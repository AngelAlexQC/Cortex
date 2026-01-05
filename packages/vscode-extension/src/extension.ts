import type { Memory } from '@ecuabyte/cortex-shared';
import * as vscode from 'vscode';
import { ContextObserver } from './contextObserver';
import { registerCortexTools } from './cortexTools';
import { MemoryTreeProvider } from './memoryTreeProvider';
import { MemoryWebviewProvider } from './memoryWebviewProvider';
import { MemoryStore } from './storage';
import { CortexTaskProvider } from './taskProvider';
import type { Tool } from './toolScanner';
import { ToolTreeProvider } from './toolTreeProvider';

export async function activate(context: vscode.ExtensionContext) {
  try {
    console.log('[Cortex] Extension activation started');

    // Initialize memory store
    console.log('[Cortex] Initializing MemoryStore...');
    const store = new MemoryStore();

    // Initialize context observer
    console.log('[Cortex] Initializing ContextObserver...');
    const observer = new ContextObserver(store);
    context.subscriptions.push(observer);

    // Register tree view providers
    console.log('[Cortex] Registering Tree Providers...');
    const treeProvider = new MemoryTreeProvider(store);
    vscode.window.registerTreeDataProvider('cortex.memoryTree', treeProvider);

    const toolTreeProvider = new ToolTreeProvider();
    vscode.window.registerTreeDataProvider('cortex.toolsTree', toolTreeProvider);

    // Register task provider for native VS Code task integration
    console.log('[Cortex] Registering Task Provider...');
    const taskProvider = new CortexTaskProvider();
    context.subscriptions.push(
      vscode.tasks.registerTaskProvider(CortexTaskProvider.type, taskProvider)
    );

    // Register webview provider
    console.log('[Cortex] Registering Webview Provider...');
    const webviewProvider = new MemoryWebviewProvider(context.extensionUri, store);

    // Register Language Model Tools for Copilot integration
    console.log('[Cortex] Registering Language Model Tools...');
    registerCortexTools(context, store, () => treeProvider.refresh());

    // Register commands
    console.log('[Cortex] Registering Commands...');
    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.addMemory', async () => {
        try {
          const content = await vscode.window.showInputBox({
            prompt: 'Enter memory content',
            placeHolder: 'What do you want to remember?',
          });

          if (!content) return;

          const typeOptions: vscode.QuickPickItem[] = [
            { label: 'fact', description: 'A factual piece of information' },
            { label: 'decision', description: 'An architectural or design decision' },
            { label: 'code', description: 'A code pattern or snippet' },
            { label: 'config', description: 'Configuration information' },
            { label: 'note', description: 'General note or observation' },
          ];

          const typeChoice = await vscode.window.showQuickPick(typeOptions, {
            placeHolder: 'Select memory type',
          });

          if (!typeChoice) return;

          const source = await vscode.window.showInputBox({
            prompt: 'Enter source',
            placeHolder: 'e.g., file path, URL, conversation',
            value: vscode.window.activeTextEditor?.document.fileName || 'manual',
          });

          if (!source) return;

          const id = await store.add({
            content,
            type: typeChoice.label as Memory['type'],
            source,
          });
          vscode.window.showInformationMessage(`Memory added (ID: ${id})`);
          treeProvider.refresh();
        } catch (error) {
          vscode.window.showErrorMessage(`Error adding memory: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.searchMemories', async () => {
        try {
          const query = await vscode.window.showInputBox({
            prompt: 'Search memories',
            placeHolder: 'Enter search query',
          });

          if (!query) return;

          const results = await store.search(query, { limit: 20 });

          if (results.length === 0) {
            vscode.window.showInformationMessage('No memories found');
            return;
          }

          const items = results.map((m) => ({
            label: `[${m.type}] ${m.content}`,
            description: m.source,
            memory: m,
          }));

          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Found ${results.length} memories`,
          });

          if (selected) {
            webviewProvider.showMemory(selected.memory);
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Error searching memories: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.refreshTree', () => {
        treeProvider.refresh();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'cortex.deleteMemory',
        async (item: { memory?: { id: number; content: string } }) => {
          try {
            if (!item?.memory?.id) return;

            const confirm = await vscode.window.showWarningMessage(
              `Delete memory "${item.memory.content}"?`,
              'Delete',
              'Cancel'
            );

            if (confirm === 'Delete') {
              await store.delete(item.memory.id);
              vscode.window.showInformationMessage('Memory deleted');
              treeProvider.refresh();
            }
          } catch (error) {
            vscode.window.showErrorMessage(`Error deleting memory: ${error}`);
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.viewMemory', (item: { memory?: Memory }) => {
        if (item?.memory) {
          webviewProvider.showMemory(item.memory);
        }
      })
    );

    // Tool commands - execute via VS Code task system
    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.runTool', async (tool: Tool) => {
        try {
          if (!tool?.command) return;

          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (!workspaceFolder) return;

          // Create and execute task using VS Code's native task system
          const task = new vscode.Task(
            { type: 'cortex', tool: tool.name, category: tool.category, command: tool.command },
            workspaceFolder,
            `${tool.category}: ${tool.name}`,
            'Cortex',
            new vscode.ShellExecution(tool.command)
          );

          await vscode.tasks.executeTask(task);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to run tool: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.refreshTools', () => {
        toolTreeProvider.refresh();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.toggleObserver', () => {
        observer.toggle();
      })
    );

    // Command to save selected text as memory
    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.addSelectionAsMemory', async () => {
        try {
          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
          }

          const selection = editor.selection;
          const selectedText = editor.document.getText(selection);

          if (!selectedText || selectedText.trim().length === 0) {
            vscode.window.showWarningMessage('No text selected');
            return;
          }

          const typeOptions: vscode.QuickPickItem[] = [
            { label: 'code', description: 'A code pattern or snippet' },
            { label: 'fact', description: 'A factual piece of information' },
            { label: 'decision', description: 'An architectural or design decision' },
            { label: 'config', description: 'Configuration information' },
            { label: 'note', description: 'General note or observation' },
          ];

          const typeChoice = await vscode.window.showQuickPick(typeOptions, {
            placeHolder: 'Select memory type for selection',
          });

          if (!typeChoice) return;

          const source = vscode.workspace.asRelativePath(editor.document.uri);
          const lineInfo = `L${selection.start.line + 1}-${selection.end.line + 1}`;

          const id = await store.add({
            content: selectedText,
            type: typeChoice.label as Memory['type'],
            source: `${source}:${lineInfo}`,
          });

          vscode.window.showInformationMessage(`Selection saved as memory (ID: ${id})`);
          treeProvider.refresh();
        } catch (error) {
          vscode.window.showErrorMessage(`Error saving selection: ${error}`);
        }
      })
    );

    // Command to scan project for context
    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.scanProject', async () => {
        try {
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (!workspaceFolder) {
            vscode.window.showWarningMessage('No workspace folder open');
            return;
          }

          const scanPath = workspaceFolder.uri.fsPath;

          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: 'Cortex: Scanning project...',
              cancellable: false,
            },
            async (progress) => {
              progress.report({ message: 'Initializing scanner...' });

              // Use local scanner (no bun:sqlite dependency)
              const { ProjectScanner } = await import('./projectScanner');
              const scanner = new ProjectScanner();

              progress.report({ message: 'Scanning files...' });

              const result = await scanner.scan({ path: scanPath });

              progress.report({ message: `Saving ${result.memories.length} memories...` });

              // Save memories
              let savedCount = 0;
              for (const memory of result.memories) {
                try {
                  await store.add({
                    content: memory.content,
                    type: memory.type as Memory['type'],
                    source: memory.source,
                    tags: memory.tags,
                  });
                  savedCount++;
                } catch (e) {
                  console.error('[Cortex] Failed to save memory:', e);
                }
              }

              // Refresh tree view
              treeProvider.refresh();

              // Show results
              const byType = Object.entries(result.summary.byType)
                .filter(([, count]) => (count as number) > 0)
                .map(([type, count]) => `${type}: ${count}`)
                .join(', ');

              vscode.window.showInformationMessage(
                `✓ Scan complete! Saved ${savedCount} memories (${byType})`
              );
            }
          );
        } catch (error) {
          vscode.window.showErrorMessage(`Error scanning project: ${error}`);
        }
      })
    );

    // Command to scan project with AI (intelligent analysis)
    context.subscriptions.push(
      vscode.commands.registerCommand('cortex.scanWithAI', async () => {
        try {
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (!workspaceFolder) {
            vscode.window.showWarningMessage('No workspace folder open');
            return;
          }

          const scanPath = workspaceFolder.uri.fsPath;

          // Create visual webview panel
          const { AIScanWebview } = await import('./aiScanWebview');
          const webview = new AIScanWebview();
          webview.show();

          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: 'Cortex: AI-powered scan...',
              cancellable: true,
            },
            async (progress, token) => {
              progress.report({ message: 'Analyzing with AI...' });

              const { scanProjectWithAI } = await import('./aiScanner');
              const result = await scanProjectWithAI(scanPath, token, store, webview);

              progress.report({ message: 'Saving memories...' });

              let savedCount = 0;
              for (const memory of result.memories) {
                try {
                  await store.add({
                    content: memory.content,
                    type: memory.type,
                    source: memory.source,
                    tags: memory.tags,
                  });
                  savedCount++;
                } catch (e) {
                  console.error('[Cortex] Failed to save AI memory:', e);
                }
              }

              treeProvider.refresh();

              vscode.window.showInformationMessage(
                `✓ AI scan complete! Analyzed ${result.filesAnalyzed} files, saved ${savedCount} intelligent memories.`
              );
            }
          );
        } catch (error) {
          vscode.window.showErrorMessage(`Error in AI scan: ${error}`);
        }
      })
    );
  } catch (error) {
    console.error('Failed to activate Cortex extension:', error);
    vscode.window.showErrorMessage(
      `Cortex extension failed to start. Check terminal logs for details. Error: ${error}`
    );
  }
}

export function deactivate() {
  console.log('Cortex Memory extension deactivated');
}
