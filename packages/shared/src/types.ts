/**
 * Common memory types used throughout Cortex.
 */
export type MemoryType = 'fact' | 'decision' | 'code' | 'config' | 'note';

/**
 * Represents a single piece of context / memory.
 */
export interface Memory {
  id?: number;
  content: string;
  type: MemoryType;
  source: string;
  projectId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Configuration options for a MemoryStore.
 */
export interface MemoryStoreOptions {
  dbPath?: string;
  projectId?: string;
  globalMode?: boolean;
  password?: string;
}

/**
 * Common interface for storage providers (ctx/store + ctx/get).
 */
export interface IMemoryStore {
  add(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<number>;
  get(id: number): Promise<Memory | null>;
  update(
    id: number,
    memory: Partial<Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean>;
  delete(id: number): Promise<boolean>;
  search(query: string, options?: { type?: string; limit?: number }): Promise<Memory[]>;
  list(options?: { type?: string; limit?: number }): Promise<Memory[]>;
  clear(): Promise<number>;
  stats(): Promise<{ total: number; byType: Record<string, number>; projectId?: string }>;
  close(): void;
}

// =============================================================================
// CONTEXT PRIMITIVES TYPES (ctx/route, ctx/guard, ctx/fuse)
// =============================================================================

/**
 * Options for ctx/route - intelligent context routing.
 */
export interface RouteOptions {
  /** The current task or question the agent is working on */
  task: string;
  /** Current file path for additional context */
  currentFile?: string;
  /** Filter results by tags */
  tags?: string[];
  /** Filter results by memory type */
  type?: MemoryType;
  /** Maximum number of context items to return (default: 5) */
  limit?: number;
}

/**
 * A scored memory with relevance information.
 */
export interface ScoredMemory {
  memory: Memory;
  score: number;
  /** Why this memory was selected */
  reason?: string;
}

/**
 * Interface for the context router (ctx/route).
 */
export interface IContextRouter {
  /**
   * Intelligently route and select relevant context for a task.
   * @param options - Routing options including task description
   * @returns Array of memories sorted by relevance
   */
  route(options: RouteOptions): Promise<Memory[]>;

  /**
   * Route with scoring information for debugging/transparency.
   */
  routeWithScores(options: RouteOptions): Promise<ScoredMemory[]>;
}

/**
 * Filter types for ctx/guard.
 */
export type GuardFilterType =
  | 'api_keys' // API keys (sk-*, key-*, etc.)
  | 'secrets' // Generic secrets and tokens
  | 'pii' // Personally identifiable information
  | 'emails' // Email addresses
  | 'urls_auth' // URLs with embedded credentials
  | 'credit_cards' // Credit card numbers
  | 'phone_numbers' // Phone numbers
  | 'ip_addresses'; // IP addresses

/**
 * Mode for handling filtered content.
 */
export type GuardMode = 'redact' | 'block' | 'warn';

/**
 * Options for ctx/guard - content protection.
 */
export interface GuardOptions {
  /** Types of sensitive data to filter */
  filters: GuardFilterType[];
  /** How to handle detected sensitive data */
  mode: GuardMode;
  /** Custom replacement text (default: '[REDACTED]') */
  replacement?: string;
}

/**
 * Result of guard operation.
 */
export interface GuardResult {
  /** The filtered/safe content */
  content: string;
  /** Whether any sensitive data was detected */
  wasFiltered: boolean;
  /** Details of what was filtered */
  filterDetails?: {
    type: GuardFilterType;
    count: number;
  }[];
}

/**
 * Interface for the context guard (ctx/guard).
 */
export interface IContextGuard {
  /**
   * Filter sensitive data from content.
   * @param content - Raw content to filter
   * @param options - Guard options
   * @returns Filtered content with metadata
   */
  guard(content: string, options: GuardOptions): GuardResult;

  /**
   * Check if content contains sensitive data without modifying it.
   */
  scan(content: string, filters: GuardFilterType[]): { type: GuardFilterType; matches: number }[];
}

/**
 * A source of context for fusion.
 */
export interface ContextSource {
  /** Type of context source */
  type: 'memory' | 'file' | 'session' | 'url';
  /** Query for memory sources, path for file sources, data for session */
  query?: string;
  path?: string;
  data?: string;
  url?: string;
  /** Weight for this source in fusion (0-1, default: 1) */
  weight?: number;
}

/**
 * Options for ctx/fuse - multi-source fusion.
 */
export interface FuseOptions {
  /** Sources to combine */
  sources: ContextSource[];
  /** Maximum tokens in final output */
  maxTokens?: number;
  /** Deduplication strategy */
  dedupe?: 'exact' | 'semantic' | 'none';
  /** Output format */
  format?: 'text' | 'markdown' | 'json';
}

/**
 * Result of fusion operation.
 */
export interface FuseResult {
  /** The combined context */
  content: string;
  /** Approximate token count */
  tokenCount: number;
  /** Sources that contributed to the result */
  sources: { type: string; count: number }[];
}

/**
 * Interface for the context fuser (ctx/fuse).
 */
export interface IContextFuser {
  /**
   * Fuse multiple context sources into a single output.
   * @param options - Fusion options with sources
   * @returns Combined context
   */
  fuse(options: FuseOptions): Promise<FuseResult>;
}

// =============================================================================
// EMBEDDING TYPES (ctx/embed)
// =============================================================================

/**
 * Configuration for embedding providers.
 */
export interface EmbeddingProviderConfig {
  /** Provider type */
  type: 'ollama' | 'openai';
  /** Model to use */
  model?: string;
  /** API base URL (for Ollama) */
  baseUrl?: string;
  /** API key (for OpenAI) */
  apiKey?: string;
  /** Request timeout in ms */
  timeout?: number;
}

/**
 * Interface for embedding providers.
 */
export interface IEmbeddingProvider {
  /** Generate embedding for a single text */
  embed(text: string): Promise<number[]>;
  /** Generate embeddings for multiple texts (batch) */
  embedBatch(texts: string[]): Promise<number[][]>;
  /** Model identifier */
  readonly model: string;
  /** Vector dimensions */
  readonly dimensions: number;
  /** Check if provider is available */
  isAvailable(): Promise<boolean>;
}

/**
 * A memory with its embedding vector.
 */
export interface MemoryWithEmbedding extends Memory {
  /** Embedding vector */
  embedding?: number[];
  /** Model used to generate embedding */
  embeddingModel?: string;
}

/**
 * Options for semantic search.
 */
export interface SemanticSearchOptions {
  /** Maximum number of results */
  limit?: number;
  /** Filter by memory type */
  type?: MemoryType;
  /** Minimum similarity score (0-1) */
  minScore?: number;
  /** Whether to include similarity scores in results */
  includeScores?: boolean;
}

/**
 * Result of semantic search.
 */
export interface SemanticSearchResult {
  memory: Memory;
  /** Cosine similarity score (0-1) */
  similarity: number;
}
