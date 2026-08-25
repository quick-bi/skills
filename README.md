# Quick BI Skills

[English](./README.md) | [简体中文](./README.zh-CN.md)

Agent Skills for Quick BI. Each skill is a self-contained folder of instructions, scripts, and resources that agents load dynamically to work better with Quick BI.

## Install

GitHub:

```bash
npx skills add https://github.com/quick-bi/skills
```

Gitee:

```bash
npx skills add https://gitee.com/quick-bi/skills
```

To install a specific skill, append `--skill <skill-name>`:

```bash
npx skills add https://github.com/quick-bi/skills --skill <skill-name>
npx skills add https://gitee.com/quick-bi/skills --skill <skill-name>
```

## Repository structure

```text
./skills     Skill examples
```

## Skills

| Skill | Description | Status |
| --- | --- | --- |
| [quickbi-custom-component](./skills/quickbi-custom-component/SKILL.md) | Build a Quick BI custom component (chart / dashboard widget) from a natural-language requirement — scaffolding, component meta, DSL binding, validation, and release. | Placeholder (work in progress) |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for versioning and changelog conventions.

## License

See [LICENSE](./LICENSE).
