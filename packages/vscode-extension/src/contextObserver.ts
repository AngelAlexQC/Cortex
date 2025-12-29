import type { MemoryType } from '@cortex/shared';
import * as vscode from 'vscode';
import type { MemoryStore } from './storage';

/**
 * ContextObserver monitors editor events and automatically suggests or captures memories.
 *
 * It listens for:
 * - Document changes (throttled)
 * - Document saves
 * - Active editor changes
 */
export class ContextObserver {
  private disposables: vscode.Disposable[] = [];
  private statusBarItem: vscode.StatusBarItem;
  private isEnabled = true;

  constructor(private storage: MemoryStore) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.text = '$(eye) Cortex: Active';
    this.statusBarItem.tooltip = 'Cortex Proactive Observer is watching for context';
    this.statusBarItem.command = 'cortex.toggleObserver';
    this.statusBarItem.show();

    // Load initial state from config
    this.isEnabled = vscode.workspace
      .getConfiguration('cortex')
      .get('proactiveCapture.enabled', true);
    this.updateStatus();

    this.registerListeners();
  }

  private registerListeners() {
    // 0. Listen for configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('cortex.proactiveCapture.enabled')) {
          this.isEnabled = vscode.workspace
            .getConfiguration('cortex')
            .get('proactiveCapture.enabled', true);
          this.updateStatus();
        }
      })
    );
    // 1. Monitor active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && this.isEnabled) {
          this.handleEditorChange(editor);
        }
      })
    );

    // 2. Monitor document saves (significant changes)
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (this.isEnabled) {
          this.handleDocumentSave(doc);
        }
      })
    );

    // 3. Monitor document changes (throttled for pattern detection)
    let throttleTimeout: NodeJS.Timeout | undefined;
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (!this.isEnabled) return;

        if (throttleTimeout) {
          clearTimeout(throttleTimeout);
        }

        throttleTimeout = setTimeout(() => {
          this.handleTextChange(event);
        }, 2000);
      })
    );
  }

  private async handleEditorChange(editor: vscode.TextEditor) {
    // Basic context capture: What are we working on?
    const doc = editor.document;
    console.log(`[Cortex] Switched to: ${doc.fileName}`);
  }

  private async handleDocumentSave(doc: vscode.TextDocument) {
    const text = doc.getText();

    // Look for @cortex tags
    // Pattern: @cortex: [type] [content]
    const cortexTagRegex = /@cortex:\s*(fact|decision|code|config|note)\s+([^\n]+)/gi;
    let count = 0;

    let match = cortexTagRegex.exec(text);
    while (match !== null) {
      const type = match[1].toLowerCase() as MemoryType;
      const content = match[2].trim();

      try {
        await this.storage.add({
          content,
          type,
          source: vscode.workspace.asRelativePath(doc.uri),
          tags: ['proactive', 'tag'],
          metadata: { capturedAt: new Date().toISOString() },
        });
        count++;
      } catch (e) {
        console.error('[Cortex] Failed to save tagged memory:', e);
      }
      match = cortexTagRegex.exec(text);
    }

    if (count > 0) {
      this.notifyCapture(count);
    }
  }

  private handleTextChange(event: vscode.TextDocumentChangeEvent) {
    // const text = event.document.getText();
    // FUTURE: More advanced pattern detection or LLM-based suggestion
    // For now, only simple tagging on save is stable.
    console.log(`[Cortex] Text changed in: ${event.document.fileName}`);
  }

  private notifyCapture(count: number) {
    this.statusBarItem.text = `$(check) Cortex: Captured ${count}`;
    setTimeout(() => {
      this.statusBarItem.text = '$(eye) Cortex: Active';
    }, 5000);

    vscode.window.showInformationMessage(`Cortex captured ${count} proactive memories.`);
  }

  public toggle(enabled?: boolean) {
    this.isEnabled = enabled ?? !this.isEnabled;
    // Sync back to configuration
    vscode.workspace
      .getConfiguration('cortex')
      .update('proactiveCapture.enabled', this.isEnabled, vscode.ConfigurationTarget.Global);
    this.updateStatus();
  }

  private updateStatus() {
    this.statusBarItem.text = this.isEnabled
      ? '$(eye) Cortex: Active'
      : '$(eye-closed) Cortex: Paused';
    this.statusBarItem.tooltip = this.isEnabled
      ? 'Cortex Proactive Observer is watching'
      : 'Cortex Proactive Observer is paused';
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.statusBarItem.dispose();
  }
}
