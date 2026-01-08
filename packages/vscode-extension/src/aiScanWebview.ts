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

  show(context: vscode.ExtensionContext) {
    if (this.panel) {
      this.panel.reveal();
      // Re-hydrate the view with current state when revealed
      this.hydrate();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'cortexAIScan',
      'Cortex AI Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
      }
    );

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
  <style>
    :root {
      /* Native VS Code Theme Variables */
      --bg-dark: var(--vscode-editor-background);
      --bg-card: var(--vscode-sideBar-background);
      --bg-card-hover: var(--vscode-list-hoverBackground);
      --bg-input: var(--vscode-input-background);
      --text-primary: var(--vscode-editor-foreground);
      --text-secondary: var(--vscode-descriptionForeground);
      --text-muted: var(--vscode-disabledForeground);
      --border: var(--vscode-panel-border);
      --focus-border: var(--vscode-focusBorder);

      /* Semantic Colors */
      --accent-blue: var(--vscode-textLink-foreground);
      --accent-purple: #a371f7; /* Custom for branding */
      --accent-green: var(--vscode-testing-iconPassed);
      --accent-yellow: var(--vscode-editorWarning-foreground);
      --accent-red: var(--vscode-testing-iconFailed);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family);
      font-weight: var(--vscode-font-weight);
      font-size: var(--vscode-font-size);
      background: var(--bg-dark);
      color: var(--text-primary);
      line-height: 1.5;
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Glassmorphism & Effects */
    .glass-panel {
      background: color-mix(in srgb, var(--bg-card), transparent 30%);
      backdrop-filter: blur(12px);
      border: 1px solid color-mix(in srgb, var(--border), transparent 50%);
      box-shadow: 0 4px 24px -1px rgba(0, 0, 0, 0.2);
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 16px;
      padding: 24px 32px;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Landing View */
    .landing-view {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
      padding: 40px;
    }

    .landing-view.visible {
      display: flex;
    }

    .hero-icon {
      font-size: 5em;
      margin-bottom: 24px;
      animation: float 6s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }

    .hero-title {
      font-size: 2.5em;
      font-weight: 700;
      margin-bottom: 16px;
      background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-subtitle {
      font-size: 1.2em;
      color: var(--text-secondary);
      max-width: 600px;
      margin-bottom: 40px;
      line-height: 1.6;
    }

    .start-btn {
      padding: 16px 48px;
      font-size: 1.2em;
      font-weight: 600;
      color: white;
      background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
      border: none;
      border-radius: 50px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(88, 166, 255, 0.4);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .start-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(88, 166, 255, 0.5);
    }

    .start-btn::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(rgba(255,255,255,0.2), transparent);
      opacity: 0;
      transition: opacity 0.3s;
    }

    .start-btn:hover::after { opacity: 1; }

    /* Dashboard Logic */
    .dashboard-header {
      grid-column: span 12;
      padding: 24px;
      margin-bottom: 8px;
      border-radius: 16px;
      background: radial-gradient(circle at top right, color-mix(in srgb, var(--accent-blue), transparent 92%), transparent 40%), var(--bg-card);
      border: 1px solid var(--border);
    }

    .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .logo { display: flex; align-items: center; gap: 12px; }
    .logo-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
      display: flex; align-items: center; justify-content: center; font-size: 20px;
    }
    .logo-text h1 {
      font-size: 1.25em; font-weight: 600;
      background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-purple) 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .logo-text span { font-size: 0.75em; color: var(--text-secondary); }

    .status-badge {
      display: flex; align-items: center; gap: 8px; padding: 8px 16px;
      border-radius: 20px; background: var(--bg-card); border: 1px solid var(--border); font-size: 0.85em;
    }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); }
    .status-dot.analyzing { background: var(--accent-yellow); animation: pulse 1.5s infinite; }
    .status-dot.complete { background: var(--accent-green); }

    @keyframes pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(210, 153, 34, 0.4); }
      50% { opacity: 0.8; box-shadow: 0 0 0 8px rgba(210, 153, 34, 0); }
    }

    .project-info { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .project-name { font-weight: 600; font-size: 1.1em; }
    .tech-badge { background: var(--bg-input); padding: 4px 10px; border-radius: 6px; font-size: 0.75em; color: var(--text-secondary); border: 1px solid var(--border); }

    .kpi-row { grid-column: span 12; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; border: none; }

    .cinematic-card {
      position: relative; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border); overflow: hidden;
      transition: transform 0.3s ease, border-color 0.3s ease;
    }
    .cinematic-card::before {
      content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 16px; padding: 1px;
      background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.01));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none;
    }
    .cinematic-card:hover::after {
      content: ""; position: absolute; top: var(--mouse-y, 0px); left: var(--mouse-x, 0px); width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(88, 166, 255, 0.15), transparent 70%);
      transform: translate(-50%, -50%); pointer-events: none; z-index: 1; opacity: 1; transition: opacity 0.5s;
    }

    @property --angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
    .moving-border { position: relative; }
    .moving-border::before, .moving-border::after {
      content: ''; position: absolute; inset: -2px; background: conic-gradient(from var(--angle), transparent 70%, var(--accent-blue));
      border-radius: 18px; z-index: -1; animation: rotate 3s linear infinite; opacity: 0; transition: opacity 0.3s;
    }
    .moving-border.active::before, .moving-border.active::after { opacity: 1; }
    .moving-border::after { filter: blur(10px); }
    @keyframes rotate { from { --angle: 0deg; } to { --angle: 360deg; } }

    .kpi-card { padding: 20px; }
    .kpi-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .kpi-icon { font-size: 1.5em; }
    .kpi-trend { font-size: 0.75em; padding: 2px 8px; border-radius: 4px; background: rgba(63, 185, 80, 0.15); color: var(--accent-green); }
    .kpi-trend.pending { background: rgba(210, 153, 34, 0.15); color: var(--accent-yellow); }
    .kpi-value { font-size: 2.25em; font-weight: 700; margin-bottom: 4px; }
    .kpi-label { font-size: 0.85em; color: var(--text-secondary); }

    .section { grid-column: span 6; border-radius: 16px; background: var(--bg-card); }
    .section-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: var(--bg-input); }
    .section-title { display: flex; align-items: center; gap: 8px; font-weight: 600; }
    .section-badge { background: var(--accent-blue); color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; font-weight: 500; }
    .section-content { padding: 16px 20px; max-height: 400px; overflow-y: auto; }

    .area-list { display: flex; flex-direction: column; gap: 10px; }
    .area-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg-input); border-radius: 8px; border: 1px solid transparent; transition: all 0.2s; }
    .area-item:hover { border-color: var(--border); background: var(--bg-card-hover); }
    .area-item.analyzing { border-color: var(--accent-yellow); background: rgba(210, 153, 34, 0.05); }
    .area-item.complete { border-left: 3px solid var(--accent-green); }
    .area-status { font-size: 1.2em; }
    .area-info { flex: 1; min-width: 0; }
    .area-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .area-meta { font-size: 0.8em; color: var(--text-muted); display: flex; gap: 8px; }
    .area-count { font-size: 0.8em; color: var(--accent-green); font-weight: 500; }
    .play-btn { background: var(--bg-input); border: 1px solid var(--border); color: var(--accent-green); border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-size: 0.8em; }
    .play-btn:hover { background: var(--accent-green); color: black; transform: scale(1.1); }
    .play-btn.spinning { animation: spin 1s linear infinite; pointer-events: none; opacity: 0.7; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .area-actions { margin-left: auto; padding-right: 12px; }

    .memory-stream { display: flex; flex-direction: column; gap: 12px; }
    .memory-item { padding: 14px 16px; background: color-mix(in srgb, var(--bg-input), transparent 50%); backdrop-filter: blur(4px); border-radius: 8px; border-left: 3px solid var(--accent-purple); border: 1px solid rgba(255,255,255,0.05); animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }

    .memory-type { display: inline-block; font-size: 0.7em; padding: 2px 8px; border-radius: 4px; background: var(--bg-card); color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .memory-type.fact { border-color: var(--accent-blue); color: var(--accent-blue); }
    .memory-type.decision { border-color: var(--accent-purple); color: var(--accent-purple); }
    .memory-type.config { border-color: var(--accent-yellow); color: var(--accent-yellow); }
    .memory-type.code { border-color: var(--accent-green); color: var(--accent-green); }
    .memory-content { font-size: 0.9em; line-height: 1.6; }
    .memory-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .memory-tag { font-size: 0.7em; padding: 2px 8px; border-radius: 4px; background: var(--bg-dark); color: var(--text-muted); }

    .stream-section { grid-column: span 12; margin-top: 16px; }
    .stream-panel { background: var(--bg-dark); border-radius: 8px; padding: 16px; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.85em; max-height: 200px; overflow-y: auto; }
    .stream-line { display: flex; gap: 12px; margin-bottom: 4px; }
    .stream-prefix { color: var(--accent-purple); user-select: none; }
    .stream-text { color: var(--text-secondary); }

    .empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); }
    .empty-icon { font-size: 2.5em; margin-bottom: 12px; opacity: 0.5; }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

    @media (max-width: 1000px) {
      .section { grid-column: span 12; }
      .kpi-row { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <!-- Landing View -->
  <div id="landing-view" class="landing-view">
    <div class="hero-icon">✨</div>
    <div class="hero-title">Cortex AI Analysis</div>
    <div class="hero-subtitle">
      Unlock deep insights into your codebase. Cortex scans, understands, and extracts memories to assist you in real-time.
    </div>
    <button class="start-btn" onclick="startScan()">Start Analysis</button>
  </div>

  <!-- Dashboard Grid -->
  <div id="dashboard-grid" class="dashboard-grid" style="display: none;">
    <!-- Header -->
    <div class="dashboard-header glass-panel">
      <div class="header-top">
        <div class="logo">
          <div class="logo-icon">✨</div>
          <div class="logo-text"><h1>Cortex AI</h1><span>Project Analysis</span></div>
        </div>
        <div class="status-badge">
          <div id="status-dot" class="status-dot"></div><span id="status-text">Ready</span>
        </div>
      </div>
      <div class="project-info">
        <span class="project-name" id="project-name-display">${this.projectContext?.name || 'Current Project'}</span>
        <div id="tech-badges" style="display: contents;">
          ${this.projectContext?.techStack ? this.projectContext.techStack.map((t) => `<span class="tech-badge">${t}</span>`).join('') : '<span class="tech-badge">Loading...</span>'}
        </div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-row">
      <div class="kpi-card cinematic-card" id="kpi-areas">
        <div class="kpi-header"><span class="kpi-icon">📊</span><span class="kpi-trend pending">Scanning</span></div>
        <div class="kpi-value" id="stats-areas">0/0</div><div class="kpi-label">Areas Analyzed</div>
      </div>
      <div class="kpi-card cinematic-card" id="kpi-memories">
        <div class="kpi-header"><span class="kpi-icon">🧠</span><span class="kpi-trend">Live</span></div>
        <div class="kpi-value" id="stats-memories">0</div><div class="kpi-label">Memories Extracted</div>
      </div>
      <div class="kpi-card cinematic-card">
        <div class="kpi-header"><span class="kpi-icon">📁</span><span class="kpi-trend">Files</span></div>
        <div class="kpi-value" id="stats-files">0</div><div class="kpi-label">Context Files</div>
      </div>
      <div class="kpi-card cinematic-card">
        <div class="kpi-header"><span class="kpi-icon">🤖</span><span class="kpi-trend">Model</span></div>
        <div class="kpi-value" style="font-size: 1.2em; margin-top: 8px;" id="stats-model">Loading...</div><div class="kpi-label">Active Intelligence</div>
      </div>
    </div>

    <!-- Sections -->
    <div class="section cinematic-card">
      <div class="section-header">
        <div class="section-title"><span class="section-title-icon">🗺️</span>Project Areas</div>
        <span class="section-badge" id="area-count-badge">0</span>
      </div>
      <div class="section-content">
        <div id="area-list" class="area-list">
          <div class="empty-state"><div class="empty-icon">🔭</div><div>Waiting for scan...</div></div>
        </div>
      </div>
    </div>

    <div class="section cinematic-card">
      <div class="section-header">
        <div class="section-title"><span class="section-title-icon">⚡</span>Live Memories</div>
        <span class="section-badge" id="memory-count-badge">0</span>
      </div>
      <div class="section-content">
        <div id="memory-stream" class="memory-stream">
          <div class="empty-state"><div class="empty-icon">💭</div><div>Memories will appear here...</div></div>
        </div>
      </div>
    </div>

    <!-- Stream -->
    <div class="section cinematic-card stream-section">
      <div class="section-header"><div class="section-title"><span class="section-title-icon">🧬</span>AI Thought Stream</div></div>
      <div class="section-content" style="padding: 0;">
        <div id="log-output" class="stream-panel">
          <div class="stream-line"><span class="stream-prefix">➜</span><span class="stream-text">System initialized. Waiting for input...</span></div>
        </div>
      </div>
    </div>

  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // Elements
    const landingView = document.getElementById('landing-view');
    const dashboardGrid = document.getElementById('dashboard-grid');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const areaList = document.getElementById('area-list');
    const memoryStream = document.getElementById('memory-stream');
    const logOutput = document.getElementById('log-output');

    const statsAreas = document.getElementById('stats-areas');
    const statsMemories = document.getElementById('stats-memories');
    const statsFiles = document.getElementById('stats-files');
    const statsModel = document.getElementById('stats-model');
    const areaCountBadge = document.getElementById('area-count-badge');
    const memoryCountBadge = document.getElementById('memory-count-badge');

    let analyzedCount = 0;
    let totalAreas = 0;
    let memoryCount = 0;
    let currentStatus = 'selecting';

    function startScan() {
      vscode.postMessage({ type: 'startScan' });
    }

    function toggleView(showDashboard) {
      if (showDashboard) {
        landingView.classList.remove('visible');
        dashboardGrid.style.display = 'grid';
      } else {
        landingView.classList.add('visible');
        dashboardGrid.style.display = 'none';
      }
    }

    // Cinematic Effects
      document.addEventListener('mousemove', (e) => {
        const cards = document.querySelectorAll('.cinematic-card');
        for (const card of cards) {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          card.style.setProperty('--mouse-x', x + 'px');
          card.style.setProperty('--mouse-y', y + 'px');
        }
      });

      // Delegate click for dynamic play buttons
      document.addEventListener('click', (e) => {
        if (e.target.closest('.play-btn')) {
          const btn = e.target.closest('.play-btn');
          const areaName = btn.dataset.area;
          vscode.postMessage({ type: 'analyzeArea', areaName });
          // Optimistic update
          btn.innerHTML = '🔄';
          btn.classList.add('spinning');
        }
      });

    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.type) {
        case 'hydrate': restoreState(message.state); break;
        case 'status': updateStatus(message.status, message.message); break;
        case 'areas': renderAreas(message.areas); break;
        case 'areaStatus': updateAreaItemStatus(message.areaName, message.status, message.memoryCount); break;
        case 'memory': addMemoryCard(message.memory); break;
        case 'chunk': appendLog(message.chunk); break;
        case 'model': statsModel.textContent = message.name; break;
        case 'model': statsModel.textContent = message.name; break;
        case 'projectContext': updateProjectInfo(message.context); break;
        case 'analyzeArea': /* handled by extension, no UI change needed here yet */ break;
        case 'summary':
          statsMemories.textContent = message.memories;
          statsFiles.textContent = message.files;
          if (message.model) statsModel.textContent = message.model;
          break;
      }
    });

    function restoreState(state) {
      currentStatus = state.status || 'selecting';
      // Show dashboard if we have data OR if explicitly in proper state
      const hasData = (state.areas && state.areas.length > 0) || currentStatus === 'analyzing' || currentStatus === 'complete';

      toggleView(hasData);

      if (hasData) {
        if (state.areas) renderAreas(state.areas);
        if (state.memories) {
          memoryStream.innerHTML = '';
          state.memories.forEach(m => addMemoryCard(m));
        }
        if (state.status) updateStatus(state.status, state.statusMessage || '');
        if (state.modelName) statsModel.textContent = state.modelName;
        if (state.projectContext) updateProjectInfo(state.projectContext);
      }
    }

    function updateStatus(status, text) {
      currentStatus = status;
      if (status === 'analyzing') toggleView(true);

      statusText.textContent = text;
      statusDot.className = 'status-dot ' + (status === 'analyzing' ? 'analyzing' : status === 'complete' ? 'complete' : '');

      const header = document.querySelector('.dashboard-header');
      if (status === 'analyzing') header.style.borderColor = 'var(--accent-yellow)';
      else if (status === 'complete') header.style.borderColor = 'var(--accent-green)';
      else header.style.borderColor = 'var(--border)';
    }

    function renderAreas(areas) {
      totalAreas = areas.length;
      analyzedCount = areas.filter(a => a.status === 'complete').length;
      updateStats();
      areaList.innerHTML = '';
      areas.forEach(area => {
        const el = document.createElement('div');
        el.className = 'area-item ' + (area.status === 'analyzing' ? 'analyzing moving-border active' : area.status === 'complete' ? 'complete' : area.status === 'error' ? 'error' : '');
        el.id = 'area-' + area.name.replace(/\\s+/g, '-');
        let icon = '⏸️';
        let action = '';
        if (area.status === 'analyzing') icon = '🔄';
        if (area.status === 'complete') icon = '✅';
        if (area.status === 'error') icon = '❌';

        // Show play button for pending/skipped/error
        if (area.status !== 'analyzing' && area.status !== 'complete') {
           action = \`<button class="play-btn" data-area="\${area.name}" title="Analyze this area">▶</button>\`;
        }

        const description = area.reason || area.rationale || 'Pending analysis...';
        el.innerHTML = \`
          <div class="area-status">\${icon}</div>
          <div class="area-info">
            <div class="area-name">\${area.name}</div>
            <div class="area-meta">\${area.status === 'error' ? 'Analysis Failed' : description.substring(0, 80) + (description.length > 80 ? '...' : '')}</div>
          </div>
          <div class="area-actions">\${action}</div>
          \${area.status === 'complete' ? \`<div class="area-count">\${area.memoryCount || 0} mems</div>\` : ''}
        \`;
        areaList.appendChild(el);
      });
      areaCountBadge.textContent = areas.length;
    }

    function updateAreaItemStatus(name, status, count) {
      const id = 'area-' + name.replace(/\\s+/g, '-');
      const el = document.getElementById(id);
      if (el) {
         el.className = 'area-item ' + (status === 'analyzing' ? 'analyzing moving-border active' : status === 'complete' ? 'complete' : status === 'error' ? 'error' : '');
         const iconDiv = el.querySelector('.area-status');
         const metaDiv = el.querySelector('.area-meta');
         if (status === 'analyzing') iconDiv.textContent = '🔄';
         if (status === 'complete') iconDiv.textContent = '✅';
         if (status === 'error') {
            iconDiv.textContent = '❌';
            if (metaDiv) metaDiv.textContent = 'Analysis Failed';
         }

         if (status === 'complete') {
           if (count) {
              const countDiv = document.createElement('div');
              countDiv.className = 'area-count'; countDiv.textContent = count + ' mems'; el.appendChild(countDiv);
           }
         }
      }
      if (status === 'complete') { analyzedCount++; updateStats(); }
    }

    function updateStats() { statsAreas.textContent = \`\${analyzedCount}/\${totalAreas}\`; }

    function addMemoryCard(memory) {
      memoryCount++; memoryCountBadge.textContent = memoryCount; statsMemories.textContent = memoryCount;
      const el = document.createElement('div'); el.className = 'memory-item';
      const typeClass = memory.type.toLowerCase();
      // Ensure content is not undefined
      const content = memory.content || memory.description || 'No content provided';
      const displayContent = content.length > 200 ? content.substring(0, 200) + '...' : content;

      el.innerHTML = \`<div class="memory-type \${typeClass}">\${memory.type}</div><div class="memory-content">\${displayContent}</div><div class="memory-tags">\${memory.tags ? memory.tags.map(t => \`<span class="memory-tag">\${t}</span>\`).join('') : ''}</div>\`;
      memoryStream.insertBefore(el, memoryStream.firstChild);
    }

    function appendLog(text) {
      const line = document.createElement('div'); line.className = 'stream-line';
      line.innerHTML = \`<span class="stream-prefix">➜</span> <span class="stream-text">\${text}</span>\`;
      logOutput.appendChild(line); logOutput.scrollTop = logOutput.scrollHeight;
    }

    function updateProjectInfo(context) {
      if (!context) return;
      const nameEl = document.getElementById('project-name-display');
      const badgesContainer = document.getElementById('tech-badges');

      if (nameEl) nameEl.textContent = context.name || 'Current Project';

      if (badgesContainer && context.techStack) {
        badgesContainer.innerHTML = context.techStack.map(t => \`<span class="tech-badge">\${t}</span>\`).join('');
      }
    }
  </script>
</body>
</html>`;
  }
}
