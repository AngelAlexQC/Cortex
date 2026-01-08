/**
 * Cortex Auto-Installer
 *
 * Automatically configures Cortex MCP server for all supported AI editors:
 * - Cursor: ~/.cursor/mcp.json
 * - Windsurf: ~/.codeium/windsurf/mcp_config.json
 * - Claude Code: ~/.claude/settings.json
 * - VS Code: ~/.vscode/settings.json (or workspace)
 * - Zed: ~/.config/zed/settings.json
 * - JetBrains: (MCP Beta - manual for now)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';

// Editor configuration paths
export interface EditorConfig {
  name: string;
  displayName: string;
  globalPath: string;
  projectPath?: string;
  configKey: string;
  format: 'mcp-servers' | 'cascade' | 'context-servers' | 'claude';
  installed?: boolean;
}

const HOME = homedir();
const IS_WINDOWS = platform() === 'win32';
const IS_MAC = platform() === 'darwin';

// Get platform-specific paths
export function getEditorConfigs(): EditorConfig[] {
  return [
    {
      name: 'cursor',
      displayName: 'Cursor',
      globalPath: join(HOME, '.cursor', 'mcp.json'),
      projectPath: '.cursor/mcp.json',
      configKey: 'mcpServers',
      format: 'mcp-servers',
    },
    {
      name: 'windsurf',
      displayName: 'Windsurf (Codeium)',
      globalPath: join(HOME, '.codeium', 'windsurf', 'mcp_config.json'),
      configKey: 'mcpServers',
      format: 'cascade',
    },
    {
      name: 'claude',
      displayName: 'Claude Code',
      globalPath: join(HOME, '.claude', 'settings.json'),
      projectPath: '.claude/settings.json',
      configKey: 'mcpServers',
      format: 'claude',
    },
    {
      name: 'claude-desktop',
      displayName: 'Claude Desktop',
      globalPath: IS_MAC
        ? join(HOME, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
        : IS_WINDOWS
          ? join(process.env['APPDATA'] || '', 'Claude', 'claude_desktop_config.json')
          : join(HOME, '.config', 'Claude', 'claude_desktop_config.json'),
      configKey: 'mcpServers',
      format: 'mcp-servers',
    },
    {
      name: 'zed',
      displayName: 'Zed',
      globalPath: join(
        process.env['XDG_CONFIG_HOME'] || join(HOME, '.config'),
        'zed',
        'settings.json'
      ),
      projectPath: '.zed/settings.json',
      configKey: 'context_servers',
      format: 'context-servers',
    },
    {
      name: 'vscode',
      displayName: 'VS Code',
      globalPath: IS_MAC
        ? join(HOME, 'Library', 'Application Support', 'Code', 'User', 'settings.json')
        : IS_WINDOWS
          ? join(process.env['APPDATA'] || '', 'Code', 'User', 'settings.json')
          : join(HOME, '.config', 'Code', 'User', 'settings.json'),
      projectPath: '.vscode/settings.json',
      configKey: 'mcp.servers',
      format: 'mcp-servers',
    },
  ];
}

// Cortex MCP server configuration
function getCortexConfig(format: EditorConfig['format']): Record<string, unknown> {
  const baseConfig = {
    command: 'npx',
    args: ['-y', '@ecuabyte/cortex-mcp-server'],
  };

  switch (format) {
    case 'mcp-servers':
    case 'claude':
    case 'cascade':
      return baseConfig;
    case 'context-servers':
      // Zed uses a different format
      return {
        command: {
          path: 'npx',
          args: ['-y', '@ecuabyte/cortex-mcp-server'],
        },
        settings: {},
      };
    default:
      return baseConfig;
  }
}

// Detect which editors are installed
export function detectInstalledEditors(): EditorConfig[] {
  const configs = getEditorConfigs();

  return configs.map((config) => ({
    ...config,
    installed: existsSync(dirname(config.globalPath)),
  }));
}

// Read existing config file safely
function readConfigFile(path: string): Record<string, unknown> {
  try {
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8');
      // Handle empty files
      if (!content.trim()) return {};
      return JSON.parse(content);
    }
  } catch (_e) {
    console.error(`Warning: Could not parse ${path}, creating new config`);
  }
  return {};
}

// Write config file with pretty formatting
function writeConfigFile(path: string, config: Record<string, unknown>): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
}

// Install Cortex for a specific editor
export function installForEditor(
  editor: EditorConfig,
  options: { global?: boolean; projectPath?: string } = { global: true }
): { success: boolean; message: string; path: string } {
  const configPath = options.global
    ? editor.globalPath
    : options.projectPath
      ? join(options.projectPath, editor.projectPath || '')
      : editor.globalPath;

  try {
    const existingConfig = readConfigFile(configPath);

    // Add Cortex configuration
    const cortexConfig = getCortexConfig(editor.format);

    // Handle different config structures
    if (editor.format === 'context-servers') {
      // Zed format
      if (!existingConfig['context_servers']) {
        existingConfig['context_servers'] = {};
      }
      (existingConfig['context_servers'] as Record<string, unknown>)['cortex-memory'] =
        cortexConfig;
    } else {
      // Standard MCP format
      const key = editor.configKey;
      const parts = key.split('.');

      let current = existingConfig;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]] as Record<string, unknown>;
      }

      const lastKey = parts[parts.length - 1];
      if (!current[lastKey]) {
        current[lastKey] = {};
      }
      (current[lastKey] as Record<string, unknown>)['cortex'] = cortexConfig;
    }

    writeConfigFile(configPath, existingConfig);

    return {
      success: true,
      message: `✅ Cortex configured for ${editor.displayName}`,
      path: configPath,
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Failed to configure ${editor.displayName}: ${error instanceof Error ? error.message : String(error)}`,
      path: configPath,
    };
  }
}

// Install AGENTS.md or CLAUDE.md template
export function installAgentsFile(
  projectPath: string,
  options: { type?: 'agents' | 'claude'; force?: boolean } = {}
): { success: boolean; message: string; path: string } {
  const fileName = options.type === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  const filePath = join(projectPath, fileName);

  if (existsSync(filePath) && !options.force) {
    return {
      success: false,
      message: `⚠️ ${fileName} already exists. Use --force to overwrite.`,
      path: filePath,
    };
  }

  const content = `# ${options.type === 'claude' ? 'Claude Code' : 'AI Agent'} Instructions

> Auto-generated by Cortex - ${new Date().toISOString().split('T')[0]}

## Memory Instructions

**At the start of EVERY conversation:**
1. Call \`cortex_context\` with a summary of the current task to load relevant memories
2. Review loaded context before responding

**When technical decisions are made, ALWAYS save them:**
- Architecture decisions → \`cortex_add\` with type="decision"
- Discovered patterns → \`cortex_add\` with type="code"
- Configuration choices → \`cortex_add\` with type="config"
- Important facts → \`cortex_add\` with type="fact"

**Memory Format:**
\`\`\`
Content: Clear, searchable description
Type: fact | decision | code | config | note
Source: Current file or "conversation"
Tags: Relevant keywords
\`\`\`

## Examples

✅ "Using Zod for validation" → \`cortex_add(content="Using Zod for input validation", type="decision", source="conversation")\`
✅ "API uses /api/v1 prefix" → \`cortex_add(content="All API routes use /api/v1 prefix", type="fact", source="architecture")\`
✅ "Components use composition" → \`cortex_add(content="React components use composition pattern over inheritance", type="code", source="codebase")\`

## At End of Conversation

If significant decisions or patterns were discussed, call \`cortex_add\` for each one before ending.
`;

  try {
    writeFileSync(filePath, content);
    return {
      success: true,
      message: `✅ Created ${fileName}`,
      path: filePath,
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Failed to create ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
      path: filePath,
    };
  }
}

// Install Claude Code hooks
export function installClaudeHooks(
  options: { global?: boolean; projectPath?: string } = { global: true }
): { success: boolean; message: string; path: string } {
  const configPath = options.global
    ? join(HOME, '.claude', 'settings.json')
    : join(options.projectPath || '.', '.claude', 'settings.json');

  try {
    const existingConfig = readConfigFile(configPath);

    // Add hooks configuration
    if (!existingConfig['hooks']) {
      existingConfig['hooks'] = {};
    }

    const hooks = existingConfig['hooks'] as Record<string, unknown[]>;

    // PostToolUse hook for auto-memory
    if (!hooks['PostToolUse']) {
      hooks['PostToolUse'] = [];
    }

    // Check if cortex hook already exists
    const postHooks = hooks['PostToolUse'] as Array<{ matcher?: string; command?: string }>;
    const hasCorTexHook = postHooks.some(
      (h) => h.command?.includes('cortex') || h.matcher?.includes('cortex')
    );

    if (!hasCorTexHook) {
      postHooks.push({
        matcher: 'Write|Edit|Create|Bash',
        command:
          'echo "Action completed: $TOOL_NAME" | npx -y @ecuabyte/cortex-mcp-server --auto-save 2>/dev/null || true',
      });
    }

    writeConfigFile(configPath, existingConfig);

    return {
      success: true,
      message: `✅ Claude Code hooks configured`,
      path: configPath,
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Failed to configure hooks: ${error instanceof Error ? error.message : String(error)}`,
      path: configPath,
    };
  }
}

// Full installation for all detected editors
export function installAll(
  options: { global?: boolean; projectPath?: string } = { global: true }
): {
  results: Array<{ editor: string; success: boolean; message: string; path: string }>;
  summary: { total: number; success: number; failed: number };
} {
  const editors = detectInstalledEditors().filter((e) => e.installed || options.projectPath);
  const results: Array<{ editor: string; success: boolean; message: string; path: string }> = [];

  for (const editor of editors) {
    const result = installForEditor(editor, options);
    results.push({
      editor: editor.displayName,
      ...result,
    });
  }

  // Also create AGENTS.md if installing for project
  if (options.projectPath) {
    const agentsResult = installAgentsFile(options.projectPath);
    results.push({
      editor: 'AGENTS.md',
      ...agentsResult,
    });
  }

  const success = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    results,
    summary: {
      total: results.length,
      success,
      failed,
    },
  };
}

// Ensure configuration runs once
export async function ensureFirstRun(): Promise<boolean> {
  try {
    // Config state paths
    const configDir = join(homedir(), '.cortex');
    const markerFile = join(configDir, 'configured');

    // Allow skipping via env
    if (process.env['CORTEX_SKIP_SETUP']) return false;

    // Check if already configured
    if (existsSync(markerFile)) return false;

    // Create config dir
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    // Run installation
    const { results, summary } = installAll({ global: true });

    if (summary.success > 0) {
      console.log('\n🧠 Cortex First Run: Auto-configured editors');
      for (const r of results) {
        if (r.success) console.log(`   ${r.message}`);
      }
      console.log('');
    }

    // Mark as configured
    writeFileSync(markerFile, new Date().toISOString());
    return true;
  } catch (_e) {
    return false;
  }
}

// Export for CLI
export default {
  detectInstalledEditors,
  installForEditor,
  installAgentsFile,
  installClaudeHooks,
  installAll,
  getEditorConfigs,
  ensureFirstRun,
};
