# Changelog

## [0.3.0] - 2026-09-17

### Changed

- 全面迁移到自定义组件新协议：meta 由 `dataSchema.areas` 改为 `{ schema, uiSchema }`
  （`schema.properties.encoding` 数据槽位 + `qbi:fieldType` 字段身份 + `schema.properties.options` 样式叶子 + `uiSchema.options` 白名单控件）；
  下钻通道名由「区域 id」统一为「槽位 key」；`AIComponentProps` 文档补齐 `fields` / `options` / `utils.format_value` / `page_config`；
  SKILL.md 版本升至 0.3.0，模板依赖对齐 `@quickbi/bi-open-react-sdk@3.0.9` / `@quickbi/bi-open-sdk@4.0.8`。

## [0.2.0] - 2026-09-11

### Added

- 下钻能力接入说明：`areas[].drill` 为显式开关（默认关闭，过滤区域与纯度量区域声明也会被宿主忽略并打 `[custom-drill]` 警告，维度度量混合区域只有实际绑上维度的位置生效）；报表 DSL 侧的 `interaction.drill` 只认 `{channel, path}`，与内置编码图表同构。meta-and-coding.md 新增「下钻能力」与「下钻接入自查」两节，SKILL.md 补意图路由、步骤 4.3 调试 DSL 示例、本地预览验收与步骤 5.1 产物自检

### Changed

- `select` 载荷口径统一为 `{ dataIndex, channel? }`：`channel` 取 `areas[].id`，多个区域声明 `drill` 时必传；组件**只上报语义区域、不上报位置索引**，位置由宿主按报表配置唯一解析，不进 DSL。SKILL.md、meta-and-coding.md、chart-libs.md（echarts 点击与 KPI 示例）、plan-template.md 已同步
- 修正 `areas[].queryAxis` 表述：枚举中的 `drill` 是普通报表数据面板的钻取轴，不是自定义组件声明下钻能力的开关
- 排序/聚合/Top N 图表必须把 `dataIndex` 映射回 `data.values` 原行下标；`seriesIndex` / `dimensionIndex` 等图表库位置量不得当作 `channel` 或区域内字段位置
- mcp-api.md：给旧组件补能力必须重传含 `meta.js` 与 `main.js` 的完整包（只改 `name`/`desc` 不切 revision）；`metaJson`、`name`、`desc` 不能充当能力来源，也不要臆造声明能力的上传参数

## [0.1.0] - 2026-09-02

### Fixed

- Clarified `url` as required in `external_assets` entries: the curl and JSON examples in mcp-api.md previously showed echarts with only `{name, global}`, and the field table marked it as `url?`, contradicting externals.md. Confirmed that omitting `url` causes the component to fail with "no resource address: the API layer did not provide a url, and it is not a sandbox built-in module." Both examples and both field tables are now unified to include `url`, a `url` generation rule has been added (exact entry path first, otherwise `{name}@{version}`), and a corresponding row has been added to the troubleshooting table (can be fixed via the update API with `external_assets` only, `revisionChanged: false`, no artifact change).
- Rewrote the CORS entry in the troubleshooting table: the original text stating "devServer needs `Access-Control-Allow-Origin: *`" was misleading — the qdt devServer already ships with full CORS headers (including `Access-Control-Allow-Private-Network`). "Permission was denied ... `loopback` address space" indicates the request went over `http://` (same-page test: https to loopback returns 200, http is rejected); the root cause remains an untrusted self-signed certificate.

## [0.0.1] - 2026-08-25

- Placeholder skill created; workflow not authored yet.
