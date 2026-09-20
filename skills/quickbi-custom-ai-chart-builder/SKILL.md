---
name: quickbi-custom-ai-chart-builder
description: >-
  开发 QuickBI AI Pro 仪表板自定义图表：脚手架新建、本地调试、构建打包、上传发布。

  触发条件：用户明确要开发自定义图表、扩展现有自定义图表（包括给它加点击下钻能力）、从零新建图表工程、本地调试自定义图表、将自定义图表上传到 QuickBI 平台，或排查自定义图表空白/加载失败/外部依赖缺失/字段映射错误/下钻入口缺失等问题。

  不触发条件：用户仅想用平台内置组件/控件制作普通仪表板；仅做数据问答、取数、生成分析报告；修改数据集结构、数据源配置或权限；以及与自定义图表开发无关的通用编码、文档写作或闲聊任务。
version: 0.3.0
---

# QuickBI AI Pro 自定义图表开发

## 意图路由

| 用户意图   | 执行步骤     | 参考文件                                                        |
| ---------- | ------------ | --------------------------------------------------------------- |
| 从零新建   | 0→1→2→3→4→5 | `references/chart-libs.md`、`references/meta-and-coding.md`    |
| 本地调试   | 0→4          | `references/setup.md`                                          |
| 只上传     | 0→5          | `references/setup.md`、`references/mcp-api.md`                 |
| 加下钻能力 | 0→3→4→5      | `references/meta-and-coding.md`、`references/chart-libs.md`    |
| 查字段写法 | —            | `references/meta-and-coding.md`                                |
| 排查空白   | 见常见故障   | `references/externals.md`                                      |

意图不明确时先问。

## 步骤 0：MCP 安装与配置

开工前先**做一次可用性探活**：调一次只读工具（`quickbi-mcp:list_custom_components`）。**探活成功就跳过步骤 0、直接进入步骤 1**；失败再按下方流程配置。

首次使用本 Skill 时，先读 `references/setup.md`，通过当前 AI 客户端或 IDE 的 MCP 设置添加 `quickbi-mcp` MCP server。配置由用户在 Quick BI AI Pro 控制台点「一键复制 MCP 配置」取得——复制出的即是完整可用的 `mcpServers.quickbi-mcp` 配置，原样合并写入客户端 MCP 配置即可，无需拼装、不得改写域名或凭证。所有 `quickbi-mcp:*` 工具调用前必须完成本步骤；工具不可用、连接失败或鉴权失败时返回本步骤，完成配置后重试原操作。

## 步骤 1：需求澄清

读 `references/plan-template.md`，产出 `PLAN.md`，等用户确认后再动手。

选型：简单图形→纯 SVG/CSS；标准图表→echarts（需自备 CDN url）；其他→写明理由。参考 `references/chart-libs.md`。

## 步骤 2：脚手架

`qbi-dev-tools` 的 `engines` 硬要求 **Node ≥ 22.20.0**（预检与构建都会在低版本上直接报错）。开工前先看 `node -v`，不达标先请用户升级。

```bash
# 在目标工程的父目录运行；统一走官方 npm 源（`--registry` 必须放在包名之前）
# React 版
npx -y --registry=https://registry.npmjs.org create-qbi-app@latest <component-name> --template ai-chart-react-ts
# Vanilla 版
npx -y --registry=https://registry.npmjs.org create-qbi-app@latest <component-name> --template ai-chart-vanilla-ts

cd <component-name> && npm install --registry=https://registry.npmjs.org
```

> 官方源也拉不到含 AI 模板的版本时，不要反复重试或改用其他脚手架：把 `npm view create-qbi-app versions` 的结果告知用户，请其联系维护者重新发布。

> 组件名必须使用小写字母开头，后续仅含小写字母、数字、`_` 或 `-`，并至少两个字符。部分 CLI 版本只在交互输入时校验名称，**传入位置参数时不校验**；因此执行脚手架命令前必须由本 Skill 先校验，不合规就要求用户改名。脚手架不会自动执行 `npm install`。`create-qbi-app` 会将 `package.json` 的 `name` 设为项目名。写入 `PLAN.md`。后续所有命令均在组件目录下执行。

## 步骤 3：编码

先查 `references/chart-libs.md` 有无现成配方。

核心契约（详见 `references/meta-and-coding.md`）：

