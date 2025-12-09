/**
 * @cortex/core - Core storage and context detection for Cortex memory system
 * 
 * This package provides the foundational layer for persistent memory storage
 * using SQLite, along with automatic project detection and isolation.
 * 
 * @packageDocumentation
 * @example
 * ```typescript
 * import { MemoryStore, ProjectContext } from '@cortex/core';
 * 
 * // Initialize store (auto-detects project)
 * const store = new MemoryStore();
 * 
 * // Add a memory
 * const id = store.add({
 *   content: 'Use PostgreSQL for production',
 *   type: 'decision',
 *   source: 'architecture-review',
 *   tags: ['database']
 * });
 * 
 * // Search memories
 * const results = store.search('PostgreSQL');
 * 
 * // Get project information
 * const projectId = ProjectContext.getProjectId();
 * const projectName = ProjectContext.getProjectName();
 * ```
 */

export { Memory, MemoryStore, MemoryStoreOptions } from './storage';
export { ProjectContext } from './context';
