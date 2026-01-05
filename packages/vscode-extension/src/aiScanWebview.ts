/**
 * AI Scan Webview - Professional VS Code native design
 * Uses VS Code CSS variables for seamless theme integration
 */

import * as vscode from 'vscode';
import type { AIMemory } from './aiScanner';

export class AIScanWebview {
  private panel: vscode.WebviewPanel | undefined;

  // Constructor accepts extensionUri for future use

  show() {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'cortexAIScan',
      'Cortex AI Scan',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    this.panel.webview.html = this.getHtml();
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  setStatus(status: 'selecting' | 'analyzing' | 'complete' | 'error', message: string) {
    this.postMessage({ type: 'status', status, message });
  }

  setModel(name: string, allModels: string[]) {
    this.postMessage({ type: 'model', name, allModels });
  }

  setTree(tree: string, stats: { lines: number }) {
    this.postMessage({ type: 'tree', tree, stats });
  }

  setSelectedFiles(files: string[]) {
    this.postMessage({ type: 'files', files });
  }

  streamChunk(chunk: string) {
    this.postMessage({ type: 'stream', chunk });
  }

  addMemory(memory: AIMemory) {
    this.postMessage({ type: 'memory', memory });
  }

  setSummary(memories: number, files: number, model: string) {
    this.postMessage({ type: 'summary', memories, files, model });
  }

  private postMessage(message: unknown) {
    this.panel?.webview.postMessage(message);
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cortex AI Scan</title>
  <style>
    /* VS Code native theme integration */
    :root {
      --radius: 4px;
      --gap: 12px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      padding: 16px;
      line-height: 1.4;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .header h1 {
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status {
      font-size: 12px;
      padding: 3px 10px;
      border-radius: 12px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }
    .status.analyzing { background: var(--vscode-inputValidation-infoBackground); }
    .status.complete { background: var(--vscode-testing-iconPassed); color: #fff; }
    .status.error { background: var(--vscode-inputValidation-errorBackground); }

    /* Sections */
    .section {
      margin-bottom: 16px;
    }
    .section-header {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-content {
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: var(--radius);
      padding: 10px 12px;
    }

    /* Model display */
    .model-name {
      font-family: var(--vscode-editor-font-family);
      font-size: 13px;
      color: var(--vscode-textLink-foreground);
    }

    /* File chips */
    .file-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .file-chip {
      font-family: var(--vscode-editor-font-family);
      font-size: 11px;
      padding: 2px 8px;
      background: var(--vscode-textCodeBlock-background);
      border-radius: 3px;
      color: var(--vscode-foreground);
    }

    /* Stream output */
    .stream-box {
      font-family: var(--vscode-editor-font-family);
      font-size: 11px;
      max-height: 150px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
      color: var(--vscode-descriptionForeground);
    }

    /* Memory cards */
    .memories-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .memory-item {
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: var(--radius);
      padding: 10px 12px;
      border-left: 3px solid var(--vscode-textLink-foreground);
    }
    .memory-item.fact { border-left-color: var(--vscode-charts-blue); }
    .memory-item.decision { border-left-color: var(--vscode-charts-green); }
    .memory-item.config { border-left-color: var(--vscode-charts-yellow); }
    .memory-item.code { border-left-color: var(--vscode-charts-purple); }

    .memory-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .memory-type {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 1px 6px;
      border-radius: 3px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }
    .memory-content {
      font-size: 13px;
      color: var(--vscode-foreground);
      line-height: 1.5;
    }
    .memory-tags {
      display: flex;
      gap: 4px;
      margin-top: 6px;
      flex-wrap: wrap;
    }
    .tag {
      font-size: 10px;
      padding: 1px 6px;
      background: var(--vscode-textCodeBlock-background);
      border-radius: 3px;
      color: var(--vscode-descriptionForeground);
    }

    /* Summary stats */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .stat-box {
      text-align: center;
      padding: 16px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: var(--radius);
    }
    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: var(--vscode-textLink-foreground);
    }
    .stat-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }

    .hidden { display: none !important; }
    .count { color: var(--vscode-textLink-foreground); font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧠 Cortex AI Scan</h1>
    <span id="status" class="status">Initializing...</span>
  </div>

  <div id="model-section" class="section hidden">
    <div class="section-header">AI Model</div>
    <div class="section-content">
      <span id="model-name" class="model-name">-</span>
    </div>
  </div>

  <div id="files-section" class="section hidden">
    <div class="section-header">Files Selected <span id="file-count" class="count">0</span></div>
    <div class="section-content">
      <div id="file-list" class="file-list"></div>
    </div>
  </div>

  <div id="stream-section" class="section hidden">
    <div class="section-header">Live Output</div>
    <div class="section-content">
      <div id="stream" class="stream-box"></div>
    </div>
  </div>

  <div id="memories-section" class="section hidden">
    <div class="section-header">Extracted Memories <span id="memory-count" class="count">0</span></div>
    <div id="memories" class="memories-list"></div>
  </div>

  <div id="summary-section" class="section hidden">
    <div class="section-header">Complete</div>
    <div class="summary-grid">
      <div class="stat-box">
        <div id="total-memories" class="stat-value">0</div>
        <div class="stat-label">Memories</div>
      </div>
      <div class="stat-box">
        <div id="total-files" class="stat-value">0</div>
        <div class="stat-label">Files</div>
      </div>
      <div class="stat-box">
        <div id="model-used" class="stat-value" style="font-size:12px;">-</div>
        <div class="stat-label">Model</div>
      </div>
    </div>
  </div>

  <script>
    let memoryCount = 0;

    window.addEventListener('message', event => {
      const msg = event.data;

      switch (msg.type) {
        case 'status':
          document.getElementById('status').className = 'status ' + msg.status;
          document.getElementById('status').textContent = msg.message;
          break;

        case 'model':
          document.getElementById('model-section').classList.remove('hidden');
          document.getElementById('model-name').textContent = msg.name;
          break;

        case 'files':
          document.getElementById('files-section').classList.remove('hidden');
          document.getElementById('file-count').textContent = msg.files.length;
          document.getElementById('file-list').innerHTML = msg.files
            .map(f => '<span class="file-chip">' + f + '</span>')
            .join('');
          break;

        case 'stream':
          document.getElementById('stream-section').classList.remove('hidden');
          const streamEl = document.getElementById('stream');
          streamEl.textContent += msg.chunk;
          streamEl.scrollTop = streamEl.scrollHeight;
          break;

        case 'memory':
          document.getElementById('memories-section').classList.remove('hidden');
          memoryCount++;
          document.getElementById('memory-count').textContent = memoryCount;

          const item = document.createElement('div');
          item.className = 'memory-item ' + msg.memory.type;
          item.innerHTML = \`
            <div class="memory-header">
              <span class="memory-type">\${msg.memory.type}</span>
            </div>
            <div class="memory-content">\${msg.memory.content}</div>
            <div class="memory-tags">
              \${msg.memory.tags.map(t => '<span class="tag">' + t + '</span>').join('')}
            </div>
          \`;
          document.getElementById('memories').prepend(item);
          break;

        case 'summary':
          document.getElementById('summary-section').classList.remove('hidden');
          document.getElementById('total-memories').textContent = msg.memories;
          document.getElementById('total-files').textContent = msg.files;
          document.getElementById('model-used').textContent = msg.model;
          break;
      }
    });
  </script>
</body>
</html>`;
  }
}
