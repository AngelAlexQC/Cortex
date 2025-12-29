import { describe, expect, test } from 'bun:test';
import { decrypt, encrypt } from './crypto';

describe('Crypto', () => {
  const password = 'my-secret-password';
  const content = 'This is a secret message from Cortex';

  test('should encrypt and decrypt correctly', async () => {
    const encrypted = await encrypt(content, password);
    expect(encrypted).toContain('.');

    const decrypted = await decrypt(encrypted, password);
    expect(decrypted).toBe(content);
  });

  test('should fail to decrypt with wrong password', async () => {
    const encrypted = await encrypt(content, password);

    await expect(decrypt(encrypted, 'wrong-password')).rejects.toThrow();
  });

  test('should fail with invalid format', async () => {
    await expect(decrypt('invalid.format', password)).rejects.toThrow();
  });
});
