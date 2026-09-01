# 自定义组件 MCP API

> **何时读**：步骤 5 注册/更新/预览，或首次配置 MCP server 时。

## 1. 公共约定

- **前缀**：`/openapi/v2/abi/components`
- **鉴权**：QBI AK/SK 网关签名 + `X-Api-Key`
- **操作者要求**：ABI 管理员
- **响应信封**：HTTP 恒 200，body `{success, data, message, code, trace_id}`
- **业务码**：400 校验 / 403 非管理员 / 404 不存在 / 409 重名
- **分页**：`page` / `page_size`(≤100) → `{items, total, page, pageSize, totalPages}`

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

| 字段             | 类型   | 必填   | 说明                                                          |
| ---------------- | ------ | ------ | ------------------------------------------------------------- |
| `package`        | file   | **是** | 产物 zip：`main.js` + `meta.js` 必需 / `main.css` 可选；≤10MB |
| `name`           | string | **是** | 展示名，同租户查重（重复 409）                                |
| `desc`           | string | 否     | ≤200 字符，LLM 选型参考                                       |
| `externalAssets` | string | 否     | JSON 数组字符串 `[{name, global, url?}]`                      |
| `sourceArchive`  | string | 否     | 源码 zip 的 Base64，≤10MB                                     |
| `thumbnail`      | file   | 否     | 缩略图 png/jpg/jpeg/svg ≤200KB                                |

### 3.2 产物 zip 规范

```
package.zip
├── main.js      # 必需，编译产物
├── meta.js      # 必需，数据契约（manifest）
└── main.css     # 可选，样式
```

- zip 白名单：`main.js` + `meta.js` + `main.css`，其余条目一律 400
- 容忍单层 wrapper 目录（如 `dist/main.js` 会被剥掉 `dist/` 前缀等价接受）
- ≤10MB；禁 symlink / 路径穿越 / 可执行文件
- **`meta.js` 随包上传**，后端解析后返回 `metaJsUrl`

### 3.3 meta.js 结构

`meta.js` 由 `src/meta.ts` 编译产出，结构定义见 `references/meta-and-coding.md`。

### 3.4 响应

```json
{
  "success": true,
  "data": {
    "componentId": "...",
    "jsUrl": ".../assets/main.js?v=<rev>",
    "metaJsUrl": ".../assets/meta.js?v=<rev>",
    "cssUrl": ".../assets/main.css?v=<rev>",
    "sourceArchiveUrl": ".../source-archive?v=<rev>",
    "thumbnailUrl": null,
    "revision": "...",
    "autoInstalled": true,
    "revisionChanged": false
  }
}
```

### 3.5 curl 示例

```bash
curl -X POST "$GATEWAY/openapi/v2/abi/components/upload" \
  -H "X-Api-Key: $AK" \
  -F name=桑基图 \
  -F 'externalAssets=[{"name":"echarts","global":"echarts"}]' \
  -F package=@sankey.zip
```

> zip 内含 `main.js` + `meta.js`（必需）+ `main.css`（可选）。

## 4. 更新

`POST /openapi/v2/abi/components/update`（multipart/form-data）

字段同注册，额外需要 `component_id`（必填）。`package` / `desc` / `thumbnail` / `sourceArchive` 等**省略即不更新**（合并语义）。换 `package` 才切 `revision`。

响应同注册（含 `revisionChanged` 标志）。

## 5. 列表

`GET /openapi/v2/abi/components/list?keyword=&page=&page_size=`

响应 items 结构：`{componentId, name, desc, visibilityType, enabled, status, createdBy, createdByNickName, updatedAt}`

## 6. 详情

`GET /openapi/v2/abi/components/detail?component_id=`

响应：

```json
{
  "componentId": "...",
  "name": "桑基图",
  "desc": "...",
  "externalAssets": [{ "name": "echarts", "global": "echarts" }],
  "packageFilename": "sankey.zip",
  "jsUrl": ".../assets/main.js?v=<rev>",
  "metaJsUrl": ".../assets/meta.js?v=<rev>",
  "cssUrl": ".../assets/main.css?v=<rev>",
  "sourceArchiveUrl": ".../source-archive?v=<rev>",
  "thumbnailUrl": null,
  "currentRevision": "...",
  "visibilityType": "all",
  "enabled": true
}
```

