# Quick BI Skills

[English](./README.md) | [简体中文](./README.zh-CN.md)

Agent Skills for Quick BI. Each skill is a self-contained folder of instructions, scripts, and resources that agents load dynamically to work better with Quick BI.

## Install

Download the latest published ZIP from Alibaba Cloud OSS and extract the skill folder into your agent's skills directory. Each package contains a versioned `SKILL.md`, and its download URL stays the same across releases.

- [quickbi-data-analyst.zip](https://quickbi-skills.oss-cn-beijing.aliyuncs.com/quickbi-data-analyst.zip)
- [quickbi-custom-ai-chart-builder.zip](https://quickbi-skills.oss-cn-beijing.aliyuncs.com/quickbi-custom-ai-chart-builder.zip)

To install globally in Codex, run the command for the skill you want.

```bash
npx skills add https://quickbi-skills.oss-cn-beijing.aliyuncs.com/quickbi-data-analyst.zip -g -a codex -y
npx skills add https://quickbi-skills.oss-cn-beijing.aliyuncs.com/quickbi-custom-ai-chart-builder.zip -g -a codex -y
```

You can also paste this prompt into your agent.

```text
Download https://quickbi-skills.oss-cn-beijing.aliyuncs.com/quickbi-data-analyst.zip and install the quickbi-data-analyst folder in your skills directory. Report the installed version from SKILL.md.
```

### Install from source

**GitHub**

```bash
npx skills add https://github.com/quick-bi/skills.git
```

**Gitee**

```bash
npx skills add https://gitee.com/quick-bi/skills.git
```

To install a specific skill, append `--skill <skill-name>`.

```bash
npx skills add https://github.com/quick-bi/skills.git --skill <skill-name>
npx skills add https://gitee.com/quick-bi/skills.git --skill <skill-name>
```

## Repository structure

```text
./skills     Skill examples
./scripts    Build tooling
```

## Skills

| Skill | Description | Status |
| --- | --- | --- |
| [quickbi-custom-ai-chart-builder](./skills/quickbi-custom-ai-chart-builder/SKILL.md) | Build a Quick BI custom chart from a natural-language requirement — scaffolding, component meta, DSL binding, validation, and upload. | Placeholder (work in progress) |
| [quickbi-data-analyst](./skills/quickbi-data-analyst/SKILL.md) | Quick BI AIPro data Q&A channel — routes natural-language data questions (metrics, rankings, trends, ratios, YoY/MoM) to AIPro and answers in text and tables. | Active |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for versioning, changelogs, and publishing to OSS.

## License

See [LICENSE](./LICENSE).
