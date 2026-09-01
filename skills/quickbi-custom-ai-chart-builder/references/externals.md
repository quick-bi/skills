# 外部依赖声明：externals 与 external_assets

> **何时读**：声明第三方图表库、拉取线上组件还原依赖、或排查「组件空白不报错 / 预览白屏」时。

`qbi.config.ts` 的 `externals` 决定编译产物里如何 `require` 依赖，`external_assets`（注册接口字段）告诉宿主怎么加载依赖。两者必须对齐，且**沙箱内置库不能进 `external_assets`**。

## 1. externals 写法：字符串简写即可

第三方库（echarts、d3、vega 等）在 `qbi.config.ts` 的 `externals` 中声明，不打进编译产物。SDK（`@quickbi/bi-open-sdk`）是宿主内置模块，无需声明。两个模板均已预置 react/react-dom/lodash/moment 在 externals 中（沙箱内置库，不打包）。

**用字符串简写**，构建工具会自动展开为完整语义：

```ts
externals: {
  'vega-embed': 'vegaEmbed',   // 左侧包名，右侧浏览器全局名
}
```

展开后 `commonjs`/`amd` 用**包名**、`root` 用**全局名**，于是 UMD 产物里是 `require("vega-embed")`，与 `externalAssets[].name` 对得上，宿主沙箱才能解析到。

> 字符串简写由 `defineConfig` 自动展开为完整形式，无需手写 `{ root, commonjs, commonjs2, amd }`。

## 2. external_assets 只写「宿主沙箱没内置的」

⚠️ **不要把宿主沙箱已内置的库写进 `external_assets`**：

- `react`
- `react-dom`
- `lodash`
- `moment`
- `styled-components`
- `@quickbi/bi-open-sdk`
- `@quickbi/bi-open-react-sdk`

这些库宿主沙箱已内置，写进去会导致组件渲染为空白。

## 3. externals ↔ external_assets 对照

| 场景                        | `qbi.config.ts` externals       | `external_assets`                                                                                                             |
| --------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 用 echarts                  | `{ echarts: 'echarts' }`        | `[{ name: 'echarts', global: 'echarts', url: 'https://cdn.jsdelivr.net/npm/echarts@5.4.0/dist/echarts.min.js' }]`             |
| 用非内置库（如 vega-embed） | `{ 'vega-embed': 'vegaEmbed' }` | `[{ name: 'vega-embed', global: 'vegaEmbed', url: 'https://cdn.jsdelivr.net/npm/vega-embed@6.x.x/build/vega-embed.min.js' }]` |
| 用 react/lodash（沙箱内置） | React 默认已在；lodash 无需声明 | **不写**                                                                                                                      |
| 用 SDK                      | 无需声明                        | **不写**                                                                                                                      |

注册时需为非沙箱内置库提供 CDN url。已知库用精确路径（如 `echarts@5.4.0/dist/echarts.min.js`），其余用 `https://cdn.jsdelivr.net/npm/{name}@{version}`。

## 4. usable mock（usable 接口的本地替身）

`public/api/v2/abi/components/usable` 是线上 `/api/v2/abi/components/usable` 接口的本地替身——路径与线上接口一致，devServer 直接将其作为静态文件透出，渲染层本地调试时读它代替调接口。

**此文件不在模板中预置**，由 agent 在首次本地调试前根据 `qbi.config.ts` 的 externals 和 devServer 配置生成。改 externals 后需同步更新 `data.components[0].external_assets`；改端口/host 后需同步更新所有 asset URL。

生成要点：

- `assets` 的 URL **必须写绝对路径**（`{devServerOrigin}/main.js`，origin 从 `qbi.config.ts` 的 `devServer` 读取），相对路径会解析到主应用 origin 导致加载失败
- `external_assets` 只填非沙箱内置库（§2 的列表不能进）
- `component_id` 固定为 `"mock"`，与调试 DSL 的 `component_ref` 一致
- 无第三方库时 `external_assets` 为空数组

`public/index.html` 仅为 devServer 着陆页，不参与组件渲染。

## 5. 拉取线上组件后的依赖还原

`externalAssets` 返回的是组件的外部依赖清单（如 `[{ name: 'echarts', global: 'echarts', version: 'x.y.z' }]`）。回填后需：

1. 将每个依赖写入 `package.json` 的 `dependencies`（`name: version`），执行 `npm install`
2. 将每个依赖的 `name: global` 写入 `qbi.config.ts` 的 `externals`（如 `{ echarts: 'echarts' }`）
3. 其余库需补全 CDN `url`（从 `package.json` 版本推导 jsdelivr 地址）
