#!/usr/bin/env bun
import { parseArgs } from 'node:util';

// Define supported targets
type Target = 'claude' | 'cursor' | 'windsurf' | 'goose';

const targets: Target[] = ['claude', 'cursor', 'windsurf', 'goose'];

// Parse arguments
const { values } = parseArgs({
  args: Bun.argv,
  options: {
    target: {
      type: 'string',
    },
  },
  strict: true,
  allowPositionals: true,
});

const target = values.target as Target | undefined;

if (!target || !targets.includes(target)) {
  console.error(`Usage: bun run generate-config --target <${targets.join('|')}>`);
  process.exit(1);
}

// Get the absolute path to the MCP server package (assuming installed globally or resolving relative)
// For this script, we'll assume the user wants to use "npx -y @ecuabyte/cortex-mcp-server" for portability
// But since we are "generating" it, we can also offer a local path version if running from source.
// For simplicity in the universal guide, we default to the npx version which is most robust.

const command = 'npx';
const args = ['-y', '@ecuabyte/cortex-mcp-server'];

// Generate config based on target
let config: Record<string, unknown>;

switch (target) {
  case 'claude':
    config = {
      mcpServers: {
        cortex: {
          command,
          args,
        },
      },
    };
    break;

  case 'cursor':
  case 'windsurf':
    // Cursor/Windsurf typically use a simpler structure or just the command in their settings UI
    // But they also support an `mcp.json` in project root or settings.
    // Here we output the object structure they expect in their config file.
    config = {
      cortex: {
        type: 'command',
        command: command,
        args: args,
      },
    };
    break;

  case 'goose':
    console.log(`Run this command to configure Goose:`);
    console.log(`goose configure mcp add cortex "${command} ${args.join(' ')}"`);
    process.exit(0);
}

console.log(JSON.stringify(config, null, 2));
