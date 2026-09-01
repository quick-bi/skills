#!/usr/bin/env python3
"""quickbi-data-analyst openapi 网关客户端（仅依赖 Python 3.8+ 标准库；无 main，不可直接执行）。

承载所有开放接口共用的网关机制：
- 签名协议：X-Gw-* 四头 HmacSHA256（签名串 = METHOD + URI + 排序后 query
  + X-Gw 头，RFC3986 编码后 HMAC-SHA256 + base64；body 不参与签名）
- SSL：默认校验证书，证书校验失败自动降级重试
- 统一包络 JSON 调用（http_json）与错误映射（HTTP 状态 / 网关包络 /
  已知业务错误码）

SSE 流不走 http_json，见 stream.py。
"""
import base64
import hashlib
import hmac
import json
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request

from output import ApiError, log

# SSL 上下文：默认校验证书；证书校验失败时自动降级重试，无需用户配置
_SSL_CONTEXT = None
_SSL_FALLBACK_LOGGED = False


# ---------------------------- SSL ----------------------------
def setup_ssl():
    """初始化全局 SSL 上下文：默认校验证书。"""
    global _SSL_CONTEXT
    _SSL_CONTEXT = None  # 默认上下文，校验证书


def _disable_ssl_verify():
    """降级：关闭证书校验（仅当默认校验失败时自动触发）。"""
    global _SSL_CONTEXT, _SSL_FALLBACK_LOGGED
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    _SSL_CONTEXT = ctx
    if not _SSL_FALLBACK_LOGGED:
        log("SSL：证书校验失败，已自动降级为不校验证书")
        _SSL_FALLBACK_LOGGED = True


def _is_ssl_cert_error(e):
    """判断异常是否为证书校验失败（兼容 urllib 的 URLError(reason=SSLError) 包装）。"""
    for cur in (e, getattr(e, "reason", None)):
        if isinstance(cur, ssl.SSLError):
            return True
        if cur is not None and "certificate verify failed" in str(cur).lower():
            return True
    return False


def ssl_context():
    return _SSL_CONTEXT


def urlopen_safe(req, timeout):
    """urlopen + SSL 自动降级：默认校验证书，证书校验失败时降级为不校验重试一次。"""
    try:
        return urllib.request.urlopen(req, timeout=timeout, context=_SSL_CONTEXT)
    except urllib.error.HTTPError:
        raise
    except (urllib.error.URLError, OSError) as e:
        if _SSL_CONTEXT is None and _is_ssl_cert_error(e):
            _disable_ssl_verify()
            return urllib.request.urlopen(req, timeout=timeout, context=_SSL_CONTEXT)
        raise


# ---------------------------- 签名协议 ----------------------------
def rfc3986_encode(s):
    return urllib.parse.quote(s, safe="-_.~")


def sign(method, uri, params, access_id, access_key, nonce, timestamp):
    parts = [method.upper(), "\n", uri]
    if params:
        kv = ["%s=%s" % (k, params[k]) for k in sorted(params)
              if params[k] is not None and params[k] != ""]
        if kv:
            parts += ["\n", "&".join(kv)]
    parts.append("\nX-Gw-AccessId:%s\nX-Gw-Nonce:%s\nX-Gw-Timestamp:%s"
                 % (access_id, nonce, timestamp))
    encoded = rfc3986_encode("".join(parts))
    digest = hmac.new(access_key.encode("utf-8"), encoded.encode("utf-8"),
                      hashlib.sha256).digest()
    return base64.b64encode(digest).decode("ascii")


def signed_headers(cfg, method, uri, params=None):
    nonce = str(_new_uuid())
    ts = str(int(time.time() * 1000))
    return {
        "X-Gw-AccessId": cfg["accessId"],
        "X-Gw-Nonce": nonce,
        "X-Gw-Timestamp": ts,
        "X-Gw-Signature": sign(method, uri, params, cfg["accessId"],
                               cfg["accessKey"], nonce, ts),
    }


def _new_uuid():
    import uuid
    return uuid.uuid4()


# ---------------------------- 业务错误码 ----------------------------
KNOWN_ERROR_CODES = {
    "AE0570010014": ("智能问数 Agent 服务未部署，请联系管理员开通", "联系 QuickBI 管理员部署对应服务"),
    "AE0580800012": ("当前环境功能裁剪，禁止访问该能力", "联系 QuickBI 管理员开通智能问数功能"),
    "AE0581030022": ("NL2SQL 模块未购买", "联系管理员购买开通智能问数（NL2SQL）模块"),
    "AE0581030029": ("席位配额未授权", "联系管理员分配智能问数席位"),
    "AE0581030019": ("智能问数额度已用尽", "联系管理员充值或开通正式额度"),
    "AE0581030025": ("Token 用量已用尽", "联系管理员扩充 Token 额度"),
    "AE0581030027": ("探索版额度已用尽", "升级正式版本或联系管理员扩容"),
    "AE0533330017": ("报告免费额度已用尽", "联系管理员开通报告额度"),
    "AE0533330025": ("报告并发超限", "稍后重试或降低并发"),
    "AE0150100004": ("用户不在组织内", "检查 user_token / api_key 是否匹配同一账号"),
    "AE0510200000": ("无操作权限", "联系管理员开通对应资源权限"),
}


