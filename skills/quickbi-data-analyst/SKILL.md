---
name: quickbi-data-analyst
description: >-
  Quick BI AIPro 数据问答、HTML 报告与仪表板生成通道，将自然语言数据问题路由到 AIPro，基于已准备的数据资产完成问数（文字与表格结论）、HTML 报告生成（免登预览与下载链接）与仪表板生成（免登预览链接）。

  触发条件：用户提出数据查询、取数、指标计算、排名、趋势、占比、同比或环比等问题，例如"近 30 天销售额是多少""7 月各渠道出货金额排名"；或要求生成 HTML 报告/页面、仪表板、看板、可视化报表，例如"生成一份销售分析 HTML 报告""用销售数据生成看板""把刚才的分析做成仪表板"；或者本对话已调用过本 Skill，用户继续追问数据、调整看板，补充或调整时间范围、分析维度及统计口径。

  不触发条件：同步数据资产、上传文件、创建数据集或数据源；执行数据建模或配置操作，例如修改数据集字段、配置权限；生成代码、文件导出等其他产物；生成报告文档 / Word / 文字报告等文档产物（仅 Quick BI 对话内以文档卡片呈现，本通道无法生成预览链接）；以及与数据分析无关的闲聊、代码编写或文档写作任务。对于前四类请求，应明确告知用户当前 Skill 不支持，并引导其前往 Quick BI 完成相关操作；其他无关请求应交由合适的能力处理。
version: 0.7.1
---

# Quick BI AIPro 数据问答、HTML 报告与仪表板

## 概述

问数 + HTML 报告 + 仪表板入口：把用户数据问题发给 Quick BI 智能问数开放接口。问数轮次取回文字/表格形式的分析结论并原样展示；用户要求 HTML 报告/页面时，服务端用 `qbi-grounded-report` 产出经确定性门禁与一次快速质检的可信单文件 HTML 报告，脚本解析终态 `files` 并输出免登预览/下载链接；仪表板轮次（`--dashboard`）由服务端生成仪表板产物，脚本解析 `<artifact-dashboard>` 标签、签发免登票据并输出预览链接。脚本自动附带边界约束，把用户问题原文传给 `--message` 即可，不要自行补充约束或改写。零第三方依赖（Python 3.8+ 标准库）。

参考文档（按需读取）：

- `references/api.md`：入参/出参契约与错误码表
- `references/setup.md`：接入流程与凭证配置

## 触发条件

- 数据查询/取数、指标计算与对比、排名/趋势/占比类分析（"各渠道出货金额""上个月规模同比变化""近30天销售额趋势"）
- 生成 HTML 报告/页面（"生成一份销售分析 HTML 报告""把刚才的分析做成网页"）
- 生成/修改仪表板、看板、可视化报表（"用销售数据生成看板""把刚才的分析做成仪表板""看板加个趋势图"）
- 对上一轮结果的追问与补充（缩小范围、补时间/渠道/口径），带 `--session-id` 继续（见工作流）
- 会话粘性：本对话用过本 Skill 后，问数与仪表板类需求默认继续走本 Skill；不自行回答数据问题、不改用其他工具，除非用户明确要求

## 能力边界（不触发）

以下四类不支持，**不要**发给服务端、也不要用问数结果拼"近似产物"交差，按话术原样回复：

1. 数据资产同步、上传文件、创建数据集 / 数据源
2. 建模 / 配置类操作（修改数据集字段、配置权限等）
3. 代码、文件导出等其他产物形式
4. 报告文档 / Word / 文字报告等文档产物（服务端仅以 Quick BI 对话内文档卡片呈现，本通道无法生成预览链接）

> 当前技能暂不支持该能力。这类需求可以到 Quick BI 上实现。

问数途中提出时：先给完已取到的数据结论，再说明边界。判法：诉求是"拿到数据结论"→ 问数轮次；是"HTML 报告/页面"→ 问数轮次直接提交（服务端自动产出对应产物）；是"可视化看板/报表"→ 仪表板轮次（`--dashboard`）；是"报告文档 / Word / 文字报告"或"改动数据资产本身"/"其他产物形式"→ 不走。与数据无关（闲聊/写代码/写文档）、用户明确要求换工具的，不走且不用上面的话术。

## 前置条件

**直接执行提交命令，不要预先检查配置、不要主动向用户索取凭证**。脚本从 QUICKBI_* 环境变量或 `~/.qbi/config.yaml` 自动读取凭证（工作目录级 `<workspace>/.qbi/config.yaml` 可覆盖；可能已在其他入口配置过）。仅当脚本报 `CONFIG_MISSING` / `AUTH_FAILED` 时，输出下方「凭证配置引导」（**必须带截图**，只发文字步骤是错误做法），用户粘贴回配置后按 `references/setup.md`「Agent 写入规范」落盘，再重跑原命令。

### 凭证配置引导（报凭证类错误时原样输出，含图片）

