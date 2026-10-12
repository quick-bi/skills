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

For a zip install, use the GitHub or Gitee repository download URL in [`release/README.md`](./release/README.md) and unzip the package into your agent's skills directory. Pushing a matching skill version tag triggers the GitHub Actions **Release** workflow, which commits the package for repository mirroring.

## Repository structure

```text
./skills     Skill examples
./scripts    Build tooling
./release    Latest installable zip for each skill and installation guide
```

## Skills

| Skill | Description | Status |
| --- | --- | --- |
| [quickbi-custom-ai-chart-builder](./skills/quickbi-custom-ai-chart-builder/SKILL.md) | Build a Quick BI custom chart from a natural-language requirement — scaffolding, component meta, DSL binding, validation, and upload. | Placeholder (work in progress) |
| [quickbi-data-analyst](./skills/quickbi-data-analyst/SKILL.md) | Quick BI AIPro data Q&A channel — routes natural-language data questions (metrics, rankings, trends, ratios, YoY/MoM) to AIPro and answers in text and tables. | Active |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for versioning and changelog conventions.

## License

See [LICENSE](./LICENSE).
