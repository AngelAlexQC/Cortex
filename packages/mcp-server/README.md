# Cortex MCP Server

The **Model Context Protocol (MCP)** server for [Cortex](https://github.com/EcuaByte-lat/Cortex).

Connects your AI tools (Claude Desktop, Cursor, Zed, etc.) to your project's persistent memory.

## 🚀 Usage

### Quick Start (Recommended)

Use the CLI to auto-install for all your editors:

```bash
npx @ecuabyte/cortex-cli setup
```

### Manual Usage (npx)

If you just want to run the server once or configure strictly manually:

```bash
npx -y @ecuabyte/cortex-mcp-server
```

### via Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cortex": {
      "command": "npx",
      "args": ["-y", "@ecuabyte/cortex-mcp-server"]
    }
  }
}
```

### via Cursor / Windsurf

1. Go to **Settings** > **MCP**
2. Add new server:
   - **Type**: `command`
   - **Command**: `npx`
   - **Args**: `-y @ecuabyte/cortex-mcp-server`

## 🛠️ Tools

This server provides the following MCP tools to your AI agent:

- `cortex_search`: Search project memories (facts, decisions, code patterns)
- `cortex_add`: Add a new memory
- `cortex_list`: List recent memories
- `cortex_auto_save`: Batch save memories from conversation
- `cortex_remember`: Quick save a single fact
- `cortex_recall`: Get intelligent context/injection for a task
- `cortex_scan`: Scan the current project to extract context automatically
- `cortex_stats`: View memory database statistics
- `cortex_guard`: (Beta) Sanitize output for PII

## 📦 Installation

```bash
npm install -g @ecuabyte/cortex-mcp-server
# or
bun add -g @ecuabyte/cortex-mcp-server
```

## 📄 License

MIT
