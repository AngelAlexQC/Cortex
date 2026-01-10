/**
 * ctx/fuse - Multi-Source Context Fusion
 *
 * Combines and consolidates context from multiple sources (memory, files, sessions)
 * into an optimal format for LLMs.
 *
 * @module @ecuabyte/cortex-core/fuser
 */

import type {
  ContextSource,
  FuseOptions,
  FuseResult,
  IContextFuser,
  IMemoryStore,
  Memory,
} from '@ecuabyte/cortex-shared';

/**
 * Approximate tokens per character (conservative estimate for English text).
 * GPT-4 uses ~4 chars per token on average.
 */
const CHARS_PER_TOKEN = 4;

/**
 * Default maximum tokens for fused output.
 */
const DEFAULT_MAX_TOKENS = 4000;

/**
 * Calculate approximate token count for text.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * ContextFuser - Combines multiple context sources.
 *
 * @example
 * ```typescript
 * const fuser = new ContextFuser(store);
 *
 * const result = await fuser.fuse({
 *   sources: [
 *     { type: 'memory', query: 'authentication' },
 *     { type: 'file', path: 'src/auth/README.md' },
 *     { type: 'session', data: 'User asked about login flow' }
 *   ],
 *   maxTokens: 2000,
 *   format: 'markdown'
 * });
 * ```
 */
export class ContextFuser implements IContextFuser {
  private store: IMemoryStore;

  constructor(store: IMemoryStore) {
    this.store = store;
  }

  /**
   * Fuse multiple context sources into a single output.
   */
  async fuse(options: FuseOptions): Promise<FuseResult> {
    const { sources, maxTokens = DEFAULT_MAX_TOKENS, dedupe = 'exact', format = 'text' } = options;

    const chunks: { type: string; content: string; weight: number }[] = [];

    // Collect content from each source
    for (const source of sources) {
      const content = await this.fetchSource(source);
      if (content) {
        chunks.push({
          type: source.type,
          content,
          weight: source.weight ?? 1,
        });
      }
    }

    // Apply deduplication
    const dedupedChunks = this.deduplicate(chunks, dedupe);

    // Sort by weight and combine
    dedupedChunks.sort((a, b) => b.weight - a.weight);

    // Combine and truncate to respect token limit
    const combined = this.combineChunks(dedupedChunks, maxTokens, format);

    // Calculate source contributions and original token count
    const sourceCounts: Record<string, number> = {};
    let originalTokenCount = 0;

    for (const chunk of chunks) {
      originalTokenCount += estimateTokens(chunk.content);
    }

    // Calculate final tokens
    const finalTokenCount = estimateTokens(combined);
    const savedTokens = Math.max(0, originalTokenCount - finalTokenCount);
    const savingsPercentage =
      originalTokenCount > 0 ? Math.round((savedTokens / originalTokenCount) * 100) : 0;

    for (const chunk of dedupedChunks) {
      sourceCounts[chunk.type] = (sourceCounts[chunk.type] || 0) + 1;
    }

    return {
      content: combined,
      tokenCount: finalTokenCount,
      sources: Object.entries(sourceCounts).map(([type, count]) => ({ type, count })),
      originalTokenCount,
      savedTokens,
      savingsPercentage,
    };
  }

  /**
   * Fetch content from a single source.
   */
  private async fetchSource(source: ContextSource): Promise<string | null> {
    switch (source.type) {
      case 'memory':
        return this.fetchMemorySource(source);

      case 'file':
        return this.fetchFileSource(source);

      case 'session':
        return source.data || null;

      case 'url':
        // URL fetching would require network calls - placeholder for now
        return source.url ? `[Context from URL: ${source.url}]` : null;

      default:
        return null;
    }
  }

  /**
   * Fetch memories matching a query.
   */
  private async fetchMemorySource(source: ContextSource): Promise<string | null> {
    if (!source.query) return null;

    const memories = await this.store.search(source.query, { limit: 10 });
    if (memories.length === 0) return null;

    return memories.map((m) => this.formatMemory(m)).join('\n\n');
  }

  /**
   * Fetch content from a file (using fs).
   */
  private async fetchFileSource(source: ContextSource): Promise<string | null> {
    if (!source.path) return null;

    try {
      const fs = await import('node:fs/promises');
      const content = await fs.readFile(source.path, 'utf-8');
      return content;
    } catch {
      // File not found or not readable
      return null;
    }
  }

  /**
   * Format a memory for output.
   */
  private formatMemory(memory: Memory): string {
    const tagStr = memory.tags?.length ? ` [${memory.tags.join(', ')}]` : '';
    return `[${memory.type}]${tagStr} ${memory.content}`;
  }

  /**
   * Deduplicate chunks based on strategy.
   */
  private deduplicate(
    chunks: { type: string; content: string; weight: number }[],
    strategy: 'exact' | 'semantic' | 'none'
  ): { type: string; content: string; weight: number }[] {
    if (strategy === 'none') return chunks;

    if (strategy === 'exact') {
      const seen = new Set<string>();
      return chunks.filter((chunk) => {
        const normalized = chunk.content.trim().toLowerCase();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      });
    }

    // Semantic deduplication - use simple similarity threshold
    // In production, this could use embeddings or more sophisticated methods
    if (strategy === 'semantic') {
      const result: { type: string; content: string; weight: number }[] = [];
      for (const chunk of chunks) {
        const isDupe = result.some(
          (existing) => this.simpleSimilarity(existing.content, chunk.content) > 0.8
        );
        if (!isDupe) {
          result.push(chunk);
        }
      }
      return result;
    }

    return chunks;
  }

  /**
   * Simple text similarity using Jaccard coefficient.
   */
  private simpleSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));

    const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Combine chunks into final output, respecting token limit.
   */
  private combineChunks(
    chunks: { type: string; content: string; weight: number }[],
    maxTokens: number,
    format: 'text' | 'markdown' | 'json'
  ): string {
    const maxChars = maxTokens * CHARS_PER_TOKEN;
    let result = '';

    for (const chunk of chunks) {
      const formatted = this.formatChunk(chunk, format);
      const separator = format === 'json' ? ',' : '\n\n';

      if (estimateTokens(result + separator + formatted) > maxTokens) {
        // Would exceed limit, try to add partial
        const remaining = maxChars - result.length - separator.length;
        if (remaining > 100) {
          result += `${separator}${formatted.slice(0, remaining)}...`;
        }
        break;
      }

      result += (result ? separator : '') + formatted;
    }

    if (format === 'json') {
      return `[${result}]`;
    }

    return result;
  }

  /**
   * Format a chunk based on output format.
   */
  private formatChunk(
    chunk: { type: string; content: string; weight: number },
    format: 'text' | 'markdown' | 'json'
  ): string {
    switch (format) {
      case 'markdown':
        return `### ${chunk.type.toUpperCase()} (weight: ${chunk.weight})\n\n${chunk.content}`;

      case 'json':
        return JSON.stringify({ type: chunk.type, content: chunk.content, weight: chunk.weight });

      default:
        return `[${chunk.type}] ${chunk.content}`;
    }
  }
}
