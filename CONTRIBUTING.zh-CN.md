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

## 发版

以 `<skill-name>@<version>` 打 tag（如 `quickbi-aipro@1.1.0`）。推送 tag 会触发 GitHub 与 Gitee 上的 CI：把对应技能打包为 `<skill-name>-<version>.zip` 并挂到两端 Release。zip 内即技能文件夹本身，解压到智能体的技能目录即可完成安装。

本地构建：

```bash
scripts/build.sh <skill-name>   # 单个技能
scripts/build.sh all            # 全部技能
```
