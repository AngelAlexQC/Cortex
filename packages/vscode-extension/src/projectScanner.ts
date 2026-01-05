/**
 * ProjectScanner for VS Code Extension
 * Standalone implementation that doesn't depend on @cortex/core (which uses bun:sqlite)
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import type { MemoryType } from '@cortex/shared';

interface ScanMemory {
  content: string;
  type: MemoryType;
  source: string;
  tags?: string[];
}

export interface ScanResult {
  memories: ScanMemory[];
  summary: {
    filesScanned: number;
    memoriesFound: number;
    byType: Record<MemoryType, number>;
    sources: string[];
  };
}

const DEFAULT_EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.vscode',
  '.idea',
  '__pycache__',
  'venv',
  '.env',
  'vendor',
];

const CODE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.scala',
  '.php',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.vue',
  '.svelte',
  '.astro',
];

export class ProjectScanner {
  private memories: ScanMemory[] = [];
  private filesScanned = 0;
  private sources = new Set<string>();

  async scan(options: { path: string; maxDepth?: number }): Promise<ScanResult> {
    const { path, maxDepth = 5 } = options;

    this.memories = [];
    this.filesScanned = 0;
    this.sources.clear();

    if (!existsSync(path)) {
      throw new Error(`Path does not exist: ${path}`);
    }

    await this.scanDocumentation(path);
    await this.scanPackageJson(path);
    await this.scanDockerCompose(path);
    await this.scanDirectory(path, path, 0, maxDepth);

    const byType: Record<MemoryType, number> = {
      fact: 0,
      decision: 0,
      code: 0,
      config: 0,
      note: 0,
    };
    for (const m of this.memories) {
      byType[m.type]++;
    }

    return {
      memories: this.memories,
      summary: {
        filesScanned: this.filesScanned,
        memoriesFound: this.memories.length,
        byType,
        sources: Array.from(this.sources),
      },
    };
  }

  private async scanDocumentation(rootPath: string): Promise<void> {
    const docFiles = ['README.md', 'ARCHITECTURE.md', 'DESIGN.md', 'CONTRIBUTING.md'];

    for (const docFile of docFiles) {
      const filePath = join(rootPath, docFile);
      if (!existsSync(filePath)) continue;

      try {
        const content = readFileSync(filePath, 'utf-8');
        this.sources.add(docFile);
        this.filesScanned++;

        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch?.[1]) {
          this.addMemory({
            content: `Project: ${titleMatch[1].trim()}`,
            type: 'fact',
            source: docFile,
            tags: ['auto-scan', 'project-info'],
          });
        }

        const descMatch = content.match(/^#.+\n\n(.+?)(?=\n\n|$)/s);
        if (descMatch?.[1] && descMatch[1].length > 20) {
          this.addMemory({
            content: descMatch[1].trim().slice(0, 300),
            type: 'fact',
            source: docFile,
            tags: ['auto-scan', 'description'],
          });
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  private async scanPackageJson(rootPath: string): Promise<void> {
    const pkgPath = join(rootPath, 'package.json');
    if (!existsSync(pkgPath)) return;

    try {
      const content = readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(content) as {
        name?: string;
        description?: string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };

      this.filesScanned++;
      this.sources.add('package.json');

      if (pkg.name) {
        this.addMemory({
          content: `Project name: ${pkg.name}`,
          type: 'fact',
          source: 'package.json',
          tags: ['auto-scan', 'project-info'],
        });
      }

      if (pkg.description) {
        this.addMemory({
          content: pkg.description,
          type: 'fact',
          source: 'package.json',
          tags: ['auto-scan', 'description'],
        });
      }

      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      const keyDeps = Object.keys(deps).filter((d) =>
        [
          'react',
          'vue',
          'angular',
          'next',
          'express',
          'hono',
          'fastify',
          'prisma',
          'drizzle',
          'postgres',
          'mysql',
          'mongodb',
          'laravel',
          'tailwind',
          'typescript',
          'vite',
          'webpack',
        ].includes(d.toLowerCase())
      );

      if (keyDeps.length > 0) {
        this.addMemory({
          content: `Tech stack: ${keyDeps.join(', ')}`,
          type: 'fact',
          source: 'package.json',
          tags: ['auto-scan', 'tech-stack'],
        });
      }
    } catch {
      // Invalid JSON
    }
  }

  private async scanDockerCompose(rootPath: string): Promise<void> {
    const composeFiles = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml'];

    for (const file of composeFiles) {
      const filePath = join(rootPath, file);
      if (!existsSync(filePath)) continue;

      try {
        const content = readFileSync(filePath, 'utf-8');
        this.filesScanned++;
        this.sources.add(file);

        const services: string[] = [];
        const serviceMatch = content.match(/services:\s*\n([\s\S]*?)(?=\n\w|$)/);
        if (serviceMatch?.[1]) {
          const lines = serviceMatch[1].split('\n');
          for (const line of lines) {
            const match = line.match(/^\s{2}(\w[\w-]+):\s*$/);
            if (match?.[1]) {
              services.push(match[1]);
            }
          }
        }

        if (services.length > 0) {
          this.addMemory({
            content: `Docker services: ${services.join(', ')}`,
            type: 'config',
            source: file,
            tags: ['auto-scan', 'docker', 'infrastructure'],
          });
        }
      } catch {
        // Skip errors
      }
    }
  }

  private async scanDirectory(
    currentPath: string,
    rootPath: string,
    depth: number,
    maxDepth: number
  ): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const entries = readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);
        const relativePath = relative(rootPath, fullPath);

        if (entry.isDirectory()) {
          if (!DEFAULT_EXCLUDE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
            await this.scanDirectory(fullPath, rootPath, depth + 1, maxDepth);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (CODE_EXTENSIONS.includes(ext)) {
            await this.scanCodeFile(fullPath, relativePath);
          }
        }
      }
    } catch {
      // Permission denied
    }
  }

  private async scanCodeFile(filePath: string, relativePath: string): Promise<void> {
    try {
      const stat = statSync(filePath);
      if (stat.size > 1024 * 1024) return; // Skip >1MB

      const content = readFileSync(filePath, 'utf-8');
      this.filesScanned++;

      const todoRegex =
        /(?:\/\/|#|\/\*|\*)\s*(TODO|FIXME|HACK|XXX|BUG|NOTE)[\s:]+(.+?)(?:\*\/|\n|$)/gi;

      let match = todoRegex.exec(content);
      while (match !== null) {
        const tag = match[1]?.toUpperCase() || 'TODO';
        const text = match[2]?.trim();

        if (text && text.length > 5 && text.length < 300) {
          this.sources.add(relativePath);
          this.addMemory({
            content: `${tag}: ${text}`,
            type: 'note',
            source: relativePath,
            tags: ['auto-scan', tag.toLowerCase()],
          });
        }
        match = todoRegex.exec(content);
      }
    } catch {
      // Skip unreadable
    }
  }

  private addMemory(memory: ScanMemory): void {
    const isDupe = this.memories.some(
      (m) => m.content === memory.content && m.source === memory.source
    );
    if (!isDupe) {
      this.memories.push(memory);
    }
  }
}
