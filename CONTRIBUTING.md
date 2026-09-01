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

## Templates

`templates/setup.md` holds the shared credential-setup wording in two parts: `references/setup.md` and the SKILL.md "Prerequisites" section. Copy and fill it in when authoring a new skill; see the comment block at the top of the file for placeholders and rules. Skills ship as standalone packages, so the template is authoring-time only.

## Releases

Tag releases as `<skill-name>@<version>` (e.g. `quickbi-data-analyst@1.1.0`). Pushing the tag triggers CI on GitHub and Gitee: the tagged skill is packaged into `<skill-name>-<version>.zip` and attached to the release on both platforms. The zip contains the skill folder itself, so unzipping into an agent's skills directory installs it.

Build zips locally with:

```bash
scripts/build.sh <skill-name>   # one skill
scripts/build.sh all            # every skill
```
