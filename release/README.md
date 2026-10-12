# Latest skill packages

Pushing a `<skill-name>@<version>` tag triggers the **Release** GitHub Actions workflow, which commits one installable zip per skill to this directory: `<skill-name>.zip`. Each zip contains one top-level skill directory with `SKILL.md`, which records its version. The zip appears here after the first tag-triggered workflow run for that skill. Because it is a normal Git file, it can be mirrored to Gitee with the repository.

For example, the stable download URLs for the latest packaged `quickbi-data-analyst` on `main` are:

```text
https://raw.githubusercontent.com/quick-bi/skills/main/release/quickbi-data-analyst.zip
https://gitee.com/quick-bi/skills/raw/main/release/quickbi-data-analyst.zip
```

Copy this prompt to install the latest packaged version with an agent (using the Gitee mirror):

```text
请从 https://gitee.com/quick-bi/skills/raw/main/release/quickbi-data-analyst.zip 安装最新版 quickbi-data-analyst Skill。将压缩包中的 quickbi-data-analyst/ 文件夹放入你的 Skills 安装目录，完成后报告 SKILL.md 中的 version。
```

Or install directly with the skills CLI (Codex global install example):

```bash
npx skills add https://gitee.com/quick-bi/skills/raw/main/release/quickbi-data-analyst.zip -g -a codex -y
```

To publish an update, bump the version in `skills/<skill-name>/SKILL.md`, merge the change into `main`, then create and push the matching tag. For example, when the skill version is `0.7.1`:

```bash
git switch main
git pull
git tag quickbi-data-analyst@0.7.1
git push origin quickbi-data-analyst@0.7.1
```

The workflow builds from the tag, verifies that the tagged commit is on `main` and that `main` has the same skill version, then commits an updated zip at the same path. Ordinary source commits do not trigger packaging. The Gitee URL updates after the repository mirror synchronizes. The zip reflects the last *packaged* version, which may differ from the current source. Older packages remain in Git history, so repository size grows once per package update.
