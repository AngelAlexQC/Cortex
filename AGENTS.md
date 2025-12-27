# AGENTS.md - Cortex

> Instructions for AI agents working on the Cortex ecosystem.

## Vision: "Proactive Context Engine"

Cortex is the operating system for agentic memory. It moves beyond passive retrieval to **Proactive Context Management**.

### Key Moat: ZKDM
**Zero-Knowledge Distributed Memory (ZKDM)** allows multiple AI agents to collaborate using shared project context without leaking private user data or proprietary logic.

## Project Structure

- **Cortex (Root)**: The Core Monorepo (Bun).
- **packages/core**: Semantic storage layer (SQLite + Embeddings).
- **packages/mcp-server**: Standardized context protocol.
- **packages/vscode-extension**: Native developer interface.
- **apps/cortex-web**: (Planned) Central dashboard and cloud sync.

## Technical Directives

1.  **Local-First Default**: All primary memory operations must work offline.
2.  **Privacy**: Zero data telemetry unless explicit Pro sync is enabled.
3.  **Speed**: Semantic search must be <200ms.
4.  **Interop**: Be the gold standard for MCP server implementations.
