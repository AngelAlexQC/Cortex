/**
 * AI-Powered Comprehensive Project Scanner
 *
 * Two-Pass Intelligent Analysis:
 * Pass 1: Show tree to AI, AI requests files to analyze
 * Pass 2: AI analyzes requested files and extracts memories
 *
 * Features:
 * - AI-driven file selection (no hardcoded limits)
 * - Full directory tree via shell command
 * - Real-time streaming output
 * - Best model selection (2026 premium models)
 * - Existing memories deduplication
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Memory, MemoryType } from '@cortex/shared';
import * as vscode from 'vscode';
import type { AIScanWebview } from './aiScanWebview';
import type { MemoryStore } from './storage';

export interface AIMemory {
  content: string;
  type: MemoryType;
  source: string;
  tags: string[];
}

export interface AIScanResult {
  memories: AIMemory[];
  filesAnalyzed: number;
  modelUsed: string;
}

// Directories to skip
const SKIP_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'vendor',
  '.vscode',
  '.idea',
  '__pycache__',
  'venv',
  '.cache',
  'out',
  'target',
  'bin',
  'obj',
  '.nuxt',
  '.output',
  '.turbo',
  '.vercel',
];

// Output channel
let outputChannel: vscode.OutputChannel | undefined;

function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Cortex AI Scan');
  }
  return outputChannel;
}

/**
 * Generate comprehensive tree structure
 */
function generateTreeStructure(rootPath: string): string {
  try {
    const ignorePattern = SKIP_DIRS.join('|');
    const treeCmd = `tree -L 5 --noreport -I "${ignorePattern}" --dirsfirst 2>/dev/null || find . -maxdepth 5 -type f ! -path './node_modules/*' ! -path './.git/*' 2>/dev/null | head -200`;

    const result = execSync(treeCmd, {
      cwd: rootPath,
      encoding: 'utf-8',
      maxBuffer: 2 * 1024 * 1024,
    });

    return result.slice(0, 15000);
  } catch {
    return generateManualTree(rootPath, '', 0, 5);
  }
}

function generateManualTree(
  rootPath: string,
  prefix: string,
  depth: number,
  maxDepth: number
): string {
  if (depth >= maxDepth) return '';

  let result = '';
  try {
    const entries = readdirSync(rootPath, { withFileTypes: true })
      .filter((e) => !SKIP_DIRS.includes(e.name) && !e.name.startsWith('.'))
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    for (let i = 0; i < entries.length && i < 30; i++) {
      const entry = entries[i];
      const isLast = i === entries.length - 1 || i === 29;
      const connector = isLast ? '└── ' : '├── ';
      const newPrefix = prefix + (isLast ? '    ' : '│   ');

      if (entry.isDirectory()) {
        const subPath = join(rootPath, entry.name);
        result += `${prefix}${connector}${entry.name}/\n`;
        result += generateManualTree(subPath, newPrefix, depth + 1, maxDepth);
      } else {
        result += `${prefix}${connector}${entry.name}\n`;
      }
    }
  } catch {
    /* skip */
  }

  return result;
}

/**
 * Read a file safely with size limits
 */
