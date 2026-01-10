/**
 * Language Model Tools for VS Code Copilot Integration
 * These tools allow Copilot to save and recall Cortex memories.
 */

import type { MemoryType } from '@ecuabyte/cortex-shared';
import * as vscode from 'vscode';
import type { MemoryStore } from './storage';

// === Interfaces ===

interface RememberParams {
  content: string;
  type?: string;
  tags?: string[];
}

interface RecallParams {
  query: string;
  type?: string;
  limit?: number;
}

// === cortex_remember Tool ===

export class CortexRememberTool implements vscode.LanguageModelTool<RememberParams> {
  constructor(
    private store: MemoryStore,
    private onMemoryAdded?: () => void
  ) {}

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<RememberParams>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    const content = options.input.content;
    const preview = content.length > 50 ? `${content.slice(0, 50)}...` : content;

    return {
      invocationMessage: `Saving memory: "${preview}"`,
      confirmationMessages: {
        title: 'Save Memory to Cortex',
        message: new vscode.MarkdownString(
          `Save this to your project memories?\n\n> ${preview}\n\nType: **${options.input.type || 'note'}**`
        ),
      },
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<RememberParams>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { content, type = 'note', tags = [] } = options.input;

    try {
      const id = await this.store.add({
        content,
        type: type as MemoryType,
        source: 'copilot-chat',
        tags: [...tags, 'auto-captured'],
      });

      // Refresh tree view
      this.onMemoryAdded?.();

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `✓ Memory saved (ID: ${id}). You can recall it later using cortex_recall.`
        ),
      ]);
    } catch (error) {
      throw new Error(`Failed to save memory: ${error}`);
    }
  }
}

// === cortex_recall Tool ===

export class CortexRecallTool implements vscode.LanguageModelTool<RecallParams> {
  constructor(private store: MemoryStore) {}

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<RecallParams>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: `Searching memories for: "${options.input.query}"`,
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<RecallParams>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { query, type, limit = 5 } = options.input;

    try {
      const memories = await this.store.search(query, { type, limit });

      if (memories.length === 0) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `No memories found for "${query}". The user may need to add some first.`
          ),
        ]);
      }

      const formatted = memories
        .map((m, i) => `${i + 1}. [${m.type}] ${m.content} (from: ${m.source})`)
        .join('\n');

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Found ${memories.length} relevant memories:\n\n${formatted}`
        ),
      ]);
    } catch (error) {
      throw new Error(`Failed to search memories: ${error}`);
    }
  }
}

// === Registration ===

import { TOOL_NAMES } from '@ecuabyte/cortex-shared';

export function registerCortexTools(
  context: vscode.ExtensionContext,
  store: MemoryStore,
  onMemoryAdded?: () => void
): void {
  // Check if API is available (requires VS Code 1.93+)
  if (!vscode.lm?.registerTool) {
    console.log('[Cortex] Language Model Tool API not available (requires VS Code 1.93+)');
    return;
  }

  context.subscriptions.push(
    vscode.lm.registerTool(TOOL_NAMES.REMEMBER, new CortexRememberTool(store, onMemoryAdded)),
    vscode.lm.registerTool(TOOL_NAMES.RECALL, new CortexRecallTool(store))
  );

  console.log(
    `[Cortex] Registered Language Model Tools: ${TOOL_NAMES.REMEMBER}, ${TOOL_NAMES.RECALL}`
  );
}
