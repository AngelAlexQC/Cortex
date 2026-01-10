import { Database } from 'bun:sqlite';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type {
  IMemoryStore,
  Memory,
  MemoryStoreOptions,
  SemanticSearchOptions,
  SemanticSearchResult,
} from '@ecuabyte/cortex-shared';
import { MEMORY_TYPES } from '@ecuabyte/cortex-shared';
import { getProjectId } from './context';
import { decrypt, encrypt } from './crypto';
import {
  cosineSimilarity,
  deserializeEmbedding,
  type IEmbeddingProvider,
  serializeEmbedding,
} from './embeddings';

/**
 * Represents a raw database row from SQLite.
 * @internal
 */
interface DatabaseRow {
  id: number;
  project_id: string | null;
  content: string;
  type: Memory['type'];
  source: string;
  tags: string | null;
  metadata: string | null;
  embedding: Uint8Array | null;
  embedding_model: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Valid memory types supported by Cortex.
 * @public
 */
export { MEMORY_TYPES };

/**
 * Type guard to check if a string is a valid memory type.
 * @public
 */
export function isValidMemoryType(type: string): type is Memory['type'] {
  // biome-ignore lint/suspicious/noExplicitAny: Check if string exists in enum values
  return Object.values(MEMORY_TYPES).includes(type as any);
}

/**
 * Validates memory type and throws error if invalid.
 * @throws {Error} If type is not valid
 * @public
 */
export function validateMemoryType(type: string): asserts type is Memory['type'] {
  if (!isValidMemoryType(type)) {
    throw new Error(
      `Invalid memory type: "${type}". Must be one of: ${Object.values(MEMORY_TYPES).join(', ')}`
    );
  }
}

/**
 * Represents a single memory entry in the Cortex system.
 *
 * @public
 * @example
 * ```typescript
 * const memory: Memory = {
 *   content: 'API endpoints use RESTful conventions',
 *   type: 'fact',
 *   source: 'docs/api-design.md',
 *   tags: ['architecture', 'api'],
 *   metadata: { author: 'team' }
 * };
 * ```
 */

/**
 * Main storage class for managing persistent memories using SQLite.
 *
 * Provides CRUD operations, search capabilities, and automatic project isolation.
 * Each MemoryStore instance is scoped to a specific project (auto-detected via git/package.json)
 * unless globalMode is enabled.
 *
 * @public
 * @example
 * ```typescript
 * // Basic usage with auto-detection
 * const store = new MemoryStore();
 * const id = store.add({
 *   content: 'Use Redis for caching',
 *   type: 'decision',
 *   source: 'architecture-meeting'
 * });
 *
 * // Custom database path
 * const store = new MemoryStore({ dbPath: './my-memories.db' });
 *
 * // Global mode (all projects)
 * const store = new MemoryStore({ globalMode: true });
 * ```
 */
export class MemoryStore implements IMemoryStore {
  private db: Database;
  private projectId: string | null;
  private globalMode: boolean;
  private password?: string;
  private embeddingProvider?: IEmbeddingProvider;

