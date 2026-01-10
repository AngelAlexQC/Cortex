import type { MemoryType } from '@ecuabyte/cortex-shared';
import * as vscode from 'vscode';
import type { AIScanWebview } from './aiScanWebview';
import type { MemoryStore } from './storage';

/**
 * ContextObserver monitors editor events and automatically suggests or captures memories.
 *
 * It listens for:
 * - Document changes (throttled)
 * - Document saves
 * - Active editor changes
 */
export class ContextObserver implements vscode.CodeLensProvider {
  private disposables: vscode.Disposable[] = [];
  private statusBarItem: vscode.StatusBarItem;
  private isEnabled = true;

  private memoryCount = 0;
  private webview: AIScanWebview | undefined;

  // HUD Decorations (The "Iron Man" Visuals)
  private decorations: Record<string, vscode.TextEditorDecorationType> = {};

  // Heuristic Detection State
  private lastTypeTime = 0;
  private charCount = 0;
  private isAgentTyping = false;
  private activityThreshold = 50; // ms per char (approx for LLM streaming)
  private debounceTimer: NodeJS.Timeout | undefined;

  // Event emitter for CodeLenses
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;



  constructor(private storage: MemoryStore) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'cortex.toggleObserver';
    this.statusBarItem.show();

    // Initialize "Iron Man" Decorations
    this.initializeDecorations();

    // Load initial state from config
    this.isEnabled = vscode.workspace
      .getConfiguration('cortex')
      .get('proactiveCapture.enabled', true);

