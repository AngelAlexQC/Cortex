# 🧠 Cortex Memory

<p align="center">
  <img src="https://raw.githubusercontent.com/EcuaByte-lat/Cortex/main/docs/branding/png/icon-512.png" alt="Cortex Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Persistent memory for AI coding assistants</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode"><img src="https://img.shields.io/visual-studio-marketplace/v/EcuaByte.cortex-vscode?label=VS%20Code%20Marketplace&logo=visualstudiocode&color=007ACC" alt="VS Code Marketplace"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode"><img src="https://img.shields.io/visual-studio-marketplace/d/EcuaByte.cortex-vscode?color=007ACC" alt="Downloads"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode"><img src="https://img.shields.io/visual-studio-marketplace/r/EcuaByte.cortex-vscode?color=007ACC" alt="Rating"></a>
  <a href="https://github.com/EcuaByte-lat/Cortex/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
</p>

---

Stop repeating yourself to AI tools. **Cortex** remembers your project context across all sessions and tools.

## ✨ Features

### 🧠 Persistent Memory
Save important context that survives between coding sessions. Never explain your project architecture to AI tools again.

### 📁 Project Isolation  
Memories are automatically isolated per project using git root or package.json detection.

### 🏷️ 5 Memory Types
Organize your memories:
- **fact** - Project facts and context
- **decision** - Architecture and design decisions  
- **code** - Code snippets and patterns
- **config** - Configuration details
- **note** - General notes

### 🔍 Full-Text Search
Find any memory instantly with powerful search.

### 🔗 Multi-Tool Integration
Works seamlessly with:
- GitHub Copilot
- Claude (via MCP)
- Cursor
- Continue

## 🆕 New in 0.3.0

- **✨ Modern UI** - Completely redesigned webview and activity bar icon
- **🧠 Memory Icons** - Type-specific colored icons for better visibility
- **🗺️ Interactive Walkthrough** - Easy onboarding for new users
- **⌨️ Keyboard Shortcuts** - Fast context capture without leaving your keyboard
- **📋 Copy Button** - Quickly copy memories from the detail view

## ⌨️ Keyboard Shortcuts

| Command | Keybinding |
|---------|------------|
| **Add Memory** | `Ctrl+Shift+M` |
| **Search Memories** | `Ctrl+Shift+Alt+M` |
| **Save Selection** | `Ctrl+Shift+S` (with text selected) |

## 📸 Screenshots


### Memory Tree View
View and manage all your memories in a dedicated sidebar panel.

### Quick Add Memory
Use `Ctrl+Shift+P` → "Cortex: Add Memory" to quickly save context.

## 🚀 Quick Start

1. **Install** the extension from VS Code Marketplace
2. **Open** a project folder
3. **Add a memory** using `Ctrl+Shift+P` → "Cortex: Add Memory"
4. **View memories** in the Cortex panel in the Activity Bar

## ⚙️ Commands

| Command | Description |
|---------|-------------|
| `Cortex: Add Memory` | Add a new memory to the current project |
| `Cortex: Search Memories` | Search through all memories |
| `Cortex: Refresh` | Refresh the memory tree view |
| `Cortex: Delete Memory` | Delete a selected memory |
| `Cortex: View Memory Details` | View full details of a memory |

## 🔗 MCP Integration

Cortex includes an MCP (Model Context Protocol) server for integration with AI tools.

### GitHub Copilot

1. Open Command Palette: `Ctrl+Shift+P`
2. Run: "MCP: Open User Configuration"
3. Add Cortex server configuration
4. Use in chat: `@cortex search "your query"`

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cortex": {
      "command": "bun",
      "args": ["run", "/path/to/Cortex/packages/mcp-server/dist/mcp-server.js"]
    }
  }
}
```

## 📋 Requirements

- VS Code 1.85.0 or higher
- No additional dependencies required

## 🐛 Known Issues

See [GitHub Issues](https://github.com/EcuaByte-lat/Cortex/issues) for known issues and feature requests.

## 📝 Release Notes

### 0.2.2
- Added official branding and icons
- Improved extension packaging

### 0.2.0
- Initial release
- Memory tree view
- Add, search, delete memories
- Project isolation
- MCP server integration

## 🤝 Contributing

Contributions are welcome! See our [Contributing Guide](https://github.com/EcuaByte-lat/Cortex/blob/main/CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](https://github.com/EcuaByte-lat/Cortex/blob/main/LICENSE)

---

<p align="center">
  <strong>Made with ❤️ by <a href="https://github.com/EcuaByte-lat">EcuaByte</a></strong>
</p>
