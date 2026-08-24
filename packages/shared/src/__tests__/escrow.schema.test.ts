import { describe, expect, it } from 'vitest';
import { depositEscrowSchema } from '../validation/escrow.schema.js';

const VALID_PAYEE = 'G'.padEnd(56, 'A');
const VALID_TOKEN = 'C'.padEnd(56, 'A');

describe('depositEscrowSchema', () => {
  it('accepts a valid deposit request', () => {
    const result = depositEscrowSchema.safeParse({
      payeePublicKey: VALID_PAYEE,
      tokenContractId: VALID_TOKEN,
      amount: '5000000',
      timeoutLedgers: 100,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a payee address that is not 56 characters', () => {
    const result = depositEscrowSchema.safeParse({
      payeePublicKey: 'not-an-address',
      tokenContractId: VALID_TOKEN,
      amount: '5000000',
      timeoutLedgers: 100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a token contract id that does not start with C', () => {
    const result = depositEscrowSchema.safeParse({
      payeePublicKey: VALID_PAYEE,
      tokenContractId: VALID_PAYEE,
      amount: '5000000',
      timeoutLedgers: 100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer amount', () => {
    const result = depositEscrowSchema.safeParse({
      payeePublicKey: VALID_PAYEE,
      tokenContractId: VALID_TOKEN,
      amount: '5.5',
      timeoutLedgers: 100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a zero amount', () => {
    const result = depositEscrowSchema.safeParse({
      payeePublicKey: VALID_PAYEE,
      tokenContractId: VALID_TOKEN,
      amount: '0',
      timeoutLedgers: 100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-positive timeoutLedgers', () => {
    const result = depositEscrowSchema.safeParse({
      payeePublicKey: VALID_PAYEE,
      tokenContractId: VALID_TOKEN,
      amount: '5000000',
      timeoutLedgers: 0,
    });
    expect(result.success).toBe(false);
  });

  it('accepts an amount larger than Number.MAX_SAFE_INTEGER', () => {
    const result = depositEscrowSchema.safeParse({
      payeePublicKey: VALID_PAYEE,
      tokenContractId: VALID_TOKEN,
      amount: '99999999999999999999',
      timeoutLedgers: 100,
    });
    expect(result.success).toBe(true);
  });
});
