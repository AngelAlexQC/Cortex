/**
 * @cortex/core - Core storage and context primitives for Cortex
 *
 * Provides the 5 context primitives:
 * - ctx/store + ctx/get: MemoryStore ✅
 * - ctx/route: ContextRouter ✅
 * - ctx/guard: ContextGuard ✅
 * - ctx/fuse: ContextFuser ✅
 */

// Re-export types from shared
export type {
  // Fuse types
  ContextSource,
  FuseOptions,
  FuseResult,
  // Guard types
  GuardFilterType,
  GuardMode,
  GuardOptions,
  GuardResult,
  IContextFuser,
  IContextGuard,
  IContextRouter,
  IMemoryStore,
  Memory,
  MemoryStoreOptions,
  MemoryType,
  // Context routing types
  RouteOptions,
  ScoredMemory,
} from '@cortex/shared';
// Project context utilities
export { clearProjectCache, getProjectId, getProjectName } from './context';
// ctx/fuse
export { ContextFuser } from './fuser';
// ctx/guard
export { ContextGuard } from './guard';
// ctx/route
export { ContextRouter } from './router';
// ctx/store + ctx/get
export {
  isValidMemoryType,
  MEMORY_TYPES,
  MemoryStore,
  validateMemoryType,
} from './storage';