**meta.ts** — 类型 `AIComponentMeta`，核心字段 `schema.properties.encoding`（数据槽位，槽位 `description` 建议写，帮助 AI 召回）、`schema.properties.options`（样式选项叶子）与 `uiSchema.options`（白名单控件提示）。必须用 `defineMeta` 包裹导出；它是 SDK 的运行时导出，若当前安装的版本不导出它，说明装到了旧版，按步骤 2 带官方 registry 重装最新版：

```ts
import type { Interfaces } from '@quickbi/bi-open-react-sdk'; // Vanilla 版用 '@quickbi/bi-open-sdk'
import { defineMeta } from '@quickbi/bi-open-react-sdk'; // Vanilla 版用 '@quickbi/bi-open-sdk'

export default defineMeta<Interfaces.AIComponentMeta>({
  schema: {
    properties: {
      encoding: { /* 槽位 key → 槽位声明：qbi:fieldType、单选 string / 多选 array + maxItems、description */ },
      options: { /* 样式选项叶子：下划线键、值域 + default */ },
    },
  },
  uiSchema: { options: { /* 白名单控件提示：select / checkbox / number / text / textarea */ } },
  interaction: { drill: { channels: [/* 可下钻槽位 key，默认关闭 */] } },
});
```

完整示例见 `references/meta-and-coding.md`「meta.ts 数据契约」节。

需要点击下钻时，在 meta 根级加 `interaction: { drill: { channels: ['category'] } }`，列出**实际可点击的维度槽位 key**（默认关闭；过滤槽位与纯度量槽位声明了也会被宿主忽略）。能力声明规则、忽略条件与报表侧 `channel`/`path` 的对齐方式见 `references/meta-and-coding.md`「下钻能力」节。

**props** — React 版直接接收 `AIComponentProps`；Vanilla 版经 `LifecycleProps` 包装，需通过 `props.customProps!` 访问：

```ts
// React 版 — 直接解构
const MyComponent: React.FC<Interfaces.AIComponentProps> = (props) => {
  const { data, encoding } = props;
};

// Vanilla 版 — 通过 customProps 访问
mount(props: Interfaces.LifecycleProps<Interfaces.AIComponentProps>) {
  const { data, encoding } = props.customProps!;
}
```

`AIComponentProps` 字段：

- `data.values` — 行数组
- `encoding` — 槽位 key → 列名数组
- `dispatch?` — 交互出口：
  - `select` 传 `{ type: 'select', payload: { dataIndex, channel? } }`：`dataIndex` 是选中行在 `data.values` 中的下标（组件内部排序/聚合后仍要换回原行下标），`channel` 是点击落在哪个槽位（值为 `schema.properties.encoding` 的属性名）
  - `cancelSelect` / `cancelDrill` / `cancelLinkage` 不带 payload

`select` 的两个字段只是**点击适配信息**：宿主拿它定位下钻来源。组件不上报也不感知任何**位置索引**，那是宿主运行时的内部值，不进报表配置；组件也不需要知道业务上要钻到哪一层。不带 `channel` 的行级 select 保留联动用途。路径推进、菜单、状态、父级过滤与取数全由宿主负责，组件只需按新传下来的 `encoding` / `data` 重画。

组件自行 `ResizeObserver` 管理尺寸。externals 规则见 `references/externals.md`。

## 步骤 4：本地调试

### 4.1 生成 usable mock（首次调试 / 改 externals 后必做）

根据 `qbi.config.ts` 的 `externals` 和 `devServer` 配置，生成 `public/api/v2/abi/components/usable`。该文件是**本地调试 mock**：devServer 将它作为静态文件透出，调试 spec 通过 `custom_components_api` 读取它加载本地产物；其路由与蛇形字段不代表线上接口契约。

生成规则：

1. 读 `qbi.config.ts` 的 `devServer`（默认 `https://127.0.0.1:8001`）拼出 `host`
2. 读 `externals` 中的非宿主内置库，为每个生成 `external_assets` 条目（CDN url 规则见 `references/externals.md`「第三方 external_assets」节）
3. `component_id` 固定为 `"mock"`（与调试 spec 的 `component_ref` 一致）
4. `assets` 的 url **必须写绝对路径**（`{host}/main.js`），相对路径会解析到主应用 origin 导致加载失败
5. 文件名是 `usable`，**不带 `.json` 扩展名**（需匹配线上 API 路径 `/api/v2/abi/components/usable`）

