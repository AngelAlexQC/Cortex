---
"@ecuabyte/cortex-mcp-server": patch
"@ecuabyte/cortex-cli": patch
---

feat: add Gemini MCP config with official schema support

- Added `--target gemini` option to `generate-config` command
- Gemini config now includes `$schema`, `trust`, and `description` fields
- Updated `installer.ts` to generate proper Gemini settings.json
- Updated documentation with correct Gemini configuration format

Users can now run:
```bash
bunx @ecuabyte/cortex-mcp-server generate-config --target gemini
```
