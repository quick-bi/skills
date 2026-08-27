#!/usr/bin/env python3
"""quickbi-aipro 输出契约（仅依赖 Python 3.8+ 标准库；无 main，不可直接执行）。

所有入口脚本共用：
- stdout 只输出契约定义的 JSON（emit/die）
- stderr 为过程日志（log），不属于契约
- 统一失败异常 ApiError，由调用方决定 die（终止）还是降级（记日志继续）
"""
import json
import sys
import time


class ApiError(Exception):
    """统一 API 异常：调用方决定 die（终止）还是降级（记日志继续）。"""

    def __init__(self, code, message, suggestion="", trace_id="", exit_code=1):
        super().__init__(message)
        self.code = code
        self.message = message
        self.suggestion = suggestion
        self.trace_id = trace_id
        self.exit_code = exit_code


def log(msg):
    print("[%s] %s" % (time.strftime("%H:%M:%S"), msg), file=sys.stderr, flush=True)


def emit(obj):
    print(json.dumps(obj, ensure_ascii=False), flush=True)


def die(code, message, suggestion="", trace_id="", exit_code=1):
    emit({"connected": False,
          "error": {"code": code, "message": message,
                    "suggestion": suggestion, "traceId": trace_id}})
    sys.exit(exit_code)


def die_from(err):
    """ApiError → 统一失败出参并退出。"""
    die(err.code, err.message, err.suggestion, err.trace_id, err.exit_code)