  /**
   * Creates a new MemoryStore instance.
   *
   * @param options - Configuration options or legacy string path to database file
   * @example
   * ```typescript
   * // Modern approach
   * const store = new MemoryStore({ dbPath: '~/.cortex/memories.db' });
   *
   * // Legacy approach (still supported)
   * const store = new MemoryStore('~/.cortex/memories.db');
   * ```
   */
  constructor(options?: MemoryStoreOptions | string) {
    // Support legacy string parameter for backwards compatibility
    const opts = typeof options === 'string' ? { dbPath: options } : options || {};

    const dbPath = opts.dbPath || join(homedir(), '.cortex', 'memories.db');

    // Create parent directory if it doesn't exist
    const dir = join(dbPath, '..');
    if (!require('node:fs').existsSync(dir)) {
      require('node:fs').mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.globalMode = opts.globalMode || false;
    this.projectId = this.globalMode ? null : opts.projectId || getProjectId();
    this.password = opts.password;

    this.initialize();
  }

  private initialize() {
    // Create memories table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT,
        content TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('fact', 'decision', 'code', 'config', 'note')),
        source TEXT NOT NULL,
        tags TEXT,
        metadata TEXT,
        embedding BLOB,
        embedding_model TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create FTS5 virtual table for search
    try {
      this.db.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
          content,
          content='memories',
          content_rowid='id'
        )
      `);

      // Triggers to keep FTS index in sync
      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
          INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
        END;
      `);
      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
          INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
        END;
      `);
      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS memories_bu BEFORE UPDATE ON memories
        WHEN old.content != new.content BEGIN
          INSERT INTO memories_fts(memories_fts, rowid, content) VALUES('delete', old.id, old.content);
        END;
      `);
      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories
        WHEN old.content != new.content BEGIN
          INSERT INTO memories_fts(rowid, content) VALUES (new.id, new.content);
        END;
      `);
    } catch (e) {
      console.warn('FTS5 not supported or error creating virtual table:', e);
    }

    // Indexes for efficient queries
    this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_project_id ON memories(project_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at)');
    this.db.run(
      'CREATE INDEX IF NOT EXISTS idx_memories_project_type ON memories(project_id, type)'
    );

    // We handle updated_at manually in the update() method to avoid trigger recursiveness
    // and potential FTS5 corruption issues.
  }

  /**
   * Adds a new memory to the store.
   *
   * @param memory - Memory object without id/timestamps (auto-generated)
   * @returns The ID of the newly created memory
   * @throws {Error} If memory type is invalid or required fields are missing
   * @example
   * ```typescript
   * const id = await store.add({
   *   content: 'PostgreSQL for main database',
   *   type: 'decision',
   *   source: 'tech-review-2025',
   *   tags: ['database', 'architecture'],
   *   metadata: { approvedBy: 'tech-lead' }
   * });
   * console.log(`Memory created with ID: ${id}`);
   * ```
   */
  async add(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    // Validate required fields
    if (!memory.content || memory.content.trim() === '') {
      throw new Error('Memory content is required and cannot be empty');
    }

    if (!memory.source || memory.source.trim() === '') {
      throw new Error('Memory source is required and cannot be empty');
    }

    // Validate type
    validateMemoryType(memory.type);

    const stmt = this.db.prepare(`
      INSERT INTO memories (project_id, content, type, source, tags, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const projectId = memory.projectId || this.projectId;

    let content = memory.content;
    let metadata = memory.metadata ? JSON.stringify(memory.metadata) : null;

    if (this.password) {
      content = await encrypt(content, this.password);
      if (metadata) {
        metadata = await encrypt(metadata, this.password);
      }
    }

    stmt.run(
      projectId,
      content,
      memory.type,
      memory.source,
      memory.tags ? JSON.stringify(memory.tags) : null,
      metadata
    );

    const result = this.db.query('SELECT last_insert_rowid() as id').get() as { id: number };
    return result.id;
  }

  /**
   * Retrieves a memory by its ID.
   *
   * Respects project isolation unless in globalMode.
   *
   * @param id - The unique identifier of the memory
   * @returns The memory object or null if not found
   * @example
   * ```typescript
   * const memory = await store.get(42);
   * if (memory) {
   *   console.log(memory.content);
   * }
   * ```
   */
  async get(id: number): Promise<Memory | null> {
    let sql = 'SELECT * FROM memories WHERE id = ?';
    const params: (number | string)[] = [id];

    if (!this.globalMode && this.projectId) {
      sql += ' AND project_id = ?';
      params.push(this.projectId);
    }

    const row = this.db.query(sql).get(...params) as DatabaseRow | undefined;
    if (!row) return null;
    return await this.rowToMemory(row);
  }

