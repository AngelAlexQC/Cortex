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
      name: 'gemini',
      displayName: 'Gemini Code Assist',
      globalPath: join(HOME, '.gemini', 'settings.json'),
      configKey: 'mcpServers',
      format: 'mcp-servers',
    },
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

// Install AGENTS.md or CLAUDE.md template - Enterprise Grade
export function installAgentsFile(
  projectPath: string,
  options: { type?: 'agents' | 'claude'; force?: boolean } = {}
): { success: boolean; message: string; path: string } {
  const fileName = options.type === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
  const filePath = join(projectPath, fileName);

  // Always overwrite to keep files up to date with latest best practices

  const claudeContent = `# Claude Code Instructions

> Generated by Cortex Memory System - ${new Date().toISOString().split('T')[0]}

## Core Principle: Memory-First Development

**At the start of EVERY session:**
\`\`\`
cortex_context("summary of current task")
\`\`\`

Review loaded context before writing any code.

## Workflow Pattern

\`\`\`
EXPLORE → PLAN → CODE → VERIFY → COMMIT
\`\`\`

| Phase | Action |
|-------|--------|
| **Explore** | Read files, query memory, understand context |
| **Plan** | Use \`think hard\` or \`ultrathink\` for complex problems |
| **Code** | Incremental changes with \`git add -p\` checkpoints |
| **Verify** | Run tests after each logical change |
| **Commit** | Conventional commits, document "why" not "what" |

## Extended Thinking Modes

| Keyword | When to Use |
|---------|-------------|
| \`think\` | Simple decisions, quick reasoning |
| \`think hard\` | Complex logic, multi-file changes |
| \`ultrathink\` | Architecture decisions, security review |

## Structured Debugging Workflow

1. **Clear Bug Report**: Specific symptoms, not vague descriptions
2. **Read Code Carefully**: Follow data flow, don't assume
3. **List All Causes**: Generate hypotheses, not just fixes
4. **Rank by Likelihood**: Prioritize investigation order
5. **Test Fixes in Isolation**: One change at a time

## Adversarial Code Review

When reviewing, act as a critical senior developer:
\`\`\`
"Do a git diff and pretend you're a senior dev doing a code
review and you HATE this implementation. What would you
criticize? What edge cases am I missing?"
\`\`\`

## Memory Integration

| Event | Action |
|-------|--------|
| Architecture decision | \`cortex_add(type="decision")\` |
| Discovered pattern | \`cortex_add(type="code")\` |
| Configuration choice | \`cortex_add(type="config")\` |
| Important fact | \`cortex_add(type="fact")\` |
| Potential risk | \`cortex_add(type="risk")\` |

## File Imports (Monorepo Pattern)

Reference other docs with \`@path/to/file.md\` syntax:
\`\`\`markdown
@docs/architecture.md
@packages/core/README.md
\`\`\`

## Custom Commands

Create reusable prompts in \`.claude/commands/\`:
\`\`\`markdown
<!-- .claude/commands/fix-issue.md -->
Analyze issue #$ARGUMENTS and create a fix
\`\`\`

## XML Tags for Structure

\`\`\`xml
<context>Current task environment</context>
<instructions>Step-by-step goals</instructions>
<constraints>Must use existing patterns</constraints>
<output_format>Desired response structure</output_format>
\`\`\`

## Anti-Patterns (NEVER DO)

- ❌ Never assume context not in memory
- ❌ Never skip \`cortex_context\` at session start
- ❌ Never commit without running tests
- ❌ Never use \`any\` type - use \`unknown\`
- ❌ Never log secrets or PII
- ❌ Never over-engineer - keep changes focused
- ❌ Never refactor beyond what was asked

## Security Practices

- Use \`/security-review\` for vulnerability analysis
- Block risky operations on \`.env\` and \`.git/\`
- Validate inputs before processing
- Never expose credentials in logs or errors
`;

  const agentsContent = `# AI Agent Orchestration Protocol

> Generated by Cortex Memory System - ${new Date().toISOString().split('T')[0]}

## Constitutional Principles

1. **Memory First** - Always query \`cortex_context\` before decisions
2. **Document Why** - Save reasoning, not just choices
3. **Verify Before Change** - Check existing patterns first
4. **Incremental Progress** - Small commits, frequent checkpoints
5. **Zero Secrets** - Never log, commit, or transmit secrets/PII
6. **Single Responsibility** - One clear purpose per task
7. **Plan Before Code** - Outline approach, get approval, then implement

## Agent Personas

### 1. Onboarding Agent
**Purpose:** Reduce developer ramp-up time from weeks to hours
- Queries Shared Knowledge Graph to explain *why* code exists
- References architectural decisions from memory
- Points to relevant documentation

### 2. Code Review Agent
**Purpose:** Ensure PRs don't contradict architectural consensus
- Queries Decision Trail before reviewing
- Flags "Semantic Drift" when code evolves away from truths
- Uses adversarial review: "What would a senior dev criticize?"

### 3. Tech Debt Radar
**Purpose:** Track and surface technical debt early
- Scans for patterns violating Architecture Guardrails
- Logs violations as \`cortex_add(type="risk")\`
- Prioritizes by impact and effort

### 4. Security Auditor
**Purpose:** Identify vulnerabilities before deployment
- Runs \`/security-review\` on changes
- Checks for OWASP Top 10 issues
- Validates input handling and auth flows

## Subagent Orchestration

Store subagent definitions in \`.claude/agents/\`:
\`\`\`yaml
# .claude/agents/reviewer.yaml
name: Code Reviewer
description: Reviews code for bugs and style
tools: [Read, Search]
\`\`\`

**Pattern:** Lead Agent delegates to specialized Subagents

## Hooks Configuration

Configure in \`.claude/settings.json\`:
\`\`\`json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit",
      "command": "echo 'Validating...' && biome check"
    }],
    "PostToolUse": [{
      "matcher": "Write",
      "command": "biome format --write"
    }]
  }
}
\`\`\`

## Memory Protocol

\`\`\`javascript
cortex_context("summary of current task")
\`\`\`

| Event | Memory Type |
|-------|-------------|
| Decisions | \`decision\` |
| Patterns | \`code\` |
| Facts | \`fact\` |
| Risks | \`risk\` |

## Session Management

- \`claude --resume\` to continue previous session
- \`/clear\` to reset context for new task
- Session history stored locally for retrospective

## MCP Tools

| Tool | Purpose |
|------|---------|
| \`cortex_context\` | Load task-relevant memories |
| \`cortex_add\` | Save new memory |
| \`cortex_search\` | Query existing memories |
`;

  const content = options.type === 'claude' ? claudeContent : agentsContent;

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

// Install .cursorrules - Enterprise Grade
export function installCursorRules(
  projectPath: string,
  options: { force?: boolean } = {}
): { success: boolean; message: string; path: string } {
  const fileName = '.cursorrules';
  const filePath = join(projectPath, fileName);

  // Always overwrite to keep files up to date with latest best practices

  const content = `# Cursor Rules - Cortex Memory Integration

> Generated by Cortex Memory System

## Priority 1: Memory-First Development

At the start of EVERY task:
\`\`\`
cortex_context("summary of current task")
\`\`\`

## Priority 2: Workflow Pattern

\`\`\`
EXPLORE → PLAN → CODE → VERIFY → COMMIT
\`\`\`

- **Explore**: Read relevant files before making changes
- **Plan**: Use \`think hard\` for complex problems
- **Code**: Incremental changes with git checkpoints
- **Verify**: Run tests after each change
- **Commit**: conventional commits with "why"

## Priority 3: Save Knowledge

Always save important decisions:
- \`cortex_add(content="...", type="decision")\`
- \`cortex_add(content="...", type="code")\`
- \`cortex_add(content="...", type="fact")\`

## Extended Thinking

Use these keywords for complex reasoning:
- \`think\` → Basic deliberation
- \`think hard\` → Deeper analysis
- \`ultrathink\` → Maximum reasoning

## Anti-Patterns

- ❌ Never skip cortex_context at session start
- ❌ Never assume context not in memory
- ❌ Never commit without tests
- ❌ Never log secrets or PII
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

    // Create .cursorrules
    const cursorResult = installCursorRules(options.projectPath);
    results.push({
      editor: '.cursorrules',
      ...cursorResult,
    });

    // Create CLAUDE.md
    const claudeResult = installAgentsFile(options.projectPath, { type: 'claude' });
    results.push({
      editor: 'CLAUDE.md',
      ...claudeResult,
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
  installCursorRules,
  installClaudeHooks,
  installAll,
  getEditorConfigs,
  ensureFirstRun,
};
