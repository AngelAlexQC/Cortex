# AGENTS.md - Cortex

> Instructions for AI agents working on the Cortex codebase.

## What is Cortex?

**Cortex** is persistent memory for AI agents. It helps AI remember decisions, code patterns, and project context across conversations.

```
┌─ AI Applications (Claude, Copilot, Cursor)
├─ Tool Layer (MCP)     ← How AI DOES things
├─ Memory Layer (Cortex) ← How AI REMEMBERS things ← US
└─ Model Layer (GPT, Claude, Llama)
```

## Quick Start

```bash
bun install          # Install dependencies
bun run build        # Build all packages
bun test             # Run all tests
bun test --coverage  # Run with coverage
```

## Project Structure

```
cortex/
├── packages/
│   ├── core/              # @cortex/core - Storage, routing, guard, fuse
│   ├── shared/            # @cortex/shared - Types and interfaces
│   ├── cli/               # @cortex/cli - Command-line interface
│   ├── mcp-server/        # @cortex/mcp-server - MCP server
│   └── vscode-extension/  # cortex-vscode - VS Code extension
├── docs/                  # Documentation
└── build.ts               # Monorepo build orchestrator
```

## The 5 Primitives

### store & get
```typescript
await cortex.store({ content: "Using JWT RS256", type: "decision" });
const memories = await cortex.search("authentication");
```

### route (Intelligent Context)
```typescript
const context = await cortex.route({
  task: "implementing login",
  currentFile: "src/auth.ts"
});
```

### guard (Privacy Filter)
```typescript
const safe = await cortex.guard(content, {
  filters: ["api_keys", "secrets", "pii"]
});
```

### fuse (Multi-Source)
```typescript
const unified = await cortex.fuse({
  sources: [{ type: "memory" }, { type: "file" }]
});
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `cortex_search` | Search memories by content |
| `cortex_add` | Add new memory |
| `cortex_list` | List recent memories |
| `cortex_stats` | Get memory statistics |
| `cortex_context` | Get task-relevant context |
| `cortex_remember` | LM Tool: AI saves memory |
| `cortex_recall` | LM Tool: AI searches context |

## VS Code Extension Features

- **AI Scanner**: Two-pass intelligent project analysis
- **Visual Webview**: Real-time streaming during scan
- **Language Model Tools**: Copilot can save/recall memories
- **TreeView**: Browse and manage memories
- **Status Bar**: Memory count indicator

## Build Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install all dependencies |
| `bun run build` | Build entire monorepo |
| `bun test` | Run all tests |
| `bun run check` | Biome lint + format |

## Code Style

- **Runtime**: Bun 1.0+
- **Language**: TypeScript 5.7+ strict
- **Linter**: Biome (not ESLint)
- **Module**: ESM only

## Testing

```bash
bun test                    # All tests
bun --cwd packages/core test  # Specific package
bun test --coverage         # Coverage report
```

## Technical Directives

1. **Local-First**: All operations work offline
2. **Privacy by Design**: Zero telemetry, guard for PII
3. **Speed**: Context routing < 200ms
4. **MCP-Native**: Works with any MCP client

## Security

- Never log user context in errors
- Use parameterized queries (SQLite)
- Project isolation via `projectId` hash
- Guard filters: API keys, secrets, PII

## Pull Request Guidelines

1. Run `bun run check` before committing
2. Ensure all tests pass
3. Follow [Conventional Commits](https://www.conventionalcommits.org/)
4. Keep PRs focused on a single concern
