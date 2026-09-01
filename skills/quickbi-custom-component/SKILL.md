---
name: quickbi-aipro-chart-builder
description: 开发 QuickBI AI Pro 仪表板自定义组件：脚手架新建、构建打包、注册上传。
---

# QuickBI AI Pro 自定义组件开发

## 意图路由

| 用户意图   | 执行步骤   | 参考文件                                        |
| ---------- | ---------- | ----------------------------------------------- |
| 从零新建   | 1→2→3→4→5  | `refs/chart-libs.md`、`refs/meta-and-coding.md` |
| 本地调试   | 4          | —                                               |
| 只注册上传 | 5          | `refs/mcp-api.md`                               |
| 查字段写法 | —          | `refs/meta-and-coding.md`                       |
| 排查空白   | 见常见故障 | `refs/externals.md`                             |

意图不明确时先问。

## 步骤 1：需求澄清

读 `refs/plan-template.md`，产出 `PLAN.md`，等用户确认后再动手。

选型：简单图形→纯 CSS；标准图表→echarts（预置库）；其他→写明理由。参考 `refs/chart-libs.md`。

## 步骤 2：脚手架

```bash
# React 版
npx create-qbi-app@latest <组件名> --template ai-chart-react-ts
# Vanilla 版
npx create-qbi-app@latest <组件名> --template ai-chart-vanilla-ts

cd <组件名> && npm install
```

> **注意**：`ai-chart-*` 模板尚未随 `create-qbi-app` 发布到 npm。如果 `npx` 报 `Expect the framework name to be within ...` 错误，说明安装的是旧版。此时改用 x

`create-qbi-app` 会自动将 `package.json` 的 `name` 设为项目名。脚手架**不会自动执行 `npm install`**，用户必须手动运行。写入 `PLAN.md`。后续所有命令均在组件目录下执行。

## 步骤 3：编码

先查 `refs/chart-libs.md` 有无现成配方。

核心契约（详见 `refs/meta-and-coding.md`）：

**meta.ts** — 类型 `AICustomComponentMeta`，核心字段 `dataSchema`（area 的 `description` 建议写，帮助 AI 召回）。必须用 `defineMeta` 包裹导出：

```ts
import type { Interfaces } from '@quickbi/bi-open-react-sdk'; // Vanilla 版用 '@quickbi/bi-open-sdk'
import { defineMeta } from '@quickbi/bi-open-react-sdk'; // Vanilla 版用 '@quickbi/bi-open-sdk'

export default defineMeta<Interfaces.AICustomComponentMeta>({
  dataSchema: {
    areas: [
      {
        id: 'area_row',
        name: '维度',
        description: '分类轴',
        queryAxis: 'row',
        rule: { required: true, maxColNum: 1, fieldTypes: ['dimension'] },
      },
      {
        id: 'area_column',
        name: '度量',
        description: '数值字段',
        queryAxis: 'column',
        rule: { required: true, maxColNum: 3, fieldTypes: ['measure'] },
      },
    ],
  },
});
```

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
- `encoding` — 区域 id → 列名数组
- `dispatch?` — 交互出口（`select` / `cancelSelect` / `cancelDrill` / `cancelLinkage`）

组件自行 `ResizeObserver` 管理尺寸。externals 规则见 `refs/externals.md`。

## 步骤 4：本地调试

### 4.1 生成 usable mock（首次调试 / 改 externals 后必做）

根据 `qbi.config.ts` 的 `externals` 和 `devServer` 配置，生成 `public/api/v2/abi/components/usable`。此文件是线上 usable 接口的本地替身——devServer 将其作为静态文件透出，渲染层本地调试时读它获取组件资源地址和 external_assets。

生成规则：

1. 读 `qbi.config.ts` 的 `devServer`（默认 `https://127.0.0.1:8001`）拼出 `host`
2. 读 `externals` 中的非沙箱内置库，为每个生成 `external_assets` 条目（CDN url 规则见 `refs/externals.md` §3）
3. `component_id` 固定为 `"mock"`（与调试 DSL 的 `component_ref` 一致）
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

### 4.2 预检 + 启动 devServer

```bash
node <skill_dir>/scripts/preflight.mjs   # 校验项目结构、meta.ts、externals 对齐
npm run start                             # 启动 https://127.0.0.1:8001
```

> `<skill_dir>` 是本 SKILL 所在目录。预检失败时根据报错修复后再启动。

devServer 透出以下内容供渲染侧读取：

| 路径                            | 来源                                                              | 说明                           |
| ------------------------------- | ----------------------------------------------------------------- | ------------------------------ |
| `/main.js`                      | rspack 编译（`src/index.ts` entry）                               | 组件 UMD 产物                  |
| `/meta.js`                      | rspack 编译（`src/meta.ts`，`qdt` 自动识别，无需在 entry 中声明） | 组件数据契约                   |
| `/main.css`                     | rspack 从 BIComponent entry 中 import 的 `.scss` 提取             | 组件样式（可选）               |
| `/api/v2/abi/components/usable` | `public/api/v2/abi/components/usable` 静态文件（步骤 4.1 生成）   | 本地替身：模拟线上 usable 接口 |

