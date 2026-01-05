/**
 * Tests for embeddings provider module.
 * @module @ecuabyte/cortex-core/embeddings.test
 */

import { describe, expect, it } from 'bun:test';
import {
  cosineSimilarity,
  deserializeEmbedding,
  OllamaEmbeddings,
  serializeEmbedding,
} from './embeddings';

describe('Embeddings', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 0, 0];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [-1, 0, 0];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(-1, 5);
    });

    it('should handle normalized vectors', () => {
      const vec1 = [0.6, 0.8];
      const vec2 = [0.8, 0.6];
      // Cosine similarity: (0.6*0.8 + 0.8*0.6) / (1 * 1) = 0.96
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0.96, 5);
    });

    it('should throw for vectors of different lengths', () => {
      const vec1 = [1, 0];
      const vec2 = [1, 0, 0];
      expect(() => cosineSimilarity(vec1, vec2)).toThrow('Vectors must have the same length');
    });

    it('should handle zero vectors gracefully', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 0, 0];
      expect(cosineSimilarity(vec1, vec2)).toBe(0);
    });
  });

  describe('serializeEmbedding / deserializeEmbedding', () => {
    it('should serialize and deserialize correctly', () => {
      const original = [0.1, 0.2, 0.3, -0.5, 1.0];
      const serialized = serializeEmbedding(original);
      const deserialized = deserializeEmbedding(serialized);

      expect(deserialized.length).toBe(original.length);
      for (let i = 0; i < original.length; i++) {
        expect(deserialized[i]).toBeCloseTo(original[i] ?? 0, 5);
      }
    });

    it('should handle empty embedding', () => {
      const original: number[] = [];
      const serialized = serializeEmbedding(original);
      const deserialized = deserializeEmbedding(serialized);
      expect(deserialized).toEqual([]);
    });

    it('should produce correct byte length', () => {
      const embedding = [1, 2, 3, 4, 5];
      const serialized = serializeEmbedding(embedding);
      expect(serialized.length).toBe(embedding.length * 4); // 4 bytes per float32
    });
  });

  describe('OllamaEmbeddings', () => {
    it('should create instance with default config', () => {
      const provider = new OllamaEmbeddings();
      expect(provider.model).toBe('nomic-embed-text');
      expect(provider.dimensions).toBe(768);
    });

    it('should create instance with custom config', () => {
      const provider = new OllamaEmbeddings({
        model: 'bge-m3',
        baseUrl: 'http://custom:11434',
      });
      expect(provider.model).toBe('bge-m3');
      expect(provider.dimensions).toBe(1024);
    });

    it('should return false for isAvailable when Ollama is not running', async () => {
      const provider = new OllamaEmbeddings({
        baseUrl: 'http://localhost:99999', // Invalid port
      });
      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });
  });
});
