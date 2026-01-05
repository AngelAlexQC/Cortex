# 🧠 Cortex

<p align="center">
  <img src="docs/branding/png/icon-512.png" alt="Cortex Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Persistent Memory for AI Agents</strong>
</p>

<p align="center">
  <a href="https://github.com/EcuaByte-lat/Cortex/actions/workflows/unified.yml"><img src="https://github.com/EcuaByte-lat/Cortex/actions/workflows/unified.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/EcuaByte-lat/Cortex"><img src="https://codecov.io/gh/EcuaByte-lat/Cortex/branch/main/graph/badge.svg" alt="Coverage"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode"><img src="https://img.shields.io/visual-studio-marketplace/v/EcuaByte.cortex-vscode?label=VS%20Code&logo=visualstudiocode&color=007ACC" alt="VS Code"></a>
  <a href="https://open-vsx.org/extension/EcuaByte/cortex-vscode"><img src="https://img.shields.io/open-vsx/v/EcuaByte/cortex-vscode?label=Open%20VSX&logo=eclipseide&color=purple" alt="Open VSX"></a>
</p>

---

## What is Cortex?

**Cortex** gives your AI agents persistent memory. It remembers your decisions, code patterns, and project context — so AI doesn't start from scratch every conversation.

```
Before Cortex:  AI forgets everything between sessions
After Cortex:   AI remembers your architecture, decisions, and preferences
```

**Works with:** GitHub Copilot, Claude, Cursor, Continue.dev, and any MCP-compatible client.

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧠 **AI-Powered Scanner** | Analyzes your project and extracts memories automatically |
| 🔍 **Intelligent Routing** | Automatically finds relevant context for your current task |
| 🔒 **Privacy Guard** | Filters API keys, secrets, and PII before sending to LLMs |
| 📁 **Project Isolation** | Context automatically scoped to your project |
| ⚡ **Local-First** | Your data stays on your machine. Works offline |
| 🔗 **MCP-Native** | Deep integration with Claude, Copilot, and modern AI tools |

## 🚀 Quick Start

### 1. VS Code / Cursor / Windsurf (Recommended)

**Option A: Marketplace (Easiest)**
1. Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode) or [Open VSX Registry](https://open-vsx.org/extension/EcuaByte/cortex-vscode).
2. Click the brain icon (🧠) in the Activity Bar.
3. Click **✨ AI Scan** to analyze your project.

**Option B: Manual Install (Restricted Environments / Google IDX)**
If you are in a corporate environment or Google IDX where the extension doesn't show up:
1. Download the `.vsix` file from the [latest release](https://github.com/EcuaByte-lat/Cortex/releases).
2. Drag and drop it into your editor's Extensions panel.
3. *Google IDX Users*: Add `"EcuaByte.cortex-vscode"` to your `.idx/dev.nix` extensions list.

### CLI

```bash
# Clone and build
git clone https://github.com/EcuaByte-lat/Cortex.git
cd Cortex && bun install && bun run build

# Add a memory
bun --cwd packages/cli run dev add -c "We use PostgreSQL with Prisma ORM" -t "decision"

# Search memories
bun --cwd packages/cli run dev search "database"

# Get context for a task
bun --cwd packages/cli run dev context "implementing user authentication"
```

### MCP Integration

Add to your Claude Desktop or VS Code settings:

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

## 📦 Packages

| Package | Description |
|---------|-------------|
| `@cortex/core` | Storage, routing, and context primitives |
| `@cortex/cli` | Command-line interface |
| `@cortex/mcp-server` | MCP server for AI integration |
| `cortex-vscode` | VS Code extension with AI scanner |

## 🛠️ How It Works

Cortex provides 5 composable primitives:

```typescript
// Store context
await cortex.store({ content: "Using JWT with RS256", type: "decision" });

// Get relevant context for your task
const context = await cortex.route({ task: "implementing auth endpoint" });

// Filter sensitive data before sending to LLM
const safe = await cortex.guard(content, { filters: ["api_keys", "secrets"] });

// Combine multiple sources
const unified = await cortex.fuse({ sources: [memory, file, session] });
```

## 🗺️ Roadmap

### ✅ Current (v0.4.0)
- [x] 5 context primitives (store, get, route, guard, fuse)
- [x] VS Code extension with AI scanner
- [x] Language Model Tools for Copilot
- [x] MCP server
- [x] CLI

### 🔜 Next
- [ ] Semantic search with embeddings
- [ ] Memory relations and graphs
- [ ] Context compression
- [ ] Multi-project support

## 🤝 Contributing

```bash
git clone https://github.com/EcuaByte-lat/Cortex.git
cd Cortex
bun install && bun run build && bun test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📚 Documentation

- [Quick Start](./docs/getting-started/quick-start.md)
- [Development Guide](./docs/DEVELOPMENT.md)
- [AI Agent Instructions](./AGENTS.md)

## 📄 License

MIT License - See [LICENSE](./LICENSE)

---

<p align="center">
  <strong>Cortex — Persistent Memory for AI Agents</strong>
</p>

<p align="center">
  Built with ❤️ by <a href="https://github.com/EcuaByte-lat">EcuaByte</a>
</p>
