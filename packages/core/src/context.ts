import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Utility class for detecting and managing project context.
 *
 * Provides automatic project identification using multiple strategies:
 * 1. Git repository root detection
 * 2. package.json location and metadata
 * 3. Fallback to current working directory
 *
 * Project IDs are stable hashes that remain consistent across sessions,
 * enabling proper memory isolation per project.
 *
 * @public
 * @example
 * ```typescript
 * // Get current project ID
 * const projectId = ProjectContext.getProjectId();
 * console.log(projectId); // e.g., "a1b2c3d4e5f6g7h8"
 *
 * // Get human-readable project name
 * const name = ProjectContext.getProjectName();
 * console.log(name); // e.g., "my-app" or "cortex-monorepo"
 *
 * // Get project ID for specific directory
 * const id = ProjectContext.getProjectId('/path/to/project');
 * ```
 */
export class ProjectContext {
  private static cache = new Map<string, string>();

  /**
   * Gets a stable project ID based on the current working directory.
   *
   * The ID is a 16-character hash derived from the project's root path
   * (git root or package.json location). Results are cached for performance.
   *
   * @param cwd - Current working directory (defaults to process.cwd())
   * @returns A stable hash representing the project (e.g., "a1b2c3d4e5f6g7h8")
   * @example
   * ```typescript
   * const projectId = ProjectContext.getProjectId();
   * const customId = ProjectContext.getProjectId('/home/user/my-project');
   * ```
   */
  static getProjectId(cwd: string = process.cwd()): string {
    // Check cache first
    const cached = ProjectContext.cache.get(cwd);
    if (cached) return cached;

    const projectId = ProjectContext.detectProjectId(cwd);
    ProjectContext.cache.set(cwd, projectId);
    return projectId;
  }

  /**
   * Detects project ID using multiple strategies for better accuracy
   */
  private static detectProjectId(cwd: string): string {
    // Strategy 1: Git repository root
    const gitRoot = ProjectContext.findGitRoot(cwd);
    if (gitRoot) {
      return ProjectContext.hashPath(gitRoot);
    }

    // Strategy 2: package.json location
    const packageJsonPath = ProjectContext.findPackageJson(cwd);
    if (packageJsonPath) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      // Use package name + path for uniqueness
      const identifier = `${packageJson.name || 'unknown'}:${packageJsonPath}`;
      return ProjectContext.hashString(identifier);
    }

    // Strategy 3: Fallback to current directory
    // Using absolute path ensures consistency across sessions
    return ProjectContext.hashPath(resolve(cwd));
  }

  /**
   * Finds the root of a git repository by looking for .git directory
   */
  private static findGitRoot(startPath: string): string | null {
    let currentPath = resolve(startPath);
    const root = resolve('/');

    while (currentPath !== root) {
      const gitPath = join(currentPath, '.git');
      if (existsSync(gitPath)) {
        return currentPath;
      }
      currentPath = resolve(currentPath, '..');
    }

    return null;
  }

  /**
   * Finds the nearest package.json file
   */
  private static findPackageJson(startPath: string): string | null {
    let currentPath = resolve(startPath);
    const root = resolve('/');

    while (currentPath !== root) {
      const packagePath = join(currentPath, 'package.json');
      if (existsSync(packagePath)) {
        return packagePath;
      }
      currentPath = resolve(currentPath, '..');
    }

    return null;
  }

  /**
   * Creates a stable hash from a file path
   */
  private static hashPath(path: string): string {
    // Normalize path to handle cross-platform consistency
    const normalized = resolve(path).toLowerCase().replace(/\\/g, '/');
    return ProjectContext.hashString(normalized);
  }

  /**
   * Creates a SHA-256 hash of a string (first 16 chars for readability)
   */
  private static hashString(input: string): string {
    return createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  /**
   * Gets a human-readable project name for UI display.
   *
   * Attempts to extract the name from package.json, git directory name,
   * or falls back to the current directory name.
   *
   * @param cwd - Current working directory (defaults to process.cwd())
   * @returns Human-readable project name
   * @example
   * ```typescript
   * const name = ProjectContext.getProjectName();
   * console.log(`Working on: ${name}`);
   * ```
   */
  static getProjectName(cwd: string = process.cwd()): string {
    // Try to get from package.json
    const packageJsonPath = ProjectContext.findPackageJson(cwd);
    if (packageJsonPath) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.name) return packageJson.name;
      } catch {
        // Ignore parse errors
      }
    }

    // Try to get from git root directory name
    const gitRoot = ProjectContext.findGitRoot(cwd);
    if (gitRoot) {
      return gitRoot.split(/[/\\]/).pop() || 'unknown-project';
    }

    // Fallback to current directory name
    return cwd.split(/[/\\]/).pop() || 'unknown-project';
  }

  /**
   * Clears the internal project ID cache.
   *
   * Primarily useful for testing or when project context changes dynamically.
   *
   * @example
   * ```typescript
   * ProjectContext.clearCache();
   * ```
   */
  static clearCache(): void {
    ProjectContext.cache.clear();
  }
}
