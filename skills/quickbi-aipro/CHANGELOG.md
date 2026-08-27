# Changelog

## [0.1.0] - 2026-08-26

### Added

- 问数全链路脚本：scripts/chat.py（异步提交 + SSE 分段消费、断点恢复、会话取消）；共享基础模块按机制拆分：config_loader.py（三级凭证来源、server_domain 必填无公网兜底）、gateway.py（HmacSHA256 签名、SSL 降级、统一包络 HTTP、错误码映射）、stream.py（SSE 分段消费与断线重连）、output.py（stdout/stderr 输出契约），便于后续新增入口脚本复用
- references/api.md 入参/出参契约与错误码表；references/setup.md 凭证配置引导（控制台一键复制截图，公网与独立部署环境均适用）
- 根目录 config.example.yaml 配置示例（复制为 ~/.qbi/config.yaml 填写）

### Changed

- 正文由英文占位大纲改写为正式问数工作流（触发条件、能力边界、凭证引导、多轮追问与异常恢复、硬性规则），移除 placeholder 标记；后经精简合并重复规则，常见错误并入硬性规则
