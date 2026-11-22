import { describe, expect, it } from 'vitest';
import { buildPaymentUri, parsePaymentUri } from '../payment-uri.js';

const KEY = 'G' + 'A'.repeat(55);
const ISSUER = 'G' + 'B'.repeat(55);

describe('payment URI', () => {
  it('round-trips a full request', () => {
    const uri = buildPaymentUri({ destination: KEY, amount: '12.5', assetCode: 'USDC', assetIssuer: ISSUER, memo: 'lunch & more' });
    expect(uri.startsWith('mixmatch://pay?v=1&')).toBe(true);
    expect(parsePaymentUri(uri)).toEqual({ destination: KEY, amount: '12.5', assetCode: 'USDC', assetIssuer: ISSUER, memo: 'lunch & more' });
  });

  it('accepts a bare public key (legacy QR)', () => {
    expect(parsePaymentUri(KEY)).toEqual({ destination: KEY });
  });

  it('accepts SEP-7 pay links', () => {
    expect(parsePaymentUri(`web+stellar:pay?destination=${KEY}&amount=3&memo=hi`)).toEqual({ destination: KEY, amount: '3', memo: 'hi' });
  });

  it('refuses unknown versions, bad keys and other schemes', () => {
    expect(parsePaymentUri(`mixmatch://pay?v=2&to=${KEY}`)).toBeNull();
    expect(parsePaymentUri('mixmatch://pay?v=1&to=GBAD')).toBeNull();
    expect(parsePaymentUri(`https://evil.example/pay?to=${KEY}`)).toBeNull();
    expect(parsePaymentUri('hello')).toBeNull();
  });

  it('drops an invalid amount instead of failing the whole link', () => {
    expect(parsePaymentUri(`mixmatch://pay?v=1&to=${KEY}&amount=-5`)).toEqual({ destination: KEY });
  });

  it('truncates long memos to the 28 character limit', () => {
    expect(parsePaymentUri(buildPaymentUri({ destination: KEY, memo: 'x'.repeat(40) }))?.memo).toHaveLength(28);
  });
});
