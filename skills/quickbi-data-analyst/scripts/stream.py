#!/usr/bin/env python3
"""quickbi-data-analyst SSE 流解析与分段消费（仅依赖 Python 3.8+ 标准库；无 main，不可直接执行）。

问数结果的唯一消费路径：事件流解析（sse_iter）+ 分段累积
（StreamStepAccumulator，message.stop 先缓存、后续事件决定回显或终态）+
断线指数退避重连与 Last-Event-ID 续读（consume_stream_step）。

后续新增的流式开放接口可直接复用本模块，流地址由调用方传入。
"""
import json
import time
import urllib.error
import urllib.parse
import urllib.request

from gateway import map_http_error, signed_headers, urlopen_safe
from output import die, log

# 终态事件：实测网关以 message.complete 结束并关连（文档写 done）。
# message.complete 携带 data.result（最终可信答案）；
# 其余别名（done/finish/finished/completed/complete/conversation.complete）
# 为跨环境防御性兼容，结构可能不同，仅作终态识别兜底。
DONE_TYPES = {"message.complete", "done", "finish", "finished", "completed",
              "complete", "conversation.complete"}


def sse_iter(resp):
    event_id, event_name, data_lines = None, "message", []
    for raw in resp:
        line = raw.decode("utf-8", errors="replace").rstrip("\r\n")
        if line == "":
            if data_lines:
                yield event_id, event_name, "\n".join(data_lines)
            event_name, data_lines = "message", []
            continue
        if line.startswith(":"):
            continue  # keepalive 注释行
        if line.startswith("id:"):
            event_id = line[3:].strip()
        elif line.startswith("event:"):
            event_name = line[6:].strip()
        elif line.startswith("data:"):
            data_lines.append(line[5:].lstrip())
    if data_lines:
        yield event_id, event_name, "\n".join(data_lines)


def extract_text(obj):
    """从事件对象提取文本：delta 类事件取 content/delta/text，终态优先取 result。

    优先级：data 层 > 顶层。message.complete 的最终答案优先取 data.result，
    故终态与增量共用本函数即可，无需单独的 result 提取逻辑。
    """
    if not isinstance(obj, dict):
        return ""
    inner = obj.get("data")
    if isinstance(inner, dict):
        for key in ("result", "content", "delta", "text"):
            if isinstance(inner.get(key), str):
                return inner[key]
    for key in ("result", "delta", "content", "text"):
        if isinstance(obj.get(key), str):
            return obj[key]
    return ""


def resume_command(conversation_id, session_id=None, cursor=None):
    cmd = "--conversation-id %s" % conversation_id
    if cursor:
        cmd += " --cursor %s" % cursor
    if session_id:
        cmd += " --session-id %s" % session_id
    else:
        cmd += " --session-id <sessionId>"
    return cmd


class StreamStepAccumulator:
    """把 SSE 事件拼成一个可展示片段；遇到片段边界立即返回。"""

    def __init__(self):
        self.message_parts = []
        self.pending_text = ""
        self.pending_cursor = None
        self.cursor = None
        self.events = 0

    def feed(self, event_id, event_name, data_str):
        self.events += 1
        if event_id:
            self.cursor = event_id
        try:
            obj = json.loads(data_str)
        except ValueError:
            obj = None
        type_val = (str(obj.get("type", "")).lower()
                    if isinstance(obj, dict) else "")
        if type_val == "heartbeat":
            return None
        # 重连后服务端可能从头重放（发流起始事件）：清空已累积内容，避免重复拼接
        if type_val in ("metadata", "session.created") and \
                (self.message_parts or self.pending_text):
            log("检测到服务端从头重放，重置已累积内容")
            self.message_parts = []
            self.pending_text = ""
            self.pending_cursor = None
        if event_name == "error" or type_val == "error":
            text = ((obj or {}).get("message") or extract_text(obj) or data_str)[:500]
            return {"status": "error", "text": text, "cursor": self.cursor,
                    "events": self.events, "final": False}
        if type_val in DONE_TYPES:
            # 终态：message.complete 优先取 data.result（最终可信结果），
            # 其余终态别名或无 result 时回退到 stop 缓存 / delta 累积
            final_text = extract_text(obj) or self.pending_text or "".join(self.message_parts)
            self.pending_text = ""
            self.pending_cursor = None
            return {"status": "done", "text": final_text, "cursor": self.cursor,
                    "events": self.events, "final": True, "complete_confirmed": True}
        if self.pending_text and type_val and type_val != "heartbeat":
            text, cursor = self.pending_text, self.pending_cursor
            self.pending_text, self.pending_cursor = "", None
            return {"status": "partial", "text": text, "cursor": cursor,
                    "events": self.events, "final": False}
        if type_val == "message.delta":
            text = extract_text(obj)
            if text:
                self.message_parts.append(text)
            return None
        if type_val == "message.stop":
            # message.stop 只是 message block 的内部边界。先缓存本 block 文本，等后续
            # 事件到达后再决定是否回显：若下一个事件是 message.complete，则以 complete
            # 为最终可信结果，避免重复；若后续还有其他 block/tool 事件，则回显这个
            # pending 文本并把 cursor 回退到 stop，下一次可继续读取后续事件。
            text = "".join(self.message_parts)
            self.message_parts = []
            if text:
                self.pending_text = text
                self.pending_cursor = self.cursor
            return None
        return None

    def running(self):
        return {"status": "running", "text": "", "cursor": self.cursor,
                "events": self.events, "final": False}


