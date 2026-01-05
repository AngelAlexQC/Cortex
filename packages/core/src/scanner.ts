/**
 * ProjectScanner - Automatically extract context from a codebase.
 *
 * Scans various sources to populate Cortex memories:
 * - README.md, ARCHITECTURE.md → facts, decisions
 * - TODO/FIXME comments → notes
 * - docker-compose.yml, .env.example → configs
 * - package.json → facts about dependencies
 *
 * @module @cortex/core/scanner
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import type { Memory, MemoryType } from '@cortex/shared';

/**
 * Result of a project scan.
 */
export interface ScanResult {
  /** Memories extracted from the project */
  memories: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>[];
  /** Summary of what was found */
  summary: {
    filesScanned: number;
    memoriesFound: number;
    byType: Record<MemoryType, number>;
    sources: string[];
  };
}

/**
 * Options for scanning.
 */
export interface ScanOptions {
  /** Root path to scan */
  path: string;
  /** Scan code files for TODO/FIXME (default: true) */
  scanTodos?: boolean;
  /** Scan documentation files (default: true) */
  scanDocs?: boolean;
  /** Scan config files (default: true) */
  scanConfigs?: boolean;
  /** Maximum depth to scan (default: 5) */
  maxDepth?: number;
  /** Directories to exclude */
  excludeDirs?: string[];
}

/**
 * Default directories to exclude from scanning.
 */
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

/**
 * File extensions that may contain TODO/FIXME comments.
 */
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

/**
 * ProjectScanner extracts context from codebases.
 *
 * @example
 * ```typescript
 * const scanner = new ProjectScanner();
 * const result = await scanner.scan({ path: '/path/to/project' });
 * console.log(`Found ${result.memories.length} memories`);
 * ```
 */
export class ProjectScanner {
  private memories: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  private filesScanned = 0;
  private sources = new Set<string>();

