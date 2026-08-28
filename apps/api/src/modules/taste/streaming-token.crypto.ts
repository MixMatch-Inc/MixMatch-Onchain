/**
 * #904: Utilities for encrypting and decrypting OAuth streaming tokens
 * (access_token / refresh_token in the `streaming_connections` table)
 * using the same AES-256-GCM scheme as Stellar secret keys.
 *
 * Tokens MUST be encrypted before being persisted and decrypted after
 * being read. Storing them as plaintext is inconsistent with how Stellar
 * secret keys are handled and leaks provider credentials if the DB is
 * compromised.
 *
 * Usage:
 *   const encrypted = encryptToken(rawAccessToken, config.walletEncryptionKey);
 *   // store `encrypted` in streaming_connections.access_token
 *
 *   const raw = decryptToken(encrypted, config.walletEncryptionKey);
 *   // use `raw` to call the provider API
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/**
 * Encrypts `plaintext` with AES-256-GCM using `hexKey` (a 64-char hex
 * string representing 32 bytes). Returns a base64-encoded string of
 * `iv (12 bytes) || ciphertext || authTag (16 bytes)`.
 */
export function encryptToken(plaintext: string, hexKey: string): string {
  const key = Buffer.from(hexKey, 'hex');
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString('base64');
}

/**
 * Decrypts a value previously produced by `encryptToken`.
 */
export function decryptToken(encoded: string, hexKey: string): string {
  const key = Buffer.from(hexKey, 'hex');
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(buf.length - TAG_BYTES);
  const ciphertext = buf.subarray(IV_BYTES, buf.length - TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}
