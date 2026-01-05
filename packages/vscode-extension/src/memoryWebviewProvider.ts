import type { Memory } from '@ecuabyte/cortex-shared';
import * as vscode from 'vscode';
import type { MemoryStore } from './storage';

/**
 * Color mapping for memory types
 */
const TYPE_COLORS: Record<string, string> = {
  fact: '#FFD93D',
  decision: '#6BCB77',
  code: '#4D96FF',
  config: '#FF6B35',
  note: '#C8B6FF',
};

export class MemoryWebviewProvider {
  private panel?: vscode.WebviewPanel;

  constructor(
    private readonly extensionUri: vscode.Uri,
    readonly _store: MemoryStore
  ) {}

  public showMemory(memory: Memory) {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Two);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'cortexMemoryDetail',
        'Memory Detail',
        vscode.ViewColumn.Two,
        {
          enableScripts: true,
          localResourceRoots: [this.extensionUri],
        }
      );

      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    }

    this.panel.title = `Memory: ${memory.type}`;
    this.panel.webview.html = this.getWebviewContent(memory);
  }

  private getWebviewContent(memory: Memory): string {
    const formatDate = (dateString?: string) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleString();
    };

    const typeColor = TYPE_COLORS[memory.type] || '#C8B6FF';
    const isCode = memory.type === 'code';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Memory Detail</title>
  <style>
    :root {
      --type-color: ${typeColor};
    }

    * {
      box-sizing: border-box;
    }

    body {
      padding: 24px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: linear-gradient(135deg,
        var(--vscode-editor-background) 0%,
        var(--vscode-sideBar-background) 100%);
      min-height: 100vh;
      margin: 0;
    }

    .card {
      background: var(--vscode-editor-background);
      border-radius: 12px;
      border: 1px solid var(--vscode-panel-border);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg,
        color-mix(in srgb, var(--type-color) 20%, transparent) 0%,
        color-mix(in srgb, var(--type-color) 5%, transparent) 100%);
      padding: 20px 24px;
      border-bottom: 1px solid var(--vscode-panel-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      background: var(--type-color);
      color: #1a1a1a;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .type-icon {
      font-size: 14px;
    }

    .memory-id {
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
    }

    .body {
      padding: 24px;
    }

    .section {
      margin-bottom: 24px;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .section-title {
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .copy-btn {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }

    .copy-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
      transform: translateY(-1px);
    }

    .copy-btn.copied {
      background: var(--vscode-testing-iconPassed);
      color: white;
    }

    .content {
      background: var(--vscode-textBlockQuote-background);
      padding: 16px 20px;
      border-radius: 8px;
      border-left: 4px solid var(--type-color);
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 14px;
      line-height: 1.6;
    }

    .content.code {
      font-family: var(--vscode-editor-font-family, 'Fira Code', monospace);
      font-size: 13px;
      background: var(--vscode-textCodeBlock-background);
      border-left-color: #4D96FF;
      overflow-x: auto;
    }

    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .metadata-item {
      background: var(--vscode-textBlockQuote-background);
      padding: 12px 16px;
      border-radius: 8px;
    }

    .metadata-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .metadata-value {
      font-size: 13px;
      color: var(--vscode-foreground);
      word-break: break-word;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tag {
      background: linear-gradient(135deg,
        var(--vscode-button-secondaryBackground) 0%,
        color-mix(in srgb, var(--vscode-button-secondaryBackground) 80%, transparent) 100%);
      color: var(--vscode-button-secondaryForeground);
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
    }

    /* Syntax highlighting for code */
    .keyword { color: #C586C0; }
    .string { color: #CE9178; }
    .number { color: #B5CEA8; }
    .comment { color: #6A9955; }
    .function { color: #DCDCAA; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-left">
        <span class="type-badge">
          <span class="type-icon">${this.getTypeIcon(memory.type)}</span>
          ${memory.type}
        </span>
      </div>
      <span class="memory-id">ID: ${memory.id}</span>
    </div>

    <div class="body">
      <div class="section">
        <div class="section-header">
          <span class="section-title">Content</span>
          <button class="copy-btn" onclick="copyContent()">
            <span id="copy-icon">📋</span>
            <span id="copy-text">Copy</span>
          </button>
        </div>
        <div class="content${isCode ? ' code' : ''}" id="memory-content">${this.escapeHtml(memory.content)}</div>
      </div>

      <div class="section">
        <div class="section-header">
          <span class="section-title">Metadata</span>
        </div>
        <div class="metadata-grid">
          <div class="metadata-item">
            <div class="metadata-label">Source</div>
            <div class="metadata-value">${this.escapeHtml(memory.source)}</div>
          </div>
          <div class="metadata-item">
            <div class="metadata-label">Created</div>
            <div class="metadata-value">${formatDate(memory.createdAt)}</div>
          </div>
          <div class="metadata-item">
            <div class="metadata-label">Updated</div>
            <div class="metadata-value">${formatDate(memory.updatedAt)}</div>
          </div>
        </div>
      </div>

      ${
        memory.tags && memory.tags.length > 0
          ? `
      <div class="section">
        <div class="section-header">
          <span class="section-title">Tags</span>
        </div>
        <div class="tags">
          ${memory.tags.map((tag: string) => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
        </div>
      </div>
      `
          : ''
      }
    </div>
  </div>

  <script>
    function copyContent() {
      const content = document.getElementById('memory-content').textContent;
      navigator.clipboard.writeText(content).then(() => {
        const btn = document.querySelector('.copy-btn');
        const icon = document.getElementById('copy-icon');
        const text = document.getElementById('copy-text');

        btn.classList.add('copied');
        icon.textContent = '✓';
        text.textContent = 'Copied!';

        setTimeout(() => {
          btn.classList.remove('copied');
          icon.textContent = '📋';
          text.textContent = 'Copy';
        }, 2000);
      });
    }
  </script>
</body>
</html>`;
  }

  private getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      fact: '💡',
      decision: '✅',
      code: '💻',
      config: '⚙️',
      note: '📝',
    };
    return icons[type] || '📌';
  }

  private escapeHtml(text: string | null | undefined): string {
    if (text === null || text === undefined) return '';
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  }
}
