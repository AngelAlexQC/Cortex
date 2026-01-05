# Changelog

## 0.5.7

### Patch Changes

- [`1949f1b`](https://github.com/EcuaByte-lat/Cortex/commit/1949f1b87d5089f91c0b20ff551e820cd3ae1775) Thanks [@AngelAlexQC](https://github.com/AngelAlexQC)! - fix: resolve all lint warnings and upgrade biome config
  codestyle: fix non-null assertions and string concatenation

## 0.5.6

### Patch Changes

- cc4ed85: fix: rename packages to @ecuabyte scope and setup changesets coverage

All notable changes to the Cortex Memory extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-12-29

### Added

- **Interactive Walkthrough** - 4-step onboarding guide for new users
- **Keyboard Shortcuts**
  - `Ctrl+Shift+M` / `Cmd+Shift+M` - Add new memory
  - `Ctrl+Shift+Alt+M` / `Cmd+Shift+Alt+M` - Search memories
  - `Ctrl+Shift+S` / `Cmd+Shift+S` - Save selection as memory
- **Context Menu Integration** - Right-click selected text to save as memory
- **Save Selection as Memory** - New command to capture code directly from editor
- **Welcome Views** - Helpful empty states for Memory and Tools trees

### Changed

- **Activity Bar Icon** - New monochrome SVG icon for proper VS Code theme integration
- **Memory Tree Icons** - Type-specific colored icons (💡 fact, ✅ decision, 💻 code, ⚙️ config, 📝 note)
- **Status Bar** - Now shows memory count with brain icon, warning background when paused
- **Memory Webview** - Complete redesign with modern card layout, gradients, and copy-to-clipboard

### Fixed

- Activity Bar icon now renders correctly instead of white square
- Status bar updates memory count automatically every 30 seconds

## [0.2.2] - 2024-12-12

### Added

- Official branding assets and icons
- Improved extension icon for VS Code Marketplace

### Fixed

- Extension packaging now includes icon.png correctly

## [0.2.1] - 2024-12-12

### Changed

- Updated repository URLs to new organization
- Bumped version for branding update

## [0.2.0] - 2024-12-09

### Added

- Memory Tree View in Activity Bar sidebar
- Add Memory command with type selection
- Search Memories functionality
- Delete Memory command
- View Memory Details command
- Statistics view panel
- Project isolation using git root detection
- SQLite-based local storage
- 5 memory types: fact, decision, code, config, note

### Technical

- Built with Bun and TypeScript
- Uses sql.js for browser-compatible SQLite
- Integrates with MCP server for AI tool connectivity

## [0.1.0] - 2024-12-08

### Added

- Initial project setup
- Core storage module
- Basic extension structure

[0.3.0]: https://github.com/EcuaByte-lat/Cortex/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/EcuaByte-lat/Cortex/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/EcuaByte-lat/Cortex/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/EcuaByte-lat/Cortex/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/EcuaByte-lat/Cortex/releases/tag/v0.1.0
