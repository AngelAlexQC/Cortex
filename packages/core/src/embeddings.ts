/**
 * Embeddings provider for semantic search.
 *
 * Supports multiple embedding backends:
 * - Ollama (local, recommended: nomic-embed-text, bge-m3)
 * - OpenAI API (cloud fallback)
 *
 * @module @ecuabyte/cortex-core/embeddings
 */

/// <reference types="bun-types" />

/**
 * Embedding provider interface.
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
 * Configuration for Ollama embeddings.
 */
export interface OllamaEmbeddingsConfig {
  /** Ollama API base URL (default: http://localhost:11434) */
  baseUrl?: string;
  /** Model to use (default: nomic-embed-text) */
  model?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

/**
 * Configuration for OpenAI embeddings (fallback).
 */
export interface OpenAIEmbeddingsConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Model to use (default: text-embedding-3-small) */
  model?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

/**
 * Model dimensions lookup table.
 */
const MODEL_DIMENSIONS: Record<string, number> = {
  'nomic-embed-text': 768,
  'bge-m3': 1024,
  'mxbai-embed-large': 1024,
  'all-minilm': 384,
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
};

/**
 * Default embedding model.
 */
export const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text';

/**
 * Ollama embeddings provider.
 *
 * Uses the local Ollama API for privacy-first embeddings.
 * Requires Ollama to be running and the model to be pulled.
 *
 * @example
 * ```typescript
 * const provider = new OllamaEmbeddings();
 * const vector = await provider.embed("Hello world");
 * console.log(vector.length); // 768 for nomic-embed-text
 * ```
 */
export class OllamaEmbeddings implements IEmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;
  private baseUrl: string;
  private timeout: number;

  constructor(config: OllamaEmbeddingsConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
    this.model = config.model ?? DEFAULT_EMBEDDING_MODEL;
    this.timeout = config.timeout ?? 30000;
    this.dimensions = MODEL_DIMENSIONS[this.model] ?? 768;
  }

  /**
   * Check if Ollama is running and model is available.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = globalThis.setTimeout(() => controller.abort(), 5000);

      const response = await globalThis.fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      globalThis.clearTimeout(timeoutId);

      if (!response.ok) return false;

      const data = (await response.json()) as { models?: { name: string }[] };
      const models = data.models ?? [];

      // Check if our model is installed
      return models.some((m) => m.name === this.model || m.name.startsWith(`${this.model}:`));
    } catch {
      return false;
    }
  }

  /**
   * Generate embedding for a single text.
   */
  async embed(text: string): Promise<number[]> {
    const embeddings = await this.embedBatch([text]);
    if (!embeddings[0]) {
      throw new Error('Failed to generate embedding');
    }
    return embeddings[0];
  }

  /**
   * Generate embeddings for multiple texts.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await globalThis.fetch(`${this.baseUrl}/api/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
        }),
        signal: controller.signal,
      });

      globalThis.clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama embedding failed: ${error}`);
      }

      const data = (await response.json()) as { embeddings: number[][] };
      return data.embeddings;
    } catch (error) {
      globalThis.clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Ollama embedding timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }
}

/**
 * OpenAI embeddings provider (cloud fallback).
 *
 * Uses the OpenAI API for embeddings when Ollama is not available.
 *
 * @example
 * ```typescript
 * const provider = new OpenAIEmbeddings({ apiKey: 'sk-...' });
 * const vector = await provider.embed("Hello world");
 * ```
 */
export class OpenAIEmbeddings implements IEmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;
  private apiKey: string;
  private timeout: number;

  constructor(config: OpenAIEmbeddingsConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'text-embedding-3-small';
    this.timeout = config.timeout ?? 30000;
    this.dimensions = MODEL_DIMENSIONS[this.model] ?? 1536;
  }

  /**
   * Check if API key is configured.
   */
  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  /**
   * Generate embedding for a single text.
   */
  async embed(text: string): Promise<number[]> {
    const embeddings = await this.embedBatch([text]);
    if (!embeddings[0]) {
      throw new Error('Failed to generate embedding');
    }
    return embeddings[0];
  }

  /**
   * Generate embeddings for multiple texts.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await globalThis.fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
        }),
        signal: controller.signal,
      });

      globalThis.clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI embedding failed: ${error}`);
      }

      const data = (await response.json()) as {
        data: { embedding: number[]; index: number }[];
      };

      // Sort by index and extract embeddings
      return data.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
    } catch (error) {
      globalThis.clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`OpenAI embedding timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }
}

/**
 * Create an embedding provider with automatic fallback.
 *
 * Tries Ollama first (local, privacy-first), falls back to OpenAI if configured.
 *
 * @example
 * ```typescript
 * const provider = await createEmbeddingProvider();
 * if (provider) {
 *   const vector = await provider.embed("Hello world");
 * }
 * ```
 */
export async function createEmbeddingProvider(options?: {
  ollamaConfig?: OllamaEmbeddingsConfig;
  openaiApiKey?: string;
}): Promise<IEmbeddingProvider | null> {
  // Try Ollama first (local, privacy-first)
  const ollama = new OllamaEmbeddings(options?.ollamaConfig);
  if (await ollama.isAvailable()) {
    return ollama;
  }

  // Fall back to OpenAI if API key is provided
  if (options?.openaiApiKey) {
    const openai = new OpenAIEmbeddings({ apiKey: options.openaiApiKey });
    if (await openai.isAvailable()) {
      return openai;
    }
  }

  // No embedding provider available
  return null;
}

/**
 * Calculate cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Serialize embedding to Uint8Array for storage.
 */
export function serializeEmbedding(embedding: number[]): Uint8Array {
  const buffer = new ArrayBuffer(embedding.length * 4); // 4 bytes per float32
  const view = new DataView(buffer);
  for (let i = 0; i < embedding.length; i++) {
    view.setFloat32(i * 4, embedding[i] ?? 0, true); // little-endian
  }
  return new Uint8Array(buffer);
}

/**
 * Deserialize embedding from Uint8Array.
 */
export function deserializeEmbedding(data: Uint8Array): number[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const embedding: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    embedding.push(view.getFloat32(i, true)); // little-endian
  }
  return embedding;
}
