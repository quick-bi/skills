# 自定义组件 MCP API

> **何时读**：步骤 5 注册/更新/预览，或首次配置 MCP server 时。

## 1. 公共约定

- **前缀**：`/openapi/v2/abi/components`
- **鉴权**：QBI AK/SK 网关签名 + `X-Api-Key`
- **操作者要求**：ABI 管理员
- **响应信封**：HTTP 恒为 200，body `{success, data, message, code, trace_id}`
- **业务码**：400 校验 / 403 非管理员 / 404 不存在 / 409 重名
- **分页**：`page` / `page_size`(≤100) → `{items, total, page, pageSize, totalPages}`（MCP 工具会再包一层 `{count, items, raw}`，`raw` 即原始分页体）
- **字段命名**：多数字段为小驼峰，但时间戳是蛇形 `created_at` / `updated_at`，不要按驼峰读

## 2. 端点一览

| 操作 | Method + Path                      | 格式      |
| ---- | ---------------------------------- | --------- |
| 注册 | `POST /upload`                     | multipart |
| 更新 | `POST /update`                     | multipart |
| 列表 | `GET /list?keyword&page&page_size` | query     |
| 详情 | `GET /detail?component_id`         | query     |
| 删除 | `POST /delete`                     | JSON body |

所有路径相对于前缀 `/openapi/v2/abi/components`。

## 3. 注册（上传）

`POST /openapi/v2/abi/components/upload`（multipart/form-data）

### 3.1 入参

| 字段             | 类型   | 必填   | 说明                                                                                                    |
| ---------------- | ------ | ------ | ------------------------------------------------------------------------------------------------------- |
| `package`        | file   | **是** | `qdt bundle` 产物；构建的 `dist/` 必含 `main.js`、`meta.js`，可含 `main.css`；≤10MB                    |
| `name`           | string | **是** | 展示名，同租户查重（重复 409）                                                                          |
| `desc`           | string | 否     | ≤200 字符，LLM 选型参考                                                                                 |
| `externalAssets` | string | 否     | JSON 数组字符串 `[{name, global, url}]`；每个第三方依赖的 `url` 必填（缺 url 时组件加载报「没有资源地址：接口层未提供 url」）  |
| `sourceArchive`  | string | 否     | 源码 zip 的 Base64，≤10MB                                                                               |
| `thumbnail`      | file   | 否     | 缩略图 png/jpg/jpeg/svg ≤200KB                                                                          |

### 3.2 qdt 产物

`qdt bundle` 不会构建代码，而是将 `dist/` 的全部直接子项写入 zip。当前 qdt 构建的直接产物为：

```
{name}-{version}.zip
├── main.js        # 必需，组件编译产物
├── meta.js        # 必需，数据契约
├── main.css       # 可选，样式
└── package.json   # qdt 自动生成，不用管
```

`meta.js` 由 `src/meta.ts` 编译产出，结构定义见 `references/meta-and-coding.md`。

### 3.3 响应

```json
{
  "success": true,
  "data": {
    "componentId": "...",
    "jsUrl": "/api/v2/abi/components/<componentId>/assets?name=main.js&v=<rev>",
    "metaJsUrl": "/api/v2/abi/components/<componentId>/assets?name=meta.js&v=<rev>",
    "cssUrl": "/api/v2/abi/components/<componentId>/assets?name=main.css&v=<rev>",
    "sourceArchiveUrl": null,
    "thumbnailUrl": null,
    "revision": "...",
    "autoInstalled": true,
    "revisionChanged": false
  }
}
```

### 3.4 curl 示例

```bash
curl -X POST "$GATEWAY/openapi/v2/abi/components/upload" \
  -H "X-Api-Key: $AK" \
  -F name=桑基图 \
  -F 'externalAssets=[{"name":"echarts","global":"echarts","url":"https://cdn.jsdelivr.net/npm/echarts@<版本>/dist/echarts.min.js"}]' \
  -F package=@sankey.zip
```

> zip 内含 `main.js` + `meta.js`（必需）+ `main.css`（可选）+ qdt 生成的 `package.json`。

