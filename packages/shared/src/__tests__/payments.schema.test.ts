import { describe, expect, it } from 'vitest';
import { sendPaymentSchema } from '../validation/payments.schema.js';

const VALID_PUBLIC_KEY = 'GBQEMWFEPUDYZ3NQOIFIW3WDGUJVOA2ABYZ66DSDDHMKYLIKFZ6OSILE';

describe('sendPaymentSchema', () => {
  it('accepts a valid payment payload', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_PUBLIC_KEY,
      amount: '10.5',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an optional memo and idempotencyKey', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_PUBLIC_KEY,
      amount: '10',
      memo: 'invoice-42',
      idempotencyKey: 'order-123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed destination public key', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: 'not-a-real-key',
      amount: '10',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a public key with the wrong prefix', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: `A${VALID_PUBLIC_KEY.slice(1)}`,
      amount: '10',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a zero amount', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_PUBLIC_KEY,
      amount: '0',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a negative amount', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_PUBLIC_KEY,
      amount: '-5',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an amount with more than 7 decimal places', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_PUBLIC_KEY,
      amount: '1.12345678',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-numeric amount', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_PUBLIC_KEY,
      amount: 'abc',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a memo longer than 28 characters', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_PUBLIC_KEY,
      amount: '10',
      memo: 'a'.repeat(29),
    });
    expect(result.success).toBe(false);
  });

  it('rejects unexpected extra fields', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_PUBLIC_KEY,
      amount: '10',
      unexpectedField: 'nope',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing destinationPublicKey', () => {
    const result = sendPaymentSchema.safeParse({ amount: '10' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing amount', () => {
    const result = sendPaymentSchema.safeParse({ destinationPublicKey: VALID_PUBLIC_KEY });
    expect(result.success).toBe(false);
  });
});
