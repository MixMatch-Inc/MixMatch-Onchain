import { describe, expect, it } from 'vitest';
import { decryptSecretKey, encryptSecretKey } from '../wallet-encryption.js';

describe('encryptSecretKey / decryptSecretKey', () => {
  it('round-trips a secret key', () => {
    const secret = 'SDPRIVATEKEYEXAMPLE1234567890ABCDEFGHIJKLMNOPQRSTUVWX';
    const encrypted = encryptSecretKey(secret);
    expect(decryptSecretKey(encrypted)).toBe(secret);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const secret = 'SDPRIVATEKEYEXAMPLE1234567890ABCDEFGHIJKLMNOPQRSTUVWX';
    expect(encryptSecretKey(secret)).not.toBe(encryptSecretKey(secret));
  });

  it('stores iv:authTag:ciphertext as hex segments', () => {
    const encrypted = encryptSecretKey('some-secret');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    for (const part of parts) {
      expect(part).toMatch(/^[0-9a-f]+$/);
    }
  });

  it('rejects a tampered ciphertext (auth tag mismatch)', () => {
    const encrypted = encryptSecretKey('some-secret');
    const [iv, authTag, ciphertext] = encrypted.split(':');
    const tamperedByte = ciphertext!.slice(0, -2) + (ciphertext!.slice(-2) === '00' ? '01' : '00');
    const tampered = `${iv}:${authTag}:${tamperedByte}`;

    expect(() => decryptSecretKey(tampered)).toThrow();
  });

  it('rejects a malformed encrypted value', () => {
    expect(() => decryptSecretKey('not-the-right-shape')).toThrow(/Malformed/);
  });
});