> 以下示例中 `{devServerOrigin}` = 从 `qbi.config.ts` 的 `devServer` 配置拼出的完整 origin（如 `https://{host}:{port}`，默认 `https://127.0.0.1:8001`）。**禁止写死，必须动态读取 `qbi.config.ts`。**

```json
{
  "success": true,
  "data": {
    "components": [
      {
        "component_id": "mock",
        "name": "本地调试组件",
        "desc": "",
        "assets": {
          "js": "{devServerOrigin}/main.js",
          "meta_js": "{devServerOrigin}/meta.js",
          "css": "{devServerOrigin}/main.css"
        },
        "external_assets": [],
        "meta_json": {},
        "revision": "local",
        "thumbnail_url": null
      }
    ]
  }
}
```

> `external_assets` 根据实际 externals 填充，无第三方库时为空数组。模板脚手架**不自带此文件**，由 agent 在首次调试前生成。

### 4.2 启动前自检 + 启动 devServer

启动前必须逐项核对，任一失败都不应启动：

1. **工程结构完整**：存在 `package.json`、`src/meta.ts`、`src/index.ts`、`qbi.config.ts`。
2. **`src/meta.ts` 已声明 `schema.properties.encoding`**，且每个槽位都有 `qbi:fieldType`。
3. **`qbi.config.ts` 的 `devServer` 保持 https**，未显式降级为 `http`。
4. **`qbi.config.ts` 的 `externals` 已正确声明**：
   - 宿主内置库 `react`、`react-dom`、`lodash`、`moment` 可声明为 external；
   - 第三方库（如 `echarts`）声明为 external 时，必须在 `public/api/v2/abi/components/usable` 的 `external_assets` 中提供 CDN url；
   - Quick BI SDK 必须打入产物，不得配置为 external。
5. **Node 版本 ≥ 22.20.0**（qdt 的 `engines` 硬性要求，低版本会直接报错）。
6. **首次调试 / 改 externals 后**，`public/api/v2/abi/components/usable` 已按 4.1 节生成。

```bash
npm run start   # 启动 devServer（host:port 以 qbi.config.ts 中的 devServer 配置为准）
```

devServer 透出以下内容供渲染侧读取：

| 路径                            | 来源                                                              | 说明                           |
| ------------------------------- | ----------------------------------------------------------------- | ------------------------------ |
| `/main.js`                      | `qbi.config.ts` 的 `BIComponent: './src/index.ts'` entry         | 组件 UMD 产物                  |
| `/meta.js`                      | `qbi.config.ts` 的 `BIComponentMeta: './src/meta.ts'` entry      | 组件数据契约                   |
| `/main.css`                     | `src/index.ts` 依赖链导入的样式                                  | 组件样式（可选）               |
| `/api/v2/abi/components/usable` | `public/api/v2/abi/components/usable` 静态 mock                  | 本地调试组件清单               |

启动后先用浏览器访问 `{devServerOrigin}`（从 `qbi.config.ts` 的 `devServer` 读取）并**接受 HTTPS 自签证书**，否则 QBI 页面 fetch 组件产物时会被浏览器拦截。

> **改端口/host 同步清单**：如果修改了 `qbi.config.ts` 的 `devServer.port` 或 `devServer.host`，以下三处必须同步更新：
>
> 1. `public/api/v2/abi/components/usable` — 所有 `assets` URL 中的 host:port
> 2. 调试 spec 中 `ui.custom_components_api` 的 URL
> 3. 浏览器接受证书的地址

### 4.3 构造调试 spec

1. 用 `quickbi-mcp:recall_assets` 召回候选数据集，只取 `asset_type` 为 `dataset` 的数据集，其 `origin_asset_id`（即 cubeId）用作 `data_sources[].id`；再用 `quickbi-mcp:get_cube_meta` 按 cubeId 取权威字段清单（`name` / `role` / `granularity`），字段实名与层级粒度以此为准
2. 根据 `src/meta.ts` 的 `schema.properties.encoding` 选择合适的维度/度量字段
3. 构造 DashboardSpec（注意 ID 前缀公约、dimensions/measures 必须是对象数组）：

