# Quick BI Skills

[English](./README.md) | [简体中文](./README.zh-CN.md)

Quick BI 的 Agent Skills 集合。每个技能是一个自包含文件夹，内含指令、脚本和资源，供智能体动态加载，从而更好地使用 Quick BI。

## 安装

从阿里云 OSS 下载最新发布的 ZIP，将解压后的技能目录放入智能体的技能目录。每个包的 `SKILL.md` 记录版本，下载地址在版本更新后继续使用。

- [quickbi-data-analyst.zip](https://quickbi-skills.oss-cn-beijing.aliyuncs.com/quickbi-data-analyst.zip)
- [quickbi-custom-ai-chart-builder.zip](https://quickbi-skills.oss-cn-beijing.aliyuncs.com/quickbi-custom-ai-chart-builder.zip)

如需全局安装到 Codex，运行对应技能的命令。

```bash
npx skills add https://quickbi-skills.oss-cn-beijing.aliyuncs.com/quickbi-data-analyst.zip -g -a codex -y
npx skills add https://quickbi-skills.oss-cn-beijing.aliyuncs.com/quickbi-custom-ai-chart-builder.zip -g -a codex -y
```

也可以将这段安装指令发给智能体。

```text
请从 https://quickbi-skills.oss-cn-beijing.aliyuncs.com/quickbi-data-analyst.zip 安装最新版 quickbi-data-analyst Skill。将压缩包中的 quickbi-data-analyst/ 文件夹放入你的 Skills 安装目录，完成后报告 SKILL.md 中的 version。
```

### 从源码安装

**GitHub**

```bash
npx skills add https://github.com/quick-bi/skills.git
```

**Gitee**

```bash
npx skills add https://gitee.com/quick-bi/skills.git
```

安装指定技能时，追加 `--skill <skill-name>`。

```bash
npx skills add https://github.com/quick-bi/skills.git --skill <skill-name>
npx skills add https://gitee.com/quick-bi/skills.git --skill <skill-name>
```

## 仓库结构

```text
./skills     技能示例
./scripts    构建工具
```

## 技能列表

| 技能 | 说明 | 状态 |
| --- | --- | --- |
| [quickbi-custom-ai-chart-builder](./skills/quickbi-custom-ai-chart-builder/SKILL.md) | 从自然语言需求生成 Quick BI 自定义图表——脚手架、组件 meta、DSL 绑定、校验与上传发布。 | 占位（开发中） |
| [quickbi-data-analyst](./skills/quickbi-data-analyst/SKILL.md) | Quick BI AIPro 数据问答（问数）通道——将自然语言数据问题（指标、排名、趋势、占比、同环比）路由到 AIPro，以文字与表格形式返回分析结论。 | 可用 |

## 贡献

版本、changelog 和 OSS 发布说明见 [CONTRIBUTING.zh-CN.md](./CONTRIBUTING.zh-CN.md)。

## 许可证

见 [LICENSE](./LICENSE)。
