# Quick BI Skills

[English](./README.md) | [简体中文](./README.zh-CN.md)

Quick BI 的 Agent Skills 集合。每个技能是一个自包含文件夹，内含指令、脚本和资源，供智能体动态加载，从而更好地使用 Quick BI。

## 安装

GitHub：

```bash
npx skills add https://github.com/quick-bi/skills.git
```

Gitee：

```bash
npx skills add https://gitee.com/quick-bi/skills.git
```

安装指定技能，追加 `--skill <skill-name>`：

```bash
npx skills add https://github.com/quick-bi/skills.git --skill <skill-name>
npx skills add https://gitee.com/quick-bi/skills.git --skill <skill-name>
```

如需通过 zip 安装，请使用 [`release/README.md`](./release/README.md) 中的 GitHub 或 Gitee 仓库下载地址，将压缩包解压到智能体的技能目录。推送与技能版本匹配的 tag 后，GitHub Actions 的 **Release** 工作流会提交安装包，供仓库同步到 Gitee。

## 仓库结构

```text
./skills     技能示例
./scripts    构建工具
./release    每个技能的最新版安装包及安装说明
```

## 技能列表

| 技能 | 说明 | 状态 |
| --- | --- | --- |
| [quickbi-custom-ai-chart-builder](./skills/quickbi-custom-ai-chart-builder/SKILL.md) | 从自然语言需求生成 Quick BI 自定义图表——脚手架、组件 meta、DSL 绑定、校验与上传发布。 | 占位（开发中） |
| [quickbi-data-analyst](./skills/quickbi-data-analyst/SKILL.md) | Quick BI AIPro 数据问答（问数）通道——将自然语言数据问题（指标、排名、趋势、占比、同环比）路由到 AIPro，以文字与表格形式返回分析结论。 | 可用 |

## 贡献

版本与 changelog 约定见 [CONTRIBUTING.zh-CN.md](./CONTRIBUTING.zh-CN.md)。

## 许可证

见 [LICENSE](./LICENSE)。
