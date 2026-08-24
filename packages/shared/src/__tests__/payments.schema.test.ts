import { describe, expect, it } from 'vitest';
import { sendPaymentSchema } from '../validation/payments.schema.js';

const VALID_ADDRESS = 'G'.padEnd(56, 'A');

describe('sendPaymentSchema', () => {
  it('accepts a valid payment request', () => {
    const result = sendPaymentSchema.safeParse({ destinationPublicKey: VALID_ADDRESS, amount: '10.5' });
    expect(result.success).toBe(true);
  });

  it('rejects an address that is not 56 characters', () => {
    const result = sendPaymentSchema.safeParse({ destinationPublicKey: 'GTOO_SHORT', amount: '10' });
    expect(result.success).toBe(false);
  });

  it('rejects an address not starting with G', () => {
    const result = sendPaymentSchema.safeParse({ destinationPublicKey: 'A'.repeat(56), amount: '10' });
    expect(result.success).toBe(false);
  });

  it('rejects a zero amount', () => {
    const result = sendPaymentSchema.safeParse({ destinationPublicKey: VALID_ADDRESS, amount: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects a negative amount', () => {
    const result = sendPaymentSchema.safeParse({ destinationPublicKey: VALID_ADDRESS, amount: '-5' });
    expect(result.success).toBe(false);
  });

  it('rejects more than 7 decimal places', () => {
    const result = sendPaymentSchema.safeParse({ destinationPublicKey: VALID_ADDRESS, amount: '1.12345678' });
    expect(result.success).toBe(false);
  });

  it('accepts an optional memo and idempotencyKey', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_ADDRESS,
      amount: '1',
      memo: 'order-123',
      idempotencyKey: 'client-key-1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a memo longer than 28 characters', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_ADDRESS,
      amount: '1',
      memo: 'x'.repeat(29),
    });
    expect(result.success).toBe(false);
  });
});
