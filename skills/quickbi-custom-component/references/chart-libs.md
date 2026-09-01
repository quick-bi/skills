# 图表库选型与配方

## 选型阶梯

| 档    | 方案              | 加载风险                                        | 适用场景                     |
| ----- | ----------------- | ----------------------------------------------- | ---------------------------- |
| **A** | 纯 SVG/CSS        | 无                                              | 指标卡、进度条、简单柱条     |
| **B** | echarts           | 低（需声明 external_assets，平台已知 CDN 地址） | 绝大多数标准图表，默认选这个 |
| **C** | 其他库（d3/vega） | 高                                              | A/B 都做不到时用             |

echarts 不是沙箱内置库，**必须在 `external_assets` 中声明**（平台已知其 CDN 地址，无额外加载风险）。沙箱内置库（react/lodash/moment 等）不写进 `external_assets`（完整清单见 `references/externals.md` §2）。

## echarts 坐标系支持

写代码前确认 series 支持目标坐标系：

| series                                                     | coordinateSystem                           |
| ---------------------------------------------------------- | ------------------------------------------ |
| `bar` / `line`                                             | cartesian2d、polar                         |
| `scatter`                                                  | cartesian2d、polar、geo、calendar          |
| `heatmap`                                                  | cartesian2d、geo、calendar（**无 polar**） |
| `pie` / `gauge` / `funnel` / `sankey` / `tree` / `treemap` | 自有布局                                   |
| `radar`                                                    | radar                                      |
| `custom`                                                   | 任意（含 polar）                           |

极坐标热力图用 `type:'custom'` + `renderItem` 画 sector。

## echarts 骨架（React）

两段 effect：init+resize 合一（ResizeObserver）、setOption 单独。

```tsx
import { init } from 'echarts';
import type { ECharts } from 'echarts';

const chartRef = React.useRef<HTMLDivElement>(null);
const instanceRef = React.useRef<ECharts | null>(null);

// ① init + resize + 事件
React.useEffect(() => {
  if (!chartRef.current) return;
  const chart = init(chartRef.current);
  instanceRef.current = chart;
  chart.on('click', (p: { dataIndex: number }) => {
    dispatch?.({ type: 'select', payload: { dataIndex: p.dataIndex } });
  });
  chart.getZr().on('click', (e: { target?: unknown }) => {
    if (!e.target) dispatch?.({ type: 'cancelSelect' });
  });
  const ro = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect;
    if (width > 0 && height > 0) chart.resize({ width, height });
  });
  ro.observe(chartRef.current);
  return () => {
    ro.disconnect();
    chart.dispose();
    instanceRef.current = null;
  };
}, []);

// ② 数据变化 → setOption
React.useEffect(() => {
  const chart = instanceRef.current;
  if (!chart) return;
  if (!categoryField || valueFields.length === 0 || !data?.values?.length) {
    chart.clear(); // 不该画图时 clear()，不能什么都不做
    return;
  }
  const rows = data?.values ?? [];
  chart.setOption({/* ... */}, true);
}, [data, encoding, status]);
```

**关键规则**：

- 图表容器 div **始终在 DOM 里**，空/错态用覆盖层 + `chart.clear()`，不能条件 return 换掉容器
- 无图表实例的纯 CSS 组件可以直接条件 return

## 数据接线套路

```ts
const categoryField = encoding?.category?.[0];
const valueFields = encoding?.value ?? [];
const rows = data?.values ?? [];

// 维度值
const categories = rows.map(row => String(row[categoryField] ?? ''));

// 度量值（兜底 0）
const values = rows.map(row => {
  const n = Number(row[field]);
  return Number.isFinite(n) ? n : 0;
});

// 多度量 → 多 series
const series = valueFields.map((field, i) => ({
  type: 'bar' as const,
  name: field,
  data: rows.map(row => {
    const n = Number(row[field]);
    return Number.isFinite(n) ? n : 0;
  }),
  itemStyle: { color: PALETTE[i % PALETTE.length] },
}));
```

## 配方 A：KPI 指标卡（纯 CSS）

```ts
// meta.ts — name/desc 在注册接口传入，meta 只定义 dataSchema
export default {
  dataSchema: {
    areas: [
      {
        id: 'metric',
        name: '指标值',
        queryAxis: 'column',
        rule: { required: true, maxColNum: 1, fieldTypes: ['measure'] },
      },
    ],
  },
};
```

```tsx
// Component.tsx
const KpiCard: React.FC<BIComponentProps> = React.memo(({ data, encoding, status, dispatch }) => {
  const field = encoding?.metric?.[0];
  if (status === 'error') return <div className="empty">数据加载失败</div>;
  if (!field) return <div className="empty">请绑定指标字段</div>;
  const value = Number((data?.values?.[0] ?? {})[field]) || 0;
  return (
    <div className="kpi" onClick={() => dispatch?.({ type: 'select', payload: { dataIndex: 0 } })}>
      <div className="label">{field}</div>
      <div className="value">{value.toLocaleString()}</div>
    </div>
  );
});
```

## 配方 B：仪表盘 Gauge（echarts，单度量）

```ts
// meta.ts
export default {
  dataSchema: {
    areas: [
      {
        id: 'value',
        name: '指标值',
        queryAxis: 'column',
        rule: { required: true, maxColNum: 1, fieldTypes: ['measure'] },
      },
    ],
  },
};
```

echarts option 要点：

```ts
series: [
  {
    type: 'gauge',
    min: 0,
    max: 100,
    progress: { show: true, width: 24 },
    pointer: { show: false },
    data: [{ value, name: valueField }],
  },
];
```

## 配方 C：柱/折线（echarts，维度+多度量）

```ts
// meta.ts
export default {
  dataSchema: {
    areas: [
      {
        id: 'category',
        name: '分类维度',
        queryAxis: 'row',
        rule: { required: true, maxColNum: 1, fieldTypes: ['dimension'] },
      },
      {
        id: 'value',
        name: '度量',
        queryAxis: 'column',
        rule: { required: true, maxColNum: 6, fieldTypes: ['measure'] },
      },
    ],
  },
};
```

echarts option 要点：

```ts
xAxis: { type: 'category', data: categories },
yAxis: { type: 'value' },
series: valueFields.map((field, i) => ({
  type: 'bar',  // 改 'line' 就是折线
  name: field,
  data: rows.map(row => Number(row[field]) || 0),
  itemStyle: { color: PALETTE[i % PALETTE.length] },
}))
```

饼图变体：去掉 xAxis/yAxis，series 用 `type: 'pie'`，data 格式 `[{ name, value }]`。

## externals 配置

echarts 必须声明 externals（否则打进 main.js 撑大体积）：

```ts
// qbi.config.ts
externals: {
  echarts: 'echarts';
}
```

`package.json` 的 `dependencies` 保留 `echarts` 版本号。
