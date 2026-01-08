/**
 * Cortex AI Scanner - Hierarchical Contextual Analysis
 *
 * Three-Phase Intelligent Analysis:
 * Phase 1: Global Context (read anchor files, understand project holistically)
 * Phase 2: Directed Analysis (AI decides what needs deeper inspection)
 * Phase 3: Synthesis (consolidate and deduplicate memories)
 *
 * Features:
 * - Context-aware analysis (no blind file selection)
 * - AI-driven depth decisions
 * - Rich, detailed memories (no length limits)
 * - Streaming output with visual feedback
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { Memory, MemoryType } from '@ecuabyte/cortex-shared';
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
  savedCount: number; // Number of memories saved in real-time
}

// Callback for real-time memory saving
export type OnMemorySaved = (memory: AIMemory, savedCount: number) => void;

interface ProjectContext {
  projectName: string;
  purpose: string;
  techStack: string[];
  architecture: string;
  areas: ProjectArea[];
  existingMemories: string;
  language: string; // Detected language for output (e.g., "English", "Spanish", "Portuguese")
}

export interface ProjectArea {
  name: string;
  path: string;
  needsDeepAnalysis: boolean;
  keyFiles: string[];
  reason: string;
  // UI State Properties
  rationale?: string; // mapping to reason for API compatibility if needed
  status?: 'pending' | 'analyzing' | 'complete' | 'skipped' | 'error';
  memoryCount?: number;
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

// Anchor files - always read first for global understanding
const ANCHOR_FILES = [
  'README.md',
  'readme.md',
  'README',
  'package.json',
  'composer.json',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'ARCHITECTURE.md',
  'DESIGN.md',
  'CONTRIBUTING.md',
  'docker-compose.yml',
  'docker-compose.yaml',
  'Dockerfile',
  '.env.example',
  '.env.sample',
  'tsconfig.json',
  'webpack.config.js',
  'vite.config.ts',
  'Makefile',
  'justfile',
];

let outputChannel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
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
    const treeCmd = `tree -L 6 --noreport -I "${ignorePattern}" --dirsfirst 2>/dev/null || find . -maxdepth 6 -type f ! -path './node_modules/*' ! -path './.git/*' 2>/dev/null | head -300`;

    const result = execSync(treeCmd, {
      cwd: rootPath,
      encoding: 'utf-8',
      maxBuffer: 5 * 1024 * 1024,
    });

    return result.slice(0, 30000);
  } catch {
    return generateManualTree(rootPath, '', 0, 6);
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

    for (let i = 0; i < entries.length && i < 50; i++) {
      const entry = entries[i];
      const isLast = i === entries.length - 1 || i === 49;
      const connector = isLast ? '└── ' : '├── ';
      const newPrefix = prefix + (isLast ? '    ' : '│   ');

      if (entry.isDirectory()) {
        result += `${prefix}${connector}${entry.name}/\n`;
        result += generateManualTree(join(rootPath, entry.name), newPrefix, depth + 1, maxDepth);
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
 * Read a file safely with generous size limit
 */
function readFileSafe(filePath: string, maxSize: number = 500000): string | null {
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
 * Read all anchor files from project root
 */
function readAnchorFiles(rootPath: string): { name: string; content: string }[] {
  const anchors: { name: string; content: string }[] = [];

  for (const anchorName of ANCHOR_FILES) {
    const filePath = join(rootPath, anchorName);
    const content = readFileSafe(filePath);
    if (content) {
      anchors.push({ name: anchorName, content });
    }
  }

  return anchors;
}

/**
 * Format existing memories for deduplication
 */
function formatExistingMemories(memories: Memory[]): string {
  if (memories.length === 0) return '';
  const items = memories.map((m) => `- [${m.type}] ${m.content}`);
  return `## MEMORIAS EXISTENTES (NO REPETIR):\n${items.join('\n')}\n\n`;
}

/**
 * Select the best available model
 */
async function selectBestModel(channel: vscode.OutputChannel): Promise<vscode.LanguageModelChat> {
  const allModels = await vscode.lm.selectChatModels({});

  if (allModels.length === 0) {
    throw new Error('No language models available. Please configure a provider.');
  }

  channel.appendLine(`📋 Modelos disponibles (${allModels.length}):`);
  for (const m of allModels.slice(0, 10)) {
    channel.appendLine(`   - ${m.name || m.id}`);
  }

  const priorityNames = [
    'claude opus 4',
    'opus 4',
    'gpt-5',
    'gemini 3 pro',
    'claude sonnet 4',
    'sonnet 4',
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
      channel.appendLine(`\n✓ Seleccionado: ${match.name || match.id}`);
      return match;
    }
  }

  const fallback = allModels[0];
  channel.appendLine(`\n⚠️ Fallback: ${fallback.name || fallback.id}`);
  return fallback;
}

