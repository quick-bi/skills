# 脚本接口契约（quickbi-aipro 问数）

当前唯一入口脚本，Python 3.8+ 标准库即可运行：

- `scripts/chat.py`：纯问数（提交 + SSE 分段消费），只输出文字与 Markdown 表格

依赖同目录基础模块（按机制拆分，后续新入口脚本共用）：`config_loader.py`（三级凭证加载）、`gateway.py`（签名/SSL/HTTP/错误映射）、`stream.py`（SSE 分段消费）、`output.py`（输出契约）。

## 通用约定

- **stdout** 只输出本契约定义的 JSON；**stderr** 为过程日志（回复增量、事件、重连），不属于契约，调用方可忽略
- **退出码**：`0` 成功 / `1` 业务失败 / `2` 配置或参数错误
- **失败出参**：

```json
{
  "connected": false,
  "error": {
    "code": "错误码，见文末错误码表",
    "message": "错误详情",
    "suggestion": "处理建议",
    "traceId": "报障用链路 ID（可能为空）"
  }
}
```

## 鉴权

- 签名：`X-Gw-AccessId` / `X-Gw-Nonce` / `X-Gw-Timestamp` / `X-Gw-Signature` 四头 HmacSHA256（签名串 = METHOD + URI + 排序后 query + X-Gw 头，RFC3986 编码后 HMAC-SHA256 + base64；body 不参与签名）
- 凭证：三级来源，`QUICKBI_*` 环境变量 > `<workspace>/.qbi/config.yaml` > `~/.qbi/config.yaml`（详见 `setup.md`），**无试用凭证**；`api_key`/`api_secret` 必须为个人级 AK
- `user_token`（可选）：配置后在提交请求 body 中携带 `user_id`

## 入参

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `--message` | string | - | 用户问题原文（纯文本）。**脚本会自动在前面拼接系统提示词与用户提示词**，故可用长度 = 10000 − 提示词前缀长度，超限报 `CONFIG_MISSING`（exit 2） |
| `--session-id` | string | - | 复用会话（多轮上下文 / 继续读取同一轮结果），值来自上一轮出参 `sessionId` |
| `--conversation-id` | string | - | 只挂流不提交（断点恢复），值来自本次提交的 `conversationId` |
| `--workspace-dir` | path | `WORKSPACE_DIR` 环境变量或当前目录 | 用户工作目录：决定工作目录级配置层 `<dir>/.qbi/config.yaml` |
| `--timeout` | int | 300 | 总超时秒数（宿主命令执行超时建议设 300000ms） |
| `--max-reconnects` | int | 3 | SSE 断线最大重连次数（指数退避，上限 30s） |
| `--stream-step` | flag | 关 | 分段拉取模式：`message.stop` 先缓存 text，后续非 complete 事件到达时返回 `partial`；若直接到达 `message.complete`，以 complete 为最终结果并避免重复展示，适合脚本 tool 不能实时透传 stdout 的 agent 平台 |
| `--cursor` | string | - | `--stream-step` 续传游标，传上一段返回的 `cursor`（SSE event id / Last-Event-ID） |
| `--cancel` | flag | 关 | 取消进行中的对话（必须 `--session-id` 指定） |
| `--submit-timeout` | int | 60 | 提交请求超时秒数 |
| `--no-guard` | flag | 关 | **仅排障用**：不拼接系统提示词与用户提示词，正常链路不要使用 |

组合规则：

- `--message` 与 `--conversation-id` 至少提供其一（前者提交新问题，后者继续读取同一轮结果）
- 只用 `--conversation-id` 继续读取结果时，也要同时传 `--session-id <sessionId>`，用于保持同一会话上下文
- `--stream-step` 首次可与 `--message` 一起使用；后续用 `--conversation-id <cid> --cursor <cursor> --session-id <sessionId> --stream-step` 继续拉下一段
- `--cancel` 为独立模式：必须配 `--session-id` 指定要取消的会话

## 提示词拼接模型（脚本自动处理，每轮提交都带）

提交给服务端的 message = 系统提示词 + 用户提示词 + 用户问题原文。

- 系统提示词固定在 `chat.py` 中，承载通用系统级边界：仅限问数、禁止非问数工具、禁止不可渲染的交互组件（卡片/按钮/下拉）、只输出文字与 Markdown 表格
- 用户提示词（`user_prompt`）来自配置文件，只承载客户/场景口径，可留空

系统提示词、用户提示词与用户问题共享服务端 10000 字符上限。脚本按实际配置后的提示词前缀长度计算用户问题可用预算，超限报 `CONFIG_MISSING`。

