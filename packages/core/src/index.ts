/**
 * @ecuabyte/cortex-core - Core storage and context primitives for Cortex
 *
 * Provides the 5 context primitives:
 * - ctx/store + ctx/get: MemoryStore ✅
 * - ctx/route: ContextRouter ✅
 * - ctx/guard: ContextGuard ✅
 * - ctx/fuse: ContextFuser ✅
 * - ctx/embed: Embeddings ✅
 */

// Re-export types from shared
export type {
  Brand,
  // Fuse types
  ContextSource,
  EmbeddingProviderConfig,
  Entity,
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
  IEmbeddingProvider,
  IMemoryStore,
  Memory,
  MemoryStoreOptions,
  MemoryType,
  MemoryWithEmbedding,
  Repository,
  // Generic Patterns
  Result,
  // Context routing types
  RouteOptions,
  ScoredMemory,
  SemanticSearchOptions,
  SemanticSearchResult,
  Service,
  ToolResponse,
} from '@ecuabyte/cortex-shared';
// Project context utilities
export { clearProjectCache, getProjectId, getProjectName } from './context';
// ctx/embed
export {
  cosineSimilarity,
  createEmbeddingProvider,
  DEFAULT_EMBEDDING_MODEL,
  deserializeEmbedding,
  OllamaEmbeddings,
  OpenAIEmbeddings,
  serializeEmbedding,
} from './embeddings';
// ctx/fuse
export { ContextFuser } from './fuser';
// ctx/guard
export { ContextGuard } from './guard';
// ctx/route
export { ContextRouter } from './router';
// ctx/scan - Project scanning utilities
export { ProjectScanner, type ScanOptions, type ScanResult } from './scanner';
// ctx/store + ctx/get
export {
  isValidMemoryType,
  MEMORY_TYPES,
  MemoryStore,
  validateMemoryType,
} from './storage';
