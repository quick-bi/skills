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

每个 Release 还附带预构建的 zip——从 [GitHub Releases](https://github.com/quick-bi/skills/releases) 或 [Gitee 发行版](https://gitee.com/quick-bi/skills/releases) 下载，解压到智能体的技能目录即可使用。

## 仓库结构

```text
./skills     技能示例
./scripts    构建工具
```

## 技能列表

| 技能 | 说明 | 状态 |
| --- | --- | --- |
| [quickbi-custom-component](./skills/quickbi-custom-component/SKILL.md) | 从自然语言需求生成 Quick BI 自定义组件（图表 / 仪表板组件）——脚手架、组件 meta、DSL 绑定、校验与发布。 | 占位（开发中） |
| [quickbi-aipro](./skills/quickbi-aipro/SKILL.md) | Quick BI AIPro 数据问答（问数）通道——将自然语言数据问题（指标、排名、趋势、占比、同环比）路由到 AIPro，以文字与表格形式返回分析结论。 | 可用 |

## 贡献

版本与 changelog 约定见 [CONTRIBUTING.zh-CN.md](./CONTRIBUTING.zh-CN.md)。

## 许可证

见 [LICENSE](./LICENSE)。
