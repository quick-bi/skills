# Quick BI Skills

[English](./README.md) | [简体中文](./README.zh-CN.md)

Agent Skills for Quick BI. Each skill is a self-contained folder of instructions, scripts, and resources that agents load dynamically to work better with Quick BI.

## Install

GitHub:

```bash
npx skills add https://github.com/quick-bi/skills.git
```

Gitee:

```bash
npx skills add https://gitee.com/quick-bi/skills.git
```

To install a specific skill, append `--skill <skill-name>`:

```bash
npx skills add https://github.com/quick-bi/skills.git --skill <skill-name>
npx skills add https://gitee.com/quick-bi/skills.git --skill <skill-name>
```

Each release also carries a prebuilt zip — download it from [GitHub Releases](https://github.com/quick-bi/skills/releases) or [Gitee releases](https://gitee.com/quick-bi/skills/releases) and unzip it into your agent's skills directory.

## Repository structure

```text
./skills     Skill examples
./scripts    Build tooling
```

## Skills

| Skill | Description | Status |
| --- | --- | --- |
| [quickbi-custom-component](./skills/quickbi-custom-component/SKILL.md) | Build a Quick BI custom component (chart / dashboard widget) from a natural-language requirement — scaffolding, component meta, DSL binding, validation, and release. | Placeholder (work in progress) |
| [quickbi-data-analyst](./skills/quickbi-data-analyst/SKILL.md) | Quick BI AIPro data Q&A channel — routes natural-language data questions (metrics, rankings, trends, ratios, YoY/MoM) to AIPro and answers in text and tables. | Active |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for versioning and changelog conventions.

## License

See [LICENSE](./LICENSE).
