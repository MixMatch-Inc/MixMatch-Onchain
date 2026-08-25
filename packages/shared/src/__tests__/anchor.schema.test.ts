import { describe, expect, it } from 'vitest';
import { depositAnchorSchema, withdrawAnchorSchema } from '../validation/anchor.schema.js';

describe('depositAnchorSchema', () => {
  it('accepts a valid deposit request with an amount', () => {
    const result = depositAnchorSchema.safeParse({ assetCode: 'SRT', amount: '10' });
    expect(result.success).toBe(true);
  });

  it('accepts a request with the amount omitted', () => {
    const result = depositAnchorSchema.safeParse({ assetCode: 'SRT' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing asset code', () => {
    const result = depositAnchorSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects an invalid asset code', () => {
    const result = depositAnchorSchema.safeParse({ assetCode: 'not valid!' });
    expect(result.success).toBe(false);
  });

  it('rejects a zero amount', () => {
    const result = depositAnchorSchema.safeParse({ assetCode: 'SRT', amount: '0' });
    expect(result.success).toBe(false);
  });
});

describe('withdrawAnchorSchema', () => {
  it('accepts a valid withdraw request', () => {
    const result = withdrawAnchorSchema.safeParse({ assetCode: 'SRT', amount: '5' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing asset code', () => {
    const result = withdrawAnchorSchema.safeParse({ amount: '5' });
    expect(result.success).toBe(false);
  });
});
