import { beforeEach, describe, expect, it } from 'bun:test';
import { ContextGuard } from '../guard';

describe('ContextGuard', () => {
  let guard: ContextGuard;

  beforeEach(() => {
    guard = new ContextGuard();
  });

  describe('guard with redact mode', () => {
    it('should redact API keys', () => {
      const content =
        'My API key is sk-abc123xyz789def456ghi and also api_key=test1234567890123456';
      const result = guard.guard(content, {
        filters: ['api_keys'],
        mode: 'redact',
      });

      expect(result.wasFiltered).toBe(true);
      expect(result.content).not.toContain('sk-abc123xyz789def456ghi');
      expect(result.content).toContain('[REDACTED]');
    });

    it('should redact email addresses', () => {
      const content = 'Contact me at user@example.com or admin@company.org';
      const result = guard.guard(content, {
        filters: ['emails'],
        mode: 'redact',
      });

      expect(result.wasFiltered).toBe(true);
      expect(result.content).not.toContain('user@example.com');
      expect(result.content).not.toContain('admin@company.org');
      expect(result.content).toContain('[REDACTED]');
    });

    it('should redact URLs with credentials', () => {
      const content = 'Database URL: https://user:password123@db.example.com/mydb';
      const result = guard.guard(content, {
        filters: ['urls_auth'],
        mode: 'redact',
      });

      expect(result.wasFiltered).toBe(true);
      expect(result.content).not.toContain('password123');
      expect(result.content).toContain('[REDACTED]');
    });

    it('should redact credit card numbers', () => {
      const content = 'Card number: 4111111111111111 and 5500000000000004';
      const result = guard.guard(content, {
        filters: ['credit_cards'],
        mode: 'redact',
      });

      expect(result.wasFiltered).toBe(true);
      expect(result.content).not.toContain('4111111111111111');
      expect(result.content).not.toContain('5500000000000004');
    });

    it('should redact phone numbers', () => {
      const content = 'Call me at (555) 123-4567 or +1 555.987.6543';
      const result = guard.guard(content, {
        filters: ['phone_numbers'],
        mode: 'redact',
      });

      expect(result.wasFiltered).toBe(true);
      expect(result.content).not.toContain('555-123-4567');
    });

    it('should redact IP addresses', () => {
      const content = 'Server IP: 192.168.1.100 and 10.0.0.1';
      const result = guard.guard(content, {
        filters: ['ip_addresses'],
        mode: 'redact',
      });

      expect(result.wasFiltered).toBe(true);
      expect(result.content).not.toContain('192.168.1.100');
      expect(result.content).not.toContain('10.0.0.1');
    });

    it('should redact secrets and passwords', () => {
      const content = 'password: MySecretPass123! and secret=anotherSecret99';
      const result = guard.guard(content, {
        filters: ['secrets'],
        mode: 'redact',
      });

      expect(result.wasFiltered).toBe(true);
      expect(result.content).not.toContain('MySecretPass123!');
    });

    it('should redact PII (SSN patterns)', () => {
      const content = 'SSN: 123-45-6789 and ID: AB123456789';
      const result = guard.guard(content, {
        filters: ['pii'],
        mode: 'redact',
      });

      expect(result.wasFiltered).toBe(true);
      expect(result.content).not.toContain('123-45-6789');
    });

    it('should apply multiple filters at once', () => {
      const content = 'Email: test@example.com, API: sk-test12345678901234, IP: 192.168.1.1';
      const result = guard.guard(content, {
        filters: ['emails', 'api_keys', 'ip_addresses'],
        mode: 'redact',
      });

      expect(result.wasFiltered).toBe(true);
      expect(result.content).not.toContain('test@example.com');
      expect(result.content).not.toContain('sk-test12345678901234');
      expect(result.content).not.toContain('192.168.1.1');
      expect(result.filterDetails?.length).toBe(3);
    });

    it('should use custom replacement text', () => {
      const content = 'Email: user@example.com';
      const result = guard.guard(content, {
        filters: ['emails'],
        mode: 'redact',
        replacement: '[EMAIL_REMOVED]',
      });

      expect(result.content).toContain('[EMAIL_REMOVED]');
      expect(result.content).not.toContain('[REDACTED]');
    });

    it('should return original content when no sensitive data found', () => {
      const content = 'This is just normal text without any sensitive data.';
      const result = guard.guard(content, {
        filters: ['api_keys', 'emails'],
        mode: 'redact',
      });

      expect(result.wasFiltered).toBe(false);
      expect(result.content).toBe(content);
      expect(result.filterDetails).toBeUndefined();
    });
  });

  describe('guard with block mode', () => {
    it('should return empty content when sensitive data found', () => {
      const content = 'API key: sk-secret12345678901234';
      const result = guard.guard(content, {
        filters: ['api_keys'],
        mode: 'block',
      });

      expect(result.wasFiltered).toBe(true);
      expect(result.content).toBe('');
    });

    it('should return original content when no sensitive data found', () => {
      const content = 'Safe content here';
      const result = guard.guard(content, {
        filters: ['api_keys'],
        mode: 'block',
      });

      expect(result.wasFiltered).toBe(false);
      expect(result.content).toBe(content);
    });
  });

  describe('guard with warn mode', () => {
    it('should return original content but flag sensitive data', () => {
      const content = 'Email: user@example.com';
      const result = guard.guard(content, {
        filters: ['emails'],
        mode: 'warn',
      });

      expect(result.wasFiltered).toBe(true);
      expect(result.content).toBe(content); // Original preserved
      expect(result.filterDetails?.length).toBe(1);
    });
  });

  describe('scan', () => {
    it('should detect sensitive data without modifying content', () => {
      const content = 'Email: a@b.com and b@c.com, API: sk-test1234567890123456';
      const findings = guard.scan(content, ['emails', 'api_keys']);

      expect(findings.length).toBe(2);
      expect(findings.find((f) => f.type === 'emails')?.matches).toBe(2);
      expect(findings.find((f) => f.type === 'api_keys')?.matches).toBe(1);
    });

    it('should return zero matches for clean content', () => {
      const content = 'No sensitive data here';
      const findings = guard.scan(content, ['emails', 'api_keys']);

      expect(findings.every((f) => f.matches === 0)).toBe(true);
    });
  });

  describe('hasSensitiveData', () => {
    it('should return true when sensitive data exists', () => {
      const content = 'My email is test@example.com';
      expect(guard.hasSensitiveData(content, ['emails'])).toBe(true);
    });

    it('should return false when no sensitive data exists', () => {
      const content = 'Just regular text';
      expect(guard.hasSensitiveData(content, ['emails'])).toBe(false);
    });
  });

  describe('guardBatch', () => {
    it('should guard multiple contents at once', () => {
      const contents = ['Email: a@b.com', 'Clean content', 'API: sk-test1234567890123456'];
      const results = guard.guardBatch(contents, {
        filters: ['emails', 'api_keys'],
        mode: 'redact',
      });

      expect(results.length).toBe(3);
      expect(results[0].wasFiltered).toBe(true);
      expect(results[1].wasFiltered).toBe(false);
      expect(results[2].wasFiltered).toBe(true);
    });
  });

  describe('getAvailableFilters', () => {
    it('should return all available filter types', () => {
      const filters = ContextGuard.getAvailableFilters();

      expect(filters).toContain('api_keys');
      expect(filters).toContain('emails');
      expect(filters).toContain('secrets');
      expect(filters).toContain('urls_auth');
      expect(filters).toContain('credit_cards');
      expect(filters).toContain('phone_numbers');
      expect(filters).toContain('ip_addresses');
      expect(filters).toContain('pii');
    });
  });

  describe('custom default replacement', () => {
    it('should use custom default replacement', () => {
      const customGuard = new ContextGuard('***HIDDEN***');
      const result = customGuard.guard('Email: test@example.com', {
        filters: ['emails'],
        mode: 'redact',
      });

      expect(result.content).toContain('***HIDDEN***');
    });
  });
});
