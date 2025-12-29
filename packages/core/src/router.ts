/**
 * ctx/route - Intelligent Context Routing
 *
 * The magic primitive that decides WHAT context to inject for a given task.
 * Uses FTS5 search + relevance scoring to select the most useful memories.
 *
 * @module @cortex/core/router
 */

import type {
  IContextRouter,
  IMemoryStore,
  Memory,
  MemoryType,
  RouteOptions,
  ScoredMemory,
} from '@cortex/shared';

/**
 * Weights for different scoring factors.
 */
interface ScoringWeights {
  /** Weight for recency (newer = higher score) */
  recency: number;
  /** Weight for tag matches */
  tagMatch: number;
  /** Weight for memory type priority */
  typePriority: number;
  /** Weight for keyword density in content */
  keywordDensity: number;
}

/**
 * Default scoring weights - can be tuned based on usage patterns.
 */
const DEFAULT_WEIGHTS: ScoringWeights = {
  recency: 0.3,
  tagMatch: 0.25,
  typePriority: 0.2,
  keywordDensity: 0.25,
};

/**
 * Priority scores for memory types (higher = more important for decisions).
 */
const TYPE_PRIORITY: Record<MemoryType, number> = {
  decision: 1.0,
  fact: 0.8,
  code: 0.7,
  config: 0.6,
  note: 0.5,
};

/**
 * ContextRouter - Intelligent context selection for AI agents.
 *
 * @example
 * ```typescript
 * const router = new ContextRouter(memoryStore);
 *
 * // Get relevant context for current task
 * const context = await router.route({
 *   task: "implementing user authentication",
 *   currentFile: "src/auth/login.ts",
 *   limit: 5
 * });
 * ```
 */
export class ContextRouter implements IContextRouter {
  private store: IMemoryStore;
  private weights: ScoringWeights;

