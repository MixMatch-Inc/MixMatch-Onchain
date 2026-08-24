import { decryptSecretKey, encryptSecretKey } from './wallet-encryption';

const KEY = 'ff'.repeat(32); // 64 hex chars = 32 bytes

describe('wallet-encryption', () => {
  it('round-trips a secret key through encrypt/decrypt', () => {
    const secret = 'SEXAMPLESECRETKEYTHATLOOKSLIKESTELLAR';
    const encrypted = encryptSecretKey(secret, KEY);
    expect(decryptSecretKey(encrypted, KEY)).toBe(secret);
  });

  it('produces a different ciphertext on each call (random IV)', () => {
    const secret = 'SEXAMPLESECRETKEYTHATLOOKSLIKESTELLAR';
    const a = encryptSecretKey(secret, KEY);
    const b = encryptSecretKey(secret, KEY);
    expect(a).not.toBe(b);
  });

  it('throws when decrypting with the wrong key', () => {
    const secret = 'SEXAMPLESECRETKEYTHATLOOKSLIKESTELLAR';
    const encrypted = encryptSecretKey(secret, KEY);
    const wrongKey = '00'.repeat(32);
    expect(() => decryptSecretKey(encrypted, wrongKey)).toThrow();
  });

  it('throws on malformed ciphertext', () => {
    expect(() => decryptSecretKey('not-the-right-format', KEY)).toThrow(
      'Malformed encrypted secret key',
    );
  });

  it('throws if the ciphertext has been tampered with', () => {
    const secret = 'SEXAMPLESECRETKEYTHATLOOKSLIKESTELLAR';
    const encrypted = encryptSecretKey(secret, KEY);
    const parts = encrypted.split(':');
    const tampered = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}ff`;
    expect(() => decryptSecretKey(tampered, KEY)).toThrow();
  });
});
