# Quick BI MCP 接入指南

> **何时读**：首次使用本 Skill 的步骤 0，或任一 `quickbi-mcp:*` 工具不可用、连接失败、鉴权失败时。

## 配置前提

此 Skill 依赖名为 `quickbi-mcp` 的 MCP server（streamable-http transport）。控制台「一键复制 MCP 配置」直接给出完整可用的 server 配置，其结构如下：

```json
{
  "mcpServers": {
    "quickbi-mcp": {
      "type": "streamable-http",
      "url": "<server_domain>/mcp",
      "headers": {
        "x-quickbi-server-domain": "<server_domain>",
        "x-quickbi-api-key": "<个人级 AccessId>",
        "x-quickbi-api-secret": "<个人级 AccessKey>"
      }
    }
  }
}
```

此 JSON 是通用 MCP 配置结构。不同客户端可能要求整个 `mcpServers` 对象，也可能只要求其中的 `quickbi-mcp` server body；按当前客户端的 MCP 设置说明放入对应位置，但键名、`type`、`url`、`headers` 全部保持复制到的原样。

若粘贴内容缺少 `quickbi-mcp`，或其 `url` / `headers` 不完整，回到步骤 0 让用户重新复制，不得猜测域名或凭证。

## 步骤 0：安装与配置

1. 确认用户正在使用的 AI 客户端或 IDE。若未说明，先询问其 MCP 配置入口或官方配置文档；不得假设命令、配置文件路径或重载方式。
2. 若该客户端支持 user、project、local 等多个配置范围，让用户选择。含鉴权信息的配置应保存在个人或本地私有范围；若该范围会同步、共享或提交到版本库，先提示凭证泄露风险。
3. 引导用户取配置：登录 Quick BI AI Pro 控制台 → 点**左下角头像** → 「个人设置」 → 「账户信息」 → 「获取个人识别码」 → 点「**一键复制 MCP 配置**」，把复制到的内容直接粘贴回对话。复制出的是一段完整 MCP server 配置（一句英文说明加 `mcpServers.quickbi-mcp` JSON），`url` 与鉴权 header 已按用户环境填好，无需再拼装。按用户语言把截图嵌在回复里（红框即入口）：

   - zh_CN: `![一键复制 MCP 配置](https://img.alicdn.com/imgextra/i4/O1CN01jnfXioYnAAB68fdG_!!6000000001269-0-tps-3024-1654.jpg)`
   - en_US: `![Copy MCP Config](https://img.alicdn.com/imgextra/i1/O1CN01O5oNRlYvevH68fd0_!!6000000003924-0-tps-3024-1638.jpg)`

   用户已有完整 `mcpServers.quickbi-mcp` 配置时，直接用它，跳过本步。

4. 从粘贴内容中取出 `quickbi-mcp` 这一个 server 的配置，合并写入当前客户端的 MCP 配置（经其设置界面、配置命令或配置文件），字段保持复制到的原样，不要覆盖或改动其他已有 MCP server。
5. 按当前客户端的方式重新加载 MCP server 或重启客户端，并通过其工具列表、连接状态或一次只读的 Quick BI 工具调用确认 `quickbi-mcp` 已可用。
6. 仅在 `quickbi-mcp` MCP 工具可用后重试被阻塞的原操作；未加载成功时，按当前客户端的报错或官方文档排查。

## 安全约束

- 不逐项索取 AK/SK，只让用户一次性粘贴控制台「一键复制 MCP 配置」复制出的完整配置。
- 不在对话、日志或示例中回显地址、请求头、AK、SK 或其他鉴权信息。
- 不使用默认、共享或推断的域名与凭证。
