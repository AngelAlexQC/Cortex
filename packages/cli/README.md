# 🧠 Cortex CLI

The command-line interface for **Cortex**, the persistent memory layer for AI coding tools.

## 🚀 Installation

```bash
# Run directly (Recommended)
npx @ecuabyte/cortex-cli setup

# Or install globally
npm install -g @ecuabyte/cortex-cli
```

## 🛠️ Usage

### Auto-Configuration (`install`)

Automatically configures your installed AI editors (Cursor, Windsurf, Claude Code, etc.) to use Cortex.

```bash
# Configure all detected editors globally
cortex install

# Configure for current project only (local config)
cortex install --project

# Configure specific editor
cortex install --editor cursor
```

**Supported Editors:**
- Gemini Code Assist (`~/.gemini/settings.json`) **[NEW]**
- Cursor (`.cursor/mcp.json`)
- Windsurf (`.codeium/windsurf/mcp_config.json`)
- Claude Code (`.claude/settings.json`)
- Claude Desktop (`claude_desktop_config.json`)
- VS Code (`settings.json`)
- Zed (`settings.json`)

### Quick Setup (`setup`)

Initializes Cortex for the current project:
1. Configures editors (local project scope)
2. Creates Always-On rule files (`.cursorrules`, `CLAUDE.md`, `AGENTS.md`)
3. Performs an AI-powered project scan for deep context extraction

```bash
cortex setup
```

### Memory Management

```bash
# Add a memory manually
cortex add -c "API requires Auth header" -t fact -s "manual"

# Search memories
cortex search "auth header"
cortex search "auth" --semantic # Requires AI provider

# List recent memories
cortex list
```

### Project Scanning

Analyze your codebase to extract patterns, architecture decisions, and TODOs automatically.

```bash
cortex scan
```

## 🤖 First Run

On the first run of any command, Cortex will automatically attempt to detect and configure your installed editors to ensure you're ready to go immediately.
