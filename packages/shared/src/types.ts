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
 * Common interface for storage providers.
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
