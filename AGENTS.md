# AGENTS.md - Cortex

> Instructions for AI agents working on the Cortex ecosystem.

## Vision: "Proactive Context Engine"

Cortex is the operating system for agentic memory. It moves beyond passive retrieval to **Proactive Context Management**.

### Key Moat: ZKDM
**Zero-Knowledge Distributed Memory (ZKDM)** allows multiple AI agents to collaborate using shared project context without leaking private user data or proprietary logic.

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
│   ├── core/              # @cortex/core - SQLite storage + types (bun:sqlite)
│   ├── cli/               # @cortex/cli - Command-line interface  
│   ├── mcp-server/        # @cortex/mcp-server - MCP protocol server
│   └── vscode-extension/  # cortex-vscode - VS Code extension
├── docs/                  # Architecture docs, ADRs, getting-started
├── build.ts               # Monorepo build orchestrator
└── bunfig.toml            # Bun configuration
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

### Development
```bash
# Build extension
bun run build:extension

# Debug: Press F5 in VS Code to launch Extension Development Host
```

## Technical Directives

1. **Local-First Default**: All primary memory operations must work offline.
2. **Privacy**: Zero data telemetry unless explicit Pro sync is enabled.
3. **Speed**: Semantic search must be <200ms.
4. **Interop**: Be the gold standard for MCP server implementations.

## Security Considerations

- Never log or expose user memory content in error messages
- Validate all input types before database operations
- Use parameterized queries (SQLite prepared statements)
- Project isolation: memories are scoped by `projectId` hash

## Pull Request Guidelines

1. Run `bun run check` before committing
2. Ensure all tests pass (`bun test`)
3. Update relevant documentation
4. Follow [Conventional Commits](https://www.conventionalcommits.org/)
5. Keep PRs focused on a single concern

## Architecture Decisions

See `docs/architecture/decisions/` for ADRs:
- `001-use-sqlite.md` - SQLite as storage layer
- `002-project-isolation.md` - Project-based memory isolation
- `003-monorepo-structure.md` - Bun Workspaces monorepo