启动后先用浏览器访问 `{devServerOrigin}`（从 `qbi.config.ts` 的 `devServer` 读取）并**接受 HTTPS 自签证书**，否则 QBI 页面 fetch 组件产物时会被浏览器拦截。

> **改端口/host 同步清单**：如果修改了 `qbi.config.ts` 的 `devServer.port` 或 `devServer.host`，以下三处必须同步更新：
>
> 1. `public/api/v2/abi/components/usable` — 所有 `assets` URL 中的 host:port
> 2. 调试 DSL 中 `ui.custom_components_api` 的 URL
> 3. 浏览器接受证书的地址

### 4.3 构造调试 DSL

1. 用 `quickbi:recall_assets` 召回数据集，拿到 `origin_asset_id`（即 cubeId）和字段列表
2. 根据 `src/meta.ts` 的 `dataSchema.areas` 选择合适的维度/度量字段
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
        "encoding": { "<area_id>": "<字段名>" }
      }
    ],
    "layout": { "grid_column": 24, "items": [{ "component_id": "cmp_debug", "x": 0, "y": 0, "w": 24, "h": 12 }] }
  }
}
```

**DSL 要点**：

- `custom_components_api` — 由 `qbi.config.ts` 的 `devServer` 配置拼接而成：`https://{host}:{port}/api/v2/abi/components/usable`（默认 `https://127.0.0.1:8001/api/v2/abi/components/usable`）。渲染层从该地址拉取组件列表而非后端 API。该字段不在 bi-dsl schema 中定义（纯调试用途），运行时从原始对象读取。**注册上线后务必删除此字段**
- `component_ref` — 必须与 `public/api/v2/abi/components/usable` 里的 `component_id` 一致（模板默认均为 `"mock"`）。渲染层通过此 ID 从 mock 接口返回的组件列表中匹配到对应组件的 asset URL
- `dataset_ref` 引用 `data_sources[].title`（不是 id）
- `dimensions`/`measures` 是**对象数组**：`[{ "field": "字段名" }]`，不是字符串
- `encoding` 值是**字符串或字符串数组**（DSL 层），平台会归一化为 `string[]` 传给组件 props。单字段写字符串 `"销售额"`，多字段写数组 `["销售额", "利润"]`
- ID 前缀：分析单元 `q_`、组件 `cmp_`
- 时间维度带 `granularity`（如 `{ "field": "订单日期", "granularity": "year-month" }`）

**ID 对应关系**（三处必须一致）：

| 位置                                  | 字段               | 默认值   |
| ------------------------------------- | ------------------ | -------- |
| `public/api/v2/abi/components/usable` | `component_id`     | `"mock"` |
| 调试 DSL `ui.components[]`            | `component_ref`    | `"mock"` |
| 注册后替换为                          | 真实 `componentId` | —        |

### 4.4 生成预览链接

```
quickbi:create_preview({ spec, title }) → { url, artifactId }
```

### 4.5 打开本地调试链接（必做）

直接用 `open` 打开 create_preview 返回的 url，**无需拼接额外 URL 参数**。DSL 中的 `custom_components_api` 已告知渲染层从本地 devServer 拉取组件，渲染层会：

1. 请求 `custom_components_api` 指定的地址 → 拿到 mock 组件列表
2. 用 `component_ref`（`"mock"`）匹配到对应组件的 asset URL（`{devServerOrigin}/main.js` 等）
3. 直接加载本地产物渲染

**等用户确认效果**。devServer 必须处于运行状态。

### 4.6 调试迭代

| 用户反馈     | 动作                                        |
| ------------ | ------------------------------------------- |
| 要改         | 改代码 → 刷新浏览器即可（devServer 热更新） |
| OK，可以上线 | 进入步骤 5 注册                             |
| 方案不对     | 回步骤 1                                    |

### 4.7 常见调试问题

见底部「常见故障」表。

## 步骤 5：注册上传

调试通过后，构建正式产物并注册到平台。

### 5.1 构建 + 打包

```bash
npm run build    # → dist/main.js + dist/meta.js + dist/main.css(可选)
node <skill_dir>/scripts/verify-build.mjs  # 校验产物完整性、体积、externals
npm run bundle   # → 工程根目录/{name}-{version}.zip（白名单：main.js + meta.js + main.css）
```

> `<skill_dir>` 是本 SKILL 所在目录。verify-build 失败时根据报错修复后再 bundle。zip 文件名来自 `package.json` 的 `name-version`。

### 5.2 注册

将 bundle 产出的 zip 读取为 base64 字符串，连同 `external_assets` 一起传入。`external_assets` 来源：