```json
{
  "title": "本地调试-<组件名>",
  "version": "1.0.0",
  "data_sources": [{ "kind": "dataset", "id": "<origin_asset_id>", "title": "<数据集名>" }],
  "analyses": [
    {
      "id": "q_debug",
      "query": {
        "dataset_ref": "<数据集名>",
        "dimensions": [{ "field": "<维度字段名>" }],
        "measures": [{ "field": "<度量字段名>", "aggregate": "SUM" }]
      }
    }
  ],
  "ui": {
    "kind": "dashboard",
    "custom_components_api": "{devServerOrigin}/api/v2/abi/components/usable",
    "components": [
      {
        "id": "cmp_debug",
        "type": "custom",
        "component_ref": "mock",
        "analysis_ref": "q_debug",
        "encoding": { "<槽位 key>": "<字段名>" },
        "interaction": {
          "drill": { "channel": "<meta.interaction.drill.channels 中的槽位 key>", "path": ["<当前绑定的维度字段>", "<下级维度字段>"] }
        }
      }
    ],
    "layout": { "grid_column": 24, "items": [{ "component_id": "cmp_debug", "x": 0, "y": 0, "w": 24, "h": 12 }] }
  }
}
```

**spec 要点**：

- `custom_components_api` — 由 `qbi.config.ts` 的 `devServer` 配置拼接而成：`https://{host}:{port}/api/v2/abi/components/usable`（默认 `https://127.0.0.1:8001/api/v2/abi/components/usable`）。渲染层从该地址拉取组件列表而非后端 API。该字段不在 DashboardSpec schema 中定义（纯调试用途），运行时从原始对象读取。**上传后务必删除此字段**。
  > 该字段会导致 `check_spec` 在 `spec_rules` 段报 error，属于预期行为，无需据此认为 spec 写错。
- `component_ref` — 必须与 `public/api/v2/abi/components/usable` 里的 `component_id` 一致（模板默认均为 `"mock"`）。渲染层通过此 ID 从 mock 接口返回的组件列表中匹配到对应组件的 asset URL
- `dataset_ref` 引用 `data_sources[].title`（不是 id）
- `dimensions`/`measures` 是**对象数组**：`[{ "field": "字段名" }]`，不是字符串
- `encoding` 值是**字符串或字符串数组**（spec 层），平台会归一化为 `string[]` 传给组件 props。单字段写字符串 `"销售额"`，多字段写数组 `["销售额", "利润"]`
- `interaction.drill` — 只在验证下钻时写，写法与内置编码图表完全相同：`channel` 是列入 `meta.interaction.drill.channels` 的槽位 key，`path[0]` 必须是该槽位当前绑定的维度字段，后续项是要钻下去的下级维度。该对象只接受 `channel` / `path`，**写位置索引之类字段会直接报错**。一个合法维度来源就能验证，不需要为演示凑多字段、多通道或非零位置；多位置 / 跳通道 / 重名属于公共测试矩阵，按组件实际结构覆盖即可
- ID 前缀：分析单元 `q_`、组件 `cmp_`
- 时间维度带 `granularity`（如 `{ "field": "订单日期", "granularity": "year-month" }`）

**ID 对应关系**（三处必须一致）：

| 位置                                  | 字段               | 默认值   |
| ------------------------------------- | ------------------ | -------- |
| `public/api/v2/abi/components/usable` | `component_id`     | `"mock"` |
| 调试 spec `ui.components[]`           | `component_ref`    | `"mock"` |
| 上传后替换为                          | 真实 `componentId` | —        |

### 4.4 生成预览链接

```
quickbi-mcp:create_preview({ spec, title }) → { url, artifact_id, embed }
```

### 4.5 打开本地调试链接（必做）

在 create_preview 返回的 url 后拼接 `?useComponent=local`（已有 query 则用 `&`），用 `open` 打开。渲染层会：

1. 请求 `custom_components_api` 指定的地址 → 拿到 mock 组件列表
2. 用 `component_ref`（`"mock"`）匹配到对应组件的 asset URL（`{devServerOrigin}/main.js` 等）
3. 直接加载本地产物渲染

**等用户确认效果**。devServer 必须处于运行状态。

组件声明了 `interaction.drill.channels` 时，按**内置图表同一份**下钻验收跑一遍：菜单与预检查、下钻/继续下钻/上钻/取消、面包屑、与联动的协作、维度替换后的数据一致性。只额外看两件 custom 特有的事：本地 `meta.js` 的能力声明有没有装进来（没装则菜单里根本不出现下钻项）、点击桥有没有把 `channel` 上报对（点不同槽位看下钻来源是否落在预期字段）。不为 custom 另立操作面板或业务验收规则。

### 4.6 调试迭代

