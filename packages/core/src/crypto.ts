/**
 * Cryptographic utilities for Cortex memory encryption.
 * Uses AES-GCM-256 for authenticated encryption.
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_DERIVATION_ALGORITHM = 'PBKDF2';
const HASH_ALGORITHM = 'SHA-256';
const KEY_LENGTH = 256;
const ITERATIONS = 100000;

/**
 * Derives a CryptoKey from a password and salt.
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: KEY_DERIVATION_ALGORITHM },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION_ALGORITHM,
      salt: new Uint8Array(salt),
      iterations: ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    passwordKey,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string using AES-GCM.
 * Returns a base64 encoded string containing the salt, IV, and ciphertext.
 * Format: base64(salt) . base64(iv) . base64(ciphertext)
 */
export async function encrypt(text: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    encoder.encode(text)
  );

  const saltBase64 = Buffer.from(salt).toString('base64');
  const ivBase64 = Buffer.from(iv).toString('base64');
  const ciphertextBase64 = Buffer.from(ciphertext).toString('base64');

  return `${saltBase64}.${ivBase64}.${ciphertextBase64}`;
}

/**
 * Decrypts a string previously encrypted with encrypt().
 */
export async function decrypt(encryptedData: string, password: string): Promise<string> {
  const [saltBase64, ivBase64, ciphertextBase64] = encryptedData.split('.');
  if (!saltBase64 || !ivBase64 || !ciphertextBase64) {
    throw new Error('Invalid encrypted data format');
  }

  const salt = Buffer.from(saltBase64, 'base64');
  const iv = Buffer.from(ivBase64, 'base64');
  const ciphertext = Buffer.from(ciphertextBase64, 'base64');

  const key = await deriveKey(password, salt);

  const decryptedContent = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decryptedContent);
}
