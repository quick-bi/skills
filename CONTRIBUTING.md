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

When a skill is ready to ship, bump its `SKILL.md` version and merge that change into `main`. Create and push a matching `<skill-name>@<version>` tag (for example, `quickbi-data-analyst@0.7.1`). The **Release** workflow builds the skill from the tag, commits the ZIP to `release/<skill-name>.zip` on `main`, and uploads it to OSS. The tagged commit must be on `main`, and the skill version on `main` must still match the tag.

```bash
git switch main
git pull
git tag quickbi-data-analyst@0.7.1
git push origin quickbi-data-analyst@0.7.1
```

Each successful release updates the selected skill at `oss://quickbi-skills/<skill-name>.zip`. The [installation guide](./README.md#install) lists the public download URLs.

### OSS settings and retries

Under **Settings → Secrets and variables → Actions**, set the `OSS_ACCESS_KEY_ID` and `OSS_ACCESS_KEY_SECRET` repository secrets. The region defaults to `cn-beijing`. Set the `OSS_REGION` repository variable to override it.

If an upload fails, rerun the failed job. To sync the current repository packages to OSS, run **Actions → Release → Run workflow**.

### Local builds

```bash
scripts/build.sh <skill-name>   # one skill
scripts/build.sh all            # every skill
```

Local packages are written to the Git-ignored `dist/` directory by default.