| 用户反馈     | 动作                                                      |
| ------------ | --------------------------------------------------------- |
| 要改         | 改代码 → 等 devServer 重新构建 → **手动刷新浏览器**（qdt 内置 `hot: false`） |
| OK，可以上线 | 进入步骤 5 上传                                           |
| 方案不对     | 回步骤 1                                                  |

## 步骤 5：上传发布

调试通过后，构建正式产物并上传到平台。

### 5.1 构建 + 打包

```bash
npm run build    # → dist/main.js + dist/meta.js + dist/main.css（可选）+ dist/package.json（qdt 自动生成）
npm run bundle   # → 工程根目录/{name}-{version}.zip（qdt 打包 dist/ 的全部直接子项）
```

构建后必须逐项核对，任一失败都不应进入上传：

1. **`dist/main.js` 与 `dist/meta.js` 存在且非空**。
2. **`dist/` 下只有 qdt bundle 预期产物**：`main.js`、`meta.js`、`main.css`（可选）、`package.json`（qdt 自动生成）。不应出现源码、临时文件或其他多余内容。
3. **产物总体积 ≤ 10MB**；若超出，检查是否漏写第三方库 externals。
4. **`dist/meta.js` 与 `src/meta.ts` 的槽位 key 一致**：读取 `src/meta.ts` 中 `schema.properties.encoding` 的属性名，确认这些字符串都出现在 `dist/meta.js` 中，否则是旧产物，需重新 `npm run build`。
5. **槽位能力与点击上报已进产物**：`src/meta.ts` 根级 `interaction.drill.channels` 列出的槽位 key，`dist/meta.js` 里也能找到该声明；且 `dist/main.js` 含对应的 `channel` 上报。能力只认产物，漏构建会让报表侧直接配不出下钻。

> `qdt bundle` 不会再次构建；它会归档 `dist/` 的每个直接子项，所以不要往 `dist/` 放额外文件。zip 文件名来自 `package.json` 的 `name-version`。`dist/package.json` 由 qdt 自动生成并随 zip 上传，无需处理。

### 5.2 上传

`package_base64` 必须由脚本/程序读取 `npm run bundle` 产出的 zip 并转 base64 后传入，见 `references/mcp-api.md`「大产物 base64 传输」节。`external_assets` 来源：

- **走过步骤 4**：取 `public/api/v2/abi/components/usable` 里 `data.components[0].external_assets`
- **直接上传（未走步骤 4）**：读 `qbi.config.ts` 的 `externals`，剔除宿主内置的 `react`、`react-dom`、`lodash`、`moment`，剩余库按 `references/externals.md`「第三方 external_assets」节的 CDN url 规则生成条目；若无第三方库则传空数组。Quick BI SDK 必须打入产物，不能配置为 external

仅传非宿主内置的第三方库：

```
quickbi-mcp:register_custom_component({
  name,
  package_base64,        // zip 文件的 base64 编码
  package_file_name,     // zip 文件名，强烈建议传（见下）
  desc,
  external_assets        // 仅非宿主第三方库；SDK 不得 externalize
})
→ componentId + jsUrl + metaJsUrl（上传即生效）
```

### 5.3 更新已有组件

```
quickbi-mcp:update_custom_component({
  component_id,
  package_base64,       // 省略不更新产物，传了才切 revision
  package_file_name,    // 同上传，换包时一并传
  desc,                 // 省略保留现值
  external_assets       // 省略保留现值
})
→ 合并语义，revisionChanged 标识是否切了版本
```

**关于 `package_file_name`**：它在 MCP schema 里不是必填项，但不传平台会把文件名记为 `package.zip`。始终传 `npm run bundle` 产出的 `{name}-{version}.zip`。

### 5.4 打开线上公开链接（必做）

上传成功拿到 `componentId` 后，修改调试 spec：

1. **删除** `ui.custom_components_api`（不再走本地 mock，改走后端 API）
2. 将 `component_ref` 从 `"mock"` 改为真实 `componentId`

```
quickbi-mcp:create_preview({ spec, title }) → 线上公开链接
```

用 `open` 打开线上公开链接，**等用户确认线上效果**。此链接从平台 CDN 加载组件产物，不依赖本地 devServer，可直接分享给任何人。

> 如果线上效果有问题，回步骤 3 改代码，再走 5.1→5.4 重新上传，然后重新生成链接确认。

## MCP 接入异常

