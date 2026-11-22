/**
 * Versioned payment link used in QR codes and deep links (#1405):
 *
 *   mixmatch://pay?v=1&to=<G...>&amount=<decimal>&asset=<CODE>&issuer=<G...>&memo=<text>
 *
 * Also understood: SEP-7 `web+stellar:pay?destination=...&amount=...&memo=...` and a bare Stellar public key
 * (what the app's QR used to contain).
 */

export const PAYMENT_URI_SCHEME = 'mixmatch';
export const PAYMENT_URI_VERSION = '1';

export interface PaymentRequest {
  destination: string;
  amount?: string;
  assetCode?: string;
  assetIssuer?: string;
  memo?: string;
}

const PUBLIC_KEY = /^G[A-Z2-7]{55}$/;
const AMOUNT = /^\d+(\.\d{1,7})?$/;
const ASSET_CODE = /^[A-Za-z0-9]{1,12}$/;

export function buildPaymentUri(request: PaymentRequest): string {
  const params = new URLSearchParams();
  params.set('v', PAYMENT_URI_VERSION);
  params.set('to', request.destination);
  if (request.amount) params.set('amount', request.amount);
  if (request.assetCode) params.set('asset', request.assetCode);
  if (request.assetIssuer) params.set('issuer', request.assetIssuer);
  if (request.memo) params.set('memo', request.memo);
  return `${PAYMENT_URI_SCHEME}://pay?${params.toString()}`;
}

function clean(raw: {
  destination: string | null;
  amount: string | null;
  asset: string | null;
  issuer: string | null;
  memo: string | null;
}): PaymentRequest | null {
  if (!raw.destination || !PUBLIC_KEY.test(raw.destination)) return null;
  const result: PaymentRequest = { destination: raw.destination };
  if (raw.amount && AMOUNT.test(raw.amount)) result.amount = raw.amount;
  if (raw.asset && ASSET_CODE.test(raw.asset)) {
    result.assetCode = raw.asset;
    if (raw.issuer && PUBLIC_KEY.test(raw.issuer)) result.assetIssuer = raw.issuer;
  }
  if (raw.memo) result.memo = raw.memo.slice(0, 28);
  return result;
}

/** Returns the request, or `null` when the text is not a payment link or key. Never throws. */
export function parsePaymentUri(input: string): PaymentRequest | null {
  const text = input.trim();
  if (PUBLIC_KEY.test(text)) return { destination: text };

  const match = /^([a-z][a-z0-9+.-]*):(?:\/\/)?pay\?(.*)$/i.exec(text);
  if (!match) return null;
  const scheme = match[1].toLowerCase();
  const params = new URLSearchParams(match[2]);

  if (scheme === PAYMENT_URI_SCHEME) {
    if (params.get('v') !== PAYMENT_URI_VERSION) return null; // unknown version: refuse rather than guess
    return clean({
      destination: params.get('to'),
      amount: params.get('amount'),
      asset: params.get('asset'),
      issuer: params.get('issuer'),
      memo: params.get('memo'),
    });
  }

  if (scheme === 'web+stellar') {
    return clean({
      destination: params.get('destination'),
      amount: params.get('amount'),
      asset: params.get('asset_code'),
      issuer: params.get('asset_issuer'),
      memo: params.get('memo_type') && params.get('memo_type') !== 'MEMO_TEXT' ? null : params.get('memo'),
    });
  }

  return null;
}
