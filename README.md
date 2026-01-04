# 🧠 Cortex Protocol

<p align="center">
  <img src="docs/branding/png/icon-512.png" alt="Cortex Logo" width="128" height="128">
</p>

<p align="center">
  <strong>The Universal Context Layer for AI</strong>
</p>

<p align="center">
  <a href="https://github.com/EcuaByte-lat/Cortex/actions/workflows/ci.yml"><img src="https://github.com/EcuaByte-lat/Cortex/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/EcuaByte-lat/Cortex"><img src="https://codecov.io/gh/EcuaByte-lat/Cortex/branch/main/graph/badge.svg" alt="Coverage"></a>
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

## What is Cortex Protocol?

**Cortex Protocol** is an open standard for how AI systems store, retrieve, and share context. Think of it as the missing layer between AI models and the tools they use.

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI APPLICATIONS                              │
│  Claude | ChatGPT | Copilot | Cursor | Your Agent              │
├─────────────────────────────────────────────────────────────────┤
│                    TOOL LAYER (MCP)                             │
│  "How AI DOES things" - Files, APIs, Databases                 │
├─────────────────────────────────────────────────────────────────┤
│                    CONTEXT LAYER (Cortex) ← YOU ARE HERE        │
│  "How AI KNOWS things" - Memory, Decisions, Patterns           │
├─────────────────────────────────────────────────────────────────┤
│                    MODEL LAYER                                  │
│  GPT | Claude | Llama | Gemini | Mistral                       │
└─────────────────────────────────────────────────────────────────┘
```

**MCP** standardizes how AI connects to tools.  
**Cortex** standardizes how AI remembers and shares knowledge.

## 🎯 The Problem

Every AI interaction suffers from the same fundamental issue:

> **AI doesn't know what you know.**

- It forgets your past decisions
- It doesn't know your project context
- It can't remember between sessions
- Multiple agents can't share what they learned

This affects **billions of AI interactions daily**, across every industry.

## ✨ The Solution: 5 Composable Primitives

```typescript
ctx/store   // Persist context (facts, decisions, patterns)
ctx/get     // Retrieve specific context
ctx/route   // Intelligently select relevant context ✨
ctx/guard   // Filter sensitive data (API keys, PII)
ctx/fuse    // Combine multiple context sources
```

## 🔐 Why Cortex?

| Principle | Description |
|-----------|-------------|
| **Local-First** | Your context never leaves your machine unless you want it to |
| **User-Owned** | You own your data, not the platforms |
| **Privacy-by-Design** | `ctx/guard` is a primitive, not a plugin |
| **Interoperable** | Works with any AI (MCP, A2A compatible) |
| **Open Standard** | No vendor lock-in, ever |

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

## 📦 Architecture

```
cortex/
├── packages/
│   ├── core/              # Context primitives (store, route, guard, fuse)
│   ├── shared/            # Types and interfaces
│   ├── cli/               # Command-line interface
│   ├── mcp-server/        # MCP protocol server
│   └── vscode-extension/  # VS Code extension
├── docs/
│   └── protocol/          # Cortex Protocol Specification
└── sdks/                  # Language SDKs (coming soon)
```

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧠 **Intelligent Routing** | Automatically selects relevant context for your task |
| 🔒 **Privacy Guard** | Filters API keys, secrets, and PII before sending to LLMs |
| 📁 **Project Isolation** | Context automatically scoped to your project |
| ⚡ **Local-First** | Works offline, zero cloud dependency |
| 🔗 **MCP-Native** | Built on the Linux Foundation standard |
| 🔍 **Full-Text Search** | SQLite FTS5 for instant search |

## 🗺️ Roadmap

### Phase 1: Foundation (Current)
- [x] Core primitives (store, get, route, guard, fuse)
- [x] MCP Server
- [x] VS Code Extension
- [ ] Semantic search with embeddings
- [ ] Protocol Specification v1.0

### Phase 2: Semantic
- [ ] Embedding-based routing
- [ ] Relation graphs between context
- [ ] Context compression

### Phase 3: Sync
- [ ] `ctx/sync` - Multi-device synchronization
- [ ] Cortex Cloud (optional)
- [ ] Team collaboration

### Phase 4: Federation
- [ ] `ctx/federate` - Share context across organizations
- [ ] `ctx/attest` - Verify context authenticity
- [ ] Zero-knowledge proofs

### Phase 5: Standard
- [ ] Submit to Linux Foundation / AAIF
- [ ] Formal standard adoption

## 📚 Documentation

- **[Protocol Specification](./docs/protocol/SPEC.md)** - The formal standard
- **[Quick Start](./docs/getting-started/quick-start.md)** - 5-minute setup
- **[Development Guide](./docs/DEVELOPMENT.md)** - For contributors
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
  <strong>Cortex Protocol — The Universal Context Layer for AI</strong>
</p>

<p align="center">
  Built with ❤️ by <a href="https://github.com/EcuaByte-lat">EcuaByte</a>
</p>
