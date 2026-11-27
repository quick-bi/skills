#!/usr/bin/env python3
"""Read personal/enterprise asset catalogues with the shared Quick BI AK/SK.

Python 3.8+ standard library only. This script does not import, copy or learn
assets. Personal keyword matching applies to one page; follow nextPage even
when that page has no matches. Enterprise keyword filtering is server-side.
"""
import argparse
import os
import sys

from config_loader import load_config
from gateway import http_json, setup_ssl
from output import ApiError, die_from, emit

PATH_PERSONAL = "/openapi/v2/abi/agent/assets"
PATH_ENTERPRISE = "/openapi/v2/abi/agent/enterprise-assets"


def list_assets(cfg, scope="personal", page=1, page_size=20, keyword=None):
    if scope not in ("personal", "enterprise") or page < 1 or not 1 <= page_size <= 100:
        raise ApiError("INVALID_PARAMS", "scope 须为 personal/enterprise，page >= 1，page-size 为 1~100",
                       "修正目录范围或分页参数", exit_code=2)
    keyword = (keyword or "").strip()
    if scope == "enterprise":
        path = PATH_ENTERPRISE
        params = {"page": page, "page_size": page_size}
        if keyword:
            params["keyword"] = keyword
    else:
        path = PATH_PERSONAL
        params = {"offset": (page - 1) * page_size, "limit": page_size}
    envelope = http_json(cfg, "GET", path, params=params)
    data = envelope.get("data")
    if (not isinstance(data, dict) or not isinstance(data.get("items"), list)
            or type(data.get("total")) is not int or data["total"] < 0
            or any(not isinstance(item, dict) for item in data["items"])):
        raise ApiError("SERVER_ERROR", "资产目录响应缺少有效的 items/total",
                       "核对当前环境的资产目录接口版本；不要将异常响应当成空目录")
    items = data["items"]
    scanned = len(items)
    if keyword and scope == "personal":
        items = [item for item in items
                 if keyword.casefold() in str(item.get("asset_name") or "").casefold()]
    has_more = page * page_size < data["total"]
    return {"connected": True, "scope": scope, "items": items,
            "total": data["total"], "page": page, "pageSize": page_size,
            "scannedOnPage": scanned, "matchedOnPage": len(items),
            "hasMore": has_more, "nextPage": page + 1 if has_more else None,
            "traceId": envelope.get("trace_id") or envelope.get("traceId") or ""}


def main():
    parser = argparse.ArgumentParser(description="查询 Quick BI AIPro 数据资产目录（只读）")
    parser.add_argument("--scope", choices=("personal", "enterprise"), default="personal")
    parser.add_argument("--page", type=int, default=1)
    parser.add_argument("--page-size", type=int, default=20)
    parser.add_argument("--keyword", help="名称关键词；个人资产仅过滤当前页，须继续读取 nextPage")
    parser.add_argument("--workspace-dir", default=None)
    args = parser.parse_args()
    workspace_dir = args.workspace_dir or os.environ.get("WORKSPACE_DIR") or os.getcwd()
    try:
        cfg = load_config(workspace_dir)
        setup_ssl()
        emit(list_assets(cfg, args.scope, args.page, args.page_size, args.keyword))
    except ApiError as error:
        die_from(error)


if __name__ == "__main__":
    sys.exit(main())
