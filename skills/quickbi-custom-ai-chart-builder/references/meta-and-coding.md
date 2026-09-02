# 契约与组件实现

> **何时读**：步骤 3 编码，或需要确认数据契约、组件写法时（契约权威来源）。


## 核心链路

`meta.dataSchema.areas[].id` → DSL `encoding[id]` → 组件读取同一 `encoding[id]`。修改区域 id 时同步更新 meta、DSL 和组件代码。

## meta.ts 数据契约

当前 AI 模板目标契约使用 `Interfaces.AIComponentMeta`，并通过 `defineMeta` 导出；不要导出裸对象，也不要使用已不存在的 `AICustomComponentMeta`。`defineMeta` 是 SDK 的运行时导出（React 版来自 `@quickbi/bi-open-react-sdk`，Vanilla 版来自 `@quickbi/bi-open-sdk`）。若当前安装的版本不导出它，说明装到了旧版，按 SKILL.md 步骤 2 带官方 registry 重装最新版。

```ts
import type { Interfaces } from '@quickbi/bi-open-react-sdk'; // Vanilla 改为 @quickbi/bi-open-sdk
import { defineMeta } from '@quickbi/bi-open-react-sdk'; // Vanilla 改为 @quickbi/bi-open-sdk

export default defineMeta<Interfaces.AIComponentMeta>({
  dataSchema: {
    areas: [
      {
        id: 'area_row',
        name: '维度',
        description: '分类轴，绑定维度字段',
        queryAxis: 'row',
        rule: { required: true, maxColNum: 1, fieldTypes: ['dimension'] },
      },
      {
        id: 'area_column',
        name: '度量',
        description: '数值轴，绑定度量字段',
        queryAxis: 'column',
        rule: { required: true, maxColNum: 3, fieldTypes: ['measure'] },
      },
    ],
  },
});
```

`name` 和 `desc` 属于注册接口参数，不在 meta.ts 中定义。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `dataSchema.areas` | `DataSchemaArea[]` | 字段区域列表 |
| `areas[].id` | `string` | DSL 和 `encoding` 的共同键 |
| `areas[].queryAxis` | `row` / `column` / `drill` / `filters` | 查询轴 |
| `areas[].rule.fieldTypes` | `dimension` / `measure` 数组 | 允许的字段类型 |
| `areas[].rule.maxColNum` | `number` | 最多字段数 |
| `areas[].rule.required` | `boolean` | 是否必填 |

## AIComponentProps

```ts
interface AIComponentProps {
  data: { values: ReadonlyArray<Readonly<Record<string, unknown>>> };
  encoding: Readonly<Record<string, string[]>>;
  dispatch?: AIComponentPropsDispatch;
}
```

- `data.values` 是行数组。
- `encoding` 是区域 id 到字段名数组的映射；读取前判空。
- `dispatch` 可选。`select` 必须传 `payload: { dataIndex }`；`cancelSelect`、`cancelDrill`、`cancelLinkage` 不传 payload。

```ts
const dataIndex = 0;
dispatch?.({ type: 'select', payload: { dataIndex } });
dispatch?.({ type: 'cancelSelect' });
```

## qbi.config.ts

两个模板都显式声明 main 与 meta entry，保留该结构：

```ts
import { defineConfig } from '@quickbi/qbi-dev-tools';

export default defineConfig({
  entry: {
    BIComponentMeta: './src/meta.ts',
    BIComponent: './src/index.ts',
  },
  devServer: {
    port: 8001,
    host: '127.0.0.1',
    server: { type: 'https' },
  },
  externals: {
    lodash: '_',
    react: 'React',
    'react-dom': 'ReactDOM',
    moment: 'moment',
  },
});
```

`@quickbi/bi-open-sdk` 和 `@quickbi/bi-open-react-sdk` 必须参与 bundle，不能放进 `externals`。

## React 组件

React 模板通过 `createBIComponent({ element: Component })` 传入直接接收 `AIComponentProps` 的组件。数据和编码直接从 props 读取：

```tsx
import React from 'react';
import type { Interfaces } from '@quickbi/bi-open-react-sdk';

const MyChart: React.FC<Interfaces.AIComponentProps> = React.memo(({ data, encoding, dispatch }) => {
  const categoryField = encoding.area_row?.[0];
  const valueFields = encoding.area_column ?? [];
  const rows = data?.values ?? [];

  return <div>{rows.length} rows</div>;
});

export default MyChart;
```

`src/index.ts` 保持模板入口：

```ts
import { createBIComponent } from '@quickbi/bi-open-react-sdk';
import Component from './Component';

export const { bootstrap, mount, unmount, update } = createBIComponent({ element: Component });
```

## Vanilla 组件

Vanilla 模板的生命周期 props 由 `LifecycleProps` 包装，业务数据必须从 `props.customProps` 读取：

```ts
import type { Interfaces } from '@quickbi/bi-open-sdk';

class MyChart {
  mount(props: Interfaces.LifecycleProps<Interfaces.AIComponentProps>) {
    this.render(props);
  }

  update(props: Interfaces.LifecycleProps<Interfaces.AIComponentProps>) {
    this.render(props);
  }

  umount(props: Interfaces.LifecycleProps<Interfaces.AIComponentProps>) {
    props.container?.replaceChildren();
  }

  private render(props: Interfaces.LifecycleProps<Interfaces.AIComponentProps>) {
    const { data, encoding } = props.customProps!;
    props.container!.textContent = `${data?.values?.length ?? 0} rows: ${Object.keys(encoding).join(', ')}`;
  }
}

export default MyChart;
```

`src/index.ts` 仍导出 wrapper 的 `unmount`。当前 Vanilla SDK wrapper 会将该调用转发给类实例的 `umount(props)`；有清理逻辑时使用 `umount`，不要只定义 `unmount`。

## 尺寸与资源清理

图表组件自行管理 `ResizeObserver`。React 在 effect cleanup 中断开 observer 并 dispose 图表；Vanilla 在 `umount` 中执行同样清理。没有可渲染数据时，已有图表实例必须 `clear()`，不要替换图表容器节点。

## 宿主保障

- 组件挂载时宿主已完成数据绑定校验。
- `status` 不属于 `AIComponentProps`；不要把通用图表组件的 `status` 逻辑复制到 AI 组件。
- `data`、`encoding` 与 `dispatch` 仍应按可选输入防御性读取。
