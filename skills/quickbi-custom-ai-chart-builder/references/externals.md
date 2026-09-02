# 外部依赖声明：externals 与 external_assets

> **何时读**：声明第三方图表库、还原线上组件依赖、或排查组件空白与预览白屏时。

`qbi.config.ts` 的 `externals` 控制构建时不打包哪些依赖；注册参数与本地 usable mock 的 `external_assets` 告诉宿主如何加载第三方依赖。两者必须对齐。

## 模板预置与 SDK

当前 AI 图表模板预置以下宿主内置 externals：

```ts
externals: {
  lodash: '_',
  react: 'React',
  'react-dom': 'ReactDOM',
  moment: 'moment',
},
```

这些宿主全局变量不写入 `external_assets`。`@quickbi/bi-open-sdk` 与 `@quickbi/bi-open-react-sdk` 也不应写入 `externals`：qbi-dev-tools 会拒绝把 bi-open 系列 SDK 外部化，SDK 必须参与组件 bundle。

`styled-components` 不在当前模板的宿主内置列表中；只有在平台契约明确提供它时才可作为宿主全局变量使用，否则按第三方库处理。

## externals 写法

`defineConfig` 将 `externals` 传递给 Rspack，不会把字符串自动展开成 CommonJS、AMD 与 root 的多目标映射。默认 Rspack 配置下，字符串值代表运行时浏览器全局：

```ts
externals: {
  echarts: 'echarts',
  'vega-embed': 'vegaEmbed',
},
```

右侧 global 必须与实际加载脚本暴露的全局变量一致。需要多环境 UMD 映射时，显式配置 Rspack 的 external 对象，而不是依赖字符串自动转换。

## 第三方 external_assets

每个非宿主内置、非 SDK 的 external 都必须有对应的 `external_assets` 条目，且**条目必须带 `url`**：

| 依赖 | `externals` | `external_assets` |
| --- | --- | --- |
| ECharts | `{ echarts: 'echarts' }` | `[{ name: 'echarts', global: 'echarts', url: 'https://cdn.jsdelivr.net/npm/echarts@<package.json 版本>/dist/echarts.min.js' }]` |
| Vega Embed | `{ 'vega-embed': 'vegaEmbed' }` | `[{ name: 'vega-embed', global: 'vegaEmbed', url: 'https://cdn.jsdelivr.net/npm/vega-embed@<package.json 版本>/build/vega-embed.min.js' }]` |
| React / lodash / moment | 模板已有映射 | 不写 |
| Quick BI SDK | 不写入 externals | 不写 |

url 生成规则：已知入口路径的库写精确路径（如 `echarts@6.1.0/dist/echarts.min.js`），其余用 `https://cdn.jsdelivr.net/npm/{name}@{version}`。版本从 package.json 或 lockfile 取精确值，不要用 `latest`，也不要猜路径。

漏 `url` 的表现：组件区域显示「自定义组件加载失败：外部依赖加载失败: `<name>`: `<global>` 没有资源地址：接口层未提供 url，且它不是沙箱内置模块」。注册与更新两个接口都按此规则校验，`echarts` 也不例外。

## usable mock

`public/api/v2/abi/components/usable` 是 devServer 静态透出的**本地 mock**。它必须与调试 DSL 的 `ui.custom_components_api` 完全一致，但其路由和蛇形字段不构成线上接口契约。

模板不自带该文件。首次平台本地调试前，根据 qbi.config.ts 生成：

- assets URL 使用 qbi.config.ts 的完整 HTTPS origin，例如 `{devServerOrigin}/main.js`。
- `component_id` 固定为 `mock`，与 DSL 的 `component_ref` 对齐。
- `external_assets` 只包含第三方 externals；无第三方库时为空数组。
- 改端口、host 或 externals 后同步更新 mock。

`public/index.html` 只是 devServer 着陆页，不参与组件渲染。

## 还原线上组件依赖

仅使用平台详情响应中实际返回的 `externalAssets` 字段，元素形状是 `{ name, global, url }`；不要依赖或推断 `version` 字段。

若响应没有版本号，优先从组件 source archive、原工程 package.json 或 lockfile 恢复版本；没有证据时不要安装 `latest`。生产 usable 路径、字段命名与 `externalAssets` 是否提供版本，需要以平台响应或后端/渲染器实现为准。
