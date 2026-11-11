# 贡献指南

[English](./CONTRIBUTING.md) | [简体中文](./CONTRIBUTING.zh-CN.md)

感谢为 Quick BI Skills 做贡献。每个技能位于 `skills/<skill-name>/`，入口文件为 `SKILL.md`。

## 版本

每个 `SKILL.md` 在 frontmatter 中声明语义化版本：

```yaml
---
name: <skill-name>
description: ...
version: 1.0.0
---
```

技能有变更时 bump 版本号：

- **major** — 工作流或产出不兼容的变更
- **minor** — 新增步骤、能力或附带资源
- **patch** — 不影响行为的修复、措辞调整

## Changelog

每个技能在 `SKILL.md` 同级维护自己的 `CHANGELOG.md`，按 [Keep a Changelog](https://keepachangelog.com/) 格式倒序记录：

```markdown
# Changelog

## [1.1.0] - 2026-08-24

### Added

- 新增 spec 校验步骤

### Fixed

- 修正 OLAP 示例中的字段名

## [1.0.0] - 2026-08-10

- 首次发布
```

不要在仓库根目录维护统一 changelog——用户通过 `npx skills add --skill <skill-name>` 按个安装，只有放在技能目录内的 changelog 才会被一起带走。

## 模板

`templates/setup.md` 是凭证接入的共性文案模板，含 `references/setup.md` 与 SKILL.md「前置条件」章节两部分。新建技能时复制填充，占位符与落地规则见文件顶部注释。技能各自打包分发，模板只在创作期使用。

## 配置文件

两种配置文件各司其职，不得混用：

- `config.yaml`（用户级 `~/.qbi/config.yaml` 或工作目录级 `<workspace>/.qbi/config.yaml`）**仅放鉴权凭证**：`server_domain` / `api_key` / `api_secret`。它是多个 Quick BI skill 共用的凭证文件，不得写入凭证以外的键。
- `settings.yaml`（Skill 根目录，随包分发）放 **skill 自身设置**（如展示类型、票据参数等非凭证项）；脚本对缺失文件或缺键回退内置默认值。

## 打包

技能准备发包时，先更新 `SKILL.md` 中的版本号并合并到 `main`，再创建并推送对应的 `<skill-name>@<version>` tag（如 `quickbi-data-analyst@0.7.1`）。**Release** 工作流会从 tag 构建技能，并将 ZIP 直接上传到 OSS。tag 指向的提交必须在 `main` 上，且 `main` 中该技能的版本号仍须与 tag 一致。

```bash
git switch main
git pull
git tag quickbi-data-analyst@0.7.1
git push origin quickbi-data-analyst@0.7.1
```

发布成功后会更新 `oss://quickbi-skills/<skill-name>.zip`。公开下载链接见[安装说明](./README.zh-CN.md#安装)。

### OSS 配置与重试

在仓库的 **Settings → Secrets and variables → Actions** 下配置 `OSS_ACCESS_KEY_ID` 和 `OSS_ACCESS_KEY_SECRET` 两个仓库 Secret。地域默认是 `cn-beijing`，可通过 `OSS_REGION` 仓库变量覆盖。

上传失败时可重跑失败的任务。如需重新发布已有版本，在 **Actions → Release → Run workflow** 中填入对应的 `<skill-name>@<version>` tag。该 tag 仍须与 `main` 上的技能版本一致。

### 本地构建

```bash
scripts/build.sh <skill-name>   # 单个技能
scripts/build.sh all            # 全部技能
```

本地构建默认输出到 Git 忽略的 `dist/` 目录。
