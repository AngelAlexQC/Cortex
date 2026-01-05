# ctx/get

> Retrieve context from storage.

## Signature

```typescript
// By ID
get(id: string): Promise<ContextBlock | null>

// By query
get(query: Query): Promise<ContextBlock[]>
```

## Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | ContextType | Filter by type |
| `types` | ContextType[] | Filter by multiple types |
| `tags` | string[] | Filter by tags (AND) |
| `scope` | ContextScope | Filter by scope |
| `search` | string | Full-text search |
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |

## Returns

A single ContextBlock (by ID) or array of ContextBlocks (by query).

## Examples

```typescript
import { Cortex } from '@cortex/core';

const cortex = new Cortex();

// Get by ID
const block = await cortex.get("550e8400-e29b-41d4-a716-446655440000");

// Search for decisions about authentication
const decisions = await cortex.get({
  type: "decision",
  search: "authentication",
  limit: 10
});

// Get all patterns with specific tags
const patterns = await cortex.get({
  type: "pattern",
  tags: ["api", "rest"]
});
```

## MCP Tool

```json
{
  "name": "cortex_search",
  "description": "Search project memory",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search query" },
      "type": { "enum": ["fact", "decision", "pattern", "constraint", "preference", "state"] },
      "limit": { "type": "number", "default": 10 }
    },
    "required": ["query"]
  }
}
```

## Notes

- Full-text search uses SQLite FTS5
- Results are ordered by relevance
- Semantic search available when embeddings enabled
