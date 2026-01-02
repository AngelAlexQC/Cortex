# Cortex - Product Requirements Document

> Version 1.0 | Last Updated: 2025-12-29

## 1. Executive Summary

### Purpose
Cortex is the **Context Layer for AI Coding Assistants** - a local-first memory system that helps AI tools remember and intelligently route project context across sessions.

### Problem Statement
AI coding assistants (Claude, Copilot, Cursor) forget everything between sessions. Developers waste time re-explaining project context, architecture decisions, and coding conventions. Context windows fill with noise instead of relevant information.

### Solution
Five composable primitives that manage context lifecycle:

```
ctx/store  → Persist context (facts, decisions, patterns)
ctx/get    → Retrieve specific context
ctx/route  → Intelligently select relevant context for current task
ctx/fuse   → Combine multiple context sources
ctx/guard  → Filter sensitive data before sending to LLMs
```

### Success Criteria
| Metric | Target (6 months) | Target (12 months) |
|--------|-------------------|-------------------|
| VS Code Extension Installs | 1,000 | 5,000 |
| GitHub Stars | 500 | 2,000 |
| Pro Subscribers | 100 | 500 |
| Weekly Active Developers | 200 | 1,000 |

## 2. Strategic Context

### Market Opportunity

The MCP (Model Context Protocol) ecosystem is experiencing rapid growth:

