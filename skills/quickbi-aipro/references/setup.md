# 接入与凭证配置指南

## 凭证来源（三级）

脚本按优先级**高 → 低**取凭证，命中即生效（stderr 日志会打印实际命中情况）：

1. `QUICKBI_*` 环境变量：`QUICKBI_SERVER_DOMAIN` / `QUICKBI_API_KEY` / `QUICKBI_API_SECRET`（逐项生效，非空即覆盖配置文件对应项）
2. `<workspace>/.qbi/config.yaml`（工作目录级；逐项覆盖用户级，用于多环境凭证隔离；`<workspace>` 即 `--workspace-dir` 指定的用户工作目录）
3. `~/.qbi/config.yaml`（用户级配置文件；扁平 `key: value` 格式）

三级取完后 `server_domain` / `api_key` / `api_secret` 任一缺失报 `CONFIG_MISSING`（退出码 2）。`server_domain` 无内置默认值，按实际环境填写。本 Skill **无试用凭证**，脚本内不含任何写死的凭证，也不做用户自动注册。

凭证要求：`api_key` / `api_secret` 必须是**个人级** AccessId/AccessKey，组织级/空间级 AK 会被 403（`AK_LEVEL_REJECTED`）拒绝。

## 配置流程

适用：IDE / CLI / 桌面端 Agent，用户使用自己的 QuickBI 环境与 AK（公网或独立部署均可）。

**先直接运行，不要预先检查配置**。仅当脚本报凭证类错误（`CONFIG_MISSING` / `AUTH_FAILED`）时，按下述方式引导。

### 方式一（推荐）：控制台一键复制

引导用户去 Quick BI 控制台的「个人识别码」区域一键复制配置：

1. 告知用户：登录 Quick BI 控制台后，点击**右上角头像**，在下拉菜单的「账号设置与管理」区域（「个人识别码」条目旁）点击「**一键复制 skill 配置**」——复制的内容形如多行 `key: value` 配置，含 `server_domain` / `api_key` / `api_secret` / `user_token`
2. 按用户语言**把截图嵌在回复里**发给用户（红框即复制入口）。截图为在线图片链接（zh/en 各一张），SKILL.md 前置条件「凭证配置引导」已内嵌同样的图片链接，优先直接按那边的话术输出：
   - zh_CN: `![一键复制 skill 配置](https://img.alicdn.com/imgextra/i3/O1CN01Ow7zAMmLeBJ2Yc1a_!!6000000004199-2-tps-1260-734.png)`
   - en_US: `![Copy Skill Config](https://img.alicdn.com/imgextra/i1/O1CN0175UzeUMuM4D64tUK_!!6000000003951-2-tps-2994-1634.png)`
3. 用户把复制到的内容**直接粘贴到对话里发回**，由你按下节规范写入配置文件

### Agent 写入规范（拿到用户粘贴的配置后执行）

- **已有配置保护**：写入前先检查 `~/.qbi/config.yaml` 是否已存在且非空；已存在时**禁止自行覆盖或修改**，除非用户明确表达更新意图（如「更新我的配置」「换成这个 AK」）；此时告知用户配置已存在，询问是否确认覆盖。该文件可能被其他 Quick BI skill 共用，覆盖前先向用户说明影响面
- **写入位置**：从粘贴内容中提取 `server_domain` / `api_key` / `api_secret` / `user_token`（支持 `key: value`、`key：value`、`key=value` 等常见格式），写入 `~/.qbi/config.yaml`（不存在则创建，建议文件权限 600）。粘贴内容中不含的键不写入、不猜测；文件中已有的其他键保持不动。用户明确要求「只给当前项目用另一套凭证」时，改写入工作目录级 `<workspace>/.qbi/config.yaml`（不存在则创建）
- **写入后确认**：向用户说明写入了哪些配置项、写到了哪个文件，然后重跑原问数命令

### 方式二（兜底）：手工逐项提供

用户无法访问控制台时，向用户逐项索取（缺一不可，不要自行猜测或从其他文件读取）：`server_domain`（QuickBI 服务域名；独立部署/专有云环境为部署地址）、`api_key` / `api_secret`（个人级 AK），按上节「Agent 写入规范」落盘到 `~/.qbi/config.yaml`（格式同下）：

```yaml
server_domain: <QuickBI 服务域名>
api_key: <个人级 AccessId>
api_secret: <个人级 AccessKey>
```

写入后重新执行原命令即可。用户要求切换环境/凭证时，更新该文件或改用 `QUICKBI_*` 环境变量覆盖即生效（环境变量优先级更高）。

Skill 根目录的 `config.example.yaml` 是含全部键（含 `user_token` / `user_prompt` 可选项）的示例，可直接复制为 `~/.qbi/config.yaml` 或工作目录级 `<workspace>/.qbi/config.yaml` 后填写。

## 配置项一览

`~/.qbi/config.yaml` 中与本 Skill 相关的键（其余键互不干扰）：

| 键 | 对应环境变量（优先级更高） | 默认 | 说明 |
| --- | --- | --- | --- |
| `server_domain` | `QUICKBI_SERVER_DOMAIN` | 无（必填） | QuickBI 服务域名，按实际环境填写（公网为 `https://bi.aliyun.com`；独立部署/专有云为部署地址） |
| `api_key` | `QUICKBI_API_KEY` | 空 | 个人级 AccessId（**必配**） |
| `api_secret` | `QUICKBI_API_SECRET` | 空 | 个人级 AccessKey（**必配**） |
| `user_token` | - | 空 | 用户 token（可选；配置后随问数请求携带 user_id，以该用户身份取数） |
| `user_prompt` | - | 空 | 用户提示词：业务口径/场景约束；由脚本自动拼在通用边界之后、用户问题之前 |

## 服务端侧前置条件

- 目标组织已开通智能问数（ABI Chat）能力并部署对应服务（否则报 `ENV_NOT_ENABLED`（AE0510010001/OE10010106），或 message 含 AE0570010014「智能问数 Agent 服务未部署」的 `BUSINESS_ERROR`；需管理员开通/部署，非 AK 问题）
- AK 归属用户具有问数席位与数据集权限
