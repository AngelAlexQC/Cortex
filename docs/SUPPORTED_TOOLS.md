# 🛠️ Supported Tools & Editors (2026 Ready)

Cortex is designed to be the **universal memory layer** for the next generation of AI development tools. It builds upon the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), ensuring compatibility with any tool that speaks this open standard.

## ✅ Native Integrations

These editors are supported out-of-the-box by our **Auto-Installer**.

| Editor | Support Level | Config Method |
|--------|---------------|---------------|
| **Cursor** | ⭐ Premium | `bunx @ecuabyte/cortex-mcp-server generate-config --target cursor` |
| **Windsurf** | ⭐ Premium | `bunx @ecuabyte/cortex-mcp-server generate-config --target windsurf` |
| **Antigravity IDE** | ⭐ Premium | `bunx @ecuabyte/cortex-mcp-server generate-config --target antigravity` |
| **Gemini CLI** | ⭐ Premium | `bunx @ecuabyte/cortex-mcp-server generate-config --target gemini` |
| **VS Code** | ⭐ Native | [Extension](https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode) or MCP |
| **Claude Desktop** | ⭐ Full | `bunx @ecuabyte/cortex-mcp-server generate-config --target claude-desktop` |
| **Claude Code** | ⭐ Experimental | `bunx @ecuabyte/cortex-mcp-server generate-config --target claude` |
| **Zed** | 🟢 Standard | `bunx @ecuabyte/cortex-mcp-server generate-config --target zed` |

## 🔌 Universal MCP Support

Any tool that supports the Model Context Protocol (MCP) can connect to Cortex manually using the standard configuration:

```json
{
  "mcpServers": {
    "cortex": {
      "command": "bunx",
      "args": ["@ecuabyte/cortex-mcp-server"]
    }
  }
}
```

### Verified Compatible Agents
- **Goose** (Block)
- **OpenInterpreter**
- **Aider** (via MCP adapter)
- **Roo Code** (VS Code Extension)

## 🔮 Future Compatibility

As an open-source project following the 2026 Agentic Web standards, Cortex is committed to supporting:
- All major IDEs via MCP.
- Terminal-based agents.
- Browser-based development environments (IDX, Codespaces).
