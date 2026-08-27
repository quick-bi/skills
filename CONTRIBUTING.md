# Contributing

[English](./CONTRIBUTING.md) | [简体中文](./CONTRIBUTING.zh-CN.md)

Thanks for contributing to Quick BI Skills. Each skill lives in `skills/<skill-name>/` with a `SKILL.md` entry file.

## Versioning

Every `SKILL.md` declares a semantic version in its frontmatter:

```yaml
---
name: <skill-name>
description: ...
version: 1.0.0
---
```

Bump the version whenever the skill changes:

- **major** — breaking changes to the skill's workflow or outputs
- **minor** — new steps, capabilities, or bundled resources
- **patch** — fixes, wording, or clarifications that don't change behavior

## Changelog

Each skill keeps its own `CHANGELOG.md` next to `SKILL.md`, newest first, following [Keep a Changelog](https://keepachangelog.com/):

```markdown
# Changelog

## [1.1.0] - 2026-08-24

### Added

- New step for spec validation

### Fixed

- Corrected field names in the OLAP example

## [1.0.0] - 2026-08-10

- Initial release
```

Do not keep a single changelog at the repo root — users install individual skills via `npx skills add --skill <skill-name>`, and only a changelog inside the skill folder ships with it.

## Releases

Tag releases as `<skill-name>@<version>` (e.g. `quickbi-aipro@1.1.0`). For major changes, publish a GitHub Release alongside the tag.
