# Quick Start

Get up and running with Cortex in under 5 minutes.

## Option 1: VS Code Extension (Recommended)

1. **Install from Marketplace**
   - Search "Cortex" in VS Code Extensions
   - Or install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=EcuaByte.cortex-vscode)

2. **Open your project**
   - Open any project in VS Code

3. **Run AI Scan**
   - Click the brain icon (🧠) in the Activity Bar
   - Click **✨ AI Scan** button
   - Watch as Cortex analyzes your project and extracts memories

4. **Use with Copilot**
   - Copilot can now use `cortex_remember` and `cortex_recall` tools
   - Your memories are automatically available as context

## Option 2: CLI

```bash
# Clone the repository
git clone https://github.com/EcuaByte-lat/Cortex.git
cd Cortex

# Install dependencies
bun install

# Build all packages
bun run build

# Add your first memory
bun --cwd packages/cli run dev add \
  -c "We use PostgreSQL with Prisma ORM for database operations" \
  -t "decision"

# Search memories
bun --cwd packages/cli run dev search "database"

# Get context for a task
bun --cwd packages/cli run dev context "setting up database migrations"
```

## Option 3: MCP Server

For Claude Desktop, Cursor, or other MCP clients:

```json
{
  "mcpServers": {
    "cortex": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/Cortex/packages/mcp-server/dist/mcp-server.js"]
    }
  }
}
```

Then in Claude/Cursor, you can say:
- "Remember that we use TypeScript strict mode"
- "What do you know about our authentication setup?"

## Memory Types

| Type | Use For |
|------|---------|
| `fact` | Technical facts (versions, stack) |
| `decision` | Architectural decisions |
| `code` | Code patterns and examples |
| `config` | Configuration details |
| `note` | General notes |

## Next Steps

- [Development Guide](../DEVELOPMENT.md) - Contributing to Cortex
- [Examples](./examples.md) - More usage examples