function readFileSafe(filePath: string, maxSize: number = 50000): string | null {
  try {
    if (!existsSync(filePath)) return null;
    const stat = statSync(filePath);
    if (!stat.isFile() || stat.size > maxSize) return null;
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Format ALL existing memories for deduplication - no limits
 */
function formatExistingMemories(memories: Memory[]): string {
  if (memories.length === 0) return '';
  // No limits - AI needs full context to avoid duplicates
  const items = memories.map((m) => `- [${m.type}] ${m.content}`);
  return `## ALREADY KNOWN (DO NOT REPEAT ANY OF THESE - ${memories.length} memories):\n${items.join('\n')}\n\n`;
}

/**
 * Select the best premium model by name matching
 */
async function selectBestModel(channel: vscode.OutputChannel): Promise<vscode.LanguageModelChat> {
  const allModels = await vscode.lm.selectChatModels({});

  if (allModels.length === 0) {
    throw new Error('No language models available.');
  }

  channel.appendLine(`📋 Available models (${allModels.length}):`);
  for (const m of allModels.slice(0, 12)) {
    channel.appendLine(`   - ${m.name || m.id}`);
  }

  const priorityNames = [
    'claude opus 4',
    'opus 4',
    'gpt-5.2',
    'gpt-5.1-codex-max',
    'gpt-5.1-codex',
    'gpt-5.1',
    'gemini 3 pro',
    'claude sonnet 4',
    'sonnet 4',
    'gpt-5',
    'o3',
    'o1',
    'gpt-4o',
  ];

  for (const priority of priorityNames) {
    const match = allModels.find(
      (m) =>
        m.name?.toLowerCase().includes(priority) ||
        m.id?.toLowerCase().includes(priority.replace(/\s+/g, '-'))
    );
    if (match) {
      channel.appendLine(`\n✓ Selected: ${match.name || match.id}`);
      return match;
    }
  }

  const fallback = allModels[0];
  channel.appendLine(`\n⚠️ Fallback: ${fallback.name || fallback.id}`);
  return fallback;
}

/**
 * PASS 1: Let AI decide which files to analyze
 */
async function aiSelectFiles(
  model: vscode.LanguageModelChat,
  treeStructure: string,
  channel: vscode.OutputChannel,
  token: vscode.CancellationToken
): Promise<string[]> {
  const prompt = `You are analyzing a software project. Based on the directory structure below, select the most important files to understand this project comprehensively.

## PROJECT STRUCTURE:
\`\`\`
${treeStructure}
\`\`\`

## YOUR TASK:
As an experienced software architect, select ALL files you need to fully understand this project. Use your expertise to decide - there are NO LIMITS.

Consider:
- Project configuration (package.json, config files, env examples)
- Main entry points and core modules
- Key business logic and services
- Important components and utilities
- Infrastructure (Dockerfile, docker-compose, CI/CD)
- Documentation (README, ARCHITECTURE, CONTRIBUTING)
- Any file that helps understand the architecture

Output ONLY a JSON array of file paths relative to project root:
["path/to/file1.ts", "path/to/file2.js", ...]

Be thorough - select as many files as you need for a complete understanding.
Only output the JSON array, nothing else.`;

  const messages = [vscode.LanguageModelChatMessage.User(prompt)];
  const response = await model.sendRequest(messages, {}, token);

  let fullResponse = '';
  for await (const chunk of response.text) {
    fullResponse += chunk;
  }

  // Extract JSON array from response
  const match = fullResponse.match(/\[[\s\S]*?\]/);
  if (match) {
    try {
      const files = JSON.parse(match[0]) as string[];
      return files.filter((f) => typeof f === 'string');
    } catch {
      channel.appendLine('⚠️ Could not parse AI file selection');
    }
  }

  return [];
}

/**
 * Main two-pass scan function with visual webview output
 */
export async function scanProjectWithAI(
  projectPath: string,
  token: vscode.CancellationToken,
  store?: MemoryStore,
  webview?: AIScanWebview
): Promise<AIScanResult> {
  if (!vscode.lm?.selectChatModels) {
    throw new Error('Language Model API not available.');
  }

  const channel = getOutputChannel();
  channel.clear();
  channel.show(true);

  const log = (msg: string) => channel.appendLine(msg);

  log('═══════════════════════════════════════════════════════════');
  log('🧠 CORTEX AI SCAN - Two-Pass Intelligent Analysis');
  log('═══════════════════════════════════════════════════════════\n');

  // Step 1: Select best model
  webview?.setStatus('selecting', 'Selecting AI model...');
  log('🔍 Selecting best AI model...');

  const allModels = await vscode.lm.selectChatModels({});
  const modelNames = allModels.slice(0, 15).map((m) => m.name || m.id || 'Unknown');

  const model = await selectBestModel(channel);
  const modelName = model.name || model.id || 'Unknown';

  webview?.setModel(modelName, modelNames);

  // Step 2: Generate tree
  webview?.setStatus('selecting', 'Analyzing project structure...');
  log('\n📂 Generating project structure...');
  const treeStructure = generateTreeStructure(projectPath);
  const treeLines = treeStructure.split('\n').length;
  log(`✓ Tree generated: ${treeLines} lines`);

  webview?.setTree(treeStructure, { lines: treeLines });

  // Step 3: Load ALL existing memories for deduplication
  let existingContext = '';
  if (store) {
    try {
      const existing = await store.list({}); // No limit - AI needs all memories
      existingContext = formatExistingMemories(existing);
      if (existing.length > 0) {
        log(`\n🧹 Loaded ${existing.length} existing memories for deduplication`);
      }
    } catch {
      /* skip */
    }
  }

  // Step 4: PASS 1 - AI selects files
  webview?.setStatus('selecting', 'AI selecting files to analyze...');
  log('\n───────────────────────────────────────────────────────────');
  log('📋 PASS 1: AI selecting important files...');
  log('───────────────────────────────────────────────────────────\n');

  const selectedFiles = await aiSelectFiles(model, treeStructure, channel, token);

  if (selectedFiles.length === 0) {
    log('⚠️ AI could not select files.');
    webview?.setStatus('error', 'AI could not select files');
    return { memories: [], filesAnalyzed: 0, modelUsed: modelName };
  }

  log(`✓ AI selected ${selectedFiles.length} files:\n`);
  for (const f of selectedFiles) {
    log(`   • ${f}`);
  }

  webview?.setSelectedFiles(selectedFiles);

  // Step 5: PASS 2 - Analyze files with visual streaming
  webview?.setStatus('analyzing', 'AI analyzing files...');
  log('\n───────────────────────────────────────────────────────────');
  log('🤖 PASS 2: Comprehensive Analysis (Streaming)');
  log('───────────────────────────────────────────────────────────\n');

  const memories = await aiAnalyzeFilesWithWebview(
    model,
    projectPath,
    selectedFiles,
    treeStructure,
    existingContext,
    channel,
    webview,
    token
  );

  // Complete
  webview?.setStatus('complete', `Extracted ${memories.length} memories`);
  webview?.setSummary(memories.length, selectedFiles.length, modelName);

  log('\n\n───────────────────────────────────────────────────────────');
  log(`✅ COMPLETE: Extracted ${memories.length} memories`);
  log(`📊 AI analyzed: ${selectedFiles.length} files (AI-selected)`);
  log(`📦 Model: ${modelName}`);
  log('═══════════════════════════════════════════════════════════');

  return { memories, filesAnalyzed: selectedFiles.length, modelUsed: modelName };
}

/**
 * PASS 2 with webview streaming
 */
async function aiAnalyzeFilesWithWebview(
  model: vscode.LanguageModelChat,
  rootPath: string,
  files: string[],
  treeStructure: string,
  existingContext: string,
  channel: vscode.OutputChannel,
  webview: AIScanWebview | undefined,
  token: vscode.CancellationToken
): Promise<AIMemory[]> {
  // Read files
  const fileContents: { path: string; content: string }[] = [];
  for (const file of files) {
    const fullPath = join(rootPath, file);
    const content = readFileSafe(fullPath);
    if (content) {
      fileContents.push({ path: file, content: content.slice(0, 8000) });
    }
  }

  if (fileContents.length === 0) return [];

  const filesText = fileContents.map((f) => `\n─── ${f.path} ───\n${f.content}`).join('\n\n');

  const prompt = `You are a senior software architect conducting a COMPREHENSIVE project analysis.

${existingContext}
## PROJECT STRUCTURE:
\`\`\`
${treeStructure.slice(0, 5000)}
\`\`\`

## FILES TO ANALYZE (${fileContents.length} files):
${filesText}

## YOUR TASK:
Extract ALL important insights about this project. For EACH insight, output one JSON line:
{"type": "fact|decision|config|code", "content": "specific description", "tags": ["tag1", "tag2"]}

Categories:
- "fact": Tech stack (with versions), frameworks, libraries, project purpose, business domain, team structure
- "decision": Architecture patterns, design choices, folder structure rationale, coding conventions
- "config": Infrastructure, deployment, environment variables, CI/CD, Docker, database settings
- "code": Key components, important patterns, notable implementations, APIs, utilities

Requirements:
1. Be EXTREMELY SPECIFIC - mention actual names, versions, file paths, function names
2. Extract AS MANY insights as needed - no limits, be thorough
3. DO NOT repeat anything from "ALREADY KNOWN" section
4. Cover comprehensively: tech stack, architecture, business domain, infrastructure, key code
5. Only output valid JSON lines, no other text
6. Each content: 50-300 characters, specific and actionable

Begin comprehensive analysis:`;

  const messages = [vscode.LanguageModelChatMessage.User(prompt)];
  const response = await model.sendRequest(messages, {}, token);

  const memories: AIMemory[] = [];
  let currentLine = '';

  for await (const chunk of response.text) {
    channel.append(chunk);
    webview?.streamChunk(chunk);

    currentLine += chunk;
    if (currentLine.includes('\n')) {
      const parts = currentLine.split('\n');
      for (let i = 0; i < parts.length - 1; i++) {
        const line = parts[i].trim();
        if (line.startsWith('{') && line.endsWith('}')) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.content && parsed.type) {
              const memory: AIMemory = {
                content: parsed.content,
                type: parsed.type as MemoryType,
                source: 'ai-scan',
                tags: [...(parsed.tags || []), 'ai-extracted'],
              };
              memories.push(memory);
              webview?.addMemory(memory);
            }
          } catch {
            /* skip */
          }
        }
      }
      currentLine = parts[parts.length - 1];
    }
  }

  // Parse remaining
  if (currentLine.trim().startsWith('{') && currentLine.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(currentLine.trim());
      if (parsed.content && parsed.type) {
        const memory: AIMemory = {
          content: parsed.content,
          type: parsed.type as MemoryType,
          source: 'ai-scan',
          tags: [...(parsed.tags || []), 'ai-extracted'],
        };
        memories.push(memory);
        webview?.addMemory(memory);
      }
    } catch {
      /* skip */
    }
  }

  return memories;
}
