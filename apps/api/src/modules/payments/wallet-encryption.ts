import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;

/**
 * Encrypts a Stellar secret key for storage in `stellar_accounts.encrypted_secret_key`.
 * Uses AES-256-GCM with the key from `WALLET_ENCRYPTION_KEY`. Output format:
 * `<iv-hex>:<authTag-hex>:<ciphertext-hex>`.
 */
export function encryptSecretKey(
  secretKey: string,
  encryptionKeyHex: string,
): string {
  const key = Buffer.from(encryptionKeyHex, 'hex');
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(secretKey, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/** Reverses `encryptSecretKey`. Throws if the ciphertext is malformed or the auth tag doesn't verify. */
export function decryptSecretKey(
  encrypted: string,
  encryptionKeyHex: string,
): string {
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted secret key');
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;

  const key = Buffer.from(encryptionKeyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