「只输出文字与 Markdown 表格」是本通道的能力边界：不产出图表、看板或任何可视化产物。用户点名要图表时，服务端照常给出文字与表格结论，并用一句话说明本通道仅输出文字与表格（不道歉、不展开技术原因）。

## 出参：分段流式模式（`--stream-step`，stdout 单个 JSON）

每次调用读取到最终完成事件，或一批暂不可展示事件后返回；`message.stop` 先缓存该 block 的 text，不立即展示，等后续事件决定是否回显：

```json
{
  "type": "stream_step",
  "connected": true,
  "status": "running",
  "final": false,
  "sessionId": "会话 ID，多轮追问时回传 --session-id",
  "conversationId": "本次对话 ID，下一段回传 --conversation-id",
  "cursor": "1785898107339-0",
  "events": 12,
  "text": ""
}
```

- `sessionId` 回显本次传入的 `--session-id`：`--conversation-id` 继续读取场景下必须同时传 `--session-id`（见组合规则），此时回显的即当前有效会话 ID；后续无论继续读取结果、分段拉取下一段，还是多轮追问，都应继续传 `--session-id`
- `status=partial`：后续非 complete 事件触发上一段 `message.stop` 缓存文本的回显；若返回非空 `text`，调用方先原样展示，再带同一 `conversationId`、`cursor` 与 `sessionId` 继续调用 `--stream-step`
- `status=running`：本次只读到工具调用、心跳，或刚遇到 `message.stop` 并已缓存当前 text block；不向用户展示，继续用返回的 `cursor` 拉下一段
- `status=done`：`text` / `reply` 是最终答案；若后续直接到达 `message.complete`，脚本不会额外回显前一个 stop 缓存文本，避免重复展示；原样展示并结束本轮
- `cursor` 是已处理完的最后一个 SSE event id，下一次作为 `--cursor` 传回，避免重复拼接
- 脚本只拼接 `message.delta`；`thinking.*`、`tool.*` 默认不展示；最终答案优先使用 `message.complete.data.result`

## 出参：取消模式（`--cancel`）

```json
{ "cancelled": true, "sessionId": "被取消的会话 ID" }
```

---

# 错误码表

| 错误码 | HTTP | 含义 | 处理动作 |
| --- | --- | --- | --- |
| `AUTH_FAILED` | 401 | 签名校验失败 / AK 无效 / 时间戳过期 | 核对 api_key/api_secret 与本机时钟；见 setup.md |
| `AK_LEVEL_REJECTED` | 403 | 组织级/空间级 AK 或越权访问 | 更换**个人级** AK；检查资源归属 |
| `API_NOT_AUTHORIZED` | 403/200 | AK 未开通该接口授权 | 联系管理员在开放平台为 AK 授权 |
| `QUOTA_INSUFFICIENT` | 200 | 连通正常，租户 ABI 额度不足 | 联系管理员充值 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在（conversation_id 有误或不归属当前用户） | 检查 ID 是否为本次提交返回值 |
| `PATH_NOT_FOUND` | 404 | 接口路径未注册（返回前端页面） | 该环境可能未部署对应 openapi，向后端确认 |
| `RATE_LIMITED` | 429 | 触发限流 | 退避后重试 |
| `INVALID_PARAMS` | 422 | 参数校验失败（FastAPI 原生 detail，退出码 2） | 对照本文检查参数取值与范围 |
| `NETWORK_ERROR` | - | 网络失败 / 请求超时 | 检查 server_domain 与网络连通性 |
| `SERVER_ERROR` | 5xx | 服务端错误（或网关返回 HTML） | 携 traceId 报障；降低并发后重试 |
| `BUSINESS_ERROR` | 200 | 网关级业务失败 / 服务端 error 事件 | 按 message 排查；携 traceId 报障 |
| `CONFIG_MISSING` | - | 配置缺失（server_domain/api_key/api_secret）、参数不完整、message 超长（退出码 2） | 按 message 补全配置（环境变量或 ~/.qbi/config.yaml，见 setup.md）或精简内容 |
| `SSE_TIMEOUT` | - | 消费超时，**任务仍在后台执行** | `--conversation-id <本次 cid> --session-id <sessionId>` 继续读取，勿重新提交 |
| `SSE_RECONNECT_EXHAUSTED` | - | 重连耗尽，**任务仍在后台执行** | 同上，继续传本次 `sessionId`，保持同一会话上下文 |
| `ENV_NOT_ENABLED` | 200 | 该环境未开通该 API（AE0510010001/OE10010106） | 非 AK 问题：后端执行 init.sql 并等约 120s 配置缓存 |