- **走过步骤 4**：取 `public/api/v2/abi/components/usable` 里 `data.components[0].external_assets`
- **直接注册（未走步骤 4）**：读 `qbi.config.ts` 的 `externals`，剔除沙箱内置库（react / react-dom / lodash / moment / styled-components / SDK），剩余库按 `refs/externals.md` §3 的 CDN url 规则生成条目；若无第三方库则传空数组

剔除沙箱内置库后传入：

```
quickbi:register_custom_component({
  name,
  package_base64,        // zip 文件的 base64 编码
  package_file_name,     // ⚠️ 必传！用 bundle 产出的 zip 文件名，否则平台记录为 "package.zip"
  desc,
  external_assets        // 沙箱内置库不传（react/lodash/moment/styled-components/SDK）
})
→ componentId + jsUrl + metaJsUrl（上传即生效，无需 release）
```

### 5.3 更新已有组件

```
quickbi:update_custom_component({
  component_id,
  package_base64,       // 省略不更新产物，传了才切 revision
  package_file_name,    // ⚠️ 同注册，必传正确文件名
  desc,                 // 省略保留现值
  external_assets       // 省略保留现值
})
→ 合并语义，revisionChanged 标识是否切了版本
```

**关键**：`package_file_name` 必须传 `npm run bundle` 产出的 zip 文件名（`{name}-{version}.zip`），不传则平台默认记录为 `package.zip`。

### 5.4 打开线上公开链接（必做）

注册成功拿到 `componentId` 后，修改调试 DSL：

1. **删除** `ui.custom_components_api`（不再走本地 mock，改走后端 API）
2. 将 `component_ref` 从 `"mock"` 改为真实 `componentId`

```
quickbi:create_preview({ spec, title }) → 线上公开链接
```

用 `open` 打开线上公开链接，**等用户确认线上效果**。此链接从平台 CDN 加载组件产物，不依赖本地 devServer，可直接分享给任何人。

> 如果线上效果有问题，回步骤 3 改代码，再走 5.1→5.4 重新上传，然后重新生成链接确认。

## MCP 配置

```json
{
  "mcpServers": {
    "quickbi": {
      "url": "http://11.163.57.195/mcp",
      "type": "http",
      "headers": {
        "x-quickbi-server-domain": "https://<环境域名>",
        "x-quickbi-api-key": "<AK>",
        "x-quickbi-api-secret": "<SK>"
      }
    }
  }
}
```

agent 不索取、不回显凭证。

## 常见故障

| 现象                                                                 | 原因                                                                                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm install` 报 `ETARGET No matching version`                       | 模板 `package.json` 中的 SDK 版本尚未发布（如 `^3.0.4` 但最新只有 `3.0.3`）。用 `npm view <包名> versions` 查实际版本后手动修正 |
| `qdt` 报 `ERR_MODULE_NOT_FOUND ... node_modules/dist/cli.cjs`        | 模板目录中残留了 `node_modules/`，脚手架复制时符号链接变成普通文件。删除项目 `node_modules/` 后重新 `npm install` 即可修复      |
| `npx create-qbi-app` 报 `Expect the framework name to be within ...` | npm 上的 `create-qbi-app` 版本尚未包含 `ai-chart-*` 模板，改用 monorepo 内本地 CLI（见步骤 2 注意事项）                         |
| 组件空白不报错                                                       | external_assets 误写沙箱内置库（react/lodash/moment 等）                                                                        |
| 字段变化后永久空白                                                   | 条件 return 换掉了图表容器 div                                                                                                  |
| 改完没生效                                                           | 没传 package_base64（不换包不切 revision）                                                                                      |
| 平台显示文件名 `package.zip`                                         | 注册/更新时没传 `package_file_name`，必须传 bundle 产出的 zip 文件名                                                            |
| 产物体积偏大                                                         | 图表库漏写 externals                                                                                                            |
| 本地调试 `ERR_CERT_AUTHORITY_INVALID`                                | HTTPS 自签证书未信任，先浏览器打开 `{devServerOrigin}`（从 `qbi.config.ts` 读取）接受证书                                       |
| 本地调试 `ERR_EMPTY_RESPONSE`                                        | devServer 未启动或证书未接受                                                                                                    |
| CORS 报错                                                            | devServer 需 `Access-Control-Allow-Origin: *`                                                                                   |
| 本地调试组件空白                                                     | `public/api/v2/abi/components/usable` 缺失或 external_assets 中 url 错误                                                        |

## 参考文件

- `refs/plan-template.md` — 计划模板
- `refs/chart-libs.md` — 图表库选型与配方
- `refs/meta-and-coding.md` — 契约与组件实现
- `refs/mcp-api.md` — MCP 接口
- `refs/externals.md` — externals 规则
- `scripts/preflight.mjs` — 构建前预检
- `scripts/verify-build.mjs` — 构建后校验