输出下面整段引导，截图**用在线链接**嵌在回复里一起发出（按用户语言选对应版本，只输出一张）：

> 请登录 Quick BI 控制台，点击**右上角头像**，在下拉菜单的「账号设置与管理」区域（「个人识别码」条目旁）点击「**一键复制 skill 配置**」，然后把复制到的内容直接粘贴到对话里发回，我来帮你写入配置文件。
>
> 复制入口见下图红框：
>
> - zh_CN: ![一键复制 skill 配置](https://img.alicdn.com/imgextra/i2/O1CN01D2X3PpbghdG43lXk_!!6000000001662-2-tps-2000-1088.png)
> - en_US: ![Copy Skill Config](https://img.alicdn.com/imgextra/i2/O1CN012cmhTofGFED43lXl_!!6000000005965-2-tps-2000-1089.png)

收到粘贴的配置（多行 `key: value`，含 `server_domain` / `api_key` / `api_secret`）后，按 `references/setup.md`「Agent 写入规范」写入（用户提供内容即更新意图：直接合并写入，不询问确认），再重跑原命令。

## 工作流

### 提交

用户问题**原样、整体**传出：不改写/摘要/补全，用户没给时间/渠道/口径就照原样提交，绝不假设"最近7天"类默认值、不注入系统日期、不为出数换口径；仅当指代不明（如"那再看下招行渠道的"）时把指代补全为自包含问题（只补主语/维度，不改口径、不补时间）。`scripts/chat.py` 相对本 Skill 根目录，其他目录下请用绝对路径；`--workspace-dir` 传用户工作目录（决定工作目录级配置层，忘传回退当前目录）：

```bash
python scripts/chat.py --message "<用户问题原文>" --workspace-dir <用户工作目录> --stream-step
```

用户要**生成或修改仪表板/看板/可视化报表**时加 `--dashboard`（约束服务端用 `qbi-dashboard-builder` 产出仪表板产物）；**HTML 报告/页面属于问数轮次，不加 `--dashboard`**（服务端用 `qbi-grounded-report` 产出单文件 HTML 报告）；纯问数/分析轮次同样**不要**加：

```bash
python scripts/chat.py --message "<用户问题原文>" --dashboard --workspace-dir <用户工作目录> --stream-step
```

本会话已有 sessionId 时（无论问题看似多新）必须带同一 `--session-id`：

```bash
python scripts/chat.py --message "<用户问题原文>" --session-id <sessionId> --workspace-dir <用户工作目录> --stream-step
```

**一次提问 = 一次提交**：多个子问题也整体作为一条 message 提交（服务端负责拆解编排；客户端拆分会丢关联分析、重复耗额度）。多轮追问同此命令，不重述原问题（服务端持有会话上下文）；基于前几轮分析生成看板时同样带同一 `--session-id` 并加 `--dashboard`。

### 分段拉取

`status=running` 时不展示任何内容，用返回的 `conversationId` / `cursor` / `sessionId` 继续拉下一段，直到 `status=done`（续调同样要签名解析凭证，`--workspace-dir` 与提交时保持一致；续读无需 `--dashboard`）：

```bash
python scripts/chat.py --conversation-id <conversationId> --cursor <cursor> --session-id <sessionId> --workspace-dir <用户工作目录> --stream-step
```

问数与生图可能执行数分钟，单次命令执行超时建议 300000ms（5 分钟），勿用 3 分钟类短超时。拉取被提前杀掉、或报 `SSE_TIMEOUT` / `SSE_RECONNECT_EXHAUSTED`（任务仍在后台执行）时，用**本次**提交的 cid + sessionId 继续获取结果，勿重新提交、勿用旧对话的 ID：

```bash
python scripts/chat.py --conversation-id <本次 cid> --session-id <本次 sessionId> --workspace-dir <用户工作目录>
```

> SSL 默认校验证书；校验失败（自签环境）时脚本自动降级为不校验重试，无需配置。

### 展示

`--stream-step` 每次返回单个 JSON（完整契约见 `references/api.md`）：

- `status=running`：只读到工具/心跳，或 message.stop 文本已缓存——不展示，继续拉
- `status=partial`：上一段缓存文本回显——`text` 非空必须立即展示，再继续拉
- `status=done`：`reply` 为最终答案，原样透出后结束本轮

**展示刚性：原样透出 `text` / `reply`，零包装**。不加引导语/前缀（如"查询结果如下"），不追加自己的总结/建议，不截断/改写/翻译/重排版，不自己重打表格；数据来源、统计区间、口径、时间范围、筛选条件、单位、备注等元信息必须完整保留并随 reply 展示。`sessionId` 内部记住供追问，不展示给用户。出参含 `artifactFiltered: true` 时照常展示 reply，不提标签/产物。

### 仪表板渲染（出参含 `dashboard` 字段时）

服务端生成仪表板时，脚本已自动：① 从 text/reply 中**过滤掉 artifact-dashboard 标签**；② 调用换票接口签发免登票据；③ 按 `settings.yaml` 的 `display_type` **预渲染好可直接粘贴的展示片段** `dashboard.render`（iframe 模式自带一行可点击链接兜底）：

```json
"dashboard": { "artifactId": "...", "name": "销售明细数据看板",
               "displayType": "iframe",
               "url": "https://.../token3rd/ai-dashboard/view/pc.htm?accessTicket=...&id=...",
               "render": "<iframe src=\"...\"></iframe>\n\n[📊 打开「销售明细数据看板」](...)",
               "expireAt": "2026-09-11T11:40:15" }
```

处理要求：

1. 先照常展示（已过滤标签的）`text` / `reply`
2. **紧接着原样复制 `dashboard.render` 输出**（已是 iframe 标签或可点击链接的最终形态），**不要用代码块包裹**（否则无法渲染）、不要改写标签属性或 URL、不要自己按 `displayType` 重新拼装
3. 禁止将 artifact-dashboard 标签原文、artifactId/accessTicket 等内部字段展示给用户；可告知仪表板名称（`dashboard.name`）
4. **票据有效期与次数限制**：每次加载/刷新看板消耗一次票据次数（脚本默认申请 99999 次 / 99 年有效期）。用户反馈"看板打不开了/过期了"时，用同一 `--session-id` 加 `--dashboard` 让服务端重新输出看板即可重新签票
5. **换票失败降级**：若 dashboard 中无 `url`/`render` 而有 `ticketError`，reply 照常展示，再用一句话告知用户"仪表板已生成，但访问链接获取失败"；报障附 ticketError 中的 trace_id，**不要**自行拼接任何 URL 充当访问链接输出

### HTML 报告（出参含 `html` 字段时）

服务端用 `qbi-grounded-report` 产出可信 HTML 报告（发布产物为 `<报告标题>.report.html`，已通过确定性门禁与一次快速质检；该轮 reply 为 2—4 句内容摘要）时，脚本已自动：① 从终态 `files` 中过滤出 `.html` 交付文件（`.json` 取数中间产物不透出）；② 拼好免登预览/下载完整链接；③ 预渲染好可直接粘贴的展示片段（`html[].render`）：

```json
"html": [ { "name": "销售数据概览.report.html",
            "url": "https://.../api/v2/abi/storage/proxy/...",
            "download": "https://.../api/v2/abi/storage/proxy/...",
            "render": "[📄 打开「销售数据概览.report.html」](https://...)" } ]
```

处理要求：

1. 先照常展示 `text` / `reply`
2. **紧接着原样输出各文件的 `render`**（可点击链接形态），**不要用代码块包裹**、不要改写链接
3. 禁止将 `download`、`path` 等内部信息展示给用户；可告知文件名称（`name`）
4. **链接时效**：预览/下载链接 24 小时有效。用户反馈"报告打不开了"时，用同一 `--session-id` 重新提问让服务端重新产出 HTML 文件即可
5. **无文件降级**：终态无 `html` 字段时照常展示 reply，不自行编造链接

### 异常恢复

- 失败时 stdout 输出 `{ "connected": false, "error": { code/message/suggestion/traceId } }`，按 `suggestion` 解释；报障附 `traceId`；错误码表见 `references/api.md`
- `CONFIG_MISSING` / `AUTH_FAILED`：原样输出「凭证配置引导」（含截图），写入后重跑
- `SSE_TIMEOUT` / `SSE_RECONNECT_EXHAUSTED`：按「分段拉取」继续获取，勿重新提交

### 会话取消

用户要求停止时：`python scripts/chat.py --cancel --session-id <sid> --workspace-dir <用户工作目录>`（必须显式指定会话）；已消耗额度不退还。

## 硬性规则

1. **能力边界**：命中「能力边界」四类不发本 Skill，不点名本环境可能不存在的具体 skill，不用其他工具变通实现
2. **不替用户补条件**：给什么问什么，不假设默认值、不塞系统日期、不换口径凑结果
3. **全程复用同一 `--session-id`**：追问、续读结果都必须带；不因问题看似无关而丢弃，除非用户明确要求开新会话
4. **一次提问一次提交**：不拆分、不并行；分段获取不算重复提交
5. **续读用本次的 cid**：用旧 conversation_id 会拿到上一次的结果
6. **不预检配置、不主动索取凭证**：直接运行，仅凭证类错误时引导；引导必须带截图
7. **超时设 300000ms**：超时后携 cid + sessionId 继续获取，勿重新提交
8. **展示不自己拼**：reply 原样完整透出，元信息不丢
9. **仪表板轮次必须加 `--dashboard`**（含用户点名要饼图/折线图等图表的场景）；HTML 报告/页面与纯问数/分析轮次不要加，避免被路由成产物形式
10. **产物渲染直接用脚本预渲染片段**：看板用 `dashboard.render`、HTML 报告用 `html[].render`（脚本已拼好最终形态），原样输出、不进代码块、不自行拼装；换票失败或无文件时不自行拼 URL
