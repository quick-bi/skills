# Changelog

## [0.7.1] - 2026-09-17

### Fixed

- 报告文档显式拒识：能力边界新增第四类「报告文档 / Word / 文字报告等文档产物」（服务端仅以 Quick BI 对话内文档卡片呈现，本通道无法生成预览链接）；触发条件与判法中「数据报表」改为「可视化报表」，避免报告文档被误路由成仪表板轮次

## [0.7.0] - 2026-09-17

### Removed

- 移除报告文档通道：删除问数轮次对 `qbi-doc-report` 的点名与 `<artifact-report>` 标签解析/换票链路（`extract_report` 函数、出参 `report`、`build_render` emoji 参数）；用户要求报告文档时按能力边界话术回复，引导到 Quick BI 上实现

## [0.6.0] - 2026-09-17

### Changed

- HTML 报告通道升级为可信报告：问数轮次点名 `qbi-grounded-report`（服务端完成 ABI 取数/派生、确定性门禁与一次快速质检后发布 `<报告标题>.report.html`），替换原 `qbi-streaming-html-report` 路由；结构与皮肤使用默认值、不发起交互确认（OpenAPI 通道禁止交互组件，服务端按内容形态自选结构）
- 客户端出参链路不变：可信报告发布产物经终态 `data.files` 透出，`html[]`（name/url/download/render）解析与 24 小时链接时效规则保持原样；该轮 reply 为 2—4 句内容摘要（主题与数据范围、指标概览、核心洞察），照常原样展示

## [0.5.0] - 2026-09-14

### Added

- HTML 报告与报告文档生成：放开系统提示词禁止网页的限制，问数轮次点名 `qbi-streaming-html-report`（单文件 HTML，默认布局配色、不交互确认）与 `qbi-doc-report`（报告文档产物）
- 产物免登输出：终态 `data.files` 过滤 `.html` 交付文件（`.json` 中间产物不透出）出参 `html[]`（name/url/download/render，24 小时有效）；`<artifact-report>` 标签提取后共用 embed-ticket 换票出参 `report`（name/url/render/expireAt，失败降级 ticketError）

### Changed

- 能力边界第三类改为「代码、文件导出等其他产物形式」；HTML 报告/报告文档属问数轮次（不加 `--dashboard`），出参 render 原样输出不进代码块；`build_render` 增加 emoji 参数（仪表板 📊 / 报告文档 📄）

## [0.3.0] - 2026-09-11

### Added

- 仪表板生成能力：chat.py 新增 `--dashboard` 轮次（系统提示词约束服务端用 `qbi-dashboard-builder` 产出仪表板产物）；解析回复中的 `<artifact-dashboard>` 标签，调用 `/openapi/v2/abi/artifacts/embed-ticket` 换票签发免登票据，出参新增 `dashboard` 字段（artifactId/name/displayType/url/render/expireAt，换票失败降级为 ticketError）
- `dashboard.render`：脚本按 `display_type` 预渲染可直接粘贴的展示片段，调用方原样输出即可，避免自行拼装时包进代码块或改坏 URL；iframe 模式额外附一行可点击链接兜底——部分客户端不渲染内嵌 iframe，没有兜底入口时用户得追问一轮才能拿到地址
- 仪表板预览设置独立放 Skill 根目录 `settings.yaml`（随包分发，默认值直写），与凭证 `config.yaml` 分离：`display_type`（iframe/markdown，默认 iframe）、`ticket_expire_minutes`（默认 99 年）、`ticket_num`（默认 99999）

### Changed

- 去掉「仅限问数」限制：系统提示词与 SKILL.md 能力边界改为问数 + 仪表板生成/修改；资产同步、建模/配置类操作与非仪表板产物仍不支持
- reply 兜底过滤只针对非仪表板产物标签与 HTML 注释；artifact-dashboard 标签改走提取 + 换票链路

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