产物 URL 是**相对路径**（相对 QBI 控制台 origin），资源名走 `name` 查询参数、`v` 为 revision。要对外分享需自行拼上环境域名。

## 4. 更新

`POST /openapi/v2/abi/components/update`（multipart/form-data）

字段同注册，额外需要 `component_id`（必填）。`package` / `desc` / `thumbnail` / `sourceArchive` 等**省略即不更新**（合并语义）。换 `package` 才切 `revision`。

响应同注册（含 `revisionChanged` 标志）。

## 5. 列表

`GET /openapi/v2/abi/components/list?keyword=&page=&page_size=`

响应 items 结构：`{componentId, name, desc, visibilityType, enabled, status, createdBy, createdByNickName, updated_at}`

`status` 为 `active` 表示组件在架可用。列表项不含 `created_at` 与产物 URL，需要这些字段走详情。

## 6. 详情

`GET /openapi/v2/abi/components/detail?component_id=`

响应（字段与顺序取自实际调用）：

```json
{
  "componentId": "...",
  "name": "桑基图",
  "desc": "...",
  "metaJson": {},
  "externalAssets": [
    {
      "name": "echarts",
      "global": "echarts",
      "url": "https://cdn.jsdelivr.net/npm/echarts@<版本>/dist/echarts.min.js"
    }
  ],
  "packageFilename": "sankey-1.0.0.zip",
  "jsUrl": "/api/v2/abi/components/<componentId>/assets?name=main.js&v=<rev>",
  "metaJsUrl": "/api/v2/abi/components/<componentId>/assets?name=meta.js&v=<rev>",
  "cssUrl": "/api/v2/abi/components/<componentId>/assets?name=main.css&v=<rev>",
  "sourceArchiveUrl": null,
  "thumbnailUrl": null,
  "currentRevision": "...",
  "visibilityType": "all",
  "enabled": true,
  "created_at": "2026-09-01T19:41:11",
  "updated_at": "2026-09-02T09:15:38"
}
```

`metaJson` 与组件绑定契约无关（实测为空对象）：组件的 `dataSchema` 走 `metaJsUrl` 指向的 `meta.js`，不要从 `metaJson` 读取。

## 7. 删除

`POST /openapi/v2/abi/components/delete`（JSON body）

```json
{ "component_id": "..." }
```

硬删，产物 URL 立即 404。

## 8. 消费侧（平台契约待验证）

本 Skill 的 `public/api/v2/abi/components/usable` 是**本地调试 mock**，它的路径、蛇形字段和 `assets` 结构不能作为生产接口的证据。需要直接对接生产渲染时，以目标环境的 API 文档和 `register_custom_component` / `get_custom_component_detail` 的实际响应为准。

## 9. MCP server 接入

在调用任何 `quickbi:*` 工具前，先按 `references/setup.md` 完成步骤 0 的安装与配置。MCP server 不可用、连接失败或鉴权失败时，返回步骤 0 后重试原操作。不得写死域名、逐项索取 AK/SK 或回显用户提供的鉴权信息。

## 10. MCP 工具

### 10.1 `quickbi:register_custom_component`

| 字段                    | 必填         | 说明                                                                                                        |
| ----------------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| `name`                  | 是           | 展示名，同租户查重（重名报 409）                                                                            |
| `package_base64`        | 是           | `qdt bundle` 产物的 Base64；zip 含 `main.js`、`meta.js`，可含 `main.css` 与 qdt 生成的 `package.json`；≤10MB（指解码后大小） |
| `package_file_name`     | 强烈建议     | schema 未列为必填，但不传平台会把文件名记为 `package.zip`；始终传 `npm run bundle` 产出的 `{name}-{version}.zip` |
| `desc`                  | 否           | 组件描述，≤200 字符                                                                                         |
| `external_assets`       | 否           | 第三方依赖清单 `[{name, global, url}]`；条目内 `url` 必填（包括 echarts），规则见 `externals.md` |
| `source_archive_base64` | 否           | 源码 zip 的 Base64，≤10MB；仅归档用                                                                         |

返回 `{componentId, jsUrl, metaJsUrl, cssUrl, revision}`。**上传即生效，无需 release**。

### 10.2 `quickbi:update_custom_component`

