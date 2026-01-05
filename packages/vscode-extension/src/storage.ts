import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { IMemoryStore, Memory } from '@ecuabyte/cortex-shared';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';

export class MemoryStore implements IMemoryStore {
  private db: Database | null = null;
  private dbPath: string;
  private initPromise: Promise<void>;

  constructor(dbPath?: string) {
    const defaultPath = join(homedir(), '.cortex', 'memories.db');
    const dir = join(homedir(), '.cortex');

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.dbPath = dbPath || defaultPath;
    this.initPromise = this.initialize().catch((error) => {
      console.error('[Cortex] MemoryStore initialization failed:', error);
      // We don't rethrow here to avoid unhandled rejection,
      // as ensureInitialized will catch it later.
    });
  }

  private async initialize() {
    try {
      // Get the path to sql-wasm.wasm file
      const require = createRequire(import.meta.url);
      const sqlJsPath = require.resolve('sql.js');
      const wasmPath = join(sqlJsPath, '..', 'sql-wasm.wasm');

      if (!existsSync(wasmPath)) {
        throw new Error(`sql-wasm.wasm not found at ${wasmPath}`);
      }

      const wasmBuffer = readFileSync(wasmPath);
      // Convert Buffer to ArrayBuffer
      const wasmBinary = wasmBuffer.buffer.slice(
        wasmBuffer.byteOffset,
        wasmBuffer.byteOffset + wasmBuffer.byteLength
      );

      const SQL = await initSqlJs({
        wasmBinary,
      });

      // Load existing database or create new one
      if (existsSync(this.dbPath)) {
        try {
          const buffer = readFileSync(this.dbPath);
          this.db = new SQL.Database(buffer);
        } catch (error) {
          console.error('[Cortex] Failed to load existing database, creating new one:', error);
          this.db = new SQL.Database();
        }
      } else {
        this.db = new SQL.Database();
      }

      if (!this.db) {
        throw new Error('Failed to create SQL.js database instance');
      }

      // Create schema
      this.db.run(`
        CREATE TABLE IF NOT EXISTS memories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('fact', 'decision', 'code', 'config', 'note')),
          source TEXT NOT NULL,
          project_id TEXT,
          tags TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Ensure project_id column exists for older databases
      try {
        this.db.run('ALTER TABLE memories ADD COLUMN project_id TEXT');
      } catch {
        // Column already exists or other non-critical error
      }

      this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at)');

      this.db.run(`
        CREATE TRIGGER IF NOT EXISTS update_memories_timestamp
        AFTER UPDATE ON memories
        BEGIN
          UPDATE memories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
      `);

      this.saveToFile();
    } catch (error) {
      console.error('[Cortex] Failed to initialize MemoryStore:', error);
      throw error; // Let ensureInitialized catch it via initPromise
    }
  }

  private async ensureInitialized() {
    try {
      await this.initPromise;
    } catch (error) {
      throw new Error(`Database failed to initialize: ${error}`);
    }

    if (!this.db) {
      throw new Error('Database not available (null after initialization)');
    }
  }

  private saveToFile() {
    if (!this.db) return;
    const data = this.db.export();
    writeFileSync(this.dbPath, Buffer.from(data));
  }

  async add(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    await this.ensureInitialized();

    this.db?.run(
      `INSERT INTO memories (content, type, source, project_id, tags, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        memory.content,
        memory.type,
        memory.source,
        memory.projectId || null,
        memory.tags ? JSON.stringify(memory.tags) : null,
        memory.metadata ? JSON.stringify(memory.metadata) : null,
      ]
    );

    const result = this.db?.exec('SELECT last_insert_rowid() as id');
    if (!result || result.length === 0 || result[0].values.length === 0) {
      throw new Error('Failed to get inserted memory ID');
    }
    const id = result[0].values[0][0] as number;

    this.saveToFile();
    return id;
  }

  async get(id: number): Promise<Memory | null> {
    await this.ensureInitialized();

    const result = this.db?.exec('SELECT * FROM memories WHERE id = ?', [id]);
    if (!result || result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    return this.rowToMemory(result[0].columns, result[0].values[0]);
  }

  async search(query: string, options?: { type?: string; limit?: number }): Promise<Memory[]> {
    await this.ensureInitialized();

    let sql = 'SELECT * FROM memories WHERE content LIKE ?';
    const params: (number | string)[] = [`%${query}%`];

    if (options?.type) {
      sql += ' AND type = ?';
      params.push(options.type);
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const result = this.db?.exec(sql, params);
    if (!result || result.length === 0) return [];

    return result[0].values.map((row: SqlValue[]) => this.rowToMemory(result[0].columns, row));
  }

  async list(options?: { type?: string; limit?: number }): Promise<Memory[]> {
    await this.ensureInitialized();

    let sql = 'SELECT * FROM memories';
    const params: (number | string)[] = [];

    if (options?.type) {
      sql += ' WHERE type = ?';
      params.push(options.type);
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const result = this.db?.exec(sql, params);
    if (!result || result.length === 0) return [];

    return result[0].values.map((row: SqlValue[]) => this.rowToMemory(result[0].columns, row));
  }

  async update(
    id: number,
    memory: Partial<Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> {
    await this.ensureInitialized();

    const updates: string[] = [];
    const params: SqlValue[] = [];

    if (memory.content !== undefined) {
      updates.push('content = ?');
      params.push(memory.content);
    }
    if (memory.type !== undefined) {
      updates.push('type = ?');
      params.push(memory.type);
    }
    if (memory.source !== undefined) {
      updates.push('source = ?');
      params.push(memory.source);
    }
    if (memory.tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(memory.tags));
    }
    if (memory.metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(memory.metadata));
    }
    if (memory.projectId !== undefined) {
      updates.push('project_id = ?');
      params.push(memory.projectId);
    }

    if (updates.length === 0) return false;

    params.push(id);
    this.db?.run(`UPDATE memories SET ${updates.join(', ')} WHERE id = ?`, params);
    this.saveToFile();

    return true;
  }

  async delete(id: number): Promise<boolean> {
    await this.ensureInitialized();

    this.db?.run('DELETE FROM memories WHERE id = ?', [id]);
    this.saveToFile();
    return true;
  }

  async clear(): Promise<number> {
    await this.ensureInitialized();

    const result = this.db?.exec('SELECT COUNT(*) as count FROM memories');
    const count = (result?.[0]?.values[0]?.[0] as number) || 0;

    this.db?.run('DELETE FROM memories');
    this.saveToFile();

    return count;
  }

  async stats(): Promise<{ total: number; byType: Record<string, number>; projectId?: string }> {
    const defaultStats = { total: 0, byType: {} };
    try {
      await this.ensureInitialized();

      const totalResult = this.db?.exec('SELECT COUNT(*) as count FROM memories');
      const total = (totalResult?.[0]?.values[0]?.[0] as number) || 0;

      const byTypeResult = this.db?.exec(`
        SELECT type, COUNT(*) as count
        FROM memories
        GROUP BY type
      `);

      const byType: Record<string, number> = {};
      if (byTypeResult && byTypeResult.length > 0) {
        byTypeResult[0].values.forEach((row: SqlValue[]) => {
          if (row && row[0] !== null) {
            byType[row[0] as string] = (row[1] as number) || 0;
          }
        });
      }

      return { total, byType };
    } catch (error) {
      console.error('[Cortex] Error getting stats:', error);
      return defaultStats;
    }
  }

  private rowToMemory(columns: string[], values: SqlValue[]): Memory {
    if (!columns || !values) {
      throw new Error('Invalid row data');
    }

    const row: Record<string, SqlValue> = {};
    columns.forEach((col, i) => {
      row[col] = values[i];
    });

    const safeParse = (json: unknown) => {
      if (typeof json !== 'string') return undefined;
      try {
        return JSON.parse(json);
      } catch {
        return undefined;
      }
    };

    return {
      id: (row.id as number) || 0,
      content: (row.content as string) || '',
      type: (row.type as Memory['type']) || 'note',
      source: (row.source as string) || 'unknown',
      projectId: (row.project_id as string) || undefined,
      tags: safeParse(row.tags),
      metadata: safeParse(row.metadata),
      createdAt: (row.created_at as string) || new Date().toISOString(),
      updatedAt: (row.updated_at as string) || new Date().toISOString(),
    };
  }

  close() {
    if (this.db) {
      this.saveToFile();
      this.db.close();
      this.db = null;
    }
  }
}
