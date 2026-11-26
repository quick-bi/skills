# 贡献指南

[English](./CONTRIBUTING.md) | [简体中文](./CONTRIBUTING.zh-CN.md)

感谢为 Quick BI Skills 做贡献。每个技能位于 `skills/<skill-name>/`，入口文件为 `SKILL.md`。

## 版本

在 `SKILL.md` 的 frontmatter 中维护版本，格式为 `X.Y.Z-YYMMDD`。发布输入、Git tag 和 OSS 归档文件名都使用这个版本号。

```yaml
---
name: <skill-name>
description: ...
version: 7.0.2-261126
---
```

技能有变更时更新日期后缀及适用的版本段。

- **major** — 工作流或产出不兼容的变更
- **minor** — 新增步骤、能力或附带资源
- **patch** — 不影响行为的修复、措辞调整

## Changelog

每个技能在 `SKILL.md` 同级维护自己的 `CHANGELOG.md`，按 [Keep a Changelog](https://keepachangelog.com/) 格式倒序记录：

```markdown
# Changelog

## [1.1.0-260824] - 2026-08-24

### Added

- 新增 spec 校验步骤

### Fixed

- 修正 OLAP 示例中的字段名

## [1.0.0-260810] - 2026-08-10

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

更新 `SKILL.md` 中的版本并将改动合并到 `main`。在 **Actions → Release → Run workflow** 中选择 `main`，填写 `skill`（技能目录名）和 `version`（`SKILL.md` 中的版本）。也可以创建并推送 `<skill-name>@<version>` tag。tag 须指向 `main` 上的提交，且该提交中的技能内容须与当前 `main` 一致。

```bash
git switch main
git pull
git tag quickbi-data-analyst@7.0.2-261126
git push origin quickbi-data-analyst@7.0.2-261126
```

工作流将最新 ZIP 提交到 `main` 的 `release/<skill-name>.zip`，并在该技能的 `CHANGELOG.md` 中记录 OSS 归档链接。随后将同一个 ZIP 按以下顺序上传到 OSS。

- `oss://quickbi-skills/<skill-name>.<version>.zip`，用于下载历史版本。
- `oss://quickbi-skills/<skill-name>.zip`，指向最近一次发布的包。

公开下载地址见[安装说明](./README.zh-CN.md#安装)。

### OSS 配置与重试

在仓库的 **Settings → Secrets and variables → Actions** 下配置 `OSS_ACCESS_KEY_ID` 和 `OSS_ACCESS_KEY_SECRET` 两个仓库 Secret。地域默认是 `cn-beijing`，可通过 `OSS_REGION` 仓库变量覆盖。

上传失败时可重跑失败的任务。只要该版本仍是当前版本，重试就会沿用已提交的 ZIP。发布不同的技能内容时须使用新版本号。

### 本地构建

```bash
scripts/build.sh <skill-name>   # 单个技能
scripts/build.sh all            # 全部技能
```

本地构建默认输出到 Git 忽略的 `dist/` 目录。