| 字段                    | 必填         | 说明                                                    |
| ----------------------- | ------------ | ------------------------------------------------------- |
| `component_id`          | 是           | 目标组件 ID                                             |
| `name`                  | 否           | 未传保留现值                                            |
| `desc`                  | 否           | 未传保留现值                                            |
| `package_base64`        | 否           | 新产物 zip 的 Base64；省略不更新产物，传了才切 revision |
| `package_file_name`     | 强烈建议     | 同注册：不传会被记为 `package.zip`。只有同时传 `package_base64` 时才有意义 |
| `external_assets`       | 否           | 未传保留现值                                            |
| `source_archive_base64` | 否           | 未传保留现值                                            |

合并语义：只传要改的字段。返回同 register（多一个 `revisionChanged` 标识）。

### 10.3 `quickbi:list_custom_components`

| 字段        | 必填 | 说明            |
| ----------- | ---- | --------------- |
| `keyword`   | 否   | 按名称模糊搜索  |
| `page`      | 否   | 页码，从 1 开始 |
| `page_size` | 否   | 每页条数，≤100  |

### 10.4 `quickbi:get_custom_component_detail`

| 字段           | 必填 | 说明        |
| -------------- | ---- | ----------- |
| `component_id` | 是   | 目标组件 ID |

返回完整详情，含 `metaJsUrl`、`jsUrl`、`cssUrl`、`externalAssets`。

### 10.5 `quickbi:delete_custom_component`

| 字段           | 必填 | 说明        |
| -------------- | ---- | ----------- |
| `component_id` | 是   | 目标组件 ID |

硬删，产物 URL 立即 404。不可逆。

### 10.6 `quickbi:recall_assets`（步骤 4 调试用）

语义检索已学习的数据集，取回数据集名与字段清单。

| 字段        | 必填 | 说明                               |
| ----------- | ---- | ---------------------------------- |
| `query`     | 是   | 检索查询文本，如「各省份销售金额」 |
| `top_k`     | 否   | 最大返回数，默认 5，建议 5~10      |
| `asset_ids` | 否   | 限定范围的 asset_id 列表           |

返回 `results[]`，每条含 `md_content`（字段清单）。从中提取数据集名与字段名用于 DSL 的 `dataset_ref` 和 `dimensions`/`measures`。

### 10.7 `quickbi:create_preview`（步骤 4 调试用）

把 DashboardSpec 保存为产物并签发预览票据。

| 字段             | 必填 | 说明                          |
| ---------------- | ---- | ----------------------------- |
| `spec`           | 是   | DashboardSpec 对象            |
| `title`          | 否   | 产物标题，缺省取 spec.title   |
| `display_type`   | 否   | `iframe`（默认）或 `markdown` |
| `expire_minutes` | 否   | 票据有效期（分钟），默认 99 年 |
| `ticket_num`     | 否   | 票据张数，默认 99999；每次页面加载/刷新消耗一张 |

返回 `{ url, artifact_id, embed }`（注意是蛇形 `artifact_id`）。内部会先校验 spec，有 error 时拒签并返回 findings。`embed` 可直接原样输出给用户，不要包进代码块。

## 11. 鉴权

MCP server 自动处理网关签名，agent 无需关心。凭证来源（优先级从高到低）：

1. 请求头 `x-quickbi-server-domain` / `x-quickbi-api-key` / `x-quickbi-api-secret`
2. 环境变量 `QUICKBI_SERVER_DOMAIN` / `QUICKBI_API_KEY` / `QUICKBI_API_SECRET`

## 12. 降级方案：手工 JSON-RPC

若 MCP 客户端调用超时，可手工走 Streamable HTTP JSON-RPC（三步握手：initialize → notifications/initialized → tools/call），每次请求带 `mcp-session-id` 响应头。`Accept` 必须含 `application/json` 与 `text/event-stream`。

### 12.1 大产物 base64 传输

`register_custom_component` / `update_custom_component` 的 `package_base64` 可达几万到几十万字符，手工誊写进 `CallMcpTool` 参数会损坏 zip。走 JSON-RPC 时应由脚本内部读取 zip 并转 base64 后直接传给 `tools/call`。