    // Initialize memory count and status
    this.refreshMemoryCount();
    this.registerListeners();
  }

  private initializeDecorations() {
    // 1. Tech Debt (Orange) - "Radar"
    this.decorations['debt'] = vscode.window.createTextEditorDecorationType({
      gutterIconPath: vscode.Uri.parse('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iI2Y5NzMxNiI+PHBhdGggZD0iTTggMEw2IDhoNHY4bDItOGgtNHoiLz48L3N2Zz4='),
      overviewRulerColor: '#f97316',
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      isWholeLine: false,
    });

    // 2. Security/Healing (Indigo) - "Guardian"
    this.decorations['security'] = vscode.window.createTextEditorDecorationType({
      gutterIconPath: vscode.Uri.parse('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0iIzYzNjZmMSI+PHBhdGggZD0iTTggMEw2IDhoNHY4bDItOGgtNHoiLz48L3N2Zz4='), // Placeholder icon, would use proper shield
      border: '1px solid #6366f120',
      backgroundColor: '#6366f105',
    });

    // 3. Cortex Core (Blue) - "Brain"
    this.decorations['core'] = vscode.window.createTextEditorDecorationType({
       after: {
        contentText: ' 🧠 Cortex Active',
        color: '#3b82f6',
        margin: '0 0 0 20px',
        fontStyle: 'italic',
        fontWeight: 'bold'
       }
    });
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

    // 2. Monitor document changes (Heuristic Detection)
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        this.detectAgentActivity(event);
        if (!this.isEnabled) return;
        // Debounced analysis (already handled by debounceTimer)
      })
    );

    // 2b. Background Analysis on Open (Passive Context Scan)
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((doc) => {
         if (!this.isEnabled) return;
         // Trigger immediate scan when a new file enters context
         this.triggerContextScan();

         // In a real implementation, this would queue a background job:
         // this.scanner.analyzeFile(doc.uri);
      })
    );

    // 3. Periodically refresh memory count (every 30 seconds)
    const countInterval = setInterval(() => {
      this.refreshMemoryCount();
    }, 30000);

    this.disposables.push({
      dispose: () => clearInterval(countInterval),
    });

    // Register CodeLens Provider
    this.disposables.push(
      vscode.languages.registerCodeLensProvider(
        { scheme: 'file', language: 'typescript' }, // For now restrict to TS/JS to test
        this
      )
    );
     this.disposables.push(
      vscode.languages.registerCodeLensProvider(
        { scheme: 'file', language: 'javascript' },
        this
      )
    );
  }

  /**
   * "Iron Man" Focus: Heuristic Agent Detection
   * Detects if typing is inhumanly fast or consistent (Agent) vs bursts (Human).
   */
  private detectAgentActivity(event: vscode.TextDocumentChangeEvent) {
    const now = Date.now();
    const diff = now - this.lastTypeTime;
    this.lastTypeTime = now;

    // Clear existing debounce timer
    if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
    }

    // Set new debounce timer to trigger scan when typing stops
    this.debounceTimer = setTimeout(() => {
        this.triggerContextScan();

        if (this.isAgentTyping) {
            this.isAgentTyping = false;
            this.setScannerState('idle');
        }
        this.charCount = 0;
    }, 600);


    // Agent characteristic: Fast, consistent stream (~10-50ms per token)
    if (diff < 100 && event.contentChanges.length > 0) {
        this.charCount++;
        if (this.charCount > 10) {
            if (!this.isAgentTyping) {
                this.isAgentTyping = true;
                this.setScannerState('active');
            }
        }
    }
  }

  private setScannerState(state: 'idle' | 'active') {
      if (state === 'active') {
          this.statusBarItem.text = '$(circle-large-outline) Cortex Scanning...';
          this.statusBarItem.color = '#3b82f6'; // Cortex Blue
          this.webview?.setStatus('analyzing', 'Agent Activity Detected');
      } else {
          this.updateStatus();
          this.webview?.setStatus('complete', 'Context Synced');
          // Reset to ready after short delay
          setTimeout(() => {
              // Only reset if we haven't started typing again
              if (!this.isAgentTyping) this.webview?.setStatus('selecting', 'Ready');
          }, 2000);
      }
  }

  public setWebview(webview: AIScanWebview) {
      this.webview = webview;
  }

  private async triggerContextScan() {
      // Refresh CodeLenses to show insights
      this._onDidChangeCodeLenses.fire();
  }

  // --- CodeLens Provider Implementation ---

  public async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[]> {
      // console.log('[Cortex] provideCodeLenses logic started');
      if (!this.isEnabled) return [];

      const lenses: vscode.CodeLens[] = [];
      const text = document.getText();

      // HEURISTIC SCANS (Simulated for Demo)

      // 1. Tech Debt / TODOs
      const todoRegex = /\/\/\s*TODO|FIXME/g;
      let match;
      while ((match = todoRegex.exec(text)) !== null) {
          const range = new vscode.Range(
              document.positionAt(match.index),
              document.positionAt(match.index + match[0].length)
          );
          const cmd: vscode.Command = {
              title: '⚡ Tech Debt Detected',
              command: 'cortex.showDashboardItem',
              arguments: [{ type: 'debt', line: match.index }],
              tooltip: 'Click to analyze Technical Debt in Dashboard'
          };
          lenses.push(new vscode.CodeLens(range, cmd));
      }

      // 2. Security Check
      // Improve regex to find line number
      const securityRegex = /password|secret|token/g;
      let secMatch;
      while ((secMatch = securityRegex.exec(text)) !== null) {
           const range = new vscode.Range(
              document.positionAt(secMatch.index),
              document.positionAt(secMatch.index + secMatch[0].length)
           );
            const cmd: vscode.Command = {
              title: '🛡️ Security Guardian Active',
              command: 'cortex.showDashboardItem',
              arguments: [{ type: 'security', line: secMatch.index }],
              tooltip: 'Click to view Security Insights'
          };
          lenses.push(new vscode.CodeLens(range, cmd));
      }

      // 3. Relevant Memories (Mockup for now, connected to DB later)
      // In real impl, we query this.storage.search(document.fileName)
      const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
        lenses.push(new vscode.CodeLens(range, {
            title: `🧠 ${this.memoryCount} Memories Linked`,
            command: 'cortex.openDashboard'
        }));

      return lenses;
  }

  private async refreshMemoryCount() {
    try {
      const stats = await this.storage.stats();
      this.memoryCount = stats.total;
      this.updateStatus();
    } catch {
      // Silently ignore errors during count refresh
    }
  }

  private async handleEditorChange(editor: vscode.TextEditor) {
    // Basic context capture: What are we working on?
    const doc = editor.document;
    // console.log(`[Cortex] Switched to: ${doc.fileName}`);

    // Immediate scan for static analysis (TODOs, Security)
    this._onDidChangeCodeLenses.fire();

    this.triggerContextScan();
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
    const countText = this.memoryCount > 0 ? ` ${this.memoryCount}` : '';

    if (this.isEnabled) {
      this.statusBarItem.text = `$(brain)${countText}`;
      this.statusBarItem.tooltip = `Cortex: ${this.memoryCount} memories • Click to disable`;
      this.statusBarItem.color = undefined;
      this.statusBarItem.backgroundColor = undefined;
    } else {
      this.statusBarItem.text = `$(brain)${countText}`;
      this.statusBarItem.tooltip = `Cortex: Paused • Click to resume`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
  }

  public dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.statusBarItem.dispose();
    Object.values(this.decorations).forEach(d => d.dispose());
  }
}
