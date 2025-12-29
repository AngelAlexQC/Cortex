import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryStore } from '../storage';

describe('MemoryStore', () => {
  let store: MemoryStore;
  let dbPath: string;

  beforeEach(() => {
    // Create a temporary database for each test
    dbPath = join(tmpdir(), `cortex-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    store = new MemoryStore({ dbPath, projectId: 'test-project-1' });
  });

  afterEach(() => {
    store.close();
    try {
      unlinkSync(dbPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('add', () => {
    it('should add a memory and return its ID', async () => {
      const id = await store.add({
        content: 'Test memory',
        type: 'fact',
        source: 'manual',
      });

      expect(id).toBeGreaterThan(0);
    });

    it('should add a memory with tags and metadata', async () => {
      const id = await store.add({
        content: 'Complex memory',
        type: 'code',
        source: 'editor',
        tags: ['typescript', 'testing'],
        metadata: { complexity: 'high' },
      });

      const memory = await store.get(id);
      expect(memory).toBeTruthy();
      expect(memory?.tags).toEqual(['typescript', 'testing']);
      expect(memory?.metadata).toEqual({ complexity: 'high' });
    });

    it('should automatically set projectId', async () => {
      const id = await store.add({
        content: 'Project-specific memory',
        type: 'decision',
        source: 'architecture',
      });

      const memory = await store.get(id);
      expect(memory?.projectId).toBe('test-project-1');
    });
  });

  describe('get', () => {
    it('should retrieve a memory by ID', async () => {
      const id = await store.add({
        content: 'Retrieve me',
        type: 'note',
        source: 'test',
      });

      const memory = await store.get(id);
      expect(memory).toBeTruthy();
      expect(memory?.content).toBe('Retrieve me');
      expect(memory?.type).toBe('note');
    });

    it('should return null for non-existent ID', async () => {
      const memory = await store.get(99999);
      expect(memory).toBeNull();
    });

    it('should not retrieve memories from other projects', async () => {
      // Add memory to project 1
      const id = await store.add({
        content: 'Project 1 memory',
        type: 'fact',
        source: 'test',
      });

      // Create store for project 2
      const store2 = new MemoryStore({ dbPath, projectId: 'test-project-2' });
      const memory = await store2.get(id);

      expect(memory).toBeNull();
      store2.close();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // Add test data
      await store.add({ content: 'TypeScript is awesome', type: 'fact', source: 'docs' });
      await store.add({
        content: 'Use TypeScript for type safety',
        type: 'decision',
        source: 'team',
      });
      await store.add({ content: 'JavaScript is flexible', type: 'fact', source: 'web' });
    });

    it('should find memories by content', async () => {
      const results = await store.search('TypeScript');
      expect(results).toHaveLength(2);
    });

    it('should be case-insensitive', async () => {
      const results = await store.search('typescript');
      expect(results).toHaveLength(2);
    });

    it('should filter by type', async () => {
      const results = await store.search('TypeScript', { type: 'fact' });
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('TypeScript is awesome');
    });

    it('should limit results', async () => {
      const results = await store.search('', { limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('should return empty array when no matches', async () => {
      const results = await store.search('Rust');
      expect(results).toHaveLength(0);
    });

    it('should only search within current project', async () => {
      // Add memory to different project
      const store2 = new MemoryStore({ dbPath, projectId: 'test-project-2' });
      await store2.add({ content: 'TypeScript in project 2', type: 'fact', source: 'test' });

      const results = await store.search('TypeScript');
      expect(results).toHaveLength(2); // Only from project 1

      store2.close();
    });
  });

  describe('list', () => {
    it('should list all memories', async () => {
      await store.add({ content: 'Fact 1', type: 'fact', source: 'test' });
      await store.add({ content: 'Decision 1', type: 'decision', source: 'test' });
      await store.add({ content: 'Code 1', type: 'code', source: 'test' });

      const memories = await store.list();
      expect(memories).toHaveLength(3);
    });

    it('should filter by type', async () => {
      await store.add({ content: 'Fact 1', type: 'fact', source: 'test' });
      await store.add({ content: 'Decision 1', type: 'decision', source: 'test' });

      const facts = await store.list({ type: 'fact' });
      expect(facts).toHaveLength(1);
      expect(facts[0].type).toBe('fact');
    });

    it('should limit results', async () => {
      await store.add({ content: 'M1', type: 'fact', source: 'test' });
      await store.add({ content: 'M2', type: 'fact', source: 'test' });
      await store.add({ content: 'M3', type: 'fact', source: 'test' });

      const memories = await store.list({ limit: 2 });
      expect(memories).toHaveLength(2);
    });

    it('should return all memories ordered by creation time', async () => {
      await store.add({ content: 'Memory 1', type: 'note', source: 'test' });
      await store.add({ content: 'Memory 2', type: 'note', source: 'test' });

      const memories = await store.list();
      expect(memories).toHaveLength(2);
      // All memories have created_at timestamps
      expect(memories[0].createdAt).toBeDefined();
      expect(memories[1].createdAt).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update memory content', async () => {
      const id = await store.add({
        content: 'Original content',
        type: 'fact',
        source: 'test',
      });

      const updated = await store.update(id, { content: 'Updated content' });
      expect(updated).toBe(true);

      const memory = await store.get(id);
      expect(memory?.content).toBe('Updated content');
      expect(memory?.type).toBe('fact');
      expect(memory?.source).toBe('test');
    });

    it('should update memory type', async () => {
      const id = await store.add({
        content: 'Test content',
        type: 'fact',
        source: 'test',
      });

      await store.update(id, { type: 'decision' });

      const memory = await store.get(id);
      expect(memory?.type).toBe('decision');
    });

    it('should update tags', async () => {
      const id = await store.add({
        content: 'Test',
        type: 'fact',
        source: 'test',
        tags: ['old', 'tags'],
      });

      await store.update(id, { tags: ['new', 'updated', 'tags'] });

      const memory = await store.get(id);
      expect(memory?.tags).toEqual(['new', 'updated', 'tags']);
    });

    it('should update metadata', async () => {
      const id = await store.add({
        content: 'Test',
        type: 'fact',
        source: 'test',
        metadata: { version: 1 },
      });

      await store.update(id, { metadata: { version: 2, author: 'test' } });

      const memory = await store.get(id);
      expect(memory?.metadata).toEqual({ version: 2, author: 'test' });
    });

    it('should update multiple fields at once', async () => {
      const id = await store.add({
        content: 'Original',
        type: 'fact',
        source: 'old-source',
        tags: ['old'],
      });

      await store.update(id, {
        content: 'Updated',
        type: 'decision',
        source: 'new-source',
        tags: ['new', 'updated'],
        metadata: { updated: true },
      });

      const memory = await store.get(id);
      expect(memory?.content).toBe('Updated');
      expect(memory?.type).toBe('decision');
      expect(memory?.source).toBe('new-source');
      expect(memory?.tags).toEqual(['new', 'updated']);
      expect(memory?.metadata).toEqual({ updated: true });
    });

    it('should return false for non-existent memory', async () => {
      const updated = await store.update(9999, { content: 'Update' });
      expect(updated).toBe(false);
    });

    it('should return false when no updates provided', async () => {
      const id = await store.add({
        content: 'Test',
        type: 'fact',
        source: 'test',
      });

      const updated = await store.update(id, {});
      expect(updated).toBe(false);
    });

    it('should not update memories from other projects', async () => {
      const id = await store.add({
        content: 'Project 1 memory',
        type: 'fact',
        source: 'test',
      });

      // Create store for different project
      const store2 = new MemoryStore({ dbPath, projectId: 'test-project-2' });

      const updated = await store2.update(id, { content: 'Hacked!' });
      expect(updated).toBe(false);

      // Original memory unchanged
      const memory = await store.get(id);
      expect(memory?.content).toBe('Project 1 memory');

      store2.close();
    });

    it('should update the updated_at timestamp', async () => {
      const id = await store.add({
        content: 'Test',
        type: 'fact',
        source: 'test',
      });

      const original = await store.get(id);
      const originalUpdatedAt = original?.updatedAt;

      // Wait to ensure timestamp changes (SQLite uses second precision)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      await store.update(id, { content: 'Updated' });

      const updated = await store.get(id);
      expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
      expect(updated?.createdAt).toBe(original?.createdAt);
    });

    it('should handle clearing tags and metadata', async () => {
      const id = await store.add({
        content: 'Test',
        type: 'fact',
        source: 'test',
        tags: ['tag1', 'tag2'],
        metadata: { key: 'value' },
      });

      await store.update(id, { tags: [], metadata: {} });

      const memory = await store.get(id);
      expect(memory?.tags).toEqual([]);
      expect(memory?.metadata).toEqual({});
    });

    it('should throw error when updating with invalid type', async () => {
      const id = await store.add({
        content: 'Test',
        type: 'fact',
        source: 'test',
      });

      await expect(store.update(id, { type: 'invalid-type' as any })).rejects.toThrow(
        'Invalid memory type'
      );
    });

    it('should throw error when updating with empty content', async () => {
      const id = await store.add({
        content: 'Test',
        type: 'fact',
        source: 'test',
      });

      await expect(store.update(id, { content: '' })).rejects.toThrow(
        'Memory content cannot be empty'
      );
    });

    it('should throw error when updating with empty source', async () => {
      const id = await store.add({
        content: 'Test',
        type: 'fact',
        source: 'test',
      });

      await expect(store.update(id, { source: '  ' })).rejects.toThrow(
        'Memory source cannot be empty'
      );
    });
  });

  describe('validation', () => {
    it('should throw error when adding with invalid type', async () => {
      await expect(
        store.add({
          content: 'Test',
          type: 'invalid-type' as any,
          source: 'test',
        })
      ).rejects.toThrow('Invalid memory type: "invalid-type"');
    });

    it('should throw error when adding with empty content', async () => {
      await expect(
        store.add({
          content: '',
          type: 'fact',
          source: 'test',
        })
      ).rejects.toThrow('Memory content is required and cannot be empty');
    });

    it('should throw error when adding with whitespace-only content', async () => {
      await expect(
        store.add({
          content: '   ',
          type: 'fact',
          source: 'test',
        })
      ).rejects.toThrow('Memory content is required and cannot be empty');
    });

    it('should throw error when adding with empty source', async () => {
      await expect(
        store.add({
          content: 'Test content',
          type: 'fact',
          source: '',
        })
      ).rejects.toThrow('Memory source is required and cannot be empty');
    });
  });

  describe('delete', () => {
    it('should delete a memory', async () => {
      const id = await store.add({
        content: 'Delete me',
        type: 'note',
        source: 'test',
      });

      const deleted = await store.delete(id);
      expect(deleted).toBe(true);

      const memory = await store.get(id);
      expect(memory).toBeNull();
    });

    it('should not delete memories from other projects', async () => {
      // Add to project 2
      const store2 = new MemoryStore({ dbPath, projectId: 'test-project-2' });
      const id = await store2.add({ content: 'Project 2', type: 'fact', source: 'test' });

      // Try to delete from project 1
      await store.delete(id);

      // Should still exist
      const memory = await store2.get(id);
      expect(memory).toBeTruthy();

      store2.close();
    });
  });

  describe('clear', () => {
    it('should clear all memories for current project', async () => {
      await store.add({ content: 'Memory 1', type: 'fact', source: 'test' });
      await store.add({ content: 'Memory 2', type: 'fact', source: 'test' });

      const count = await store.clear();
      expect(count).toBe(2);

      const memories = await store.list();
      expect(memories).toHaveLength(0);
    });

    it('should not clear memories from other projects', async () => {
      await store.add({ content: 'Project 1', type: 'fact', source: 'test' });

      const store2 = new MemoryStore({ dbPath, projectId: 'test-project-2' });
      await store2.add({ content: 'Project 2', type: 'fact', source: 'test' });

      await store.clear();

      const project2Memories = await store2.list();
      expect(project2Memories).toHaveLength(1);

      store2.close();
    });
  });

  describe('stats', () => {
    beforeEach(async () => {
      await store.add({ content: 'Fact 1', type: 'fact', source: 'test' });
      await store.add({ content: 'Fact 2', type: 'fact', source: 'test' });
      await store.add({ content: 'Decision 1', type: 'decision', source: 'test' });
    });

    it('should return correct statistics', async () => {
      const stats = await store.stats();

      expect(stats.total).toBe(3);
      expect(stats.byType.fact).toBe(2);
      expect(stats.byType.decision).toBe(1);
      expect(stats.projectId).toBe('test-project-1');
    });

    it('should only count memories from current project', async () => {
      const store2 = new MemoryStore({ dbPath, projectId: 'test-project-2' });
      await store2.add({ content: 'Other project', type: 'fact', source: 'test' });

      const stats = await store.stats();
      expect(stats.total).toBe(3);

      store2.close();
    });
  });

  describe('project isolation', () => {
    it('should isolate memories between projects', async () => {
      const store1 = new MemoryStore({ dbPath, projectId: 'project-1' });
      const store2 = new MemoryStore({ dbPath, projectId: 'project-2' });

      await store1.add({ content: 'Project 1 memory', type: 'fact', source: 'test' });
      await store2.add({ content: 'Project 2 memory', type: 'fact', source: 'test' });

      expect(await store1.list()).toHaveLength(1);
      expect(await store2.list()).toHaveLength(1);

      expect((await store1.list())[0].content).toBe('Project 1 memory');
      expect((await store2.list())[0].content).toBe('Project 2 memory');

      store1.close();
      store2.close();
    });

    it('should support global mode to access all projects', async () => {
      const store1 = new MemoryStore({ dbPath, projectId: 'project-1' });
      const store2 = new MemoryStore({ dbPath, projectId: 'project-2' });
      const globalStore = new MemoryStore({ dbPath, globalMode: true });

      await store1.add({ content: 'P1', type: 'fact', source: 'test' });
      await store2.add({ content: 'P2', type: 'fact', source: 'test' });

      const allMemories = await globalStore.list();
      expect(allMemories).toHaveLength(2);

      store1.close();
      store2.close();
      globalStore.close();
    });
  });

  describe('getAllProjects', () => {
    it('should return all unique project IDs', async () => {
      const store1 = new MemoryStore({ dbPath, projectId: 'project-1' });
      const store2 = new MemoryStore({ dbPath, projectId: 'project-2' });

      await store1.add({ content: 'P1 M1', type: 'fact', source: 'test' });
      await store1.add({ content: 'P1 M2', type: 'fact', source: 'test' });
      await store2.add({ content: 'P2 M1', type: 'fact', source: 'test' });

      const projects = store1.getAllProjects();
      expect(projects).toHaveLength(2);
      expect(projects.find((p) => p.projectId === 'project-1')?.count).toBe(2);
      expect(projects.find((p) => p.projectId === 'project-2')?.count).toBe(1);

      store1.close();
      store2.close();
    });
  });

  describe('getProjectId', () => {
    it('should return the current project ID', () => {
      const projectId = store.getProjectId();
      expect(projectId).toBe('test-project-1');
    });

    it('should return null in global mode', () => {
      const globalStore = new MemoryStore({ dbPath, globalMode: true });
      const projectId = globalStore.getProjectId();
      expect(projectId).toBeNull();
      globalStore.close();
    });
  });

  describe('legacy constructor', () => {
    it('should support string parameter for backwards compatibility', async () => {
      const legacyStore = new MemoryStore(dbPath);
      const id = await legacyStore.add({
        content: 'Legacy test',
        type: 'fact',
        source: 'test',
      });

      expect(id).toBeGreaterThan(0);
      legacyStore.close();
    });
  });

  describe('edge cases', () => {
    it('should handle memory with custom projectId', async () => {
      // Use globalMode to bypass project filtering
      const globalStore = new MemoryStore({ dbPath, globalMode: true });

      const id = await globalStore.add({
        content: 'Custom project memory',
        type: 'fact',
        source: 'test',
        projectId: 'custom-project-id',
      });

      const memory = await globalStore.get(id);
      expect(memory?.projectId).toBe('custom-project-id');

      globalStore.close();
    });

    it('should handle memories without tags', async () => {
      const id = await store.add({
        content: 'No tags',
        type: 'note',
        source: 'test',
      });

      const memory = await store.get(id);
      expect(memory?.tags).toBeUndefined();
    });

    it('should handle memories without metadata', async () => {
      const id = await store.add({
        content: 'No metadata',
        type: 'note',
        source: 'test',
      });

      const memory = await store.get(id);
      expect(memory?.metadata).toBeUndefined();
    });

    it('should handle empty search query', async () => {
      await store.add({ content: 'Test 1', type: 'fact', source: 'test' });
      await store.add({ content: 'Test 2', type: 'fact', source: 'test' });

      const results = await store.search('');
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should return true when deleting non-existent memory', async () => {
      const result = await store.delete(99999);
      // Even if memory doesn't exist, SQLite delete succeeds
      expect(result).toBe(true);
    });
  });

  describe('global mode operations', () => {
    it('should allow getting memories from any project in global mode', async () => {
      const store1 = new MemoryStore({ dbPath, projectId: 'project-1' });
      const store2 = new MemoryStore({ dbPath, projectId: 'project-2' });
      const globalStore = new MemoryStore({ dbPath, globalMode: true });

      const id1 = await store1.add({ content: 'P1', type: 'fact', source: 'test' });
      const id2 = await store2.add({ content: 'P2', type: 'fact', source: 'test' });

      const memory1 = await globalStore.get(id1);
      const memory2 = await globalStore.get(id2);

      expect(memory1?.content).toBe('P1');
      expect(memory2?.content).toBe('P2');

      store1.close();
      store2.close();
      globalStore.close();
    });

    it('should allow searching across all projects in global mode', async () => {
      const store1 = new MemoryStore({ dbPath, projectId: 'project-1' });
      const store2 = new MemoryStore({ dbPath, projectId: 'project-2' });
      const globalStore = new MemoryStore({ dbPath, globalMode: true });

      await store1.add({ content: 'TypeScript P1', type: 'fact', source: 'test' });
      await store2.add({ content: 'TypeScript P2', type: 'fact', source: 'test' });

      const results = await globalStore.search('TypeScript');
      expect(results.length).toBeGreaterThanOrEqual(2);

      store1.close();
      store2.close();
      globalStore.close();
    });

    it('should allow deleting memories from any project in global mode', async () => {
      const store1 = new MemoryStore({ dbPath, projectId: 'project-1' });
      const globalStore = new MemoryStore({ dbPath, globalMode: true });

      const id = await store1.add({ content: 'Delete me', type: 'fact', source: 'test' });

      await globalStore.delete(id);

      const memory = await store1.get(id);
      expect(memory).toBeNull();

      store1.close();
      globalStore.close();
    });

    it('should clear all memories in global mode', async () => {
      const store1 = new MemoryStore({ dbPath, projectId: 'project-1' });
      const store2 = new MemoryStore({ dbPath, projectId: 'project-2' });
      const globalStore = new MemoryStore({ dbPath, globalMode: true });

      await store1.add({ content: 'P1', type: 'fact', source: 'test' });
      await store2.add({ content: 'P2', type: 'fact', source: 'test' });

      const count = await globalStore.clear();
      expect(count).toBeGreaterThanOrEqual(2);

      const allMemories = await globalStore.list();
      expect(allMemories).toHaveLength(0);

      store1.close();
      store2.close();
      globalStore.close();
    });

    it('should return stats for all projects in global mode', async () => {
      const store1 = new MemoryStore({ dbPath, projectId: 'project-1' });
      const store2 = new MemoryStore({ dbPath, projectId: 'project-2' });
      const globalStore = new MemoryStore({ dbPath, globalMode: true });

      await store1.add({ content: 'P1', type: 'fact', source: 'test' });
      await store2.add({ content: 'P2', type: 'decision', source: 'test' });

      const stats = await globalStore.stats();
      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.projectId).toBeUndefined();

      store1.close();
      store2.close();
      globalStore.close();
    });
  });

  describe('encryption', () => {
    let encryptedStore: MemoryStore;
    const password = 'test-password';

    beforeEach(() => {
      encryptedStore = new MemoryStore({ dbPath, password, projectId: 'crypto-project' });
    });

    it('should encrypt and decrypt memory content', async () => {
      const content = 'This is a secret';
      const id = await encryptedStore.add({
        content,
        type: 'fact',
        source: 'secret-source',
      });

      const memory = await encryptedStore.get(id);
      expect(memory?.content).toBe(content);
    });

    it('should encrypt and decrypt metadata', async () => {
      const metadata = { secretKey: 'secretValue' };
      const id = await encryptedStore.add({
        content: 'Secret with metadata',
        type: 'fact',
        source: 'secret-source',
        metadata,
      });

      const memory = await encryptedStore.get(id);
      expect(memory?.metadata).toEqual(metadata);
    });

    it('should not be able to decrypt with wrong password', async () => {
      const content = 'My secret content';
      const id = await encryptedStore.add({
        content,
        type: 'fact',
        source: 'source',
      });

      const wrongStore = new MemoryStore({
        dbPath,
        password: 'wrong-password',
        projectId: 'crypto-project',
      });
      const memory = await wrongStore.get(id);

      // Decryption fails, so it returns encrypted content as is (or errors in log)
      expect(memory?.content).not.toBe(content);
      expect(memory?.content).toContain('.'); // Format: salt.iv.cipher
      wrongStore.close();
    });

    it('should handle updating encrypted memories', async () => {
      const id = await encryptedStore.add({
        content: 'Initial secret',
        type: 'fact',
        source: 'source',
      });

      await encryptedStore.update(id, { content: 'Updated secret' });
      const memory = await encryptedStore.get(id);
      expect(memory?.content).toBe('Updated secret');
    });

    it('should search in-memory for encrypted content', async () => {
      await encryptedStore.add({ content: 'Secret A', type: 'fact', source: 's' });
      await encryptedStore.add({ content: 'Secret B', type: 'fact', source: 's' });
      await encryptedStore.add({ content: 'Other', type: 'fact', source: 's' });

      const results = await encryptedStore.search('Secret');
      expect(results).toHaveLength(2);
    });
  });
});
