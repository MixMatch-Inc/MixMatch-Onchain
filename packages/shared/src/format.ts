/**
 * Single implementation of amount and address display (#1419). Amounts are handled as decimal strings so
 * 7-decimal Stellar values never pass through floating point.
 */

const STELLAR_DECIMALS = 7;

export function formatAmount(value: string | number, decimals: number = STELLAR_DECIMALS): string {
  const text = String(value).trim();
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match || (match[2] === '' && !match[3])) return text;
  const [, sign, whole, fraction = ''] = match;
  const padded = fraction.slice(0, decimals).padEnd(decimals, '0');
  const grouped = (whole || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimals > 0 ? `${sign}${grouped}.${padded}` : `${sign}${grouped}`;
}

/** `GABC…WXYZ` style truncation; short values are returned unchanged. */
export function truncateAddress(address: string, head = 1, tail = 4): string {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/** Initials-free avatar seed: a stable hue (0-359) for an address. */
export function addressHue(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i += 1) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}