def check_known_error_code(text):
    """在响应文本中扫描已知业务错误码，命中则记日志返回提示（不退出）。"""
    if not text:
        return None
    for code, mapped in KNOWN_ERROR_CODES.items():
        if code in str(text):
            log("业务错误码 %s: %s（%s）" % (code, mapped[0], mapped[1]))
            return mapped
    return None


# ---------------------------- 错误映射 ----------------------------
def _classify_message_error(msg):
    """按 message 关键字分类认证/授权/额度类错误。返回 (code, message, suggestion)。"""
    lower = (msg or "").lower()
    if "only personal-level" in lower:
        return ("AK_LEVEL_REJECTED", msg, "更换个人级 AK")
    if "not authorized" in lower or "notauthorized" in lower:
        return ("API_NOT_AUTHORIZED", "AK 未开通该 API 授权: %s" % msg,
                "联系管理员在开放平台为该 AK 授权对应接口")
    if "额度" in (msg or "") or "quota" in lower:
        return ("QUOTA_INSUFFICIENT", msg, "额度不足请联系管理员充值")
    return None


def map_http_error(status, body_text, content_type="", trace_id=""):
    lower = (body_text or "").lower()
    is_html = "text/html" in (content_type or "").lower() or lower.lstrip().startswith("<!doctype")
    if status == 401:
        return ("AUTH_FAILED", "签名校验失败 / AK 无效 / 时间戳过期 (401)",
                "核对 api_key/api_secret 与本机时钟")
    if status == 403:
        classified = _classify_message_error(body_text)
        if classified:
            return classified
        mapped = check_known_error_code(body_text)
        if mapped:
            return ("BUSINESS_ERROR", mapped[0], mapped[1])
        return ("AK_LEVEL_REJECTED", "403：AK 越权访问或资源不归属当前用户",
                "更换个人级 AK；检查资源归属")
    if status == 404:
        if is_html:
            return ("PATH_NOT_FOUND",
                    "接口路径未注册（404 返回前端页面，请求未进 openapi 网关）",
                    "确认 server_domain 指向 QuickBI 开放接口域名")
        return ("RESOURCE_NOT_FOUND", "资源不存在 (404)",
                "检查 ID 是否正确、是否归属当前用户")
    if status == 422:
        return ("INVALID_PARAMS", "参数校验失败 (422): %s" % (body_text or "")[:300],
                "对照接口文档检查参数取值与范围")
    if status == 429:
        return ("RATE_LIMITED", "触发限流 (429)", "退避后重试")
    mapped = check_known_error_code(body_text)
    if mapped:
        return ("BUSINESS_ERROR", mapped[0], mapped[1])
    return ("SERVER_ERROR", "HTTP %s: %s" % (status, (body_text or "")[:300]),
            "携 traceId 报障")


def map_envelope_error(envelope):
    """网关级 success=false（HTTP 200）错误映射。"""
    msg = envelope.get("message") or "业务失败"
    code_raw = str(envelope.get("code") or "")
    mapped = KNOWN_ERROR_CODES.get(code_raw)
    if mapped:
        return ("BUSINESS_ERROR", "%s（%s）: %s" % (mapped[0], code_raw, msg), mapped[1])
    if code_raw in ("AE0510010001", "OE10010106"):
        return ("ENV_NOT_ENABLED",
                "该环境未开通此 API（%s）: %s" % (code_raw, msg),
                "非 AK 问题：需管理员在当前环境开通智能问数开放接口")
    classified = _classify_message_error(msg)
    if classified:
        return classified
    return ("BUSINESS_ERROR", msg, "按 message 排查；携 traceId 报障")


# ---------------------------- HTTP（统一包络 JSON 接口） ----------------------------
def http_json(cfg, method, uri, params=None, json_body=None, raw_body=None,
              content_type=None, timeout=30, ok_codes=None):
    """签名并调用统一包络接口，成功返回完整 envelope（dict），失败抛 ApiError。

    签名覆盖 method+uri+query（body 不参与）；SSE 流不走本函数。
    """
    headers = signed_headers(cfg, method, uri, params)
    data = None
    if json_body is not None:
        data = json.dumps(json_body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    elif raw_body is not None:
        data = raw_body
        if content_type:
            headers["Content-Type"] = content_type
    url = cfg["gateway"] + uri
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen_safe(req, timeout) as resp:
            envelope = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        text = ""
        try:
            text = e.read().decode("utf-8")
        except Exception:
            pass
        ct = e.headers.get("Content-Type", "") if e.headers else ""
        code, msg, sug = map_http_error(e.code, text, ct)
        raise ApiError(code, msg, sug, exit_code=2 if e.code == 422 else 1)
    except urllib.error.URLError as e:
        raise ApiError("NETWORK_ERROR", "请求失败: %s" % getattr(e, "reason", e),
                       "检查 server_domain 与网络连通性")
    except (OSError, TimeoutError) as e:
        raise ApiError("NETWORK_ERROR", "请求超时/网络错误: %s" % e, "稍后重试")
    except ValueError as e:
        raise ApiError("SERVER_ERROR", "响应非 JSON: %s" % e, "携 traceId 报障")
    trace_id = envelope.get("trace_id") or envelope.get("traceId") or ""
    # 部分接口包络字段为字符串（success="false"），需按字面量归一
    ok = str(envelope.get("success")).lower() == "true"
    if ok and ok_codes is not None:
        ok = str(envelope.get("code")) in ok_codes
    if not ok:
        code, msg, sug = map_envelope_error(envelope)
        raise ApiError(code, msg, sug, trace_id)
    return envelope
