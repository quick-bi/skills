# Contributing

[English](./CONTRIBUTING.md) | [简体中文](./CONTRIBUTING.zh-CN.md)

Thanks for contributing to Quick BI Skills. Each skill lives in `skills/<skill-name>/` with a `SKILL.md` entry file.

## Versioning

Set the version in the `SKILL.md` frontmatter using `X.Y.Z-YYMMDD`. Use that version for the release input, Git tag, and OSS archive name.

```yaml
---
name: <skill-name>
description: ...
version: 7.0.2-261126
---
```

Update the date suffix and the applicable version component when the skill changes.

- **major** — breaking changes to the skill's workflow or outputs
- **minor** — new steps, capabilities, or bundled resources
- **patch** — fixes, wording, or clarifications that don't change behavior

## Changelog

Each skill keeps its own `CHANGELOG.md` next to `SKILL.md`, newest first, following [Keep a Changelog](https://keepachangelog.com/):

```markdown
# Changelog

## [1.1.0-260824] - 2026-08-24

### Added

- New step for spec validation

### Fixed

- Corrected field names in the OLAP example

## [1.0.0-260810] - 2026-08-10

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

Update the version in `SKILL.md` and merge the changes into `main`. In **Actions → Release → Run workflow**, select `main` and enter `skill` (the directory name) and `version` (from `SKILL.md`). You can also push a `<skill-name>@<version>` tag. The tagged commit must be on `main`, and its skill contents must match the current contents on `main`.

```bash
git switch main
git pull
git tag quickbi-data-analyst@7.0.2-261126
git push origin quickbi-data-analyst@7.0.2-261126
```

The workflow commits the latest ZIP to `release/<skill-name>.zip` on `main` and records the OSS archive link in the skill's `CHANGELOG.md`. It then uploads the same ZIP to OSS in this order.

- `oss://quickbi-skills/<skill-name>.<version>.zip` for downloading previous releases.
- `oss://quickbi-skills/<skill-name>.zip` for the most recently published package.

See the [installation guide](./README.md#install) for public download URLs.

### OSS settings and retries

Under **Settings → Secrets and variables → Actions**, set the `OSS_ACCESS_KEY_ID` and `OSS_ACCESS_KEY_SECRET` repository secrets. The region defaults to `cn-beijing`. Set the `OSS_REGION` repository variable to override it.

If an upload fails, rerun the failed job. A retry uses the committed ZIP while its version is still current. Use a new version when publishing different skill contents.

### Local builds

```bash
scripts/build.sh <skill-name>   # one skill
scripts/build.sh all            # every skill
```

Local packages are written to the Git-ignored `dist/` directory by default.
