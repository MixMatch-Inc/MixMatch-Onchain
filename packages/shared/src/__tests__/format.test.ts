import { describe, expect, it } from 'vitest';
import { addressHue, formatAmount, truncateAddress } from '../format.js';

describe('formatAmount', () => {
  it('pads to 7 decimals', () => expect(formatAmount('10')).toBe('10.0000000'));
  it('keeps precision without float rounding', () => expect(formatAmount('0.1234567')).toBe('0.1234567'));
  it('groups thousands', () => expect(formatAmount('1234567.5')).toBe('1,234,567.5000000'));
  it('supports other decimal counts', () => expect(formatAmount('5', 2)).toBe('5.00'));
  it('leaves non-numeric input alone', () => expect(formatAmount('abc')).toBe('abc'));
});

describe('truncateAddress', () => {
  it('shortens long keys', () => expect(truncateAddress('G'.padEnd(52, 'A') + 'ABCD')).toBe('G…ABCD'));
  it('leaves short values', () => expect(truncateAddress('GABCD')).toBe('GABCD'));
});

describe('addressHue', () => {
  it('is stable and within range', () => {
    expect(addressHue('GABC')).toBe(addressHue('GABC'));
    expect(addressHue('GABC')).toBeLessThan(360);
  });
});
