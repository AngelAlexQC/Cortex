# ctx/guard

> Filter sensitive information from context before sharing.

## Signature

```typescript
guard(content: string, rules?: GuardRules): Promise<GuardResult>
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | ✅ | Content to sanitize |
| `rules.patterns` | string[] | ❌ | Additional patterns |
| `rules.mode` | "redact" \| "mask" \| "remove" | ❌ | How to handle matches |

## Returns

```typescript
interface GuardResult {
  content: string;        // Sanitized content
  redacted: Redaction[];  // What was removed
  safe: boolean;          // True if nothing redacted
}

interface Redaction {
  type: string;           // e.g., "api_key", "email"
  original: string;       // What was found (partial)
  replacement: string;    // What it was replaced with
}
```

## Default Patterns

| Category | Examples |
|----------|----------|
| API Keys | `Bearer`, `sk-`, `AKIA`, `ghp_` |
| Secrets | Private keys, passwords |
| PII | Email, phone, SSN |
| Credentials | Connection strings |

## Example

```typescript
import { Cortex } from '@cortex/core';

const cortex = new Cortex();

const input = `
Database connection:
postgresql://admin:super_secret_123@db.example.com:5432/mydb

API key: sk-1234567890abcdef
Contact: john.doe@company.com
`;

const result = await cortex.guard(input);

console.log(result.content);
// Database connection:
// postgresql://[REDACTED_CREDENTIALS]@db.example.com:5432/mydb
//
// API key: [REDACTED_API_KEY]
// Contact: [REDACTED_EMAIL]

console.log(result.safe); // false
console.log(result.redacted.length); // 3
```

## MCP Tool

```json
{
  "name": "cortex_guard",
  "description": "Filter sensitive data from content",
  "inputSchema": {
    "type": "object",
    "properties": {
      "content": { "type": "string", "description": "Content to sanitize" }
    },
    "required": ["content"]
  }
}
```

## Why Guard is a Primitive

Privacy isn't a feature — it's architecture.

```
Other tools: "We added a privacy filter"
Cortex: "Privacy filtering is built into the protocol"
```

Every compliant implementation MUST support ctx/guard.
