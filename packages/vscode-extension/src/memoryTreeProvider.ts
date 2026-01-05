import type { Memory } from '@ecuabyte/cortex-shared';
import * as vscode from 'vscode';
import type { MemoryStore } from './storage';

export class MemoryTreeProvider implements vscode.TreeDataProvider<MemoryTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    MemoryTreeItem | undefined | null | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private store: MemoryStore) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: MemoryTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: MemoryTreeItem): Promise<MemoryTreeItem[]> {
    if (!element) {
      // Root level - show categories
      const stats = await this.store.stats();
      const categories: MemoryTreeItem[] = [
        new MemoryTreeItem(
          'All Memories',
          `${stats.total} total`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'all'
        ),
        new MemoryTreeItem(
          'Facts',
          `${stats.byType.fact || 0}`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'fact'
        ),
        new MemoryTreeItem(
          'Decisions',
          `${stats.byType.decision || 0}`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'decision'
        ),
        new MemoryTreeItem(
          'Code Patterns',
          `${stats.byType.code || 0}`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'code'
        ),
        new MemoryTreeItem(
          'Configs',
          `${stats.byType.config || 0}`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'config'
        ),
        new MemoryTreeItem(
          'Notes',
          `${stats.byType.note || 0}`,
          vscode.TreeItemCollapsibleState.Collapsed,
          'note'
        ),
      ];
      return categories;
    } else {
      // Show memories for category
      const type = element.category === 'all' ? undefined : element.category;
      const memories = await this.store.list({ type, limit: 100 });
      const items = memories.map((m) => {
        const item = new MemoryTreeItem(
          m.content.substring(0, 60) + (m.content.length > 60 ? '...' : ''),
          m.source,
          vscode.TreeItemCollapsibleState.None,
          'memory'
        );
        item.memory = m;
        item.contextValue = 'memory';
        item.command = {
          command: 'cortex.viewMemory',
          title: 'View Memory',
          arguments: [item],
        };
        return item;
      });
      return items;
    }
  }
}

/**
 * Icon mapping for memory types
 */
const MEMORY_TYPE_ICONS: Record<string, { icon: string; color?: string }> = {
  all: { icon: 'library', color: 'charts.purple' },
  fact: { icon: 'lightbulb', color: 'charts.yellow' },
  decision: { icon: 'checklist', color: 'charts.green' },
  code: { icon: 'code', color: 'charts.blue' },
  config: { icon: 'gear', color: 'charts.orange' },
  note: { icon: 'note', color: 'charts.foreground' },
  memory: { icon: 'symbol-snippet' },
};

class MemoryTreeItem extends vscode.TreeItem {
  memory?: Memory;
  category?: string;

  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    category?: string
  ) {
    super(label, collapsibleState);
    this.category = category;
    this.tooltip = `${this.label} - ${this.description}`;

    // Apply type-specific icons
    const iconConfig = MEMORY_TYPE_ICONS[category || 'memory'] || MEMORY_TYPE_ICONS.memory;
    this.iconPath = iconConfig.color
      ? new vscode.ThemeIcon(iconConfig.icon, new vscode.ThemeColor(iconConfig.color))
      : new vscode.ThemeIcon(iconConfig.icon);
  }
}
