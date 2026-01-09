import * as vscode from 'vscode';
import type { AIMemory, ProjectArea } from './aiScanner';

/**
 * Manages the AI Analysis Dashboard Webview
 * Now adaptable to any VS Code theme with a futuristic "Cinematic" look.
 */
export class AIScanWebview {
  private panel: vscode.WebviewPanel | undefined;

  // State persistence
  private projectContext: { name: string; techStack: string[] } | undefined;
  private areas: ProjectArea[] = [];
  private memories: AIMemory[] = [];
  private status: 'selecting' | 'analyzing' | 'complete' | 'error' = 'selecting';
  private statusMessage: string = '';
  private modelName: string = '';
  private summary: { memories: number; files: number; model?: string } | undefined;
  private logStream: string = '';

  // biome-ignore lint/suspicious/noExplicitAny: Generic payload
  private _onDidReceiveMessage = new vscode.EventEmitter<any>();
  readonly onDidReceiveMessage = this._onDidReceiveMessage.event;

  private _onDidAnalyzeArea = new vscode.EventEmitter<string>();
  readonly onDidAnalyzeArea = this._onDidAnalyzeArea.event;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly context: vscode.ExtensionContext
  ) {
    // Load persisted state
    // biome-ignore lint/suspicious/noExplicitAny: State object shape is dynamic
    const state = this.context.workspaceState.get<any>('cortexDashboardState');
    if (state) {
      this.projectContext = state.projectContext;
      this.areas = state.areas || [];
      this.memories = state.memories || [];
      this.status = state.status || 'selecting';
      this.statusMessage = state.statusMessage || '';
      this.modelName = state.modelName || '';
      this.summary = state.summary;
    }
  }

  private savePersistence() {
    this.context.workspaceState.update('cortexDashboardState', {
      projectContext: this.projectContext,
      areas: this.areas,
      memories: this.memories,
      status: this.status,
      statusMessage: this.statusMessage,
      modelName: this.modelName,
      summary: this.summary,
    });
  }

  /**
   * Clears all persisted state. Call this when the actual database is empty/missing
   * to avoid showing stale cached data.
   */
  public clearState() {
    this.projectContext = undefined;
    this.areas = [];
    this.memories = [];
    this.status = 'selecting';
    this.statusMessage = '';
    this.modelName = '';
    this.summary = undefined;
    this.logStream = '';
    this.context.workspaceState.update('cortexDashboardState', undefined);
    // Notify webview to reset
    this.postMessage({ type: 'clearState' });
  }

  show(context: vscode.ExtensionContext) {
    if (this.panel) {
      this.panel.reveal();
      this.hydrate();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'cortexAIScan',
      'Cortex AI Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
      }
    );

    this.setupPanel(panel, context);
  }

  /**
   * Restores a webview from a persisted state
   */
  attach(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.setupPanel(panel, context);
  }

  private setupPanel(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.panel = panel;
    this.panel.webview.html = this.getHtml();

    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      null,
      context.subscriptions
    );

    this.panel.webview.onDidReceiveMessage(
      (message) => {
        this._onDidReceiveMessage.fire(message);
      },
      null,
      context.subscriptions
    );

    // Initial hydration
    this.hydrate();
  }

  // Restore state to the webview
  private hydrate() {
    if (!this.panel) return;

    this.postMessage({
      type: 'hydrate',
      state: {
        projectContext: this.projectContext,
        areas: this.areas,
        memories: this.memories,
        status: this.status,
        statusMessage: this.statusMessage,
        modelName: this.modelName,
        summary: this.summary,
      },
    });
  }

  getProjectContext() {
    return this.projectContext;
  }

  setProjectContext(name: string, techStack: string[]) {
    this.projectContext = { name, techStack };
    this.savePersistence();
    this.postMessage({ type: 'projectContext', context: this.projectContext });
  }

  getArea(name: string): ProjectArea | undefined {
    return this.areas.find((a) => a.name === name);
  }

  setAreas(areas: ProjectArea[]) {
    this.areas = areas;
    this.savePersistence();
    this.postMessage({ type: 'areas', areas });
  }

  updateAreaStatus(
    areaName: string,
    status: 'pending' | 'analyzing' | 'complete' | 'skipped' | 'error',
    memoryCount?: number
  ) {
    const area = this.areas.find((a) => a.name === areaName);
    if (area) {
      area.status = status;
      if (memoryCount !== undefined) area.memoryCount = memoryCount;
      this.savePersistence();
    }
    this.postMessage({ type: 'areaStatus', areaName, status, memoryCount });
  }

  setStatus(status: 'selecting' | 'analyzing' | 'complete' | 'error', message: string) {
    this.status = status;
    this.statusMessage = message;
    this.savePersistence();
    this.postMessage({ type: 'status', status, message });
  }

  setModel(name: string, allModels: string[]) {
    this.modelName = name;
    this.savePersistence();
    this.postMessage({ type: 'model', name, allModels });
  }

  setTree(tree: string, stats: { lines: number }) {
    this.postMessage({ type: 'tree', tree, stats });
  }

  setSelectedFiles(files: string[]) {
    this.postMessage({ type: 'files', files });
  }

  streamChunk(chunk: string) {
    this.logStream += chunk;
    this.postMessage({ type: 'chunk', chunk });
  }

  addMemory(memory: AIMemory) {
    this.memories.push(memory);
    this.savePersistence();
    this.postMessage({ type: 'memory', memory });
  }

  setSummary(memories: number, files: number, model: string) {
    this.summary = { memories, files, model };
    this.savePersistence();
    this.postMessage({ type: 'summary', memories, files, model });
  }

  postMessage(message: unknown) {
    this.panel?.webview.postMessage(message);
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cortex AI Analysis</title>
  <script src="https://unpkg.com/@phosphor-icons/web"></script>
  <style>
    /* === NATIVE VS CODE THEME INTEGRATION === */
    :root {
      /* Core colors from VS Code theme */
      --bg-app: var(--vscode-editor-background);
      --bg-card: var(--vscode-sideBar-background, var(--vscode-editor-background));
      --bg-card-hover: var(--vscode-list-hoverBackground);
      --border: var(--vscode-panel-border, var(--vscode-widget-border));

      /* Semantic accent colors */
      --color-primary: var(--vscode-button-background, #0078d4);
      --color-primary-hover: var(--vscode-button-hoverBackground, #106ebe);
      --color-success: var(--vscode-testing-iconPassed, #3fb950);
      --color-danger: var(--vscode-inputValidation-errorBorder, #f85149);
      --color-warning: var(--vscode-inputValidation-warningBorder, #d29922);
      --color-purple: var(--vscode-charts-purple, #bc8cff);

      /* Text colors */
      --text-main: var(--vscode-foreground);
      --text-muted: var(--vscode-descriptionForeground);
      --text-accent: var(--vscode-textLink-foreground);

      /* Native font */
      --font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
      --font-size: var(--vscode-font-size, 13px);
    }

    body {
      background-color: var(--bg-app);
      color: var(--text-main);
      font-family: var(--font-family);
      font-size: var(--font-size);
      margin: 0;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: 100vh;
      box-sizing: border-box;
      overflow: hidden;
    }

    /* === UTILS === */
    .row { display: flex; gap: 12px; }
    .col { display: flex; flex-direction: column; gap: 12px; }
    .flex-1 { flex: 1; }
    .flex-center { display: flex; align-items: center; justify-content: center; }
    .justify-between { justify-content: space-between; }

    .badge {
      background: color-mix(in srgb, var(--color-primary) 15%, transparent);
      color: var(--color-primary);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
      border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
    }

    /* === CARDS with GLASSMORPHISM + SPOTLIGHT === */
    .card {
      background: color-mix(in srgb, var(--bg-card) 90%, transparent);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      position: relative;
      overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      border-color: var(--text-muted);
      box-shadow: 0 4px 20px color-mix(in srgb, var(--color-primary) 10%, transparent);
    }
    /* Spotlight Effect */
    .card::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), color-mix(in srgb, var(--color-primary) 8%, transparent), transparent 40%);
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
    }
    .card:hover::before { opacity: 1; }

    /* === HEADER === */
    .header-card {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px;
      background: linear-gradient(135deg, color-mix(in srgb, var(--bg-card) 95%, var(--color-primary) 5%), var(--bg-card));
    }
    .logo-section { display: flex; align-items: center; gap: 14px; }
    .logo-box {
      width: 44px; height: 44px;
      background: linear-gradient(135deg, var(--color-primary), var(--color-purple));
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; color: white;
      box-shadow: 0 4px 16px color-mix(in srgb, var(--color-primary) 40%, transparent);
    }

    /* === STATS GRID === */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    @media (max-width: 900px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .stat-card {
      display: flex; flex-direction: column; justify-content: space-between;
      min-height: 90px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-main);
      margin: 6px 0;
      text-shadow: 0 0 20px color-mix(in srgb, var(--color-primary) 30%, transparent);
    }
    .stat-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-icon {
      position: absolute;
      top: 14px; right: 14px;
      font-size: 18px;
      color: var(--border);
    }

    /* === MAIN CONTENT AREA === */
    .main-grid {
      display: grid;
      grid-template-columns: 350px 1fr;
      gap: 12px;
      flex: 1;
      min-height: 0;
    }
    @media (max-width: 800px) {
      .main-grid { grid-template-columns: 1fr; }
    }

    /* === AREAS LIST === */
    .area-list {
      overflow-y: auto;
      display: flex; flex-direction: column; gap: 6px;
      padding-right: 4px;
    }
    .area-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 12px;
      background: color-mix(in srgb, var(--text-main) 3%, transparent);
      border-radius: 6px;
      border-left: 3px solid transparent;
      transition: all 0.2s;
    }
    .area-item:hover {
      background: color-mix(in srgb, var(--text-main) 6%, transparent);
    }
    .area-item.status-analyzing {
      border-color: var(--color-warning);
      background: color-mix(in srgb, var(--color-warning) 8%, transparent);
    }
    .area-item.status-complete { border-color: var(--color-success); }
    .area-item.status-error { border-color: var(--color-danger); }

    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--border);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--text-main) 5%, transparent);
    }
    .status-analyzing .status-dot {
      background: var(--color-warning);
      animation: pulse 1.5s infinite;
    }
    .status-complete .status-dot {
      background: var(--color-success);
      box-shadow: 0 0 8px color-mix(in srgb, var(--color-success) 50%, transparent);
    }

    /* === LIVE FEED with CRT EFFECT === */
    .feed-container {
      background: color-mix(in srgb, var(--bg-app) 95%, black);
      border-radius: 8px;
      border: 1px solid var(--border);
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
      font-size: 12px;
      position: relative;
    }
    /* CRT Scanlines */
    .feed-container::after {
      content: "";
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        color-mix(in srgb, var(--bg-app) 3%, transparent) 2px,
        color-mix(in srgb, var(--bg-app) 3%, transparent) 4px
      );
      pointer-events: none;
      opacity: 0.5;
    }
    .log-entry {
      margin-bottom: 6px;
      padding-bottom: 6px;
      border-bottom: 1px solid color-mix(in srgb, var(--text-main) 5%, transparent);
      animation: slideIn 0.2s ease;
      display: flex; gap: 8px;
      position: relative;
      z-index: 1;
    }
    .log-time { color: var(--text-muted); min-width: 55px; font-size: 10px; }
    .log-content { color: var(--text-main); }
    .log-tag {
      color: var(--color-primary);
      text-shadow: 0 0 8px color-mix(in srgb, var(--color-primary) 50%, transparent);
    }

    /* === BUTTON (Native Style) === */
    .btn-primary {
      background: var(--color-primary);
      color: var(--vscode-button-foreground, white);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 600;
      font-size: var(--font-size);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn-primary:hover {
      background: var(--color-primary-hover);
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* === ANIMATIONS === */
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.2); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-5px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes glow {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    /* === SCROLLBAR (Theme-aware) === */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-background, var(--border));
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-scrollbarSlider-hoverBackground, var(--color-primary));
    }

  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="card header-card">
    <div class="logo-section">
      <div class="logo-box">
        <i class="ph-bold ph-brain"></i>
      </div>
      <div>
        <h2 style="margin: 0; color: var(--text-main);">Cortex AI</h2>
        <div style="font-size: 12px; color: var(--text-muted);">Project Analysis Directory</div>
      </div>
    </div>

    <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; max-width: 50%;">
      <span class="badge">Gemini Flash 2.5</span>
      <span class="badge" id="project-badge">...</span>
      <span class="badge" style="border-style: dashed; opacity: 0.7;">Auto-Discovery Mode</span>
    </div>

    <button id="btn-analyze" class="btn-primary">
      <i class="ph-bold ph-play"></i> Start Analysis
    </button>
  </div>

  <!-- STATS ROW -->
  <div class="stats-grid">

    <!-- 1. Coverage / Radar -->
    <div class="card stat-card">
      <div class="stat-icon"><i class="ph-bold ph-chart-pie-slice"></i></div>
      <div class="stat-label">Coverage</div>
      <div style="display: flex; align-items: flex-end; justify-content: space-between;">
        <div class="stat-value" id="val-coverage">0%</div>

        <!-- MINI RADAR SVG -->
        <svg width="60" height="60" viewBox="0 0 100 100" style="opacity: 0.8;">
             <circle cx="50" cy="50" r="45" fill="none" stroke="#30363d" stroke-width="2" />
             <path id="mini-radar" d="M 50 50 L 50 5 Z" fill="rgba(88, 166, 255, 0.3)" stroke="var(--color-primary)" stroke-width="2" />
        </svg>
      </div>
    </div>

    <!-- 2. Memories -->
    <div class="card stat-card">
      <div class="stat-icon"><i class="ph-bold ph-brain"></i></div>
      <div class="stat-label">Memories Extracted</div>
      <div class="stat-value" id="val-memories">0</div>
      <div style="height: 4px; background: #30363d; border-radius: 2px; overflow: hidden; margin-top: 8px;">
         <div id="bar-memories" style="width: 0%; height: 100%; background: var(--color-purple); transition: width 0.5s;"></div>
      </div>
    </div>

    <!-- 3. Context Files -->
    <div class="card stat-card">
      <div class="stat-icon"><i class="ph-bold ph-files"></i></div>
      <div class="stat-label">Context Files</div>
      <div class="stat-value" id="val-files">0</div>
      <div style="font-size: 10px; color: var(--text-muted);">Indexed in vector store</div>
    </div>

    <!-- 4. Active Intelligence (Guardian) -->
    <div class="card stat-card" style="border-color: rgba(63, 185, 80, 0.3);">
      <div class="stat-icon"><i class="ph-bold ph-shield-check" style="color: var(--color-success);"></i></div>
      <div class="stat-label" style="color: var(--color-success);">Guardian Active</div>
      <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
         <div style="position: relative; width: 40px; height: 40px;">
             <!-- Pulsing Ring -->
             <div style="position: absolute; inset: 0; border: 2px solid var(--color-success); border-radius: 50%; opacity: 0.5; animation: pulse 2s infinite;"></div>
             <i class="ph-duotone ph-lock-key" style="position: absolute; top: 10px; left: 10px; font-size: 20px; color: var(--color-success);"></i>
         </div>
         <div>
             <div style="font-size: 18px; font-weight: 700;">Secure</div>
             <div style="font-size: 10px; opacity: 0.7;">No threats detected</div>
         </div>
      </div>
    </div>

  </div>

  <!-- MAIN AREA -->
  <div class="main-grid">

    <!-- LEFT: Project Areas -->
    <div class="card col" style="padding: 0; overflow: hidden; display: flex; flex-direction: column;">
      <div style="padding: 12px 16px; border-bottom: 1px solid var(--border); font-weight: 600; display: flex; justify-content: space-between;">
        <span><i class="ph-bold ph-squares-four"></i> Project Areas</span>
        <span class="badge" id="area-count">0</span>
      </div>
      <div class="area-list" id="area-list" style="padding: 12px; flex: 1;">
        <!-- Area Items -->
        <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px;">
            Click "Start Analysis" to map project...
        </div>
      </div>
    </div>

    <!-- RIGHT: Live Feed -->
    <div class="col" style="overflow: hidden;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
         <div style="font-weight: 600;"><i class="ph-bold ph-lightning"></i> Live Memories</div>
         <span class="badge" id="memory-count-badge">0</span>
      </div>
      <div class="feed-container" id="feed">
         <div class="log-entry">
            <span class="log-time">SYS</span>
            <span class="log-content">Dashboard ready. Waiting for input...</span>
         </div>
      </div>
    </div>

  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // State
    let totalAreas = 0;
    let completedAreas = 0;
    let totalMemories = 0;

    // Elements
    const btnAnalyze = document.getElementById('btn-analyze');
    const areaList = document.getElementById('area-list');
    const feed = document.getElementById('feed');
    const valCoverage = document.getElementById('val-coverage');
    const valMemories = document.getElementById('val-memories');
    const radarPath = document.getElementById('mini-radar');

    // Mouse Tracking for Spotlight
    document.addEventListener('mousemove', e => {
        document.querySelectorAll('.card').forEach(card => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mouse-x', \`\${e.clientX - rect.left}px\`);
            card.style.setProperty('--mouse-y', \`\${e.clientY - rect.top}px\`);
        });
    });

    btnAnalyze.addEventListener('click', () => {
        vscode.postMessage({ type: 'startScan' });
        btnAnalyze.innerHTML = '<i class="ph-bold ph-spinner" style="animation: spin 1s infinite;"></i> Scanning...';
        btnAnalyze.style.opacity = '0.7';
    });

    window.addEventListener('message', event => {
        const msg = event.data;

        if (msg.type === 'hydrate' || msg.type === 'projectContext') {
            if (msg.context || msg.state?.projectContext) {
                const ctx = msg.context || msg.state.projectContext;
                document.getElementById('project-badge').innerText = ctx.name;
            }
        }

        if (msg.type === 'areas' || (msg.type === 'hydrate' && msg.state?.areas)) {
            const areas = msg.areas || msg.state.areas;
            renderAreas(areas);
            updateStats(areas);
        }

        if (msg.type === 'areaStatus') {
            updateAreaStatus(msg.areaName, msg.status);
        }

        if (msg.type === 'memory' || (msg.type === 'hydrate' && msg.state?.memories)) {
            // If hydrate array
            if (Array.isArray(msg.state?.memories)) {
                msg.state.memories.forEach(m => addLog(m));
            } else if (msg.memory) {
                addLog(msg.memory);
            }
        }

        if (msg.type === 'status' && msg.status === 'complete') {
            btnAnalyze.innerHTML = '<i class="ph-bold ph-check"></i> Complete';
            btnAnalyze.style.background = 'var(--color-success)';
        }

        // Handle state clear when database is empty
        if (msg.type === 'clearState') {
            totalAreas = 0;
            completedAreas = 0;
            totalMemories = 0;
            valMemories.innerText = '0';
            valCoverage.innerText = '0%';
            document.getElementById('memory-count-badge').innerText = '0';
            document.getElementById('area-count').innerText = '0';
            document.getElementById('project-badge').innerText = '...';
            document.getElementById('bar-memories').style.width = '0%';
            areaList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px;">Click "Start Analysis" to map project...</div>';
            feed.innerHTML = '<div class="log-entry"><span class="log-time">SYS</span><span class="log-content">Dashboard ready. Waiting for input...</span></div>';
            btnAnalyze.innerHTML = '<i class="ph-bold ph-play"></i> Start Analysis';
            btnAnalyze.style.background = '';
        }
    });

    function renderAreas(areas) {
        if (!areas || areas.length === 0) return;
        areaList.innerHTML = '';
        totalAreas = areas.length;
        document.getElementById('area-count').innerText = totalAreas;

        areas.forEach(area => {
            const div = document.createElement('div');
            div.className = \`area-item status-\${area.status || 'pending'}\`;
            div.id = \`area-\${area.name}\`;
            div.innerHTML = \`
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="status-dot"></span>
                    <span style="font-weight: 500;">\${area.name}</span>
                </div>
                <div style="font-size: 10px; color: var(--text-muted);">\${area.memoryCount || 0} mems</div>
            \`;
            areaList.appendChild(div);
        });
        updateStats(areas);
    }

    function updateAreaStatus(name, status) {
        const el = document.getElementById(\`area-\${name}\`);
        if (el) {
            el.className = \`area-item status-\${status}\`;
            // Trigger stats update
             if (status === 'complete') {
                completedAreas++;
                updateCoverage();
            }
        }
    }

    function addLog(memory) {
        totalMemories++;
        valMemories.innerText = totalMemories;
        document.getElementById('memory-count-badge').innerText = totalMemories;

        // Update bar
        const width = Math.min(totalMemories * 2, 100);
        document.getElementById('bar-memories').style.width = \`\${width}%\`;

        const div = document.createElement('div');
        div.className = 'log-entry';
        const time = new Date().toLocaleTimeString().split(' ')[0];

        // Tag Logic
        let tag = 'INFO';
        if (memory.tags?.includes('debt')) tag = 'DEBT';
        if (memory.tags?.includes('security')) tag = 'SEC';

        div.innerHTML = \`
            <span class="log-time">\${time}</span>
            <span class="log-tag">[\${tag}]</span>
            <span class="log-content">\${memory.content}</span>
        \`;
        feed.prepend(div);

        // Animate radar on update
        radarPath.style.transform = \`scale(\${1 + (Math.random() * 0.2)})\`;
        setTimeout(() => radarPath.style.transform = 'scale(1)', 200);
    }

    function updateStats(areas) {
        // Simple mock calc
        const done = areas.filter(a => a.status === 'complete').length;
        completedAreas = done;
        updateCoverage();
    }

    function updateCoverage() {
        if (totalAreas === 0) return;
        const pct = Math.round((completedAreas / totalAreas) * 100);
        valCoverage.innerText = \`\${pct}%\`;
        // Update simple radar wedge angle (mock)
        // A full implementation would calculate d path based on angle.
        // For now, just opacity/pulse indicating activity.
    }

  </script>
</body>
</html>`;
  }
}
