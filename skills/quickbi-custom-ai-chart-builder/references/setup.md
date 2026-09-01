# Quick BI MCP 接入指南

> **何时读**：首次使用本 Skill 的步骤 0，或任一 `quickbi:*` 工具不可用、连接失败、鉴权失败时。

## 配置前提

此 Skill 使用 HTTP transport 的 `quickbi` MCP server。必须取得以下完整结构；其中所有尖括号内的值都只能来自用户提供的环境配置，示例不提供默认地址或凭证：

```json
{
  "mcpServers": {
    "quickbi": {
      "url": "<用户提供的 Quick BI MCP URL>",
      "type": "http",
      "headers": {
        "x-quickbi-server-domain": "<用户提供的 Quick BI 服务域名>",
        "x-quickbi-api-key": "<用户提供的个人级 AccessId>",
        "x-quickbi-api-secret": "<用户提供的个人级 AccessKey>"
      }
    }
  }
}
```

此 JSON 是通用 MCP 配置结构。不同客户端可能要求整个 `mcpServers` 对象，也可能只要求其中的 `quickbi` server body；按当前客户端的 MCP 设置说明放入对应位置，但保持 `quickbi` 的 `url`、`type` 和 `headers` 原样不变。以下内容不能直接配置为 MCP：

- 缺少 `url`、`type` 或任一上述 header 的配置。
- 仅含 `server_domain`、`api_key`、`api_secret` 等 `key: value` 凭证的普通 Skill 配置。

遇到不完整配置时，要求用户从 Quick BI MCP 部署说明或管理员处获取完整 `mcpServers.quickbi` 配置；不得据此猜测 URL、transport 或请求头。

## 步骤 0：安装与配置

1. 确认用户正在使用的 AI 客户端或 IDE。若未说明，先询问其 MCP 配置入口或官方配置文档；不得假设命令、配置文件路径或重载方式。
2. 若该客户端支持 user、project、local 等多个配置范围，让用户选择。含鉴权信息的配置应保存在个人或本地私有范围；若该范围会同步、共享或提交到版本库，先提示凭证泄露风险。
3. 引导用户从 Quick BI 控制台获取环境专属配置：

   > 请登录 Quick BI 控制台，点击**右上角头像**，在下拉菜单的「账号设置与管理」区域（「个人识别码」条目旁）点击「**一键复制 skill 配置**」，然后把复制到的内容直接粘贴到对话里发回。
   >
   > 复制入口见下图红框：
   >
   > - zh_CN: ![一键复制 skill 配置](https://img.alicdn.com/imgextra/i3/O1CN01Ow7zAMmLeBJ2Yc1a_!!6000000004199-2-tps-1260-734.png)
   > - en_US: ![Copy Skill Config](https://img.alicdn.com/imgextra/i1/O1CN0175UzeUMuM4D64tUK_!!6000000003951-2-tps-2994-1634.png)

4. 按「配置前提」识别用户粘贴的内容。只有完整 `quickbi` MCP server 定义才可继续；若名称缺失，先请用户确认使用 `quickbi`，不得自行命名。
5. 通过当前客户端的 MCP 设置界面、配置命令或配置文件添加 `quickbi` server。仅使用用户提供的完整 server body；不要自行拼接 URL、transport、headers 或凭证，也不要覆盖其他已有 MCP server。
6. 按当前客户端的方式重新加载 MCP server 或重启客户端，并通过其工具列表、连接状态或一次只读的 Quick BI 工具调用确认 `quickbi` 已可用。
7. 仅在 `quickbi` MCP 工具可用后重试被阻塞的原操作；未加载成功时，按当前客户端的报错或官方文档排查。

## 安全约束

- 不主动逐项索取凭证；仅接受用户主动粘贴的环境专属配置。
- 不在对话、日志或示例中回显地址、请求头、AK、SK 或其他鉴权信息。
- 不使用默认、共享或推断的 MCP 地址与凭证。