  /**
   * Create a new ContextRouter.
   * @param store - Memory store to search
   * @param weights - Optional custom scoring weights
   */
  constructor(store: IMemoryStore, weights?: Partial<ScoringWeights>) {
    this.store = store;
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Route and select relevant context for a task.
   * Returns memories sorted by relevance score.
   */
  async route(options: RouteOptions): Promise<Memory[]> {
    const scored = await this.routeWithScores(options);
    return scored.map((s) => s.memory);
  }

  /**
   * Route with scoring information for debugging/transparency.
   */
  async routeWithScores(options: RouteOptions): Promise<ScoredMemory[]> {
    const { task, currentFile, tags, type, limit = 5 } = options;

    // Step 1: Extract keywords from task
    const keywords = this.extractKeywords(task);

    // Step 2: Build search query
    const searchQuery = keywords.join(' ');

    // Step 3: Get candidate memories via FTS5 search
    let candidates = await this.store.search(searchQuery, {
      type: type,
      limit: limit * 3, // Get more candidates for scoring
    });

    // If no results from search, try listing recent memories
    if (candidates.length === 0) {
      candidates = await this.store.list({
        type: type,
        limit: limit * 3,
      });
    }

    // Step 4: Score each candidate
    const scored = candidates.map((memory) => ({
      memory,
      score: this.scoreMemory(memory, keywords, tags, currentFile),
      reason: this.explainScore(memory, keywords, tags),
    }));

    // Step 5: Sort by score and return top-K
    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Extract meaningful keywords from a task description.
   */
  private extractKeywords(task: string): string[] {
    // Common stop words to filter out
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'shall',
      'can',
      'need',
      'dare',
      'to',
      'of',
      'in',
      'for',
      'on',
      'with',
      'at',
      'by',
      'from',
      'as',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'between',
      'under',
      'again',
      'further',
      'then',
      'once',
      'here',
      'there',
      'when',
      'where',
      'why',
      'how',
      'all',
      'each',
      'few',
      'more',
      'most',
      'other',
      'some',
      'such',
      'no',
      'nor',
      'not',
      'only',
      'own',
      'same',
      'so',
      'than',
      'too',
      'very',
      'just',
      'and',
      'but',
      'if',
      'or',
      'because',
      'until',
      'while',
      'although',
      'though',
      'after',
      'before',
      'i',
      'me',
      'my',
      'myself',
      'we',
      'our',
      'you',
      'your',
      'he',
      'she',
      'it',
      'its',
      'they',
      'them',
      'what',
      'which',
      'who',
      'whom',
      'this',
      'that',
      'these',
      'those',
      'am',
      'about',
      'against',
      'any',
      'both',
      'implement',
      'implementing',
      'create',
      'creating',
      'add',
      'adding',
      'work',
      'working',
      'make',
      'making',
      'get',
      'getting',
      'set',
      'setting',
    ]);

    // Tokenize and filter
    const tokens = task
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));

    // Remove duplicates while preserving order
    return [...new Set(tokens)];
  }

  /**
   * Calculate relevance score for a memory.
   */
  private scoreMemory(
    memory: Memory,
    keywords: string[],
    filterTags?: string[],
    currentFile?: string
  ): number {
    let score = 0;

    // 1. Recency score (0-1, newer = higher)
    const recencyScore = this.calculateRecencyScore(memory);
    score += recencyScore * this.weights.recency;

    // 2. Tag match score (0-1)
    const tagScore = this.calculateTagScore(memory, filterTags);
    score += tagScore * this.weights.tagMatch;

    // 3. Type priority score (0-1)
    const typeScore = TYPE_PRIORITY[memory.type] || 0.5;
    score += typeScore * this.weights.typePriority;

    // 4. Keyword density score (0-1)
    const keywordScore = this.calculateKeywordScore(memory, keywords);
    score += keywordScore * this.weights.keywordDensity;

    // 5. Bonus for file path relevance
    if (currentFile && memory.source) {
      const fileBonus = this.calculateFileBonus(memory, currentFile);
      score += fileBonus * 0.1;
    }

    return Math.min(1, score); // Cap at 1.0
  }

  /**
   * Calculate recency score - newer memories score higher.
   */
  private calculateRecencyScore(memory: Memory): number {
    if (!memory.createdAt) return 0.5;

    const now = Date.now();
    const created = new Date(memory.createdAt).getTime();
    const ageInDays = (now - created) / (1000 * 60 * 60 * 24);

    // Decay over 30 days, minimum 0.1
    return Math.max(0.1, 1 - ageInDays / 30);
  }

  /**
   * Calculate tag match score.
   */
  private calculateTagScore(memory: Memory, filterTags?: string[]): number {
    if (!filterTags || filterTags.length === 0 || !memory.tags) {
      return 0.5; // Neutral if no tags to match
    }

    const memoryTags = memory.tags.map((t) => t.toLowerCase());
    const searchTags = filterTags.map((t) => t.toLowerCase());
    const matches = searchTags.filter((t) => memoryTags.includes(t));

    return matches.length / searchTags.length;
  }

  /**
   * Calculate keyword density score.
   */
  private calculateKeywordScore(memory: Memory, keywords: string[]): number {
    if (keywords.length === 0) return 0.5;

    const content = memory.content.toLowerCase();
    let matchCount = 0;

    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        matchCount++;
      }
    }

    return matchCount / keywords.length;
  }

  /**
   * Calculate bonus for file path relevance.
   */
  private calculateFileBonus(memory: Memory, currentFile: string): number {
    if (!memory.source) return 0;

    const source = memory.source.toLowerCase();
    const file = currentFile.toLowerCase();

    // Extract path components
    const sourceParts = source.split('/').filter(Boolean);
    const fileParts = file.split('/').filter(Boolean);

    // Count matching path components
    let matches = 0;
    for (const part of sourceParts) {
      if (fileParts.includes(part)) {
        matches++;
      }
    }

    return matches > 0 ? Math.min(1, matches / 3) : 0;
  }

  /**
   * Generate human-readable explanation for score.
   */
  private explainScore(memory: Memory, keywords: string[], filterTags?: string[]): string {
    const reasons: string[] = [];

    // Type
    reasons.push(`type:${memory.type}`);

    // Keywords matched
    const content = memory.content.toLowerCase();
    const matched = keywords.filter((k) => content.includes(k));
    if (matched.length > 0) {
      reasons.push(`keywords:[${matched.slice(0, 3).join(',')}]`);
    }

    // Tags matched
    if (filterTags && memory.tags) {
      const memTags = memory.tags;
      const tagMatches = filterTags.filter((t) =>
        memTags.map((mt) => mt.toLowerCase()).includes(t.toLowerCase())
      );
      if (tagMatches.length > 0) {
        reasons.push(`tags:[${tagMatches.join(',')}]`);
      }
    }

    // Recency
    if (memory.createdAt) {
      const ageInDays = Math.floor(
        (Date.now() - new Date(memory.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (ageInDays === 0) {
        reasons.push('recent:today');
      } else if (ageInDays < 7) {
        reasons.push(`recent:${ageInDays}d`);
      }
    }

    return reasons.join(' ');
  }
}
