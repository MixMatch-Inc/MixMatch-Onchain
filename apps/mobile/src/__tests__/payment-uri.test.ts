import { buildPaymentUri, parsePaymentUri } from '../utils/payment-uri';

const VALID_PUBLIC_KEY = 'GBQEMWFEPUDYZ3NQOIFIW3WDGUJVOA2ABYZ66DSDDHMKYLIKFZ6OSILE';

describe('parsePaymentUri', () => {
  it('parses a mixmatch:// deep link', () => {
    const result = parsePaymentUri(`mixmatch://payments/send?destination=${VALID_PUBLIC_KEY}&amount=10&memo=invoice-1`);
    expect(result).toEqual({ destinationPublicKey: VALID_PUBLIC_KEY, amount: '10', memo: 'invoice-1' });
  });

  it('parses a SEP-0007 web+stellar:pay URI', () => {
    const result = parsePaymentUri(`web+stellar:pay?destination=${VALID_PUBLIC_KEY}&amount=5`);
    expect(result).toEqual({ destinationPublicKey: VALID_PUBLIC_KEY, amount: '5' });
  });

  it('parses a mixmatch link with no optional params', () => {
    const result = parsePaymentUri(`mixmatch://payments/send?destination=${VALID_PUBLIC_KEY}`);
    expect(result).toEqual({ destinationPublicKey: VALID_PUBLIC_KEY });
  });

  it('returns null for an unrelated scheme', () => {
    expect(parsePaymentUri(`https://example.com?destination=${VALID_PUBLIC_KEY}`)).toBeNull();
  });

  it('returns null for a malformed destination key', () => {
    expect(parsePaymentUri('mixmatch://payments/send?destination=not-a-real-key')).toBeNull();
  });

  it('returns null when destination is missing', () => {
    expect(parsePaymentUri('mixmatch://payments/send?amount=10')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(parsePaymentUri('')).toBeNull();
    expect(parsePaymentUri('   ')).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(parsePaymentUri('not a uri at all')).toBeNull();
  });
});

describe('buildPaymentUri', () => {
  it('builds a mixmatch deep link with all fields', () => {
    const uri = buildPaymentUri({ destinationPublicKey: VALID_PUBLIC_KEY, amount: '10', memo: 'invoice-1' });
    const parsed = parsePaymentUri(uri);
    expect(parsed).toEqual({ destinationPublicKey: VALID_PUBLIC_KEY, amount: '10', memo: 'invoice-1' });
  });

  it('builds a mixmatch deep link with only the destination', () => {
    const uri = buildPaymentUri({ destinationPublicKey: VALID_PUBLIC_KEY });
    expect(uri).toBe(`mixmatch://payments/send?destination=${VALID_PUBLIC_KEY}`);
  });
});
