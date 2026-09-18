# 图表库选型与配方

> **何时读**：步骤 1 计划选型，或步骤 3 编码时查现成配方。


## 选型阶梯

| 档 | 方案 | 适用场景 |
| --- | --- | --- |
| A | 纯 SVG / CSS | 指标卡、进度条、简单柱条 |
| B | ECharts | 大多数标准图表 |
| C | d3 / Vega 等 | A、B 无法满足的定制图形 |

ECharts、d3、Vega 都是第三方依赖：保留在 `package.json` 的 dependencies，配置 `externals`，并在本地 usable mock 和平台上传参数中声明对应 `external_assets`（写法与 url 规则见 `externals.md`）。宿主内置的 React、ReactDOM、lodash、moment 与必须打入产物的 Quick BI SDK 不属于这一类。

## ECharts 坐标系

| series | coordinateSystem |
| --- | --- |
| `bar` / `line` | cartesian2d、polar |
| `scatter` | cartesian2d、polar、geo、calendar |
| `heatmap` | cartesian2d、geo、calendar（无 polar） |
| `pie` / `gauge` / `funnel` / `sankey` / `tree` / `treemap` | 自有布局 |
| `radar` | radar |
| `custom` | 任意 |

## 当前 AI Meta 基线

所有配方都以 `AIComponentMeta` 和 `defineMeta` 为起点；基线示例与导出写法见 `meta-and-coding.md`「meta.ts 数据契约」节。

## React ECharts 骨架

React 组件直接接收 `AIComponentProps`；初始化和 resize 在一个 effect 中，数据变化只更新 option：

```tsx
import React from 'react';
import { init } from 'echarts';
import type { ECharts } from 'echarts';
import type { Interfaces } from '@quickbi/bi-open-react-sdk';

const Chart: React.FC<Interfaces.AIComponentProps> = ({ data, encoding, dispatch }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<ECharts | null>(null);
  const categoryField = encoding.category?.[0];
  const valueFields = encoding.value ?? [];

  React.useEffect(() => {
    if (!containerRef.current) return;
    const chart = init(containerRef.current);
    chartRef.current = chart;
    chart.on('click', event => {
      /* channel 是槽位 key，不是 event.seriesIndex 之类图表库位置量 */
      dispatch?.({ type: 'select', payload: { dataIndex: event.dataIndex, channel: 'category' } });
    });
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) chart.resize({ width, height });
    });
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [dispatch]);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const rows = data?.values ?? [];
    if (!categoryField || valueFields.length === 0 || rows.length === 0) {
      chart.clear();
      return;
    }
    chart.setOption({
      xAxis: { type: 'category', data: rows.map(row => String(row[categoryField] ?? '')) },
      yAxis: { type: 'value' },
      series: valueFields.map(field => ({
        type: 'bar',
        name: field,
        data: rows.map(row => Number(row[field]) || 0),
      })),
    }, true);
  }, [data, categoryField, valueFields]);

  return <div ref={containerRef} className="chart" />;
};
```

## Vanilla 图表实现

Vanilla 在 `mount` 与 `update` 中读取 `props.customProps` 并刷新图表，在 `umount` 中清理资源：

```ts
mount(props: Interfaces.LifecycleProps<Interfaces.AIComponentProps>) {
  this.chart = init(props.container!);
  this.render(props);
}

update(props: Interfaces.LifecycleProps<Interfaces.AIComponentProps>) {
  this.render(props);
}

umount() {
  this.resizeObserver?.disconnect();
  this.chart?.dispose();
}

render(props: Interfaces.LifecycleProps<Interfaces.AIComponentProps>) {
  const { data, encoding } = props.customProps!;
  // 根据 data.values 与 encoding.category / encoding.value 调用 setOption
}
```

## KPI 指标卡

单度量卡片可仅保留一个度量槽位：

```ts
export default defineMeta<Interfaces.AIComponentMeta>({
  schema: {
    type: 'object',
    properties: {
      encoding: {
        type: 'object',
        title: '数据',
        properties: {
          value: {
            type: 'string',
            title: '指标值',
            description: '指标数值，绑定 1 个度量字段',
            'qbi:fieldType': 'measure',
          },
        },
        required: ['value'],
      },
    },
  },
});
```

React 组件直接接收 `AIComponentProps`：

```tsx
import React from 'react';
import type { Interfaces } from '@quickbi/bi-open-react-sdk';

const KpiCard: React.FC<Interfaces.AIComponentProps> = ({ data, encoding, dispatch }) => {
  const field = encoding.value?.[0];
  const row = data?.values?.[0];
  const value = field && row ? Number(row[field]) || 0 : 0;

  return (
    <button type="button" onClick={() => dispatch?.({ type: 'select', payload: { dataIndex: 0 } })}>
      {value.toLocaleString()}
    </button>
  );
};
```
