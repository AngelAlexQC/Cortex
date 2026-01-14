import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type * as vscode from 'vscode';

/**
 * Utilities for detecting and managing project context.
 * Replicated from @ecuabyte/cortex-core to avoid heavy dependencies in VS Code extension.
 */

// Cache for project IDs
const projectIdCache = new Map<string, string>();

export async function getProjectId(uri: vscode.Uri): Promise<string> {
  const fsPath = uri.fsPath;

  // Check cache first
  const cached = projectIdCache.get(fsPath);
  if (cached) return cached;

  const projectId = detectProjectId(fsPath);
  projectIdCache.set(fsPath, projectId);
  return projectId;
}

function detectProjectId(cwd: string): string {
  // Strategy 1: Git repository root
  const gitRoot = findGitRoot(cwd);
  if (gitRoot) {
    return hashPath(gitRoot);
  }

  // Strategy 2: package.json location
  const packageJsonPath = findPackageJson(cwd);
  if (packageJsonPath) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      // Use package name + path for uniqueness
      const identifier = `${packageJson.name || 'unknown'}:${packageJsonPath}`;
      return hashString(identifier);
    } catch {
      // Fallback if package.json is invalid
    }
  }

  // Strategy 3: Fallback to current directory
  return hashPath(resolve(cwd));
}

function findGitRoot(startPath: string): string | null {
  let currentPath = resolve(startPath);
  const root = resolve('/');

  while (currentPath !== root) {
    const gitPath = join(currentPath, '.git');
    if (existsSync(gitPath)) {
      return currentPath;
    }
    const parent = resolve(currentPath, '..');
    if (parent === currentPath) break; // Reached root
    currentPath = parent;
  }

  return null;
}

function findPackageJson(startPath: string): string | null {
  let currentPath = resolve(startPath);
  const root = resolve('/');

  while (currentPath !== root) {
    const packagePath = join(currentPath, 'package.json');
    if (existsSync(packagePath)) {
      return packagePath;
    }
    const parent = resolve(currentPath, '..');
    if (parent === currentPath) break; // Reached root
    currentPath = parent;
  }

  return null;
}

function hashPath(path: string): string {
  // Normalize path to handle cross-platform consistency
  const normalized = resolve(path).toLowerCase().replace(/\\/g, '/');
  return hashString(normalized);
}

function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex').substring(0, 16);
}

export function clearProjectCache(): void {
  projectIdCache.clear();
}
