# ctx/fuse

> Combine multiple context sources into unified context.

## Signature

```typescript
fuse(sources: ContextSource[]): Promise<FusedContext>
```

## Source Types

| Type | Description |
|------|-------------|
| `memory` | Query stored ContextBlocks |
| `file` | Read from file path |
| `url` | Fetch from URL |
| `inline` | Inline content |

## Parameters

```typescript
interface ContextSource {
  type: "memory" | "file" | "url" | "inline";
  
  // For memory
  query?: Query;
  
  // For file/url
  path?: string;
  
  // For inline
  content?: string;
  
  // Common
  priority?: number;  // Higher = more important
  maxTokens?: number; // Token budget for this source
}
```

## Returns

```typescript
interface FusedContext {
  content: string;          // Combined context
  sources: SourceInfo[];    // Attribution
  totalTokens: number;      // Final token count
  truncated: boolean;       // If budget exceeded
}
```

## Example

```typescript
import { Cortex } from '@cortex/core';

const cortex = new Cortex();

const context = await cortex.fuse([
  // Priority 1: Stored decisions
  {
    type: "memory",
    query: { type: "decision" },
    priority: 1,
    maxTokens: 1000
  },
  // Priority 2: Architecture docs
  {
    type: "file",
    path: "./docs/architecture.md",
    priority: 2,
    maxTokens: 2000
  },
  // Priority 3: Current session notes
  {
    type: "inline",
    content: "User is working on authentication feature",
    priority: 3
  }
]);

console.log(context.content);
// ## Decisions
// - Use JWT with RS256...
// - PostgreSQL with Prisma...
//
// ## Architecture
// The system follows hexagonal architecture...
//
// ## Current Session
// User is working on authentication feature
```

## Operations

1. **Fetch**: Retrieve all sources
2. **Prioritize**: Order by priority
3. **Deduplicate**: Remove redundant content
4. **Budget**: Fit within token limit
5. **Format**: Structure for consumption

## Use Cases

- Combine project memory + current file + session history
- Merge team context + personal preferences
- Unify multiple project contexts for cross-project work