def consume_stream_step_events(events):
    """消费一批 SSE 事件，返回下一个完整可见片段或最终结果。"""
    acc = StreamStepAccumulator()
    for event_id, event_name, data_str in events:
        step = acc.feed(event_id, event_name, data_str)
        if step:
            return step
    return acc.running()


def consume_stream_step(cfg, stream_uri, conversation_id, timeout, max_reconnects,
                        cursor=None, session_id=None):
    """按 cursor 续读流，遇到下一个完整 message block 或最终完成即返回。

    cursor 语义：上一次调用「已处理完」的最后一个 SSE event id，作为本次 Last-Event-ID
    回传，网关从该 id 之后继续发送（不含边界）。若网关改为含边界重发，需在此适配。
    """
    uri = stream_uri
    params = {"conversation_id": conversation_id}
    deadline = time.time() + timeout
    last_event_id, reconnects = cursor, 0
    acc = StreamStepAccumulator()

    while True:
        remain = deadline - time.time()
        if remain <= 0:
            die("SSE_TIMEOUT", "分段消费超时（%ss），已收 %s 个事件" %
                (timeout, acc.events),
                "携 %s 重试" %
                resume_command(conversation_id, session_id, last_event_id or cursor or "<cursor>"))
        headers = signed_headers(cfg, "GET", uri, params)
        headers["Accept"] = "text/event-stream"
        if last_event_id:
            headers["Last-Event-ID"] = last_event_id
        url = cfg["gateway"] + uri + "?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers=headers, method="GET")
        try:
            log("建立分段 SSE 连接%s..." %
                ("（Last-Event-ID=%s）" % last_event_id if last_event_id else ""))
            with urlopen_safe(req, min(remain, 300)) as resp:
                for event_id, event_name, data_str in sse_iter(resp):
                    reconnects = 0
                    if event_id:
                        last_event_id = event_id
                    step = acc.feed(event_id, event_name, data_str)
                    if step:
                        return step
            # 本次连接没有拿到可展示边界，但已消费到新 cursor，交还调用方继续下一次拉取。
            if acc.events:
                return acc.running()
            raise urllib.error.URLError("流提前关闭（未收到任何事件）")
        except urllib.error.HTTPError as e:
            text = ""
            try:
                text = e.read().decode("utf-8")
            except Exception:
                pass
            ct = e.headers.get("Content-Type", "") if e.headers else ""
            code, msg, sug = map_http_error(e.code, text, ct)
            die(code, msg, sug)
        except (urllib.error.URLError, OSError, TimeoutError) as e:
            reconnects += 1
            if reconnects > max_reconnects:
                die("SSE_RECONNECT_EXHAUSTED",
                    "分段重连 %s 次仍失败（已收 %s 个事件）" %
                    (max_reconnects, acc.events),
                    "携 %s 重试" %
                    resume_command(conversation_id, session_id, last_event_id or cursor or "<cursor>"))
            backoff = min(2 ** reconnects, 30)
            log("分段 SSE 断开（%s），%ss 后第 %s/%s 次重连..." %
                (e, backoff, reconnects, max_reconnects))
            time.sleep(backoff)