  /**
   * Searches memories by content using SQL LIKE pattern matching.
   *
   * @param query - Search term (case-insensitive, partial match)
   * @param options - Optional filters for type and result limit
   * @returns Array of matching memories, ordered by creation date (newest first)
   * @example
   * ```typescript
   * // Simple search
   * const results = await store.search('database');
   *
   * // Search with filters
   * const decisions = await store.search('api', { type: 'decision', limit: 10 });
   * ```
   */
  async search(query: string, options?: { type?: string; limit?: number }): Promise<Memory[]> {
    // If query is empty, just list memories with filters and limit
    if (!query || query.trim() === '') {
      return this.list(options);
    }

    // If encrypted, we can't search with FTS5 easily without decrypting everything.
    // For now, if password is set, we use simple LIKE on the encrypted content (which won't work well)
    // or we decrypt and search in memory.
    // FUTURE: Implement searchable encryption or local index.

    if (this.password) {
      // Simple implementation: fetch all and filter in memory
      const all = await this.list({ type: options?.type });
      const results = all.filter((m) => m.content.toLowerCase().includes(query.toLowerCase()));
      return options?.limit ? results.slice(0, options.limit) : results;
    }

    let sql =
      'SELECT * FROM memories WHERE id IN (SELECT rowid FROM memories_fts WHERE memories_fts MATCH ?)';
    const params: (number | string)[] = [query];

    // Add project isolation unless in global mode
    if (!this.globalMode && this.projectId) {
      sql += ' AND project_id = ?';
      params.push(this.projectId);
    }

    if (options?.type) {
      sql += ' AND type = ?';
      params.push(options.type);
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.db.query(sql).all(...params) as DatabaseRow[];
    return Promise.all(rows.map((row) => this.rowToMemory(row)));
  }

  /**
   * Lists all memories, optionally filtered by type and limited by count.
   *
   * @param options - Optional filters for type and result limit
   * @returns Array of memories, ordered by creation date (newest first)
   * @example
   * ```typescript
   * // All memories
   * const all = await store.list();
   *
   * // Only facts, limited to 20
   * const facts = await store.list({ type: 'fact', limit: 20 });
   *
   * // All decisions
   * const decisions = await store.list({ type: 'decision' });
   * ```
   */
  async list(options?: { type?: string; limit?: number }): Promise<Memory[]> {
    let sql = 'SELECT * FROM memories';
    const params: (number | string)[] = [];
    const conditions: string[] = [];

    // Add project isolation unless in global mode
    if (!this.globalMode && this.projectId) {
      conditions.push('project_id = ?');
      params.push(this.projectId);
    }

    if (options?.type) {
      conditions.push('type = ?');
      params.push(options.type);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.db.query(sql).all(...params) as DatabaseRow[];
    return Promise.all(rows.map((row) => this.rowToMemory(row)));
  }

  /**
   * Updates an existing memory.
   *
   * Respects project isolation unless in globalMode.
   * The updated_at timestamp is automatically updated by database trigger.
   *
   * @param id - The unique identifier of the memory to update
   * @param updates - Partial memory object with fields to update
   * @returns true if update was successful, false if memory not found
   * @example
   * ```typescript
   * // Update content only
   * await store.update(42, { content: 'Updated content' });
   *
   * // Update multiple fields
   * await store.update(42, {
   *   content: 'New content',
   *   tags: ['updated', 'revised'],
   *   metadata: { version: 2 }
   * });
   * ```
   */
  async update(
    id: number,
    updates: Partial<Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> {
    // Check if memory exists and belongs to current project
    const existing = await this.get(id);
    if (!existing) {
      return false;
    }

    // Validate updates
    if (updates.content !== undefined && updates.content.trim() === '') {
      throw new Error('Memory content cannot be empty');
    }

    if (updates.source !== undefined && updates.source.trim() === '') {
      throw new Error('Memory source cannot be empty');
    }

    if (updates.type !== undefined) {
      validateMemoryType(updates.type);
    }

    const fields: string[] = [];
    const params: (number | string | null)[] = [];

    if (updates.content !== undefined) {
      fields.push('content = ?');
      let content = updates.content;
      if (this.password) {
        content = await encrypt(content, this.password);
      }
      params.push(content);
    }

    if (updates.type !== undefined) {
      fields.push('type = ?');
      params.push(updates.type);
    }

    if (updates.source !== undefined) {
      fields.push('source = ?');
      params.push(updates.source);
    }

    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      params.push(updates.tags ? JSON.stringify(updates.tags) : null);
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      let metadata = updates.metadata ? JSON.stringify(updates.metadata) : null;
      if (this.password && metadata) {
        metadata = await encrypt(metadata, this.password);
      }
      params.push(metadata);
    }

    if (updates.projectId !== undefined) {
      fields.push('project_id = ?');
      params.push(updates.projectId);
    }

    if (fields.length === 0) {
      return false; // No updates provided
    }

    // Add ID to params
    params.push(id);

    // Always update the timestamp
    fields.push('updated_at = CURRENT_TIMESTAMP');

    let sql = `UPDATE memories SET ${fields.join(', ')} WHERE id = ?`;

    // Add project isolation
    if (!this.globalMode && this.projectId) {
      sql += ' AND project_id = ?';
      params.push(this.projectId);
    }

    this.db.run(sql, params);
    return true;
  }

  /**
   * Deletes a memory by its ID.
   *
   * Respects project isolation unless in globalMode.
   *
   * @param id - The unique identifier of the memory to delete
   * @returns true if deletion was successful
   * @example
   * ```typescript
   * store.delete(42);
   * ```
   */
  async delete(id: number): Promise<boolean> {
    let sql = 'DELETE FROM memories WHERE id = ?';
    const params: (number | string)[] = [id];

    if (!this.globalMode && this.projectId) {
      sql += ' AND project_id = ?';
      params.push(this.projectId);
    }

    this.db.run(sql, params);
    return true;
  }

  /**
   * Clears all memories from the current project.
   *
   * ⚠️ DANGER: This operation cannot be undone!
   * Respects project isolation unless in globalMode.
   *
   * @returns Number of memories deleted
   * @example
   * ```typescript
   * const count = store.clear();
   * console.log(`Deleted ${count} memories`);
   * ```
   */
  async clear(): Promise<number> {
    let countSql = 'SELECT COUNT(*) as count FROM memories';
    let deleteSql = 'DELETE FROM memories';
    const params: (number | string)[] = [];

    if (!this.globalMode && this.projectId) {
      const condition = ' WHERE project_id = ?';
      countSql += condition;
      deleteSql += condition;
      params.push(this.projectId);
    }

    const count = (this.db.query(countSql).get(...params) as { count: number }).count;
    this.db.run(deleteSql, params);
    return count;
  }

  /**
   * Returns statistics about stored memories.
   *
   * @returns Object containing total count, breakdown by type, and current project ID
   * @example
   * ```typescript
   * const stats = store.stats();
   * console.log(`Total: ${stats.total}`);
   * console.log(`Facts: ${stats.byType.fact || 0}`);
   * console.log(`Decisions: ${stats.byType.decision || 0}`);
   * console.log(`Project: ${stats.projectId}`);
   * ```
   */
  async stats(): Promise<{ total: number; byType: Record<string, number>; projectId?: string }> {
    const params: (number | string)[] = [];
    let whereClause = '';

    if (!this.globalMode && this.projectId) {
      whereClause = ' WHERE project_id = ?';
      params.push(this.projectId);
    }

    const total = this.db
      .query(`SELECT COUNT(*) as count FROM memories${whereClause}`)
      .get(...params) as { count: number };
    const byType = this.db
      .query(`
      SELECT type, COUNT(*) as count
      FROM memories
      ${whereClause}
      GROUP BY type
    `)
      .all(...params) as Array<{ type: string; count: number }>;

    return {
      total: total.count,
      byType: Object.fromEntries(byType.map(({ type, count }) => [type, count])),
      projectId: this.projectId || undefined,
    };
  }

  private async rowToMemory(row: DatabaseRow): Promise<Memory> {
    let content = row.content;
    let metadata = row.metadata;

    if (this.password) {
      try {
        content = await decrypt(content, this.password);
        if (metadata) {
          metadata = await decrypt(metadata, this.password);
        }
      } catch (e) {
        // If decryption fails, it might be unencrypted data or wrong password
        // For now, we leave it as is (encrypted string) or handle it
        console.error('Failed to decrypt memory:', row.id, e);
      }
    }

    return {
      id: row.id,
      projectId: row.project_id ?? undefined,
      content,
      type: row.type,
      source: row.source,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      metadata: metadata ? JSON.parse(metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Gets the current project ID being used for isolation.
   *
   * @returns The project ID hash or null if in globalMode
   * @example
   * ```typescript
   * const projectId = store.getProjectId();
   * console.log(`Current project: ${projectId}`);
   * ```
   */
  getProjectId(): string | null {
    return this.projectId;
  }

  /**
   * Gets all unique project IDs stored in the database with memory counts.
   *
   * Useful for understanding which projects have memories stored.
   *
   * @returns Array of objects containing projectId and count, sorted by count (descending)
   * @example
   * ```typescript
   * const projects = store.getAllProjects();
   * projects.forEach(p => {
   *   console.log(`${p.projectId}: ${p.count} memories`);
   * });
   * ```
   */
  getAllProjects(): Array<{ projectId: string; count: number }> {
    const rows = this.db
      .query(`
      SELECT project_id, COUNT(*) as count
      FROM memories
      WHERE project_id IS NOT NULL
      GROUP BY project_id
      ORDER BY count DESC
    `)
      .all() as Array<{ project_id: string; count: number }>;

    return rows.map((row) => ({
      projectId: row.project_id,
      count: row.count,
    }));
  }

  /**
   * Sets the embedding provider for semantic search.
   *
   * @param provider - The embedding provider to use
   * @example
   * ```typescript
   * const ollama = new OllamaEmbeddings();
   * store.setEmbeddingProvider(ollama);
   * ```
   */
  setEmbeddingProvider(provider: IEmbeddingProvider): void {
    this.embeddingProvider = provider;
  }

  /**
   * Gets the current embedding provider.
   */
  getEmbeddingProvider(): IEmbeddingProvider | undefined {
    return this.embeddingProvider;
  }

  /**
   * Updates the embedding for a memory.
   *
   * @param id - The memory ID to update
   * @returns true if embedding was updated, false if memory not found
   * @example
   * ```typescript
   * await store.updateEmbedding(42);
   * ```
   */
  async updateEmbedding(id: number): Promise<boolean> {
    if (!this.embeddingProvider) {
      throw new Error('No embedding provider configured. Call setEmbeddingProvider first.');
    }

    const memory = await this.get(id);
    if (!memory) {
      return false;
    }

    const embedding = await this.embeddingProvider.embed(memory.content);
    const serialized = serializeEmbedding(embedding);

    let sql = 'UPDATE memories SET embedding = ?, embedding_model = ? WHERE id = ?';
    const params: (Uint8Array | string | number)[] = [serialized, this.embeddingProvider.model, id];

    if (!this.globalMode && this.projectId) {
      sql += ' AND project_id = ?';
      params.push(this.projectId);
    }

    this.db.run(sql, params);
    return true;
  }

  /**
   * Updates embeddings for all memories that don't have one.
   *
   * @returns Number of memories updated
   */
  async updateAllEmbeddings(): Promise<number> {
    if (!this.embeddingProvider) {
      throw new Error('No embedding provider configured. Call setEmbeddingProvider first.');
    }

    let sql = 'SELECT id, content FROM memories WHERE embedding IS NULL';
    const params: string[] = [];

    if (!this.globalMode && this.projectId) {
      sql += ' AND project_id = ?';
      params.push(this.projectId);
    }

    const rows = this.db.query(sql).all(...params) as Array<{ id: number; content: string }>;

    // Process in batches of 10 for efficiency
    const batchSize = 10;
    let updated = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const contents = batch.map((r) => r.content);

      let decryptedContents = contents;
      if (this.password) {
        decryptedContents = await Promise.all(
          contents.map(async (c) => {
            try {
              if (!this.password) return c;
              return await decrypt(c, this.password);
            } catch {
              return c;
            }
          })
        );
      }

      const embeddings = await this.embeddingProvider.embedBatch(decryptedContents);

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const embedding = embeddings[j];
        if (row && embedding) {
          const serialized = serializeEmbedding(embedding);
          this.db.run('UPDATE memories SET embedding = ?, embedding_model = ? WHERE id = ?', [
            serialized,
            this.embeddingProvider.model,
            row.id,
          ]);
          updated++;
        }
      }
    }

    return updated;
  }

  /**
   * Searches memories using semantic similarity.
   *
   * Uses cosine similarity between query embedding and stored embeddings.
   * Falls back to keyword search if no embedding provider is configured.
   *
   * @param query - Natural language query
   * @param options - Search options
   * @returns Array of memories with similarity scores, sorted by relevance
   * @example
   * ```typescript
   * const results = await store.searchSemantic('database architecture');
   * for (const { memory, similarity } of results) {
   *   console.log(`${similarity.toFixed(2)}: ${memory.content}`);
   * }
   * ```
   */
  async searchSemantic(
    query: string,
    options?: SemanticSearchOptions
  ): Promise<SemanticSearchResult[]> {
    if (!this.embeddingProvider) {
      // Fall back to keyword search
      const memories = await this.search(query, {
        type: options?.type,
        limit: options?.limit,
      });
      // Return with default similarity score
      return memories.map((memory) => ({ memory, similarity: 0.5 }));
    }

    // Generate query embedding
    const queryEmbedding = await this.embeddingProvider.embed(query);

    // Get all memories with embeddings
    let sql = 'SELECT * FROM memories WHERE embedding IS NOT NULL';
    const params: string[] = [];

    if (!this.globalMode && this.projectId) {
      sql += ' AND project_id = ?';
      params.push(this.projectId);
    }

    if (options?.type) {
      sql += ' AND type = ?';
      params.push(options.type);
    }

    const rows = this.db.query(sql).all(...params) as DatabaseRow[];

    // Calculate similarity for each memory
    const results: SemanticSearchResult[] = [];

    for (const row of rows) {
      if (!row.embedding) continue;

      const embedding = deserializeEmbedding(row.embedding);
      const similarity = cosineSimilarity(queryEmbedding, embedding);

      // Filter by minimum score
      if (options?.minScore !== undefined && similarity < options.minScore) {
        continue;
      }

      const memory = await this.rowToMemory(row);
      results.push({ memory, similarity });
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    // Apply limit
    if (options?.limit) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Closes the database connection.
   *
   * Should be called when the MemoryStore is no longer needed to free resources.
   *
   * @example
   * ```typescript
   * store.close();
   * ```
   */
  close() {
    this.db.close();
  }
}
