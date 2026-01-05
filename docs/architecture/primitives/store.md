# ctx/store

> Persist context to storage.

## Signature

```typescript
store(block: Partial<ContextBlock>): Promise<string>
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | ✅ | The context to store |
| `type` | ContextType | ✅ | Classification (fact, decision, pattern, constraint, preference, state) |
| `tags` | string[] | ❌ | Searchable tags |
| `source` | string | ❌ | Origin identifier |
| `scope` | ContextScope | ❌ | Visibility scope (default: project) |

## Returns

The `id` (UUID) of the stored ContextBlock.

## Example

```typescript
import { Cortex } from '@cortex/core';

const cortex = new Cortex();

// Store a decision
const id = await cortex.store({
  content: "We use PostgreSQL with Prisma ORM for type-safe database access",
  type: "decision",
  tags: ["database", "orm", "prisma"],
  source: "architecture-meeting-2026-01"
});

console.log(`Stored with ID: ${id}`);
```

## MCP Tool

```json
{
  "name": "cortex_store",
  "description": "Store context in project memory",
  "inputSchema": {
    "type": "object",
    "properties": {
      "content": { "type": "string", "description": "The context to store" },
      "type": { "enum": ["fact", "decision", "pattern", "constraint", "preference", "state"] },
      "tags": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["content", "type"]
  }
}
```

## Notes

- Content is automatically hashed for integrity verification
- Embeddings are generated if semantic search is enabled
- Context is isolated by project ID
