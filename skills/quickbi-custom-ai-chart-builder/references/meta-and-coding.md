# 契约与组件实现

> **何时读**：步骤 3 编码，或需要确认数据契约、组件写法时（契约权威来源）。


## 核心链路

`meta schema.properties.encoding.<槽位 key>` → 报表配置 `encoding[<槽位 key>]` → 组件读取同一 `encoding[<槽位 key>]`。修改槽位 key 时同步更新 meta、报表配置和组件代码。

## meta.ts 数据契约

当前 AI 模板目标契约使用 `Interfaces.AIComponentMeta`，并通过 `defineMeta` 导出；不要导出裸对象，也不要使用已不存在的 `AICustomComponentMeta`。`defineMeta` 是 SDK 的运行时导出（React 版来自 `@quickbi/bi-open-react-sdk`，Vanilla 版来自 `@quickbi/bi-open-sdk`）。若当前安装的版本不导出它，说明装到了旧版，按 SKILL.md 步骤 2 带官方 registry 重装最新版。

```ts
import type { Interfaces } from '@quickbi/bi-open-react-sdk'; // Vanilla 改为 @quickbi/bi-open-sdk
import { defineMeta } from '@quickbi/bi-open-react-sdk'; // Vanilla 改为 @quickbi/bi-open-sdk

export default defineMeta<Interfaces.AIComponentMeta>({
  schema: {
    type: 'object',
    properties: {
      encoding: {
        type: 'object',
        title: '数据',
        properties: {
          category: {
            type: 'string',
            title: '维度',
            description: '分类轴，绑定 1 个维度字段',
            'qbi:fieldType': 'dimension',
          },
          color: {
            type: 'string',
            title: '图例',
            description: '按该维度分色',
            'qbi:fieldType': 'dimension',
          },
          value: {
            type: 'array',
            title: '度量',
            description: '数值轴，绑定 1~3 个度量字段',
            items: { type: 'string' },
            maxItems: 3,
            'qbi:fieldType': 'measure',
          },
        },
        required: ['category', 'value'],
      },
      options: {
        type: 'object',
        title: '样式',
        properties: {
          show_label: { type: 'boolean', title: '显示数据标签', default: true },
        },
      },
    },
  },
  uiSchema: {
    options: {
      show_label: { 'ui:widget': 'checkbox' },
    },
  },
  interaction: { drill: { channels: ['category'] } },
});
```

`name` 和 `desc` 属于上传接口参数，不在 meta.ts 中定义。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `schema.properties.encoding` | `object` | 数据槽位映射：槽位 key → 槽位声明 |
| 槽位 key（属性名） | `string` | 报表配置与组件 `encoding` 的共同键，同时是下钻的通道名 |
| `slot.qbi:fieldType` | `dimension` / `measure` / `both` | 字段身份；宿主据此判定槽位性质与候选维度 |
| `slot.type` + `items` / `maxItems` | `string` / `array` | 单选槽为 string；多选槽为 array 并带 items 与 maxItems |
| `slot.description` | `string` | 槽位描述；建议写，帮助 AI 召回与报表侧展示 |
| `encoding.required` | `string[]` | 必填槽位 key 列表 |
| `schema.properties.options` | `object` | 样式选项叶子（键统一下划线格式，值域 + default） |
| `uiSchema.options` | `object` | 白名单控件提示（select / checkbox / number / text / textarea） |
| `interaction.drill.channels` | `readonly string[]` | 根级下钻能力：可下钻槽位 key 列表，默认关闭 |

## 下钻能力：meta.interaction.drill.channels

下钻能力在 meta 根级写 `interaction.drill: { channels: [...] }`，与内置图表的下钻能力声明同形；不要写单数 channel、path 或位置索引。

**显式开启**：meta 已取得但未声明 `interaction.drill`，或 `channels: []`，都表示没有下钻能力。只允许非空槽位 key 字符串，按声明顺序去重；非法形状禁用能力，非法项逐项诊断并忽略，合法数据槽位继续保留。未知槽位 key 不会按名称或序号猜补。meta 未取得则是证据不足，与无能力不同。

声明了也会被宿主忽略的两种槽位（控制台会打 `[custom-drill]` 警告）：

- 过滤用途槽位——过滤字段不在图上展示，没有「被点中的维度」可替换；
- `qbi:fieldType` 为 `measure` 的纯度量槽——下钻的本质是替换维度。

维度度量混合槽（`qbi:fieldType: 'both'`）算可下钻，但只有**实际绑上维度**的位置才会成为下钻来源：字段是维度还是度量由数据集说话，不由 meta 声明，把度量绑进维度槽照样判为度量。