  /**
   * Scan a project directory.
   */
  async scan(options: ScanOptions): Promise<ScanResult> {
    const {
      path,
      scanTodos = true,
      scanDocs = true,
      scanConfigs = true,
      maxDepth = 5,
      excludeDirs = DEFAULT_EXCLUDE_DIRS,
    } = options;

    this.memories = [];
    this.filesScanned = 0;
    this.sources.clear();

    if (!existsSync(path)) {
      throw new Error(`Path does not exist: ${path}`);
    }

    // Scan documentation files
    if (scanDocs) {
      await this.scanDocumentation(path);
    }

    // Scan config files
    if (scanConfigs) {
      await this.scanConfigs(path);
    }

    // Scan for TODOs/FIXMEs in code
    if (scanTodos) {
      await this.scanDirectory(path, path, 0, maxDepth, excludeDirs);
    }

    // Calculate summary
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

  /**
   * Scan documentation files (README, ARCHITECTURE, etc.)
   */
  private async scanDocumentation(rootPath: string): Promise<void> {
    const docFiles = [
      'README.md',
      'README.txt',
      'README',
      'ARCHITECTURE.md',
      'DESIGN.md',
      'ADR.md',
      'CONTRIBUTING.md',
      'CHANGELOG.md',
      'docs/README.md',
      'docs/architecture.md',
    ];

    for (const docFile of docFiles) {
      const filePath = join(rootPath, docFile);
      if (!existsSync(filePath)) continue;

      try {
        const content = readFileSync(filePath, 'utf-8');
        const relativePath = docFile;
        this.sources.add(relativePath);
        this.filesScanned++;

        // Extract title (first heading)
        const titleMatch = content.match(/^#\s+(.+)$/m);
        if (titleMatch?.[1]) {
          this.addMemory({
            content: `Project: ${titleMatch[1].trim()}`,
            type: 'fact',
            source: relativePath,
            tags: ['auto-scan', 'project-info'],
          });
        }

        // Extract description (paragraph after first heading)
        const descMatch = content.match(/^#.+\n\n(.+?)(?=\n\n|$)/s);
        if (descMatch?.[1] && descMatch[1].length > 20) {
          const desc = descMatch[1].trim().slice(0, 300);
          this.addMemory({
            content: desc,
            type: 'fact',
            source: relativePath,
            tags: ['auto-scan', 'description'],
          });
        }

        // Look for architecture decisions (## sections with keywords)
        const decisionKeywords = [
          'decision',
          'architecture',
          'design',
          'tech stack',
          'framework',
          'database',
          'why we',
        ];
        const sections = content.split(/^##\s+/m).slice(1);

        for (const section of sections) {
          const firstLine = section.split('\n')[0]?.toLowerCase() || '';
          if (decisionKeywords.some((kw) => firstLine.includes(kw))) {
            const sectionContent = section.slice(0, 400).trim();
            if (sectionContent.length > 30) {
              this.addMemory({
                content: sectionContent,
                type: 'decision',
                source: relativePath,
                tags: ['auto-scan', 'architecture'],
              });
            }
          }
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  /**
   * Scan configuration files.
   */
  private async scanConfigs(rootPath: string): Promise<void> {
    // package.json
    await this.scanPackageJson(rootPath);

    // docker-compose
    await this.scanDockerCompose(rootPath);

    // .env.example
    await this.scanEnvExample(rootPath);

    // tsconfig.json
    await this.scanTsConfig(rootPath);
  }

  /**
   * Extract info from package.json
   */
  private async scanPackageJson(rootPath: string): Promise<void> {
    const pkgPath = join(rootPath, 'package.json');
    if (!existsSync(pkgPath)) return;

    try {
      const content = readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(content) as {
        name?: string;
        description?: string;
        scripts?: Record<string, string>;
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

      // Key dependencies as facts
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
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
          'typeorm',
          'postgres',
          'mysql',
          'mongodb',
          'tailwind',
          'typescript',
          'vite',
          'webpack',
          'laravel',
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

  /**
   * Extract services from docker-compose.
   */
  private async scanDockerCompose(rootPath: string): Promise<void> {
    const composeFiles = [
      'docker-compose.yml',
      'docker-compose.yaml',
      'compose.yml',
      'compose.yaml',
    ];

    for (const file of composeFiles) {
      const filePath = join(rootPath, file);
      if (!existsSync(filePath)) continue;

      try {
        const content = readFileSync(filePath, 'utf-8');
        this.filesScanned++;
        this.sources.add(file);

        // Extract service names (simple regex approach)
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

        // Look for database services
        const dbServices = services.filter((s) =>
          ['postgres', 'mysql', 'mongodb', 'redis', 'mariadb', 'db', 'database'].some((db) =>
            s.toLowerCase().includes(db)
          )
        );

        if (dbServices.length > 0) {
          this.addMemory({
            content: `Database: ${dbServices.join(', ')} (via Docker)`,
            type: 'config',
            source: file,
            tags: ['auto-scan', 'database', 'infrastructure'],
          });
        }
      } catch {
        // Skip parse errors
      }
    }
  }

  /**
   * Extract environment variables from .env.example
   */
  private async scanEnvExample(rootPath: string): Promise<void> {
    const envFiles = ['.env.example', '.env.sample', '.env.template'];

    for (const file of envFiles) {
      const filePath = join(rootPath, file);
      if (!existsSync(filePath)) continue;

      try {
        const content = readFileSync(filePath, 'utf-8');
        this.filesScanned++;
        this.sources.add(file);

        const envVars: string[] = [];
        const lines = content.split('\n');

        for (const line of lines) {
          const match = line.match(/^([A-Z][A-Z0-9_]+)=/);
          if (match?.[1]) {
            envVars.push(match[1]);
          }
        }

        if (envVars.length > 0) {
          this.addMemory({
            content: `Environment variables: ${envVars.slice(0, 10).join(', ')}${envVars.length > 10 ? '...' : ''}`,
            type: 'config',
            source: file,
            tags: ['auto-scan', 'environment', 'config'],
          });
        }
      } catch {
        // Skip errors
      }
    }
  }

  /**
   * Extract TypeScript config info.
   */
  private async scanTsConfig(rootPath: string): Promise<void> {
    const tsConfigPath = join(rootPath, 'tsconfig.json');
    if (!existsSync(tsConfigPath)) return;

    try {
      const content = readFileSync(tsConfigPath, 'utf-8');
      // Remove comments for JSON parsing
      const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
      const config = JSON.parse(cleanContent) as {
        compilerOptions?: { target?: string; module?: string; strict?: boolean };
      };

      this.filesScanned++;
      this.sources.add('tsconfig.json');

      if (config.compilerOptions) {
        const opts = config.compilerOptions;
        const features: string[] = [];
        if (opts.target) features.push(`target: ${opts.target}`);
        if (opts.module) features.push(`module: ${opts.module}`);
        if (opts.strict) features.push('strict mode');

        if (features.length > 0) {
          this.addMemory({
            content: `TypeScript config: ${features.join(', ')}`,
            type: 'config',
            source: 'tsconfig.json',
            tags: ['auto-scan', 'typescript', 'config'],
          });
        }
      }
    } catch {
      // Invalid JSON
    }
  }

  /**
   * Recursively scan directory for TODO/FIXME comments.
   */
  private async scanDirectory(
    currentPath: string,
    rootPath: string,
    depth: number,
    maxDepth: number,
    excludeDirs: string[]
  ): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const entries = readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);
        const relativePath = relative(rootPath, fullPath);

        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            await this.scanDirectory(fullPath, rootPath, depth + 1, maxDepth, excludeDirs);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (CODE_EXTENSIONS.includes(ext)) {
            await this.scanCodeFile(fullPath, relativePath);
          }
        }
      }
    } catch {
      // Permission denied or other error
    }
  }

  /**
   * Scan a code file for TODO/FIXME comments.
   */
  private async scanCodeFile(filePath: string, relativePath: string): Promise<void> {
    try {
      const stat = statSync(filePath);
      // Skip files larger than 1MB
      if (stat.size > 1024 * 1024) return;

      const content = readFileSync(filePath, 'utf-8');
      this.filesScanned++;

      // Match TODO, FIXME, HACK, XXX, BUG, NOTE comments
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
      // Skip unreadable files
    }
  }

  /**
   * Add a memory to the result.
   */
  private addMemory(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): void {
    // Avoid duplicates
    const isDupe = this.memories.some(
      (m) => m.content === memory.content && m.source === memory.source
    );
    if (!isDupe) {
      this.memories.push(memory);
    }
  }
}
