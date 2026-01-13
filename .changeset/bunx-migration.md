---
"@ecuabyte/cortex-mcp-server": patch
"@ecuabyte/cortex-cli": patch
---

chore: migrate from npx to bunx for Bun runtime compatibility

- Changed MCP server build target from `node` to `bun`
- Added `#!/usr/bin/env bun` shebang to bundled output
- Updated all configuration generators to output `bunx` commands
- Updated installer.ts to generate bunx configs for all editors
- Updated documentation (README, UNIVERSAL_SETUP.md) with bunx instructions

Users now need Bun installed to run: `bunx @ecuabyte/cortex-mcp-server`
