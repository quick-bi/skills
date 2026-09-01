# 契约与组件实现

## 核心链路

`meta.dataSchema.areas[].id` → DSL `encoding[id]` → `props.encoding[id]`（区域 id 一名三用，改名三处同步）

## meta.ts 数据契约

`src/meta.ts` 导出一个 `AICustomComponentMeta` 对象，rspack 编译为 `dist/meta.js`。

```typescript
import type { Interfaces } from '@quickbi/bi-open-react-sdk'; // Vanilla 版用 '@quickbi/bi-open-sdk'

const componentMeta: Interfaces.AICustomComponentMeta = {
  dataSchema: {
    areas: [
      {
        id: 'category',
        name: '维度',
        description: '分类轴',
        queryAxis: 'row',
        rule: { required: true, maxColNum: 1, fieldTypes: ['dimension'] },
      },
      {
        id: 'value',
        name: '度量',
        description: '数值字段',
        queryAxis: 'column',
        rule: { required: true, maxColNum: 6, fieldTypes: ['measure'] },
      },
    ],
  },
};
export default componentMeta;
```

### AICustomComponentMeta

| 字段         | 类型             | 必填 | 描述     |
| ------------ | ---------------- | ---- | -------- |
| `dataSchema` | `MetaDataSchema` |      | 数据契约 |

> 组件的 `name` 和 `desc` 在注册接口（`register_custom_component`）时传入，不在 meta.ts 中。

### MetaDataSchema

| 字段    | 类型               | 必填 | 描述         |
| ------- | ------------------ | ---- | ------------ |
| `areas` | `DataSchemaArea[]` | ✅   | 字段区域列表 |

### DataSchemaArea

| 字段          | 类型                                        | 必填 | 描述                                |
| ------------- | ------------------------------------------- | ---- | ----------------------------------- |
| `id`          | `string`                                    | ✅   | 区域 id（一名三用）                 |
| `name`        | `string`                                    | ✅   | 区域名称                            |
| `nameTip`     | `string`                                    |      | 区域名称提示                        |
| `description` | `string`                                    |      | 区域语义描述，告诉 LLM 该绑什么字段 |
| `queryAxis`   | `"row" \| "column" \| "drill" \| "filters"` | ✅   | 查询轴                              |
| `rule`        | `DataSchemaAreaRule`                        | ✅   | 区域规则                            |

### DataSchemaAreaRule

| 字段                   | 类型                                     | 描述               |
| ---------------------- | ---------------------------------------- | ------------------ |
| `required`             | `boolean`                                | 是否必填           |
| `maxColNum`            | `number`                                 | 字段个数限制       |
| `placeholder`          | `string`                                 | 占位提示           |
| `fieldTypes`           | `("dimension" \| "measure")[]`           | 允许的字段类型     |
| `fieldGroupTypes`      | `("dimensionGroup" \| "measureGroup")[]` | 允许的字段组类型   |
| `fieldCollectionTypes` | `string[]`                               | 允许的字段集合类型 |

---

## AIComponentProps（运行时）

```ts
interface AIComponentProps {
  data: { values: ReadonlyArray<Readonly<Record<string, unknown>>> };
  encoding: Readonly<Record<string, string[]>>;
  dispatch?: AIComponentPropsDispatch;
}
```

| 字段          | 说明                                               |
| ------------- | -------------------------------------------------- |
| `data.values` | 行数组，通过 `.values` 取                          |
| `encoding`    | 区域 id → 列名数组（未绑定的区域不存在，取前判空） |
| `dispatch`    | 交互出口，可选，调用写 `dispatch?.()`              |

### dispatch 动作（AIComponentPropsDispatch）

dispatch 接收无 payload 的 action 对象：

```ts
dispatch?.({ type: 'select' });
dispatch?.({ type: 'cancelSelect' });
dispatch?.({ type: 'cancelDrill' });
dispatch?.({ type: 'cancelLinkage' });
```

---

## 组件实现

### 入口文件 index.ts

```ts
import { createBIComponent } from '@quickbi/bi-open-react-sdk';
import Component from './Component';
export const { bootstrap, mount, unmount, update } = createBIComponent({ element: Component });
```

### React 版骨架

```tsx
import React from 'react';
import type { Interfaces } from '@quickbi/bi-open-react-sdk';

const MyChart: React.FC<Interfaces.AIComponentProps> = React.memo(({ data, encoding, dispatch }) => {
  const field = encoding?.category?.[0];
  const rows = data?.values ?? [];
  // ...渲染
});
export default MyChart;
```

### Vanilla 版骨架

```ts
// index.ts
import { createBIComponent } from '@quickbi/bi-open-sdk';
import Component from './component';
export const { bootstrap, mount, unmount, update } = createBIComponent({ element: Component });

// component.ts
import type { Interfaces } from '@quickbi/bi-open-sdk';

class MyChart {
  mount(props: Interfaces.LifecycleProps<Interfaces.AIComponentProps>) {
    /* init */
  }
  update(props: Interfaces.LifecycleProps<Interfaces.AIComponentProps>) {
    /* re-render */
  }
  unmount(props: Interfaces.LifecycleProps<Interfaces.AIComponentProps>) {
    /* dispose */
  }
}
export default MyChart;
```

### 自适应尺寸（必做）

组件自行 `ResizeObserver`，不能写死宽高：

```ts
const ro = new ResizeObserver(entries => {
  const { width, height } = entries[0].contentRect;
  if (width > 0 && height > 0) chart.resize({ width, height });
});
ro.observe(container);
```

### 宿主保障

- 组件挂载时一定有数据（loading/空态由宿主处理）
- 数据绑定已校验，不匹配时不挂载组件
- 组件抛错由宿主兜住

### 组件必做

1. 不画图时 `chart.clear()`（不能什么都不做）
2. 自行 `ResizeObserver` 管尺寸
3. 通过 `data.values` 取数据
