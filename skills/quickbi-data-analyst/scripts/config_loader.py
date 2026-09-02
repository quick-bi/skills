#!/usr/bin/env python3
"""quickbi-data-analyst 凭证配置加载（仅依赖 Python 3.8+ 标准库；无 main，不可直接执行）。

鉴权体系（无试用凭证）：
- 凭证三级来源（高 → 低）：QUICKBI_* 环境变量（QUICKBI_SERVER_DOMAIN /
  QUICKBI_API_KEY / QUICKBI_API_SECRET）→ <workspace>/.qbi/config.yaml
  （工作目录级）→ ~/.qbi/config.yaml（用户级）。
- 必配项：server_domain（按实际环境填写；独立部署为部署地址）
  与个人级 api_key / api_secret，任一缺失报 CONFIG_MISSING。

含一个零依赖的简易 YAML 解析器（仅覆盖本 skill 配置所需的子集）。
"""
import os

from output import die, log

# 用户级配置文件
USER_CONFIG_PATH = os.path.join(os.path.expanduser("~"), ".qbi", "config.yaml")

# 工作目录级配置目录（与用户级 ~/.qbi 同构）
WORKSPACE_CONFIG_SUBDIR = ".qbi"

# 凭证三级来源（低 → 高）：~/.qbi/config.yaml → <workspace>/.qbi/config.yaml
# → QUICKBI_* 环境变量
ENV_KEYS = {
    "server_domain": "QUICKBI_SERVER_DOMAIN",
    "api_key": "QUICKBI_API_KEY",
    "api_secret": "QUICKBI_API_SECRET",
}


# ---------------------------- 简易 YAML 解析 ----------------------------
def parse_simple_yaml(text):
    """解析本 skill 配置所需的 YAML 子集：key/value、缩进列表、| 多行文本。

    仅支持扁平键与缩进列表；遇到嵌套 map 等不支持语法时显式告警到 stderr。
    """
    result = {}
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        raw = lines[i]
        stripped = raw.strip()
        if not stripped or stripped.startswith("#") or ":" not in raw:
            i += 1
            continue
        key, _, value = raw.partition(":")
        key = key.strip()
        value = value.strip()
        # 先去引号再剔除行尾注释，避免引号内含 " #" 的值被误截断
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        else:
            value = value.split(" #", 1)[0].strip()
        if value == "|":
            block = []
            i += 1
            while i < len(lines):
                block_raw = lines[i]
                block_stripped = block_raw.strip()
                if block_stripped and not block_raw.startswith((" ", "\t")) and ":" in block_raw:
                    break
                if block_raw.startswith("  "):
                    block.append(block_raw[2:])
                elif block_raw.startswith("\t"):
                    block.append(block_raw[1:])
                else:
                    block.append(block_raw)
                i += 1
            result[key] = "\n".join(block) + "\n"
            continue
        if value == "":
            items = []
            j = i + 1
            while j < len(lines):
                item_raw = lines[j]
                item_stripped = item_raw.strip()
                if not item_stripped or item_stripped.startswith("#"):
                    j += 1
                    continue
                if item_raw.startswith((" ", "\t")) and item_stripped.startswith("-"):
                    items.append(item_stripped[1:].strip())
                    j += 1
                    continue
                break
            if items:
                result[key] = items
                i = j
                continue
            k = j
            while k < len(lines) and not lines[k].strip():
                k += 1
            if k < len(lines) and lines[k].startswith((" ", "\t")) and ":" in lines[k]:
                log("配置含嵌套结构，parse_simple_yaml 不支持（键 %s 被忽略）" % key)
        result[key] = value
        i += 1
    return result


def _read_yaml_file(path):
    """读 YAML 配置文件为 dict；不存在或解析失败返回空 dict。"""
    if not os.path.isfile(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return parse_simple_yaml(f.read())
    except OSError as e:
        log("配置文件读取失败 %s: %s" % (path, e))
        return {}


# ---------------------------- 配置加载 ----------------------------
def _merge_nonempty(base, override):
    """把 override 中的非空值合并进 base（高优先级层覆盖低优先级层）。"""
    for key, value in (override or {}).items():
        if value is not None and str(value).strip() != "":
            base[key] = value
    return base


def _workspace_config_path(workspace_dir):
    return os.path.join(workspace_dir, WORKSPACE_CONFIG_SUBDIR, "config.yaml")


def load_raw_config(workspace_dir=None):
    """加载原始配置：~/.qbi/config.yaml 打底，workspace 级配置按项覆盖，
    QUICKBI_* 环境变量最高优先级覆盖凭证三项。

    环境变量只覆盖凭证三项。
    """
    raw = _read_yaml_file(USER_CONFIG_PATH)
    if workspace_dir:
        workspace_path = _workspace_config_path(workspace_dir)
        workspace_cfg = _read_yaml_file(workspace_path)
        if workspace_cfg:
            _merge_nonempty(raw, workspace_cfg)
            log("已加载工作目录级配置: %s" % workspace_path)
    for key, env_key in ENV_KEYS.items():
        value = (os.environ.get(env_key) or "").strip()
        if value:
            raw[key] = value
            log("凭证项 %s 由环境变量 %s 覆盖" % (key, env_key))
    return raw


def build_config(raw):
    """归一化内部 cfg：补协议、校验必填项（无试用凭证；server_domain 与
    AK/SK 任一缺失即报错，不静默回退公网域名）。"""
    cfg = {
        "gateway": str(raw.get("server_domain") or "").strip().rstrip("/"),
        "accessId": str(raw.get("api_key") or ""),
        "accessKey": str(raw.get("api_secret") or ""),
    }
    if cfg["gateway"] and not cfg["gateway"].startswith(("http://", "https://")):
        cfg["gateway"] = "https://" + cfg["gateway"]

    missing = [n for k, n in (("gateway", "server_domain"),
                              ("accessId", "api_key"),
                              ("accessKey", "api_secret")) if not cfg[k]]
    if missing:
        die("CONFIG_MISSING",
            "Quick BI 配置缺失: %s" % ", ".join(missing),
            "设置环境变量 %s，或写入 ~/.qbi/config.yaml 或工作目录级"
            " <workspace>/.qbi/config.yaml 的 server_domain /"
            " api_key / api_secret 字段（server_domain 按实际环境填写；"
            "仅支持个人级 AK；获取方式见 references/setup.md）"
            % " / ".join(ENV_KEYS[k] for k in ("server_domain", "api_key", "api_secret")),
            exit_code=2)
    return cfg


def load_config(workspace_dir=None):
    """加载配置并归一化内部 cfg。"""
    return build_config(load_raw_config(workspace_dir))
