export interface PaymentUriPayload {
  destinationPublicKey: string;
  amount?: string;
  memo?: string;
}

const STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

const MIXMATCH_PATTERN = /^mixmatch:\/\/payments\/send\/?(\?(.*))?$/i;
const SEP7_PATTERN = /^web\+stellar:pay\/?(\?(.*))?$/i;

function parseQueryParams(query: string | undefined): URLSearchParams {
  return new URLSearchParams(query ?? '');
}

/**
 * Parses a scanned QR/deep-link payload into a payment prefill. Supports the
 * app's own `mixmatch://payments/send?destination=...` scheme and the
 * Stellar-ecosystem-standard SEP-0007 `web+stellar:pay?destination=...` URI,
 * so QR codes from other Stellar wallets also work. Parsed manually (no
 * global `URL`) since Hermes' URL support varies across RN/Expo versions.
 */
export function parsePaymentUri(raw: string): PaymentUriPayload | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const match = MIXMATCH_PATTERN.exec(trimmed) ?? SEP7_PATTERN.exec(trimmed);
  if (!match) return null;

  const params = parseQueryParams(match[2]);
  const destination = params.get('destination');
  if (!destination || !STELLAR_PUBLIC_KEY_PATTERN.test(destination)) return null;

  const payload: PaymentUriPayload = { destinationPublicKey: destination };

  const amount = params.get('amount');
  if (amount) payload.amount = amount;

  const memo = params.get('memo');
  if (memo) payload.memo = memo;

  return payload;
}

/** Builds a `mixmatch://payments/send?...` deep link for sharing/QR display. */
export function buildPaymentUri(payload: PaymentUriPayload): string {
  const params = new URLSearchParams({ destination: payload.destinationPublicKey });
  if (payload.amount) params.set('amount', payload.amount);
  if (payload.memo) params.set('memo', payload.memo);
  return `mixmatch://payments/send?${params.toString()}`;
}
