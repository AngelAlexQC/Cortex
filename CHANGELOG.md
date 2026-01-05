# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-01-05

### Added
- **AI-Powered Project Scanner**: Comprehensive two-pass intelligent analysis
  - Pass 1: AI reviews project tree and selects relevant files autonomously
  - Pass 2: AI analyzes selected files and extracts memories with deduplication
  - No hardcoded limits - AI decides what to analyze
  - Real-time visual streaming in professional webview panel
- **Language Model Tools for Copilot**: Native VS Code integration
  - `cortex_remember`: AI can save memories directly
  - `cortex_recall`: AI can search context
  - Automatic tree view refresh on memory save
- **Visual AI Scan Panel**: Professional webview with VS Code native theme
  - Uses `--vscode-*` CSS variables for seamless theme integration
  - Real-time memory cards with type-based color coding
  - Live streaming output display
  - Summary statistics on completion
- **Premium Model Selection**: Intelligent 2026 model priority
  - Claude Opus 4.5, GPT-5.2, GPT-5.1-Codex, Gemini 3 Pro support
  - Automatic fallback to best available model

### Changed
- **Deduplication**: AI now receives ALL existing memories for context (no limits)
- **Tree Command**: Uses native `tree` command for accurate project structure

### Fixed
- Memory tree view now auto-refreshes when AI tools add memories

## [0.3.0] - 2025-12-29

### Added
- **Interactive Walkthrough**: New onboarding flow in VS Code for new users.
- **Keyboard Shortcuts**: Native keybindings for fast context capture (`Ctrl+Shift+M`, `Ctrl+Shift+S`, `Ctrl+Shift+Alt+M`).
- **Modern UI**: Completely redesigned card-based memory webview and monochrome Activity Bar icon.
- **CLI Branding**: Refreshed CLI with improved help output and consistency.
- **Enhanced Status Bar**: Real-time memory counter and brain icon in the VS Code status bar.

### Changed
- **Version Synchronization**: All monorepo packages synchronized to v0.3.0.
- **Professional Metadata**: Standardized package authors, descriptions, and keywords for Marketplace/npm readiness.
- **Registry Readiness**: Added `bin` entry to `@cortex/mcp-server` for easier distribution.
- **CI/CD Polishing**: Fixed coverage reporting and badge URLs.

### Fixed
- CLI build failure due to async/await mismatch with core storage API.
- Activity Bar icon rendering issues (replaced multi-color SVG with mask-safe monochrome).

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

[0.3.0]: https://github.com/EcuaByte-lat/Cortex/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/EcuaByte-lat/Cortex/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/EcuaByte-lat/Cortex/releases/tag/v0.1.0
