# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Embeddings + semantic search (sqlite-vec integration)
- Cross-framework SDK (LangChain, CrewAI, AutoGen)
- Context observability dashboard
- `cortex_fuse` MCP tool for multi-source fusion
- ZKDM (Zero-Knowledge Data Markets) for secure context sharing

## [0.2.0] - 2025-12-29

### Added
- **`ContextRouter`** class for intelligent context routing (ctx/route)
  - Keyword extraction with stop words filtering
  - Relevance scoring: recency, tags, type priority, keywords
  - File path relevance bonus
  - Transparency features (score reasons for each result)
- **`ContextGuard`** class for PII/secrets filtering (ctx/guard)
  - 8 filter types: api_keys, secrets, emails, urls_auth, credit_cards, phone_numbers, ip_addresses, pii
  - 3 modes: redact, block, warn
  - Batch processing support
- **`ContextFuser`** class for multi-source fusion (ctx/fuse)
  - 4 source types: memory, file, session, url
  - Deduplication strategies: exact, semantic, none
  - Token counting and limiting
  - Output formats: text, markdown, json
- New MCP tool: `cortex_context` for task-relevant context retrieval
- New MCP tool: `cortex_guard` for sensitive data filtering
- ADR 004: Context Primitives Architecture
- Comprehensive test suite: 142 tests, 100% coverage

### Changed
- **Strategic Pivot**: From "Persistent Memory" to "The Context Layer for AI Agents"
- Updated vision: 5 context primitives (store, get, route, fuse, guard)
- Rebranded positioning to emphasize intelligent context orchestration
- Fixed Biome/TypeScript lint configuration conflicts
- Updated all documentation to reflect new direction

## [0.1.0] - 2025-12-09

### Added
- Initial monorepo setup with Bun workspaces
- `@cortex/core` package with SQLite storage and FTS5 search
- `@cortex/cli` command-line interface
- `@cortex/mcp-server` for AI tool integration
- `@cortex/shared` package for shared types
- VS Code extension with TreeView and Webview
- Project isolation system via context detection
- Encryption support (AES-256-GCM)
- Support for 5 memory types: fact, decision, code, config, note
- MCP integration with Claude Desktop, GitHub Copilot, and Continue.dev

[Unreleased]: https://github.com/EcuaByte-lat/Cortex/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/EcuaByte-lat/Cortex/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/EcuaByte-lat/Cortex/releases/tag/v0.1.0