// ============================================================================
// PHASE 1: Build Project Context
// ============================================================================

async function buildProjectContext(
  model: vscode.LanguageModelChat,
  rootPath: string,
  treeStructure: string,
  existingMemories: string,
  channel: vscode.OutputChannel,
  _webview: AIScanWebview | undefined,
  token: vscode.CancellationToken
): Promise<ProjectContext> {
  const anchors = readAnchorFiles(rootPath);

  channel.appendLine(`📌 Archivos ancla encontrados: ${anchors.length}`);
  for (const a of anchors) {
    channel.appendLine(`   - ${a.name} (${a.content.length} chars)`);
  }

  const anchorContents = anchors.map((a) => `\n─── ${a.name} ───\n${a.content}`).join('\n\n');

  const prompt = `You are a senior software architect analyzing a project for the first time.

## COMPLETE PROJECT STRUCTURE:
\`\`\`
${treeStructure}
\`\`\`

## KEY FILES (full content):
${anchorContents}

${existingMemories}

## YOUR TASK:
Understand the project HOLISTICALLY before analyzing specific code.

Analyze:
1. What is the main purpose of the project?
2. What tech stack does it use?
3. What is the general architecture?
4. What are the main areas/modules?
5. Which areas need deep analysis and which do you already understand well?
6. What language (human language) is used in the project's documentation, comments, and variable names?

Respond ONLY with this JSON (no markdown, no explanations):
{
  "projectName": "project name",
  "purpose": "2-3 sentence description of purpose",
  "techStack": ["tech1", "tech2", ...],
  "architecture": "2-3 sentence architecture description",
  "language": "detected language for output (English, Spanish, Portuguese, French, etc.)",
  "areas": [
    {
      "name": "Area name",
      "path": "relative/path/",
      "needsDeepAnalysis": true,
      "keyFiles": ["file1.ts", "file2.ts"],
      "reason": "Why it needs or doesn't need deep analysis"
    }
  ]
}

IMPORTANT:
- Detect the project's main language from README, comments, and code style
- All your future outputs should be in the detected language
- needsDeepAnalysis=false if you already understand the area from anchor files
- needsDeepAnalysis=true only for areas with complex business logic requiring inspection
- Be selective: better to deeply analyze 3-5 important areas than superficially 20`;

  const messages = [vscode.LanguageModelChatMessage.User(prompt)];
  const response = await model.sendRequest(messages, {}, token);

  let fullResponse = '';
  for await (const chunk of response.text) {
    fullResponse += chunk;
    channel.append(chunk);
  }

  // Parse JSON response
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = fullResponse;
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    const detectedLang = parsed.language || 'English';
    channel.appendLine(`\n\n🌐 Detected language: ${detectedLang}`);

    return {
      projectName: parsed.projectName || 'Unknown',
      purpose: parsed.purpose || '',
      techStack: parsed.techStack || [],
      architecture: parsed.architecture || '',
      areas: parsed.areas || [],
      existingMemories,
      language: detectedLang,
    };
  } catch (e) {
    channel.appendLine(`\n⚠️ Error parsing context: ${e}`);
    return {
      projectName: basename(rootPath),
      purpose: '',
      techStack: [],
      architecture: '',
      areas: [],
      existingMemories,
      language: 'English',
    };
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

export async function scanProjectWithAI(
  projectPath: string,
  token: vscode.CancellationToken,
  store?: MemoryStore,
  webview?: AIScanWebview,
  onMemorySaved?: OnMemorySaved,
  refreshTree?: () => void
): Promise<AIScanResult> {
  if (!vscode.lm?.selectChatModels) {
    throw new Error('Language Model API not available.');
  }

  const channel = getOutputChannel();
  channel.clear();
  channel.show(true); // Show output channel as requested

  const log = (msg: string) => channel.appendLine(msg);

  log('═══════════════════════════════════════════════════════════════');
  log('🧠 CORTEX AI SCAN - Análisis Contextual Jerárquico');
  log('═══════════════════════════════════════════════════════════════\n');

  // Select model
  webview?.setStatus('selecting', 'Seleccionando modelo AI...');
  log('🔍 Seleccionando mejor modelo...');
  const model = await selectBestModel(channel);
  const modelName = model.name || model.id || 'Unknown';

  const allModels = await vscode.lm.selectChatModels({});
  webview?.setModel(
    modelName,
    allModels.slice(0, 15).map((m) => m.name || m.id || 'Unknown')
  );

  // Generate tree
  webview?.setStatus('selecting', 'Analizando estructura...');
  log('\n📂 Generando estructura del proyecto...');
  const treeStructure = generateTreeStructure(projectPath);
  log(`✓ Árbol generado: ${treeStructure.split('\n').length} líneas`);
  webview?.setTree(treeStructure, { lines: treeStructure.split('\n').length });

  // Load existing memories
  let existingContext = '';
  if (store) {
    try {
      const existing = await store.list({});
      existingContext = formatExistingMemories(existing);
      if (existing.length > 0) {
        log(`\n🧹 Cargadas ${existing.length} memorias existentes para deduplicación`);
      }
    } catch {
      /* skip */
    }
  }

  // ========== PHASE 1 ==========
  log('\n───────────────────────────────────────────────────────────────');
  log('📋 FASE 1: Construcción de Contexto Global');
  log('───────────────────────────────────────────────────────────────\n');
  webview?.setStatus('analyzing', 'Fase 1: Comprendiendo proyecto globalmente...');

  const context = await buildProjectContext(
    model,
    projectPath,
    treeStructure,
    existingContext,
    channel,
    webview,
    token
  );

  log(`\n\n✓ Proyecto: ${context.projectName}`);
  log(`✓ Propósito: ${context.purpose}`);
  log(`✓ Stack: ${context.techStack.join(', ')}`);
  log(`✓ Language: ${context.language}`);
  log(`✓ Áreas identificadas: ${context.areas.length}`);

  // Send project context to webview
  webview?.setProjectContext(context.projectName, context.techStack);

  // Mark areas with initial status
  const areasWithStatus = context.areas.map((a) => ({
    ...a,
    status: (a.needsDeepAnalysis ? 'pending' : 'skipped') as 'pending' | 'skipped',
  }));
  webview?.setAreas?.(areasWithStatus);

  const areasNeedingAnalysis = context.areas.filter((a) => a.needsDeepAnalysis);
  log(`✓ Áreas que requieren análisis profundo: ${areasNeedingAnalysis.length}`);

  webview?.setSelectedFiles(areasNeedingAnalysis.flatMap((a) => a.keyFiles));

  // ========== PHASE 2 ==========
  log('\n───────────────────────────────────────────────────────────────');
  log('🔬 PHASE 2: Directed Deep Analysis');
  log('───────────────────────────────────────────────────────────────');
  webview?.setStatus('analyzing', 'Phase 2: Deep analysis of key areas...');

  const allMemories: AIMemory[] = [];
  let filesAnalyzed = 0;
  let savedCount = 0;

  // Helper to save memory in real-time
  const saveMemoryRealTime = async (memory: AIMemory) => {
    if (store) {
      try {
        await store.add({
          content: memory.content,
          type: memory.type,
          source: memory.source,
          tags: memory.tags,
        });
        savedCount++;
        log(`   💾 Saved: [${memory.type}] ${memory.content.substring(0, 50)}...`);
        onMemorySaved?.(memory, savedCount);
        refreshTree?.();
      } catch (e) {
        log(`   ⚠️ Failed to save: ${e}`);
      }
    }
  };

  log(`\n📋 FASE 2: Análisis Detallado (Paralelo: ${areasNeedingAnalysis.length} áreas)`);
  webview?.setStatus(
    'analyzing',
    `Analizando ${areasNeedingAnalysis.length} áreas simultáneamente...`
  );

  // Run analysis in PARALLEL
  await Promise.all(
    areasNeedingAnalysis.map(async (area) => {
      // Update area status to analyzing
      webview?.updateAreaStatus(area.name, 'analyzing');

      try {
        const areaMemories = await analyzeAreaWithRealTimeSave(
          model,
          projectPath,
          area,
          context,
          channel,
          webview,
          token,
          saveMemoryRealTime
        );

        allMemories.push(...areaMemories);
        filesAnalyzed += area.keyFiles.length;

        // Update area status to complete
        webview?.updateAreaStatus(area.name, 'complete', areaMemories.length);
        log(`   ✓ ${area.name}: ${areaMemories.length} memorias`);
      } catch (error) {
        log(`   ❌ Error en área ${area.name}: ${error}`);
        webview?.updateAreaStatus(area.name, 'error');
      }
    })
  );

  // ========== PHASE 3 ==========
  log('\n───────────────────────────────────────────────────────────────');
  log('🧠 PHASE 3: High-Level Synthesis');
  log('───────────────────────────────────────────────────────────────');
  webview?.setStatus('analyzing', 'Phase 3: Synthesis and consolidation...');

  const highLevelMemories = await synthesizeHighLevelMemoriesWithRealTimeSave(
    model,
    context,
    allMemories,
    channel,
    webview,
    token,
    saveMemoryRealTime
  );
  allMemories.push(...highLevelMemories);

  // Complete
  webview?.setStatus('complete', `Saved ${savedCount} memories`);
  webview?.setSummary(allMemories.length, filesAnalyzed, modelName);

  log('\n\n═══════════════════════════════════════════════════════════════');
  log(`✅ ANALYSIS COMPLETE`);
  log(`   📊 Memories extracted: ${allMemories.length}`);
  log(`   💾 Memories saved: ${savedCount}`);
  log(`   📁 Files analyzed: ${filesAnalyzed}`);
  log(`   🤖 Model: ${modelName}`);
  log(`   📋 Areas analyzed: ${areasNeedingAnalysis.length}/${context.areas.length}`);
  log('═══════════════════════════════════════════════════════════════');

  return { memories: allMemories, filesAnalyzed, modelUsed: modelName, savedCount };
}

// Wrapper for analyzeArea that saves memories in real-time
export async function analyzeAreaWithRealTimeSave(
  model: vscode.LanguageModelChat,
  rootPath: string,
  area: ProjectArea,
  context: ProjectContext,
  channel: vscode.OutputChannel,
  webview: AIScanWebview | undefined,
  token: vscode.CancellationToken,
  saveMemory: (memory: AIMemory) => Promise<void>
): Promise<AIMemory[]> {
  channel.appendLine(`\n🔍 Analyzing: ${area.name} (${area.path})`);

  const fileContents: { path: string; content: string }[] = [];

  for (const file of area.keyFiles) {
    let content: string | null = null;
    let resolvedPath = file;

    const exactPath = join(rootPath, file);
    content = readFileSafe(exactPath);

    if (!content && area.path) {
      const areaPath = join(rootPath, area.path, basename(file));
      content = readFileSafe(areaPath);
      if (content) resolvedPath = join(area.path, basename(file));
    }

    if (!content && area.path) {
      const directPath = join(rootPath, area.path, file);
      content = readFileSafe(directPath);
      if (content) resolvedPath = join(area.path, file);
    }

    if (content) {
      fileContents.push({ path: resolvedPath, content });
      channel.appendLine(`   📄 ${resolvedPath} (${content.length} chars)`);
    } else {
      channel.appendLine(`   ⚠️ Not found: ${file}`);
    }
  }

  if (fileContents.length === 0 && area.path) {
    channel.appendLine(`   🔄 Fallback: scanning directory ${area.path}...`);
    const areaDir = join(rootPath, area.path);
    try {
      if (existsSync(areaDir) && statSync(areaDir).isDirectory()) {
        const entries = readdirSync(areaDir, { withFileTypes: true });
        const relevantFiles = entries
          .filter((e) => e.isFile() && !e.name.startsWith('.'))
          .slice(0, 10);

        for (const entry of relevantFiles) {
          const filePath = join(areaDir, entry.name);
          const content = readFileSafe(filePath);
          if (content) {
            const relativePath = join(area.path, entry.name);
            fileContents.push({ path: relativePath, content });
            channel.appendLine(`   📄 ${relativePath} (${content.length} chars)`);
          }
        }
      }
    } catch (e) {
      channel.appendLine(`   ⚠️ Error scanning directory: ${e}`);
    }
  }

  if (fileContents.length === 0) {
    channel.appendLine(`   ⚠️ Could not read files for this area`);
    return [];
  }

  const filesText = fileContents.map((f) => `\n─── ${f.path} ───\n${f.content}`).join('\n\n');

  const prompt = `You are a software architect analyzing the "${area.name}" area of a project.

## OUTPUT LANGUAGE: ${context.language}
All memory content must be written in ${context.language}.

## GLOBAL PROJECT CONTEXT:
- Name: ${context.projectName}
- Purpose: ${context.purpose}
- Stack: ${context.techStack.join(', ')}
- Architecture: ${context.architecture}

## AREA TO ANALYZE: ${area.name}
Path: ${area.path}
Reason for deep analysis: ${area.reason}

## FILES:
${filesText}

${context.existingMemories}

## YOUR TASK:
Extract ALL important memories from this area. For each insight, output one JSON line:
{"type": "fact|decision|config|code", "content": "detailed description in ${context.language}", "tags": ["tag1", "tag2"]}

Types:
- "fact": Information about what it does, purpose, business domain
- "decision": Architectural decisions, chosen patterns, conventions
- "config": Configuration, environment variables, deployment
- "code": Important code patterns, APIs, key utilities

CRITICAL REQUIREMENTS:
1. Be VERY SPECIFIC - mention function names, classes, paths, versions
2. Each memory must be USEFUL for a new developer
3. DO NOT repeat existing memories
4. No length limits - write as much as needed to be useful
5. Only output valid JSON, one memory per line
6. ALL CONTENT MUST BE IN ${context.language}

Begin analysis:`;

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
                source: `ai-scan:${area.name}`,
                tags: [
                  ...(parsed.tags || []),
                  'ai-extracted',
                  area.name.toLowerCase().replace(/\s+/g, '-'),
                ],
              };
              memories.push(memory);
              webview?.addMemory(memory);
              // Save immediately!
              await saveMemory(memory);
            }
          } catch {
            /* skip invalid JSON */
          }
        }
      }
      currentLine = parts[parts.length - 1];
    }
  }

  // Parse remaining line
  if (currentLine.trim().startsWith('{') && currentLine.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(currentLine.trim());
      if (parsed.content && parsed.type) {
        const memory: AIMemory = {
          content: parsed.content,
          type: parsed.type as MemoryType,
          source: `ai-scan:${area.name}`,
          tags: [
            ...(parsed.tags || []),
            'ai-extracted',
            area.name.toLowerCase().replace(/\s+/g, '-'),
          ],
        };
        memories.push(memory);
        webview?.addMemory(memory);
        await saveMemory(memory);
      }
    } catch {
      /* skip */
    }
  }

  return memories;
}

