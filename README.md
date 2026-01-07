# 🧠 Cortex

<p align="center">
  <img src="docs/branding/png/icon-512.png" alt="Cortex Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Own Your AI's Memory — Local-First, Privacy-First</strong>
</p>

<p align="center">
  <a href="https://github.com/EcuaByte-lat/Cortex/actions/workflows/unified.yml"><img src="https://github.com/EcuaByte-lat/Cortex/actions/workflows/unified.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/EcuaByte-lat/Cortex"><img src="https://codecov.io/gh/EcuaByte-lat/Cortex/branch/main/graph/badge.svg" alt="Coverage"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode"><img src="https://img.shields.io/visual-studio-marketplace/v/EcuaByte.cortex-vscode?label=VS%20Code&logo=visualstudiocode&color=007ACC" alt="VS Code"></a>
  <a href="https://open-vsx.org/extension/EcuaByte/cortex-vscode"><img src="https://img.shields.io/open-vsx/v/EcuaByte/cortex-vscode?label=Open%20VSX&logo=eclipseide&color=purple" alt="Open VSX"></a>
</p>

---

## 🚀 What is Cortex?

**Cortex** solves the "amnesia" problem for AI coding assistants. Your AI forgets everything when you close the window. Cortex doesn't.

It's a **universal, persistent memory layer** that lets your AI (Copilot, Claude, Cursor, etc.) remember:

*   🏛️ **Architecture Decisions**: "We use Feature-Sliced Design"
*   💡 **Code Patterns**: "All React components must use functional style"
*   🔧 **Configuration**: "Production uses AWS RDS with specific flags"
*   🚫 **Exclusions**: "Never touch the legacy payment module"

Unlike cloud-based solutions, Cortex stores everything **locally on your machine** (`~/.cortex/memories.db`). Your code context never leaves your computer.

> **💡 Stop teaching your AI the same things over and over.**

## ✨ Key Features

### 1. 🧠 AI-Powered Project Scanner (Two-Pass)
Cortex doesn't just "read files". It performs a **semantic analysis** of your entire project:
1.  **Pass 1 (Tree Scan):** The AI analyzes your file structure to understand the project's topology.
2.  **Pass 2 (Extraction):** It selectively reads key files to extract "Facts", "Decisions", and "Patterns", storing them as structured memories.

### 2. 🌐 Universal MCP Support
Built on the **Model Context Protocol (MCP)**, Cortex works with *any* modern AI tool:
*   **VS Code / Cursor / Windsurf**: Native integration.
*   **Claude Desktop**: Full memory access.
*   **JetBrains / Neovim**: Via MCP stdio.
*   **Command Line Agents**: Works with Goose, Zed, and others.

### 3. 🔐 Privacy & Local-First
*   **100% Local Storage:** Memories are stored in SQLite (`~/.cortex/memories.db`) on your machine.
*   **Privacy Guard:** (Coming Soon) Automatic PII redaction before context injection.
*   **Project Isolation:** Memories are automatically scoped to the specific git repository you are working on.

### 4. 🔎 Hybrid Search
Cortex uses a hybrid approach for finding context:
*   **FTS5 (Full Text Search):** Fast, exact matching for keywords/symbols.
*   **Vectors (Semantic Search):** (Optional) If you provide an `OPENAI_API_KEY`, Cortex enables semantic understanding to find related concepts even if keywords don't match.

## 🛠️ Installation & Setup

### A. VS Code / Cursor / Windsurf (Recommended)

**Option 1: One-Click Install**
*   **VS Code:** [Install from Marketplace](https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode)
*   **OpenVSX (VSCodium, etc.):** [Install from OpenVSX](https://open-vsx.org/extension/EcuaByte/cortex-vscode)
*   **Google IDX:** Add `"EcuaByte.cortex-vscode"` to your `.idx/dev.nix`.

**Option 2: Native MCP Integration (Advanced)**
For editors like **Cursor** (Composer) or **Windsurf** that support MCP natively:

Run this command to generate the configuration:
```bash
npx -y @ecuabyte/cortex-mcp-server generate-config --target cursor
```
*Then copy the output into your editor's MCP settings.*

### B. Claude Desktop

To give accessible memory to Claude:

```bash
# Generate config automatically
npx -y @ecuabyte/cortex-mcp-server generate-config --target claude >> ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

*Or manually add:*
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

### C. Command Line Agents (Goose, etc.)

```bash
goose configure mcp add cortex "npx -y @ecuabyte/cortex-mcp-server"
```

## 📦 Architecture

Cortex allows you to compose 5 core primitives:

```typescript
// 1. STORE: Save items (facts, decisions, code)
await cortex.store({ content: "Use Zod for validation", type: "decision" });

// 2. ROUTE: Find context relevant to a generic query
const context = await cortex.route({ task: "Implement user login" });

// 3. GET: Retrieve specific memories
const memories = await cortex.get({ type: "code", tags: ["auth"] });

// 4. GUARD: (Beta) Sanitize output
const safe = await cortex.guard(content);

// 5. SCAN: Analyze project structure
await cortex.scan();
```

## 🗺️ Roadmap & Status

| Feature | Status | Notes |
|:---|:---:|:---|
| **Core Storage (SQLite)** | ✅ | Production ready, local FTS5 |
| **Vector Search** | 🚧 | Supported via OpenAI API, improving local embeddings |
| **VS Code Extension** | ✅ | Full UI, AI Scanner, Native Models |
| **MCP Server** | ✅ | Universal support (Claude, Cursor, etc.) |
| **Privacy Guard** | ⏳ | In development |
| **Multi-Agent Sync** | 🔮 | Future |

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md).

```bash
git clone https://github.com/EcuaByte-lat/Cortex.git
cd Cortex
bun install
bun run build
```

## 📄 License

MIT License © [EcuaByte](https://github.com/EcuaByte-lat)

---

## ☁️ Cloud Services

Need multi-device sync, team collaboration, or enterprise features? Check out [Cortex Cloud](https://cortex.ecuabyte.lat).
