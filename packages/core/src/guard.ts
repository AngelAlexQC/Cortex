/**
 * ctx/guard - Context Security and Privacy Protection
 *
 * Filters sensitive data (API keys, secrets, PII) before sending to LLMs.
 * Prevents accidental exposure of credentials and personal information.
 *
 * @module @cortex/core/guard
 */

import type { GuardFilterType, GuardOptions, GuardResult, IContextGuard } from '@cortex/shared';

/**
 * Regex patterns for detecting sensitive data.
 * Each pattern is designed to have low false positives while catching common formats.
 */
const FILTER_PATTERNS: Record<GuardFilterType, RegExp> = {
  // API keys - common formats: sk-*, api_key=*, key-*, token-*
  api_keys:
    /(?:api[_-]?key|secret[_-]?key|access[_-]?key|auth[_-]?token|bearer|sk-|pk-|api-|key-)[a-zA-Z0-9_-]{16,}/gi,

  // Generic secrets and tokens
  secrets:
    /(?:password|passwd|pwd|secret|token|credential)[:\s=]+['"]?[a-zA-Z0-9!@#$%^&*()_+={}[\]:;<>,.?/-]{8,}['"]?/gi,

  // Email addresses
  emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // URLs with embedded credentials (user:pass@host)
  urls_auth: /https?:\/\/[^:\s]+:[^@\s]+@[^\s]+/g,

  // Credit card numbers (basic patterns for major cards)
  credit_cards:
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,

  // Phone numbers (international and US formats)
  phone_numbers: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,

  // IP addresses (IPv4)
  ip_addresses:
    /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,

  // PII - Social Security Numbers, passport-like patterns
  pii: /\b(?:\d{3}[-\s]?\d{2}[-\s]?\d{4}|[A-Z]{1,2}\d{6,9})\b/g,
};

/**
 * Default replacement text for redacted content.
 */
const DEFAULT_REPLACEMENT = '[REDACTED]';

/**
 * ContextGuard - Protects sensitive data in context.
 *
 * @example
 * ```typescript
 * const guard = new ContextGuard();
 *
 * // Redact sensitive data
 * const result = guard.guard(
 *   "My API key is sk-abc123xyz and email is user@example.com",
 *   { filters: ['api_keys', 'emails'], mode: 'redact' }
 * );
 * // result.content = "My API key is [REDACTED] and email is [REDACTED]"
 *
 * // Scan without modifying
 * const findings = guard.scan(content, ['api_keys', 'secrets']);
 * // [{ type: 'api_keys', matches: 2 }]
 * ```
 */
export class ContextGuard implements IContextGuard {
  private replacement: string;

  /**
   * Create a new ContextGuard.
   * @param defaultReplacement - Default replacement text for redacted content
   */
  constructor(defaultReplacement: string = DEFAULT_REPLACEMENT) {
    this.replacement = defaultReplacement;
  }

  /**
   * Filter sensitive data from content.
   */
  guard(content: string, options: GuardOptions): GuardResult {
    const { filters, mode, replacement = this.replacement } = options;

    // Scan for sensitive data first
    const findings = this.scan(content, filters);
    const wasFiltered = findings.some((f) => f.matches > 0);

    // If mode is 'block' and sensitive data found, return empty content
    if (mode === 'block' && wasFiltered) {
      return {
        content: '',
        wasFiltered: true,
        filterDetails: findings
          .filter((f) => f.matches > 0)
          .map((f) => ({ type: f.type, count: f.matches })),
      };
    }

    // If mode is 'warn', return original content with flag
    if (mode === 'warn') {
      return {
        content,
        wasFiltered,
        filterDetails: findings
          .filter((f) => f.matches > 0)
          .map((f) => ({ type: f.type, count: f.matches })),
      };
    }

    // Mode is 'redact' - replace sensitive data
    let result = content;
    const filterDetails: { type: GuardFilterType; count: number }[] = [];

    for (const filterType of filters) {
      const pattern = FILTER_PATTERNS[filterType];
      if (!pattern) continue;

      // Create a new regex instance to avoid lastIndex issues
      const regex = new RegExp(pattern.source, pattern.flags);
      const matches = result.match(regex);

      if (matches && matches.length > 0) {
        result = result.replace(regex, replacement);
        filterDetails.push({ type: filterType, count: matches.length });
      }
    }

    return {
      content: result,
      wasFiltered: filterDetails.length > 0,
      filterDetails: filterDetails.length > 0 ? filterDetails : undefined,
    };
  }

  /**
   * Scan content for sensitive data without modifying it.
   */
  scan(content: string, filters: GuardFilterType[]): { type: GuardFilterType; matches: number }[] {
    const results: { type: GuardFilterType; matches: number }[] = [];

    for (const filterType of filters) {
      const pattern = FILTER_PATTERNS[filterType];
      if (!pattern) {
        results.push({ type: filterType, matches: 0 });
        continue;
      }

      // Create a new regex instance to avoid lastIndex issues
      const regex = new RegExp(pattern.source, pattern.flags);
      const matches = content.match(regex);
      results.push({ type: filterType, matches: matches?.length ?? 0 });
    }

    return results;
  }

  /**
   * Quick check if content contains any sensitive data.
   */
  hasSensitiveData(content: string, filters: GuardFilterType[]): boolean {
    return this.scan(content, filters).some((f) => f.matches > 0);
  }

  /**
   * Guard multiple pieces of content at once.
   */
  guardBatch(contents: string[], options: GuardOptions): GuardResult[] {
    return contents.map((content) => this.guard(content, options));
  }

  /**
   * Get the list of available filter types.
   */
  static getAvailableFilters(): GuardFilterType[] {
    return Object.keys(FILTER_PATTERNS) as GuardFilterType[];
  }
}