「meta.ts 数据契约」节的示例只把 `category` 列入 channels：点图例位置不进下钻，点度量也不进。

### 报表侧下钻配置只认 channel 与 path

组件声明能力、报表配置下钻路径，两者靠**槽位 key** 对齐。报表的 `interaction.drill` 写成 `{ "channel": "<槽位 key>", "path": ["省份", "城市"] }`，与内置编码图表完全同构：`channel` 指向哪个槽位、`path[0]` 是该槽位上的哪个字段，宿主据此唯一定位下钻来源。

**位置索引是宿主运行时算出来的内部值**，既不出现在报表配置中，也不出现在组件 props 或 `dispatch` 里。同一槽位把同一字段绑到多个位置的报表在校验阶段就会被拒绝，组件不需要处理这种歧义。

## AIComponentProps

```ts
interface AIComponentProps {
  data: { values: ReadonlyArray<Readonly<Record<string, unknown>>> };
  encoding: Readonly<Record<string, string[]>>;
  fields?: Readonly<Record<string, { alias?: string; format?: string; granularity?: string }>>;
  options?: Readonly<Record<string, unknown>>;
  utils?: { format_value: (value: unknown, format?: string) => string };
  page_config?: { artifact_id?: string; user_id?: string };
  dispatch?: AIComponentPropsDispatch;
}
```

- `data.values` 是行数组。
- `encoding` 是槽位 key 到字段名数组的映射；读取前判空。
- `fields` 是字段级元信息（alias / format / granularity），展示与格式化据此对齐报表口径。
- `options` 是 meta `schema.properties.options` 声明的样式值（下划线键），未配置时为声明的 default。
- `utils.format_value` 是宿主格式化函数，与报表内建格式化同口径。
- `page_config` 是页面级身份（`artifact_id` / `user_id`）。
- `dispatch` 可选。`select` 的 payload 是 `{ dataIndex, channel? }`；`cancelSelect`、`cancelDrill`、`cancelLinkage` 不传 payload。

## select：把点击落点告诉宿主

```ts
dispatch?.({ type: 'select', payload: { dataIndex, channel: 'category' } });
dispatch?.({ type: 'cancelSelect' });
```

| 字段 | 含义 | 何时必须传 |
| --- | --- | --- |
| `dataIndex` | 选中行在 `data.values` 中的下标 | 始终 |
| `channel` | 点击落在哪个槽位，值为槽位 key | 需要区分点击槽位时；已配置来源唯一且无槽位歧义时可省略 |

组件只上报**语义槽位**，不上报位置索引：槽位内具体是哪个字段，由宿主按报表的下钻配置解析。`channel` 可选，不根据能力列表长度机械判为必填；已配置来源唯一时可省略。需要区分不同语义槽位的点击时应传真实槽位 key；传入槽位与已配置来源不一致时不会触发该来源下钻。

**`dataIndex` 必须是原始行下标。** 组件内部为绘制而排序、聚合、截断 Top N 都会改变渲染顺序，上报时要换回该行在 `data.values` 里的位置：

```tsx
const rows = data?.values ?? [];
/* 排序只影响画法、不影响上报口径：把原下标随行带上 */
const sorted = rows.map((row, index) => ({ row, index })).sort((a, b) => value(b.row) - value(a.row));
const onBarClick = (rank: number) =>
  dispatch?.({ type: 'select', payload: { dataIndex: sorted[rank].index, channel: 'category' } });
```

`channel` 是槽位 key，**不能拿图表库的 `seriesIndex` / `dimensionIndex` 之类位置量顶替**——图表库的序号与槽位内字段顺序没有稳定对应关系。

Vanilla 版从 `props.customProps!.dispatch` 取同一出口，payload 口径不变：

```ts
private bindClick(props: Interfaces.LifecycleProps<Interfaces.AIComponentProps>) {
  const { dispatch } = props.customProps!;
  this.chart?.off('click');
  this.chart?.on('click', (event: { dataIndex: number }) => {
    dispatch?.({ type: 'select', payload: { dataIndex: event.dataIndex, channel: 'category' } });
  });
}
```

下钻发生后宿主重算查询，把新的 `encoding` 与 `data` 传下来：**组件按新 props 重画即可**，不要缓存字段名、不要自己推断下钻状态。菜单、路径推进、面包屑、上钻与取消、父级过滤全部由宿主负责；`cancelDrill` 只是给组件一个主动退出的出口，不需要组件维护路径。

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
  const categoryField = encoding.category?.[0];
  const valueFields = encoding.value ?? [];
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
- 下钻的菜单、预检查、路径推进、状态与取数全部由宿主完成，组件只做两件事：声明能力、上报点击落点。
