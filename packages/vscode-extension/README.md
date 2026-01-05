# Cortex - VS Code Extension

**Persistent Memory for AI Agents**

Cortex gives your AI assistants persistent memory. It remembers your decisions, code patterns, and project context — so AI doesn't start from scratch every conversation.

## Features

### 🧠 AI-Powered Project Scanner
Automatically analyze your project and extract memories. The AI:
1. Reviews your project structure
2. Selects the most important files
3. Extracts facts, decisions, and patterns
4. Saves them as searchable memories

### 🔍 Intelligent Context Routing
Cortex automatically finds relevant context for your current task based on:
- Keywords and semantic similarity
- File path relevance
- Memory type and tags
- Recency

### 🔒 Privacy Guard
Filters sensitive data (API keys, secrets, PII) before sending context to LLMs.

### 🔗 Copilot Integration
Native Language Model Tools for GitHub Copilot:
- `cortex_remember`: AI can save memories directly
- `cortex_recall`: AI can search and retrieve context

### ⚡ Local-First
Your data stays on your machine. Works completely offline.

## Usage

1. Click the brain icon (🧠) in the Activity Bar
2. Click **✨ AI Scan** to analyze your project
3. Browse and manage memories in the TreeView
4. Use the webview panel for detailed memory management

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+M` | Add memory from selection |
| `Ctrl+Shift+S` | Search memories |
| `Ctrl+Shift+Alt+M` | Open memory webview |

## MCP Integration

Works with Claude, Cursor, Continue.dev and other MCP clients.

## Requirements

- VS Code 1.95.0+
- Bun runtime (for MCP server)

## Links

- [GitHub](https://github.com/EcuaByte-lat/Cortex)
- [Documentation](https://github.com/EcuaByte-lat/Cortex#readme)
- [Report Issue](https://github.com/EcuaByte-lat/Cortex/issues)

## License

MIT