- **Market Size**: [Projected $10.3B by 2025](https://medium.com/predict/why-building-an-mcp-server-is-2025s-hottest-tech-opportunity-80049cb73ee5)
- **Ecosystem Growth**: [10,000+ MCP servers published](https://thenewstack.io/ai-engineering-trends-in-2025-agents-mcp-and-vibe-coding/)
- **Standards Adoption**: [MCP adopted by Linux Foundation (Dec 2025)](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation) with AWS, Google, Microsoft, OpenAI as platinum members

### Competitive Landscape

| Competitor | Funding | Approach | Weakness |
|------------|---------|----------|----------|
| [Mem0](https://mem0.ai) | [$24M Series A](https://techcrunch.com/2025/10/28/mem0-raises-24m-from-yc-peak-xv-and-basis-set-to-build-the-memory-layer-for-ai-apps/) | Cloud-first API | Privacy concerns, vendor lock-in |
| [Letta](https://letta.com) | [$10M Seed](https://techcrunch.com/2024/09/23/letta-one-of-uc-berkeleys-most-anticipated-ai-startups-has-just-come-out-of-stealth/) | MemGPT research | Complex setup, academic focus |
| OpenAI Memory | Built-in | Per-conversation | Limited customization |
| Custom RAG | DIY | Vector databases | High maintenance |

### Our Differentiation

| Factor | Cortex | Mem0 | Letta |
|--------|--------|------|-------|
| Deployment | Local-first | Cloud-only | Self-host complex |
| Privacy | Data never leaves device | Cloud stored | Depends |
| MCP Native | Yes | Via adapter | No |
| VS Code Extension | Published | No | No |
| Pricing | Free + Pro | Usage-based | Open source |

## 3. User Personas

### Primary: Individual Developer
- **Profile**: Solo developer or small team member
- **Pain**: Repeats context to AI tools daily
- **Need**: Persistent memory that "just works"
- **Value**: Time saved, better AI outputs

### Secondary: Team Lead / Architect
- **Profile**: Manages codebase standards and decisions
- **Pain**: Team members don't know historical decisions
- **Need**: Shared context across team
- **Value**: Consistent codebase, onboarding efficiency

### Tertiary: Enterprise Developer
- **Profile**: Works in regulated environment
- **Pain**: Cannot send code context to cloud services
- **Need**: Local-only solution with audit trail
- **Value**: Compliance, security

## 4. Functional Requirements

### P0 - Must Have (MVP)

#### ctx/store - Context Storage
```typescript
// Store a piece of context
cortex.store({
  content: "We use PostgreSQL with Prisma ORM",
  type: "decision",      // fact | decision | code | config | note
  tags: ["database", "orm"],
  source: "architecture-meeting"
});
```

**Requirements**:
- [x] SQLite storage with full-text search (FTS5)
- [x] 5 context types: fact, decision, code, config, note
- [x] Automatic project detection (git root, package.json)
- [x] CLI interface for manual storage
- [x] VS Code extension for visual management

#### ctx/get - Context Retrieval
```typescript
// Get specific context
const decisions = cortex.get({ type: "decision", tags: ["database"] });
```

**Requirements**:
- [x] Filter by type, tags, date range
- [x] Full-text search across all context
- [x] Export to markdown/JSON

#### ctx/route - Intelligent Routing ✨
```typescript
// Get context relevant to current task
const relevant = cortex.route("implementing user authentication");
// Returns: auth decisions, security patterns, related code snippets
```

**Requirements**:
- [x] Semantic relevance scoring
- [ ] Embedding-based similarity (In Progress)
- [ ] Task-aware context selection
- [ ] Token budget management

#### ctx/guard - Privacy Filter
```typescript
// Filter sensitive data before sending to LLM
const safe = cortex.guard(context, {
  filter: ["api_keys", "passwords", "pii"]
});
```

**Requirements**:
- [x] Regex-based secret detection
- [x] Configurable filter rules
- [ ] Custom pattern support
- [ ] Audit logging

#### ctx/fuse - Context Fusion
```typescript
// Combine multiple context sources
const combined = cortex.fuse([
  projectMemory,
  relevantDocs,
  recentChanges
]);
```

**Requirements**:
- [x] Merge multiple context sources
- [ ] Deduplication
- [ ] Priority weighting
- [ ] Token limit respect

### P1 - Should Have

- [ ] **Embeddings**: sqlite-vec for semantic search
- [ ] **Sync**: Optional cloud sync for Cortex Pro
- [ ] **Team Sharing**: Share context within organization
- [ ] **Analytics**: Usage patterns and insights

### P2 - Nice to Have

- [ ] **ZKDM**: Zero-knowledge context sharing
- [ ] **Multi-Agent**: LangChain, CrewAI integration
- [ ] **Auto-capture**: Learn from git commits, PRs

## 5. Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                     User Interfaces                      │
├─────────────┬─────────────────┬─────────────────────────┤
│   VS Code   │      CLI        │      MCP Clients        │
│  Extension  │   (cortex)      │  (Claude, Copilot...)   │
└──────┬──────┴────────┬────────┴───────────┬─────────────┘
       │               │                    │
       ▼               ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                    MCP Server                            │
│              (packages/mcp-server)                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │  ctx/store  ctx/get  ctx/route  ctx/guard  ctx/fuse │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Core Library                          │
│                  (packages/core)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐    │
│  │  Storage   │  │  Context   │  │    Search      │    │
│  │  (SQLite)  │  │  Manager   │  │   (FTS5/Vec)   │    │
│  └────────────┘  └────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Runtime | Bun | Native SQLite, fast builds |
| Database | SQLite (bun:sqlite) | Local-first, zero config |
| Search | FTS5 + sqlite-vec | Full-text + semantic |
| Protocol | MCP | Industry standard |
| UI | VS Code Extension API | Largest IDE market |
| Language | TypeScript | Type safety |

### Data Model

```typescript
interface Memory {
  id: string;           // UUID
  projectId: string;    // Git root hash
  content: string;      // The actual context
  type: MemoryType;     // fact | decision | code | config | note
  tags: string[];       // User-defined tags
  source: string;       // Where it came from
  embedding?: number[]; // Vector for semantic search
  createdAt: Date;
  updatedAt: Date;
}

interface Project {
  id: string;           // Hash of git root path
  name: string;         // Folder name
  rootPath: string;     // Absolute path
  config: ProjectConfig;
}
```

## 6. MCP Integration

Cortex exposes these MCP tools:

```json
{
  "tools": [
    {
      "name": "cortex_store",
      "description": "Store context in project memory",
      "inputSchema": {
        "type": "object",
        "properties": {
          "content": { "type": "string" },
          "type": { "enum": ["fact", "decision", "code", "config", "note"] },
          "tags": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["content", "type"]
      }
    },
    {
      "name": "cortex_search",
      "description": "Search project memory",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" },
          "type": { "enum": ["fact", "decision", "code", "config", "note"] },
          "limit": { "type": "number", "default": 10 }
        },
        "required": ["query"]
      }
    },
    {
      "name": "cortex_route",
      "description": "Get relevant context for current task",
      "inputSchema": {
        "type": "object",
        "properties": {
          "task": { "type": "string" },
          "maxTokens": { "type": "number", "default": 2000 }
        },
        "required": ["task"]
      }
    }
  ]
}
```

## 7. Monetization

### Pricing Tiers

Based on [MCP monetization patterns](https://cline.bot/blog/building-the-mcp-economy-lessons-from-21st-dev-and-the-future-of-plugin-monetization):

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | 1 project, 500 memories, local only |
| **Pro** | $19/month | Unlimited projects, cloud sync, analytics |
| **Team** | $49/user/month | Shared context, admin controls, SSO |
| **Enterprise** | Custom | On-prem, audit logs, SLA |

### Revenue Projections

| Month | Free Users | Pro | Team | MRR |
|-------|------------|-----|------|-----|
| 6 | 500 | 25 | 0 | $475 |
| 12 | 2,000 | 100 | 10 | $2,390 |
| 24 | 10,000 | 500 | 50 | $12,000 |

## 8. Roadmap

### v0.3.0 (Current)
- [x] 5 primitives defined
- [x] ctx/store and ctx/get implemented
- [x] VS Code extension published
- [x] MCP server functional

### v0.4.0 (Q1 2025)
- [ ] Embeddings with sqlite-vec
- [ ] Improved ctx/route with semantic search
- [ ] CLI improvements
- [ ] Documentation site

### v0.5.0 (Q2 2025)
- [ ] Cortex Pro (cloud sync)
- [ ] Team features
- [ ] Usage analytics
- [ ] Marketplace listing (MCP Registry)

### v1.0.0 (Q3 2025)
- [ ] Stable API
- [ ] Enterprise features
- [ ] Multi-agent SDK support
- [ ] ZKDM for secure sharing

## 9. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Mem0 dominates market | Medium | High | Focus on local-first niche |
| MCP adoption slows | Low | High | Maintain standard MCP compatibility |
| Embedding performance | Medium | Medium | Use sqlite-vec, optimize queries |
| VS Code API changes | Low | Medium | Abstract extension API |

## 10. References

### Competition
- [Mem0 Documentation](https://docs.mem0.ai)
- [Letta/MemGPT Paper](https://arxiv.org/abs/2310.08560)
- [OpenAI Memory Announcement](https://openai.com/index/memory-and-new-controls-for-chatgpt/)

### Technology
- [MCP Specification](https://modelcontextprotocol.io)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [sqlite-vec](https://github.com/asg017/sqlite-vec)
- [Bun SQLite](https://bun.sh/docs/api/sqlite)

### Market
- [AI Developer Tools Market](https://medium.com/predict/why-building-an-mcp-server-is-2025s-hottest-tech-opportunity-80049cb73ee5)
- [MCP Monetization](https://cline.bot/blog/building-the-mcp-economy-lessons-from-21st-dev-and-the-future-of-plugin-monetization)