`quickbi-mcp` MCP server 不可用、连接失败或鉴权失败时，返回步骤 0，按 `references/setup.md` 重新完成配置后再重试原操作。不得写死域名、逐项索取 AK/SK 或回显用户提供的鉴权信息。

## 常见故障

| 现象                                                                 | 原因                                                                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `npm install` 报 `ETARGET No matching version`                       | 当前源上没有模板声明的 SDK 版本。带 `--registry=https://registry.npmjs.org` 重装；官方源也没有才记录 `npm view` 结果并请用户联系维护者，不要自行替换、降级或混用 SDK 版本 |
| 组件区域报「外部依赖加载失败: xxx 没有资源地址：接口层未提供 url」       | `external_assets` 条目漏了 `url`。每个非宿主内置库（包括 echarts）都必须带 CDN url，规则见 `references/externals.md`；用 update 接口只传 `external_assets` 即可补齐，不会切 revision |
| 组件空白不报错                                                       | `external_assets` 误写宿主内置的 react / react-dom / lodash / moment，或 SDK 被错误地配置为 external                              |
| 字段变化后永久空白                                                   | 条件 return 换掉了图表容器 div                                                                                                          |
| Vanilla 组件卸载后资源未清理                                         | 当前 Vanilla wrapper 调用实例的 `umount(props)`；清理逻辑写在 `unmount` 不会被调用                                                     |
| 改完没生效                                                           | qdt 内置 `hot: false`（产物是被平台页拉进去的 UMD 外部脚本，无法热替换）；等 devServer 重建完成后手动刷新浏览器                            |
| 改完线上产物没生效                                                   | 没传 package_base64（不换包不切 revision）                                                                                              |
| 平台显示文件名 `package.zip`                                         | 上传/更新时没传 `package_file_name`，必须传 bundle 产出的 zip 文件名                                                                    |
| 产物体积偏大                                                         | 图表库漏写 externals                                                                                                                    |
| 本地调试 `ERR_CERT_AUTHORITY_INVALID`                                | HTTPS 自签证书未信任，先浏览器打开 `{devServerOrigin}`（从 `qbi.config.ts` 读取）接受证书                                               |
| 本地调试 `ERR_EMPTY_RESPONSE`                                        | devServer 未启动或证书未接受                                                                                                            |
| CORS 报错 `Permission was denied for this request to access the 'loopback' address space` | 不是缺 CORS 头（qdt devServer 已自带 `Access-Control-Allow-Origin` 回显与 `Access-Control-Allow-Private-Network`）。实测：同一页面下 https 打 loopback 返 200，换成 http 就报这条 —— 因此该报错意味着请求走了 `http://`，而 devServer 只听 https。它总与 `ERR_CERT_AUTHORITY_INVALID` 同根（自签证书未信任）：先浏览器打开 `{devServerOrigin}` 接受自签证书再硬刷，两条会一起消失 |
| 本地调试组件空白                                                     | `public/api/v2/abi/components/usable` 缺失或 external_assets 中 url 错误                                                                |
| 报表侧配不出下钻 / 点击没有下钻入口                                | 根级 `interaction.drill.channels` 未列出有效维度槽位 key、声明了过滤或纯度量槽位、点击需区分槽位却没带 `channel`，或线上装的是不含声明的旧产物：前三项按 `references/meta-and-coding.md`「下钻能力」与「select」节的声明与上报口径纠正，后者重新构建并上传产物 |
| `npx create-qbi-app` 报 `Unknown option --registry`                   | `--registry` 错放在包名之后，被当作 CLI 参数。必须放在包名之前：`npx -y --registry=<url> create-qbi-app@latest <name> --template ai-chart-react-ts` |
| `npx create-qbi-app` 找不到 `ai-chart-*` 模板                        | 当前源拉到的是不含 AI 模板的旧版（表现为传 `--template` 后静默回退交互选择）。按步骤 2 带 `--registry=https://registry.npmjs.org` 重跑，官方源的 `create-qbi-app@latest` 含 `ai-chart-react-ts` 与 `ai-chart-vanilla-ts` |

## 参考文件

- `references/plan-template.md` — 计划模板
- `references/chart-libs.md` — 图表库选型与配方
- `references/meta-and-coding.md` — 契约与组件实现
- `references/setup.md` — MCP 安装与配置
- `references/mcp-api.md` — MCP 接口
- `references/externals.md` — externals 规则

