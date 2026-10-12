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

## Configuration files

The two configuration files serve distinct purposes and must not be mixed:

- `config.yaml` (user-level `~/.qbi/config.yaml` or workspace-level `<workspace>/.qbi/config.yaml`) holds **credentials only**: `server_domain` / `api_key` / `api_secret`. It is a credential file shared across Quick BI skills — never add non-credential keys.
- `settings.yaml` (skill root, shipped with the package) holds **skill-specific settings** (display options, ticket parameters, and other non-credential items); scripts fall back to built-in defaults when the file or a key is missing.

## Packaging

When a skill is ready to ship, bump its `SKILL.md` version and merge that change into `main`. Create and push a matching `<skill-name>@<version>` tag (for example, `quickbi-data-analyst@0.7.1`). The **Release** workflow builds the skill from the tag and commits `release/<skill-name>.zip` to `main`. The tagged commit must be on `main`, and the skill version on `main` must still match the tag. The workflow rejects packaging the same version twice.

```bash
git switch main
git pull
git tag quickbi-data-analyst@0.7.1
git push origin quickbi-data-analyst@0.7.1
```

The fixed GitHub and Gitee repository download URLs are documented in `release/README.md`. Each tag updates only the selected skill's zip. The Gitee URL updates after the repository mirror synchronizes. Older packages remain in Git history, so repository size grows once per package update.

The zip contains the skill folder itself, so unzipping into an agent's skills directory installs it. Ordinary commits do not trigger the workflow; tags outside the `<skill-name>@<version>` pattern do not produce packages.

Build zips locally with:

```bash
scripts/build.sh <skill-name>   # one skill
scripts/build.sh all            # every skill
```

Local builds remain available for checking changes; `dist/` stays ignored and is not used by the workflow.
