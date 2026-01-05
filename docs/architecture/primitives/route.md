# ctx/route

> Intelligently select relevant context for a task.

## Signature

```typescript
route(task: string, options?: RouteOptions): Promise<ContextBlock[]>
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task` | string | ✅ | Description of current task |
| `options.limit` | number | ❌ | Max blocks (default: 10) |
| `options.types` | ContextType[] | ❌ | Filter by types |
| `options.maxTokens` | number | ❌ | Token budget |

## Returns

Array of ContextBlocks ranked by relevance to the task.

## Algorithm

1. **Parse Intent**: Extract semantic meaning from task description
2. **Match Embeddings**: Compare against stored vector representations
3. **Apply Filters**: Respect type and scope constraints
4. **Rank Results**: Score by relevance, recency, and confidence
5. **Budget Tokens**: Fit within token limit

## Example

```typescript
import { Cortex } from '@cortex/core';

const cortex = new Cortex();

// Get context for implementing auth
const context = await cortex.route("implementing user authentication", {
  limit: 5,
  maxTokens: 2000
});

// Returns top 5 most relevant:
// - Authentication decisions
// - Security patterns
// - Related code snippets
// - Configuration notes
```

## MCP Tool

```json
{
  "name": "cortex_context",
  "description": "Get relevant context for current task",
  "inputSchema": {
    "type": "object",
    "properties": {
      "task": { "type": "string", "description": "Current task description" },
      "limit": { "type": "number", "default": 5 },
      "maxTokens": { "type": "number", "default": 4000 }
    },
    "required": ["task"]
  }
}
```

## The "Magic" of ctx/route

This is the differentiating primitive. Instead of:

```
🔴 "Here's my entire project context (50,000 tokens)"
```

You get:

```
🟢 "Here's exactly the 5 things relevant to auth (2,000 tokens)"
```

Better results. Lower costs. Faster responses.
