# GitHub Copilot Instructions for Cortex

This file provides project-specific instructions for GitHub Copilot when working on the Cortex codebase.

## Project Overview

Cortex is a persistent memory system for AI coding assistants built as a Bun monorepo. It provides local-first storage with SQLite, an MCP server for AI tool integration, a CLI, and a VS Code extension.

## Tech Stack

- **Runtime**: Bun 1.0+ (NOT Node.js)
- **Language**: TypeScript 5.7+ with strict mode
- **Database**: SQLite via `bun:sqlite` (NOT better-sqlite3 or sql.js)
- **Linter/Formatter**: Biome (NOT ESLint or Prettier)
- **Package Manager**: Bun Workspaces
- **Test Runner**: Bun's native test runner (`bun test`)
- **Protocol**: Model Context Protocol (MCP) for AI integrations

## Coding Guidelines

### TypeScript
- Always use explicit return types for public functions
- Prefer `interface` over `type` for object shapes
- Use `const` assertions and `as const` for literal types
- Always handle null/undefined cases explicitly
- Use `satisfies` operator for type-safe object literals

### Imports
```typescript
// ✅ Correct: Use package imports
import { MemoryStore } from '@cortex/core';

// ❌ Wrong: Don't use relative paths across packages
import { MemoryStore } from '../../core/src';
```

### Error Handling
```typescript
// ✅ Correct: Throw typed errors with context
throw new Error(`Invalid memory type: "${type}". Must be one of: ${MEMORY_TYPES.join(', ')}`);

// ❌ Wrong: Vague error messages
throw new Error('Invalid type');
```

### Database Operations
```typescript
// ✅ Correct: Use parameterized queries
const stmt = this.db.prepare('SELECT * FROM memories WHERE id = ?');
const result = stmt.get(id);

// ❌ Wrong: String interpolation (SQL injection risk)
this.db.query(`SELECT * FROM memories WHERE id = ${id}`);
```

## File Naming Conventions

- Component files: `camelCase.ts` (e.g., `memoryStore.ts`)
- Test files: `*.test.ts` in `src/__tests__/`
- Type files: `types.ts` or inline in implementation
- Entry points: `index.ts`

## Common Patterns

### Memory Types
Always use the valid memory types:
```typescript
type MemoryType = 'fact' | 'decision' | 'code' | 'config' | 'note';
```

### Project Isolation
Memories are isolated by project. Always respect `projectId`:
```typescript
// Get current project ID
const projectId = store.getProjectId();

// Use globalMode only when explicitly needed
const globalStore = new MemoryStore({ globalMode: true });
```

### MCP Tool Implementation
When adding new MCP tools, follow this pattern:
```typescript
{
  name: 'cortex_toolname',
  description: 'Clear description of what the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'What this param does' }
    },
    required: ['param']
  }
}
```

## Testing Requirements

- Write tests for all new functionality
- Use temporary in-memory databases: `new MemoryStore({ dbPath: ':memory:' })`
- Clean up temporary files in `afterEach`/`afterAll`
- Test edge cases: empty strings, null, invalid types

## What NOT to Do

- ❌ Don't use `console.log` in library code (use `console.error` for CLI/server)
- ❌ Don't use Node.js APIs when Bun equivalents exist
- ❌ Don't use ESLint/Prettier (use Biome)
- ❌ Don't use npm/yarn/pnpm (use Bun)
- ❌ Don't add dependencies without checking if Bun has a native solution
- ❌ Don't commit without running `bun run check`

## Documentation

- Use JSDoc for all public APIs
- Keep CHANGELOG.md updated for user-facing changes
- Reference ADRs in `docs/architecture/decisions/` for design rationale
