# 🧠 Cortex

<p align="center">
  <img src="docs/branding/png/icon-512.png" alt="Cortex Logo" width="128" height="128">
</p>

<p align="center">
  <strong>The Context Layer for AI Coding Assistants</strong>
</p>

<p align="center">
  <a href="https://github.com/EcuaByte-lat/Cortex/actions/workflows/ci.yml"><img src="https://github.com/EcuaByte-lat/Cortex/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/EcuaByte-lat/Cortex"><img src="https://img.shields.io/codecov/c/github/EcuaByte-lat/Cortex?logo=codecov" alt="Coverage"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://github.com/EcuaByte-lat/Cortex/releases"><img src="https://img.shields.io/github/v/release/EcuaByte-lat/Cortex?logo=github&label=release" alt="GitHub Release"></a>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode"><img src="https://img.shields.io/visual-studio-marketplace/v/EcuaByte.cortex-vscode?label=VS%20Code&logo=visualstudiocode&color=007ACC" alt="VS Code"></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-1.0+-black?logo=bun" alt="Bun"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript" alt="TypeScript"></a>
  <a href="https://github.com/EcuaByte-lat/Cortex/stargazers"><img src="https://img.shields.io/github/stars/EcuaByte-lat/Cortex?style=social" alt="GitHub Stars"></a>
</p>

---

**Stop telling AI what your project already knows.** Cortex intelligently manages context for AI coding assistants — storing, routing, and protecting your project knowledge.

## 🎯 The Problem

AI assistants forget everything between sessions. You repeat the same context. They miss relevant patterns. Context windows fill with noise.

## ✨ The Solution: 5 Simple Primitives

Like Stripe reduced payments to 7 lines of code, Cortex reduces context engineering to **5 composable primitives**:

```typescript
ctx/store   // Store context (facts, decisions, patterns)
ctx/get     // Retrieve specific context  
ctx/route   // Intelligently decide WHAT context to inject ✨
ctx/fuse    // Combine multiple context sources
ctx/guard   // Filter sensitive data (API keys, PII)
```

## 🚀 Quick Start

```bash
# Install
bun install && bun run build

# Add context
bun --cwd packages/cli run dev add -c "We use PostgreSQL with Prisma ORM" -t "decision"

# Get intelligent context for your current task
bun --cwd packages/cli run dev context "implementing user authentication"
```

## 🔗 MCP Integration

Cortex is **MCP-native** — works with Claude, Copilot, Cursor, and any MCP client.

```json
// VS Code or Claude Desktop config
{
  "mcpServers": {
    "cortex": {
      "command": "bun",
      "args": ["run", "/path/to/Cortex/packages/mcp-server/dist/mcp-server.js"]
    }
  }
}
```

Then in your AI chat:
```
@cortex What context is relevant for implementing the login flow?
```

## 📦 Architecture

```
cortex/
├── packages/
│   ├── core/              # Context primitives (store, route, guard, fuse)
│   ├── shared/            # Types and interfaces
│   ├── cli/               # Command-line interface
│   ├── mcp-server/        # MCP protocol server
│   └── vscode-extension/  # VS Code extension
└── docs/                  # Documentation
```

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧠 **Intelligent Routing** | Automatically selects relevant context for your current task |
| 🔒 **Privacy Guard** | Filters API keys, secrets, and PII before sending to LLMs |
| 📁 **Project Isolation** | Context automatically scoped to your project |
| ⚡ **Local-First** | Works offline, zero cloud dependency |
| 🔗 **MCP-Native** | Built on the Linux Foundation standard |
| 🔍 **Full-Text Search** | SQLite FTS5 for instant search |

## 🛠️ Stack

- **Bun** - Runtime + Bundler (50x faster than npm)
- **SQLite** - Local storage (bun:sqlite native)
- **MCP** - Model Context Protocol (Linux Foundation standard)
- **TypeScript** - Type safety throughout

## 🗺️ Roadmap

- [x] **ctx/store + ctx/get** - Memory storage layer
- [x] **MCP Server** - AI tool integration
- [x] **VS Code Extension** - Visual interface
- [x] **ctx/route** - Intelligent context routing
- [x] **ctx/guard** - PII and secrets filtering
- [x] **ctx/fuse** - Multi-source context fusion
- [ ] **Embeddings** - Semantic search with sqlite-vec (In Progress)
- [ ] **ZKDM** - Zero-knowledge context sharing
- [ ] **Multi-Agent SDK** - LangChain, CrewAI, AutoGen integration

## 📚 Documentation

- **[Quick Start](./docs/getting-started/quick-start.md)** - 5-minute setup
- **[Development Guide](./docs/DEVELOPMENT.md)** - For contributors
- **[Architecture Decisions](./docs/architecture/decisions/)** - Design rationale
- **[AGENTS.md](./AGENTS.md)** - AI agent instructions

## 🤝 Contributing

```bash
git clone https://github.com/EcuaByte-lat/Cortex.git
cd Cortex
bun install && bun run build && bun test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - See [LICENSE](./LICENSE)

---

<p align="center">
  <strong>Built with ❤️ by <a href="https://github.com/EcuaByte-lat">EcuaByte</a></strong>
</p>