## 7. 删除

`POST /openapi/v2/abi/components/delete`（JSON body）

```json
{ "component_id": "..." }
```

硬删，产物 URL 立即 404。

## 8. 消费侧（渲染用）

| 端点                                 | 说明                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `GET /usable`                        | 可用清单（已安装且启用），返回 `components[]` 含 `assets.js/metaJs/css` + `externalAssets` + `revision` |
| `GET /{componentId}/assets/main.js`  | 产物直出（非信封），ETag=revision + 304；URL 永不变，更新即生效                                         |
| `GET /{componentId}/assets/meta.js`  | 数据契约直出                                                                                            |
| `GET /{componentId}/assets/main.css` | 同上                                                                                                    |
| `GET /{componentId}/thumbnail`       | 缩略图直出                                                                                              |
| `GET /{componentId}/source-archive`  | 源码 zip 附件下载                                                                                       |

> 产物 URL **不校验安装/可见/启停**（分享场景直接可渲染）。

## 9. MCP server 接入

在调用任何 `quickbi:*` 工具前，先按 `references/setup.md` 完成步骤 0 的安装与配置。MCP server 不可用、连接失败或鉴权失败时，返回步骤 0 后重试原操作。不得猜测或写死地址、索取凭证或回显用户提供的鉴权信息。

## 10. MCP 工具

### 10.1 `quickbi:register_custom_component`

| 字段                    | 必填         | 说明                                                                                                        |
| ----------------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| `name`                  | 是           | 展示名，同租户查重（重名报 409）                                                                            |
| `package_base64`        | 是           | 产物 zip 的 Base64：根级 `main.js` + `meta.js` 必需 / `main.css` 可选；≤10MB                                |
| `package_file_name`     | **强烈建议** | zip 文件名（如 `my-chart-1.0.0.zip`）；**不传则平台记录为 `package.zip`**，用 `npm run bundle` 产出的文件名 |
| `desc`                  | 否           | 组件描述，≤200 字符                                                                                         |
| `external_assets`       | 否           | 第三方依赖清单 `[{name, global, url?}]`                                                                     |
| `source_archive_base64` | 否           | 源码 zip 的 Base64，≤10MB；仅归档用                                                                         |

返回 `{componentId, jsUrl, metaJsUrl, cssUrl, revision}`。**上传即生效，无需 release**。

### 10.2 `quickbi:update_custom_component`

| 字段                    | 必填         | 说明                                                    |
| ----------------------- | ------------ | ------------------------------------------------------- |
| `component_id`          | 是           | 目标组件 ID                                             |
| `name`                  | 否           | 未传保留现值                                            |
| `desc`                  | 否           | 未传保留现值                                            |
| `package_base64`        | 否           | 新产物 zip 的 Base64；省略不更新产物，传了才切 revision |
| `package_file_name`     | **强烈建议** | zip 文件名；**不传则平台记录为 `package.zip`**          |
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

| 字段           | 必填 | 说明                          |
| -------------- | ---- | ----------------------------- |
| `spec`         | 是   | DashboardSpec 对象            |
| `title`        | 否   | 产物标题，缺省取 spec.title   |
| `display_type` | 否   | `iframe`（默认）或 `markdown` |

返回 `{ url, artifactId, embed }`。内部会先校验 spec，有 error 时拒签并返回 findings。

## 11. 鉴权

MCP server 自动处理网关签名，agent 无需关心。凭证来源（优先级从高到低）：

1. 请求头 `x-quickbi-server-domain` / `x-quickbi-api-key` / `x-quickbi-api-secret`
2. 环境变量 `QUICKBI_SERVER_DOMAIN` / `QUICKBI_API_KEY` / `QUICKBI_API_SECRET`

## 12. 降级方案：手工 JSON-RPC

若 MCP 客户端调用超时，可手工走 Streamable HTTP JSON-RPC（三步握手：initialize → notifications/initialized → tools/call），每次请求带 `mcp-session-id` 响应头。`Accept` 必须含 `application/json` 与 `text/event-stream`。
