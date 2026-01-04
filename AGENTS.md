# AGENTS.md - Cortex Protocol

> Instructions for AI agents working on the Cortex Protocol ecosystem.

## Vision: "The Universal Context Layer for AI"

Cortex Protocol is an **open standard** for how AI systems store, retrieve, and share context. It defines the missing layer between AI models and the tools they use.

```
┌─ AI Applications (Claude, Copilot, Cursor)
├─ Tool Layer (MCP)     ← "How AI DOES things"
├─ Context Layer (Cortex) ← "How AI KNOWS things" ← US
└─ Model Layer (GPT, Claude, Llama)
```

### Core Philosophy

**Like Stripe reduced payments to 7 lines, Cortex reduces context engineering to 5 primitives:**

```
ctx/store  →  Persist context (facts, decisions, patterns)
ctx/get    →  Retrieve specific context
ctx/route  →  Intelligently select relevant context ✨
ctx/guard  →  Filter sensitive data (PII, secrets)
ctx/fuse   →  Combine multiple context sources
```

### Protocol Principles

1. **Local-First** - Works offline, data never leaves unless you want
2. **User-Owned** - You own your context, not the platforms
3. **Privacy-by-Design** - ctx/guard is a primitive, not a plugin
4. **Interoperable** - MCP-native, A2A compatible, works with any AI
5. **Open Standard** - No vendor lock-in, ever


---

## Quick Start

```bash
# Install dependencies
bun install

# Build all packages (ordered: core → cli, mcp-server, vscode-extension)
bun run build

# Run all tests
bun test

# Run with coverage
bun test --coverage
```

## Project Structure

```
cortex/
├── packages/
│   ├── core/              # @cortex/core - Context primitives + SQLite storage
│   │   ├── storage.ts     # ctx/store, ctx/get (MemoryStore)
│   │   ├── router.ts      # ctx/route (ContextRouter) ← NEW
│   │   ├── guard.ts       # ctx/guard (ContextGuard) ← NEW
│   │   └── fuser.ts       # ctx/fuse (ContextFuser) ← NEW
│   ├── shared/            # @cortex/shared - Types and interfaces
│   ├── cli/               # @cortex/cli - Command-line interface  
│   ├── mcp-server/        # @cortex/mcp-server - MCP protocol server
│   └── vscode-extension/  # cortex-vscode - VS Code extension
├── docs/                  # Architecture docs, ADRs, getting-started
├── build.ts               # Monorepo build orchestrator
└── bunfig.toml            # Bun configuration
```

## The 5 Context Primitives

### ctx/store & ctx/get (Implemented ✅)
```typescript
// Store context
await cortex.store({
  content: "We use JWT with RS256 for authentication",
  type: "decision",
  tags: ["auth", "security"]
});

// Retrieve context
const memories = await cortex.search("authentication");
```

### ctx/route (The Magic ✨)
```typescript
// Intelligently get context relevant to current task
const context = await cortex.route({
  task: "implementing login endpoint",
  currentFile: "src/auth/login.ts",
  limit: 5
});
// Returns: Top 5 most relevant memories for this task
```

### ctx/fuse
```typescript
// Combine multiple context sources
const unified = await cortex.fuse({
  sources: [
    { type: "memory", query: "auth patterns" },
    { type: "file", path: "./docs/auth.md" },
    { type: "session", data: conversationHistory }
  ],
  maxTokens: 4000
});
```

### ctx/guard
```typescript
// Filter sensitive data before sending to LLM
const safe = await cortex.guard(content, {
  filters: ["api_keys", "pii", "secrets"],
  mode: "redact"
});
// "API key: sk-123abc" → "API key: [REDACTED]"
```

## Build & Test Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install all dependencies |
| `bun run build` | Build entire monorepo (parallelized) |
| `bun run build:core` | Build only @cortex/core |
| `bun run build:cli` | Build only @cortex/cli |
| `bun run build:mcp` | Build only @cortex/mcp-server |
| `bun run build:extension` | Build only VS Code extension |
| `bun test` | Run all tests |
| `bun test --coverage` | Run tests with coverage |
| `bun run typecheck` | TypeScript type checking |
| `bun run check` | Biome lint + format |

## Code Style Guidelines

### General
- **Runtime**: Bun 1.0+ (use `bun:sqlite` for database)
- **Language**: TypeScript 5.7+ with strict mode
- **Linter/Formatter**: Biome (not ESLint/Prettier)
- **Module System**: ESM only (`"type": "module"`)

### Conventions
- Use **camelCase** for variables/functions, **PascalCase** for types/classes
- Prefer `const` over `let`, never use `var`
- Use explicit return types for public functions
- Document public APIs with JSDoc comments
- No `console.log` in production code (use `console.error` for CLI/server output)

### File Organization
- Put tests in `src/__tests__/` with `.test.ts` suffix
- Export from package entry point (`src/index.ts`)
- Keep files under 500 lines; split if larger

## Testing Instructions

```bash
# Run all tests
bun test

# Run specific package tests
bun --cwd packages/core test
bun --cwd packages/vscode-extension test

# Watch mode
bun test --watch

# Coverage (aim for >90%)
bun test --coverage
```

### Test Conventions
- Use Bun's native test runner (`bun test`)
- Use temporary in-memory databases for storage tests
- Clean up temp files/directories after tests
- Test edge cases: empty strings, null, undefined, invalid types

## MCP Server Implementation

The MCP server (`packages/mcp-server`) implements the Model Context Protocol for AI tool integration.

### Available Tools
| Tool | Description |
|------|-------------|
| `cortex_search` | Search memories by content |
| `cortex_add` | Add new memory |
| `cortex_list` | List recent memories |
| `cortex_stats` | Get memory statistics |
| `cortex_context` | **NEW**: Get intelligent, task-relevant context |

### Testing MCP Server
```bash
# Build and run
bun run build:mcp
bun run packages/mcp-server/dist/mcp-server.js
```

## VS Code Extension

The extension (`packages/vscode-extension`) provides:
- TreeView for memory browsing
- Webview for memory management
- TaskProvider for project tools
- ToolScanner for workspace scanning
- **NEW**: Auto-inject context based on active file

### Development
```bash
# Build extension
bun run build:extension

# Debug: Press F5 in VS Code to launch Extension Development Host
```

## Technical Directives

1. **Local-First Default**: All context operations must work offline.
2. **Privacy by Design**: Zero telemetry. ctx/guard for PII filtering.
3. **Speed**: Context routing must be <200ms.
4. **Simplicity**: 5 primitives that compose into any solution.
5. **Interop**: MCP-native, works with any AI tool.

## Security Considerations

- Never log or expose user context in error messages
- Validate all input types before database operations
- Use parameterized queries (SQLite prepared statements)
- Project isolation: context scoped by `projectId` hash
- ctx/guard filters: API keys, secrets, PII, credentials

## Pull Request Guidelines

1. Run `bun run check` before committing
2. Ensure all tests pass (`bun test`)
3. Update relevant documentation
4. Follow [Conventional Commits](https://www.conventionalcommits.org/)
5. Keep PRs focused on a single concern

## Architecture Decisions

See `docs/architecture/decisions/` for ADRs:
- `001-use-sqlite.md` - SQLite as storage layer
- `002-project-isolation.md` - Project-based context isolation
- `003-monorepo-structure.md` - Bun Workspaces monorepo
- `004-context-primitives.md` - The 5 context primitives (NEW)
