/**
 * @cortex/core - Core storage and context detection for Cortex memory system
 */

export type { IMemoryStore, Memory, MemoryStoreOptions, MemoryType } from '@cortex/shared';
export { clearProjectCache, getProjectId, getProjectName } from './context';
export {
  isValidMemoryType,
  MEMORY_TYPES,
  MemoryStore,
  validateMemoryType,
} from './storage';
