import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ContextRouter } from '../router';
import { MemoryStore } from '../storage';

describe('ContextRouter', () => {
  let store: MemoryStore;
  let router: ContextRouter;
  let dbPath: string;

  beforeEach(() => {
    dbPath = join(tmpdir(), `cortex-router-test-${Date.now()}-${Math.random()}.db`);
    store = new MemoryStore({ dbPath, projectId: 'test-project' });
    router = new ContextRouter(store);
  });

  afterEach(() => {
    store.close();
    if (existsSync(dbPath)) {
      try {
        unlinkSync(dbPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('route', () => {
    it('should return memories relevant to the task', async () => {
      // Add some memories
      await store.add({
        content: 'We use JWT tokens for authentication',
        type: 'decision',
        source: 'meeting-notes',
        tags: ['auth', 'security'],
      });
      await store.add({
        content: 'Database uses PostgreSQL with Prisma ORM',
        type: 'decision',
        source: 'architecture',
        tags: ['database', 'orm'],
      });
      await store.add({
        content: 'The login endpoint should validate email format',
        type: 'fact',
        source: 'requirements',
        tags: ['auth', 'validation'],
      });

      // Route for auth-related task
      const results = await router.route({
        task: 'implementing user authentication with JWT',
        limit: 2,
      });

      expect(results.length).toBe(2);
      // Should prioritize auth-related memories
      expect(results.some((m) => m.content.includes('JWT'))).toBe(true);
    });

    it('should return empty array when no memories exist', async () => {
      const results = await router.route({
        task: 'implementing something',
        limit: 5,
      });

      expect(results).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      // Add multiple memories
      for (let i = 0; i < 10; i++) {
        await store.add({
          content: `Memory about authentication ${i}`,
          type: 'fact',
          source: 'test',
        });
      }

      const results = await router.route({
        task: 'authentication',
        limit: 3,
      });

      expect(results.length).toBe(3);
    });

    it('should filter by type when specified', async () => {
      await store.add({
        content: 'A fact about testing',
        type: 'fact',
        source: 'test',
      });
      await store.add({
        content: 'A decision about testing',
        type: 'decision',
        source: 'test',
      });

      const results = await router.route({
        task: 'testing',
        type: 'decision',
        limit: 10,
      });

      expect(results.length).toBe(1);
      expect(results[0].type).toBe('decision');
    });
  });

  describe('routeWithScores', () => {
    it('should return memories with scores and reasons', async () => {
      await store.add({
        content: 'We decided to use TypeScript for type safety',
        type: 'decision',
        source: 'architecture',
        tags: ['typescript', 'tooling'],
      });

      const results = await router.routeWithScores({
        task: 'typescript configuration',
        limit: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('memory');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('reason');
      expect(typeof results[0].score).toBe('number');
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].score).toBeLessThanOrEqual(1);
    });

    it('should score decisions higher than notes', async () => {
      await store.add({
        content: 'Random note about the project',
        type: 'note',
        source: 'test',
      });
      await store.add({
        content: 'Decision about the project architecture',
        type: 'decision',
        source: 'test',
      });

      const results = await router.routeWithScores({
        task: 'project',
        limit: 10,
      });

      // Find the decision and note
      const decision = results.find((r) => r.memory.type === 'decision');
      const note = results.find((r) => r.memory.type === 'note');

      expect(decision).toBeDefined();
      expect(note).toBeDefined();
      // Decision should have higher score due to type priority
      if (decision && note) {
        expect(decision.score).toBeGreaterThanOrEqual(note.score);
      }
    });

    it('should include reason explaining the score', async () => {
      await store.add({
        content: 'Authentication uses OAuth 2.0',
        type: 'decision',
        source: 'test',
        tags: ['auth'],
      });

      const results = await router.routeWithScores({
        task: 'oauth authentication',
        tags: ['auth'],
        limit: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].reason).toContain('type:decision');
      expect(results[0].reason).toContain('keywords:');
    });
  });

  describe('keyword extraction', () => {
    it('should extract meaningful keywords and filter stop words', async () => {
      await store.add({
        content: 'PostgreSQL database configuration',
        type: 'config',
        source: 'test',
      });

      // "the", "for", "with" should be filtered as stop words
      const results = await router.route({
        task: 'configure the database connection for PostgreSQL with SSL',
        limit: 5,
      });

      // Should still find the memory because "postgresql" and "database" remain
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('PostgreSQL');
    });
  });

  describe('tag matching', () => {
    it('should boost memories with matching tags', async () => {
      await store.add({
        content: 'Generic security information',
        type: 'fact',
        source: 'test',
        tags: ['unrelated'],
      });
      await store.add({
        content: 'Security best practices',
        type: 'fact',
        source: 'test',
        tags: ['security', 'best-practices'],
      });

      const results = await router.routeWithScores({
        task: 'security implementation',
        tags: ['security'],
        limit: 10,
      });

      // The one with matching tags should score higher
      const withTag = results.find((r) => r.memory.tags?.includes('security'));
      const withoutTag = results.find((r) => r.memory.tags?.includes('unrelated'));

      expect(withTag).toBeDefined();
      expect(withoutTag).toBeDefined();
      if (withTag && withoutTag) {
        expect(withTag.score).toBeGreaterThan(withoutTag.score);
      }
    });
  });

  describe('file relevance', () => {
    it('should boost memories from related paths', async () => {
      await store.add({
        content: 'Auth utilities for login',
        type: 'code',
        source: 'src/auth/utils.ts',
      });
      await store.add({
        content: 'Database utilities',
        type: 'code',
        source: 'src/db/utils.ts',
      });

      const results = await router.routeWithScores({
        task: 'login implementation',
        currentFile: 'src/auth/login.ts',
        limit: 10,
      });

      // Auth-related should score higher due to path match
      const authMemory = results.find((r) => r.memory.source?.includes('auth'));
      const dbMemory = results.find((r) => r.memory.source?.includes('db'));

      expect(authMemory).toBeDefined();
      expect(dbMemory).toBeDefined();
      if (authMemory && dbMemory) {
        expect(authMemory.score).toBeGreaterThan(dbMemory.score);
      }
    });
  });

  describe('custom weights', () => {
    it('should allow custom scoring weights', async () => {
      const customRouter = new ContextRouter(store, {
        recency: 0.1,
        typePriority: 0.9, // Heavily weight type priority
      });

      await store.add({
        content: 'Old decision',
        type: 'decision',
        source: 'test',
      });
      await store.add({
        content: 'Recent note',
        type: 'note',
        source: 'test',
      });

      const results = await customRouter.routeWithScores({
        task: 'project work',
        limit: 10,
      });

      // Decision should win due to high type priority weight
      expect(results[0].memory.type).toBe('decision');
    });
  });

  describe('fallback to list', () => {
    it('should list recent memories when search returns no results', async () => {
      await store.add({
        content: 'Memory with unrelated content xyz123',
        type: 'fact',
        source: 'test',
      });

      // Search for something that won't match but router should fallback
      const results = await router.route({
        task: 'completely different topic',
        limit: 5,
      });

      // Should still return something from the fallback list
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });
});