// Wrapper for synthesizeHighLevelMemories that saves in real-time
async function synthesizeHighLevelMemoriesWithRealTimeSave(
  model: vscode.LanguageModelChat,
  context: ProjectContext,
  collectedMemories: AIMemory[],
  channel: vscode.OutputChannel,
  webview: AIScanWebview | undefined,
  token: vscode.CancellationToken,
  saveMemory: (memory: AIMemory) => Promise<void>
): Promise<AIMemory[]> {
  channel.appendLine(`\n\n🧠 Phase 3: High-level synthesis (${context.language})...`);

  const memorySummary = collectedMemories.map((m) => `[${m.type}] ${m.content}`).join('\n');

  const prompt = `You are a software architect who has completed detailed analysis of a project.

## OUTPUT LANGUAGE: ${context.language}
All memory content must be written in ${context.language}.

## PROJECT: ${context.projectName}
Purpose: ${context.purpose}
Stack: ${context.techStack.join(', ')}
Architecture: ${context.architecture}

## ALREADY EXTRACTED MEMORIES:
${memorySummary}

## YOUR TASK:
Generate HIGH-LEVEL memories that complement the existing ones:
1. Architectural decisions that cross multiple areas
2. Project patterns and conventions
3. Critical information for onboarding new developers
4. Important dependencies and their purposes
5. Main data flows

DO NOT repeat what's already in existing memories.
Output one JSON line per memory:
{"type": "fact|decision|config|code", "content": "description in ${context.language}", "tags": ["tag1"]}

Only generate truly new high-level memories (ALL IN ${context.language}):`;

  const messages = [vscode.LanguageModelChatMessage.User(prompt)];
  const response = await model.sendRequest(messages, {}, token);

  const highLevelMemories: AIMemory[] = [];
  let fullResponse = '';

  for await (const chunk of response.text) {
    fullResponse += chunk;
    channel.append(chunk);
  }

  // Parse JSON lines and save each
  const lines = fullResponse.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.content && parsed.type) {
          const memory: AIMemory = {
            content: parsed.content,
            type: parsed.type as MemoryType,
            source: 'ai-scan:synthesis',
            tags: [...(parsed.tags || []), 'ai-extracted', 'high-level'],
          };
          highLevelMemories.push(memory);
          webview?.addMemory(memory);
          await saveMemory(memory);
        }
      } catch {
        /* skip */
      }
    }
  }

  return highLevelMemories;
}
