import { describe, expect, it } from 'vitest';
import { establishTrustlineSchema, pathQuoteSchema, sendPaymentSchema } from '../validation/payments.schema.js';

const VALID_ADDRESS = 'G'.padEnd(56, 'A');
const VALID_ISSUER = 'G'.padEnd(56, 'B');

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

  it('accepts a non-native payment with matching assetCode and assetIssuer', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_ADDRESS,
      amount: '10',
      assetCode: 'MMX',
      assetIssuer: VALID_ISSUER,
    });
    expect(result.success).toBe(true);
  });

  it('rejects assetCode without assetIssuer', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_ADDRESS,
      amount: '10',
      assetCode: 'MMX',
    });
    expect(result.success).toBe(false);
  });

  it('rejects assetIssuer without assetCode', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_ADDRESS,
      amount: '10',
      assetIssuer: VALID_ISSUER,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an asset code with invalid characters', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_ADDRESS,
      amount: '10',
      assetCode: 'not valid!',
      assetIssuer: VALID_ISSUER,
    });
    expect(result.success).toBe(false);
  });

  it('accepts a path payment with a receive asset, pathMode, and slippageBps', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_ADDRESS,
      amount: '10',
      receiveAssetCode: 'MMX',
      receiveAssetIssuer: VALID_ISSUER,
      pathMode: 'strictReceive',
      slippageBps: 100,
    });
    expect(result.success).toBe(true);
  });

  it('rejects receiveAssetCode without receiveAssetIssuer', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_ADDRESS,
      amount: '10',
      receiveAssetCode: 'MMX',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a slippageBps above 1000', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_ADDRESS,
      amount: '10',
      receiveAssetCode: 'MMX',
      receiveAssetIssuer: VALID_ISSUER,
      slippageBps: 1001,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a negative slippageBps', () => {
    const result = sendPaymentSchema.safeParse({
      destinationPublicKey: VALID_ADDRESS,
      amount: '10',
      receiveAssetCode: 'MMX',
      receiveAssetIssuer: VALID_ISSUER,
      slippageBps: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe('pathQuoteSchema', () => {
  it('accepts a valid strict-send quote request (native source, custom dest)', () => {
    const result = pathQuoteSchema.safeParse({
      source: {},
      dest: { assetCode: 'MMX', assetIssuer: VALID_ISSUER },
      amount: '10',
      mode: 'strictSend',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid strict-receive quote request', () => {
    const result = pathQuoteSchema.safeParse({
      source: { assetCode: 'MMX', assetIssuer: VALID_ISSUER },
      dest: {},
      amount: '10',
      mode: 'strictReceive',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a source asset with a code but no issuer', () => {
    const result = pathQuoteSchema.safeParse({
      source: { assetCode: 'MMX' },
      dest: {},
      amount: '10',
      mode: 'strictSend',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid mode', () => {
    const result = pathQuoteSchema.safeParse({
      source: {},
      dest: {},
      amount: '10',
      mode: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

describe('establishTrustlineSchema', () => {
  it('accepts a valid trustline request', () => {
    const result = establishTrustlineSchema.safeParse({ assetCode: 'MMX', assetIssuer: VALID_ISSUER });
    expect(result.success).toBe(true);
  });

  it('accepts an optional limit', () => {
    const result = establishTrustlineSchema.safeParse({
      assetCode: 'MMX',
      assetIssuer: VALID_ISSUER,
      limit: '1000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing assetIssuer', () => {
    const result = establishTrustlineSchema.safeParse({ assetCode: 'MMX' });
    expect(result.success).toBe(false);
  });

  it('rejects an asset code longer than 12 characters', () => {
    const result = establishTrustlineSchema.safeParse({
      assetCode: 'WAYTOOLONGCODE',
      assetIssuer: VALID_ISSUER,
    });
    expect(result.success).toBe(false);
  });
});
