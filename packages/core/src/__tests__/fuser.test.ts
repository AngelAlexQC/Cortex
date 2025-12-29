import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ContextFuser } from '../fuser';
import { MemoryStore } from '../storage';

describe('ContextFuser', () => {
  let store: MemoryStore;
  let fuser: ContextFuser;
  let dbPath: string;
  let tempDir: string;

  beforeEach(() => {
    dbPath = join(tmpdir(), `cortex-fuser-test-${Date.now()}-${Math.random()}.db`);
    tempDir = join(tmpdir(), `cortex-fuser-files-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    store = new MemoryStore({ dbPath, projectId: 'test-project' });
    fuser = new ContextFuser(store);
  });

  afterEach(() => {
    store.close();
    if (existsSync(dbPath)) {
      try {
        unlinkSync(dbPath);
      } catch {
        // Ignore
      }
    }
    if (existsSync(tempDir)) {
      try {
        rmSync(tempDir, { recursive: true });
      } catch {
        // Ignore
      }
    }
  });

  describe('fuse with memory source', () => {
    it('should fetch and combine memories', async () => {
      await store.add({
        content: 'Authentication uses JWT tokens',
        type: 'decision',
        source: 'docs',
        tags: ['auth'],
      });
      await store.add({
        content: 'Database uses PostgreSQL',
        type: 'decision',
        source: 'docs',
        tags: ['db'],
      });

      const result = await fuser.fuse({
        sources: [{ type: 'memory', query: 'authentication' }],
      });

      expect(result.content).toContain('JWT');
      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.sources).toContainEqual({ type: 'memory', count: 1 });
    });

    it('should handle empty memory results', async () => {
      const result = await fuser.fuse({
        sources: [{ type: 'memory', query: 'veryunlikelyquery' }],
      });

      expect(result.content).toBe('');
      expect(result.tokenCount).toBe(0);
    });
  });

  describe('fuse with file source', () => {
    it('should read file content', async () => {
      const filePath = join(tempDir, 'test.md');
      writeFileSync(filePath, '# Test File\n\nThis is test content.');

      const result = await fuser.fuse({
        sources: [{ type: 'file', path: filePath }],
      });

      expect(result.content).toContain('Test File');
      expect(result.sources).toContainEqual({ type: 'file', count: 1 });
    });

    it('should handle non-existent files gracefully', async () => {
      const result = await fuser.fuse({
        sources: [{ type: 'file', path: '/nonexistent/path/file.md' }],
      });

      expect(result.content).toBe('');
    });
  });

  describe('fuse with session source', () => {
    it('should include session data directly', async () => {
      const result = await fuser.fuse({
        sources: [{ type: 'session', data: 'User is asking about login flow' }],
      });

      expect(result.content).toContain('login flow');
      expect(result.sources).toContainEqual({ type: 'session', count: 1 });
    });
  });

  describe('fuse with multiple sources', () => {
    it('should combine multiple source types', async () => {
      await store.add({
        content: 'API uses REST',
        type: 'fact',
        source: 'docs',
      });

      const filePath = join(tempDir, 'readme.txt');
      writeFileSync(filePath, 'README content here');

      const result = await fuser.fuse({
        sources: [
          { type: 'memory', query: 'API' },
          { type: 'file', path: filePath },
          { type: 'session', data: 'Current session context' },
        ],
      });

      expect(result.content).toContain('REST');
      expect(result.content).toContain('README');
      expect(result.content).toContain('session');
      expect(result.sources.length).toBe(3);
    });

    it('should respect source weights', async () => {
      const result = await fuser.fuse({
        sources: [
          { type: 'session', data: 'Low weight content', weight: 0.1 },
          { type: 'session', data: 'High weight content', weight: 0.9 },
        ],
        format: 'markdown',
      });

      // Higher weight should appear first
      const highPos = result.content.indexOf('High weight');
      const lowPos = result.content.indexOf('Low weight');
      expect(highPos).toBeLessThan(lowPos);
    });
  });

  describe('deduplication', () => {
    it('should remove exact duplicates', async () => {
      const result = await fuser.fuse({
        sources: [
          { type: 'session', data: 'Same content' },
          { type: 'session', data: 'Same content' },
          { type: 'session', data: 'Different content' },
        ],
        dedupe: 'exact',
      });

      // Should have 2 unique pieces of content
      expect(result.sources).toContainEqual({ type: 'session', count: 2 });
    });

    it('should detect semantically similar content', async () => {
      const result = await fuser.fuse({
        sources: [
          { type: 'session', data: 'The quick brown fox jumps over the lazy dog' },
          { type: 'session', data: 'The quick brown fox jumps over the lazy dog again' },
        ],
        dedupe: 'semantic',
      });

      // Similar content should be deduplicated
      expect(result.sources).toContainEqual({ type: 'session', count: 1 });
    });

    it('should keep all content when dedupe is none', async () => {
      const result = await fuser.fuse({
        sources: [
          { type: 'session', data: 'Same' },
          { type: 'session', data: 'Same' },
        ],
        dedupe: 'none',
      });

      expect(result.sources).toContainEqual({ type: 'session', count: 2 });
    });
  });

  describe('output formats', () => {
    it('should output plain text by default', async () => {
      const result = await fuser.fuse({
        sources: [{ type: 'session', data: 'Test content' }],
        format: 'text',
      });

      expect(result.content).toContain('[session]');
    });

    it('should output markdown format', async () => {
      const result = await fuser.fuse({
        sources: [{ type: 'session', data: 'Test content' }],
        format: 'markdown',
      });

      expect(result.content).toContain('### SESSION');
      expect(result.content).toContain('weight:');
    });

    it('should output JSON format', async () => {
      const result = await fuser.fuse({
        sources: [{ type: 'session', data: 'Test content' }],
        format: 'json',
      });

      expect(result.content.startsWith('[')).toBe(true);
      const parsed = JSON.parse(result.content);
      expect(parsed[0].type).toBe('session');
    });
  });

  describe('token limiting', () => {
    it('should respect maxTokens limit', async () => {
      // Create a long content
      const longContent = 'word '.repeat(1000);

      const result = await fuser.fuse({
        sources: [{ type: 'session', data: longContent }],
        maxTokens: 100,
      });

      expect(result.tokenCount).toBeLessThanOrEqual(110); // Allow some margin
    });

    it('should truncate with ellipsis when exceeding limit', async () => {
      const longContent = 'test '.repeat(500);

      const result = await fuser.fuse({
        sources: [{ type: 'session', data: longContent }],
        maxTokens: 50,
      });

      expect(result.content).toContain('...');
    });
  });
});
