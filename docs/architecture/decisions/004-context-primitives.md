# ADR 004: Context Primitives Architecture

**Status:** Accepted  
**Date:** 2025-12-29  
**Authors:** EcuaByte Team

## Context

Cortex started as a "persistent memory" solution for AI coding assistants. However, market research revealed critical insights:

1. **Context windows are becoming commodity** — LLMs now support 1M+ tokens
2. **Simple memory storage is not a moat** — Competitors like Zep, mem0 already exist
3. **The real problem is context engineering** — Deciding *what* context to inject, *when*

We need to pivot from "memory storage" to "context orchestration" while preserving our core differentiators (local-first, MCP-native, privacy-focused).

## Decision

We adopt a **5 primitives architecture** inspired by successful infrastructure patterns:

- **Stripe**: Reduced payments to 7 lines of code
- **S3**: Reduced storage to PUT/GET/LIST/DELETE
- **Unix**: "Do one thing well" philosophy

### The 5 Context Primitives

```
┌─────────────────────────────────────────────────────────────┐
│                 THE CONTEXT PRIMITIVES                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ctx/store   →  Store context (fact, decision, code, etc.)  │
│  ctx/get     →  Retrieve specific context by ID or search   │
│  ctx/route   →  Decide what context to inject (THE MAGIC)   │
│  ctx/fuse    →  Combine multiple context sources            │
│  ctx/guard   →  Filter/protect sensitive data               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Primitive Responsibilities

| Primitive | Class | File | Status |
|-----------|-------|------|--------|
| **ctx/store** | `MemoryStore.add()` | `storage.ts` | ✅ Implemented |
| **ctx/get** | `MemoryStore.get()`, `search()` | `storage.ts` | ✅ Implemented |
| **ctx/route** | `ContextRouter` | `router.ts` | 🔄 To implement |
| **ctx/fuse** | `ContextFuser` | `fuser.ts` | 🔄 To implement |
| **ctx/guard** | `ContextGuard` | `guard.ts` | 🔄 To implement |

### Architecture Diagram

```
                    ┌─────────────────────┐
                    │   AI Agent/LLM      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    MCP Protocol     │
                    └──────────┬──────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                         CORTEX                               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    ctx/guard                            │ │
│  │         (Security Layer - filters sensitive data)       │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    ctx/route                            │ │
│  │    (Intelligence Layer - decides WHAT context to use)   │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    ctx/fuse                             │ │
│  │       (Fusion Layer - combines multiple sources)        │ │
│  └────────────────────────────────────────────────────────┘ │
│                              │                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              ctx/store + ctx/get                        │ │
│  │            (Persistence Layer - SQLite + FTS5)          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Rationale

### Why 5 Primitives?

1. **Composability**: Complex solutions emerge from combining simple parts
2. **Learnability**: Developers can understand the system in 5 minutes
3. **Testability**: Each primitive can be tested in isolation
4. **Extensibility**: New behaviors via composition, not new primitives

### Why ctx/route is "The Magic"

Current AI memory systems are **passive** — they store and retrieve. The insight is that the **real value** is in:

1. **Intent detection**: What is the agent trying to do?
2. **Relevance scoring**: Which memories are most useful for this task?
3. **Context selection**: Returning the optimal subset within token limits

This transforms Cortex from "a database" to "an intelligent context layer".

### Why ctx/guard?

Privacy is a differentiator. 65% of organizations lack visibility into AI data risks. ctx/guard addresses:

- API key leakage
- PII exposure
- Secret credentials
- Proprietary code patterns

## Implementation

### Phase 1: ctx/route MVP (Week 1-2)

```typescript
// packages/core/src/router.ts
export interface RouteOptions {
  task: string;           // What the agent is working on
  currentFile?: string;   // Active file path
  tags?: string[];        // Filter by tags
  limit?: number;         // Max results (default: 5)
}

export class ContextRouter {
  constructor(private store: MemoryStore) {}
  
  async route(options: RouteOptions): Promise<Memory[]> {
    // 1. Extract keywords from task
    // 2. Search via FTS5
    // 3. Score by relevance (recency, tags, type)
    // 4. Return top-K
  }
}
```

### Phase 2: ctx/guard (Week 2-3)

```typescript
// packages/core/src/guard.ts
export class ContextGuard {
  guard(content: string, filters: string[]): string {
    // Apply regex patterns for each filter type
    // Return redacted content
  }
}
```

### Phase 3: ctx/fuse (Week 3-4)

```typescript
// packages/core/src/fuser.ts
export class ContextFuser {
  async fuse(sources: ContextSource[]): Promise<string> {
    // 1. Fetch from each source
    // 2. Deduplicate
    // 3. Rank by relevance
    // 4. Truncate to token limit
  }
}
```

## Consequences

### Positive

- **Clear mental model**: 5 primitives vs. unlimited features
- **Marketing advantage**: "5 lines to intelligent context"
- **Technical composability**: Primitives combine into any use case
- **Existing code reuse**: ~80% of current code maps to ctx/store + ctx/get

### Negative

- **Learning curve**: Developers must understand the primitive model
- **Potential oversimplification**: Complex use cases may feel constrained
- **Documentation burden**: Must clearly explain composition patterns

### Risks

- **ctx/route complexity**: Relevance scoring is hard to get right
- **Performance**: Must maintain <200ms response time
- **Scope creep**: Resist adding 6th, 7th primitives

## Related Decisions

- [ADR 001: Use SQLite](./001-use-sqlite.md) — Persistence layer for ctx/store
- [ADR 002: Project Isolation](./002-project-isolation.md) — Context scoped by project
- [ADR 003: Monorepo Structure](./003-monorepo-structure.md) — Package organization
