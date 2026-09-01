# Changelog

## [0.2.0] - 2026-09-01

### Changed

- 技能更名：`quickbi-aipro` → `quickbi-data-analyst`，突出“数据问答/问数”定位；目录、SKILL.md name、脚本与文档中的自称、README/CONTRIBUTING 中的引用一并更新。更名属破坏性变更，已安装旧名的环境需按新名重新安装

## [0.1.1] - 2026-08-31

### Fixed

- reply 兜底过滤新增 HTML 注释规则：服务端回复夹带的内部注释标记（如 `<!--TABLE_TITLE:...-->`）不再原样透给用户，与产物标签共用同一过滤路径

## [0.1.0] - 2026-08-26

### Added

- 问数全链路脚本：scripts/chat.py（异步提交 + SSE 分段消费、断点恢复、会话取消）；共享基础模块按机制拆分：config_loader.py（三级凭证来源、server_domain 必填无公网兜底）、gateway.py（HmacSHA256 签名、SSL 降级、统一包络 HTTP、错误码映射）、stream.py（SSE 分段消费与断线重连）、output.py（stdout/stderr 输出契约），便于后续新增入口脚本复用
- references/api.md 入参/出参契约与错误码表；references/setup.md 凭证配置引导（控制台一键复制截图，公网与独立部署环境均适用）
- 根目录 config.example.yaml 配置示例（复制为 ~/.qbi/config.yaml 填写）

### Changed

- 正文由英文占位大纲改写为正式问数工作流（触发条件、能力边界、凭证引导、多轮追问与异常恢复、硬性规则），移除 placeholder 标记；后经精简合并重复规则，常见错误并入硬性规则
- setup.md「已有配置保护」语义调整：用户提供配置内容即更新意图，直接合并写入、不再询问确认覆盖；SKILL.md 同步表述
