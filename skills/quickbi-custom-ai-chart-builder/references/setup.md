# Quick BI MCP 接入指南

> **何时读**：首次使用本 Skill 的步骤 0，或任一 `quickbi:*` 工具不可用、连接失败、鉴权失败时。

## 配置前提

此 Skill 使用 HTTP transport 的 `quickbi` MCP server，结构如下；尖括号内的值都来自用户环境，示例不提供默认地址或凭证：

```json
{
  "mcpServers": {
    "quickbi": {
      "url": "<server_domain>",
      "type": "https",
      "headers": {
        "x-quickbi-server-domain": "<server_domain>",
        "x-quickbi-api-key": "<个人级 AccessId>",
        "x-quickbi-api-secret": "<个人级 AccessKey>"
      }
    }
  }
}
```

三个值取自控制台「一键复制 skill 配置」给出的 `server_domain` / `api_key` / `api_secret`（获取方式见步骤 0）：`url` 与 `x-quickbi-server-domain` 都填 `server_domain` 原样值，`type` 恒为 `https`。若用户环境的 MCP 独立部署并给了单独地址，`url` 以用户提供的为准。

此 JSON 是通用 MCP 配置结构。不同客户端可能要求整个 `mcpServers` 对象，也可能只要求其中的 `quickbi` server body；按当前客户端的 MCP 设置说明放入对应位置，但键名保持原样。

`server_domain` / `api_key` / `api_secret` 任一缺失时回到步骤 0 让用户重新复制，不得猜测域名或凭证。

## 步骤 0：安装与配置

1. 确认用户正在使用的 AI 客户端或 IDE。若未说明，先询问其 MCP 配置入口或官方配置文档；不得假设命令、配置文件路径或重载方式。
2. 若该客户端支持 user、project、local 等多个配置范围，让用户选择。含鉴权信息的配置应保存在个人或本地私有范围；若该范围会同步、共享或提交到版本库，先提示凭证泄露风险。
3. 引导用户取配置：登录 Quick BI 控制台 → 点**右上角头像** → 在「账号设置与管理」区域（「个人识别码」条目旁）点「**一键复制 skill 配置**」，把复制到的内容直接粘贴回对话。复制出的是多行 `key: value`，含 `server_domain` / `api_key` / `api_secret`。按用户语言把截图嵌在回复里（红框即入口）：

   - zh_CN: `![一键复制 skill 配置](https://img.alicdn.com/imgextra/i3/O1CN01Ow7zAMmLeBJ2Yc1a_!!6000000004199-2-tps-1260-734.png)`
   - en_US: `![Copy Skill Config](https://img.alicdn.com/imgextra/i1/O1CN0175UzeUMuM4D64tUK_!!6000000003951-2-tps-2994-1634.png)`

   用户已有完整 `mcpServers.quickbi` 配置时，直接用它，跳过本步。

4. 按「配置前提」把粘贴内容组装成 `quickbi` server 定义：`url` 与 `x-quickbi-server-domain` 填 `server_domain`，`type` 填 `https`，两个 AK 填对应 header。server 名称固定为 `quickbi`。
5. 通过当前客户端的 MCP 设置界面、配置命令或配置文件写入该 server，不要覆盖其他已有 MCP server。
6. 按当前客户端的方式重新加载 MCP server 或重启客户端，并通过其工具列表、连接状态或一次只读的 Quick BI 工具调用确认 `quickbi` 已可用。
7. 仅在 `quickbi` MCP 工具可用后重试被阻塞的原操作；未加载成功时，按当前客户端的报错或官方文档排查。

## 安全约束

- 不逐项索取 AK/SK，只让用户一次性粘贴控制台复制出的配置。
- 不在对话、日志或示例中回显地址、请求头、AK、SK 或其他鉴权信息。
- 不使用默认、共享或推断的域名与凭证。
