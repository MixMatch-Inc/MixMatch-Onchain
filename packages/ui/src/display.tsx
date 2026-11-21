import { addressHue, formatAmount, truncateAddress } from "@mixmatch/shared";
import { useState } from "react";

/** Amount with 7-decimal Stellar formatting (#1419). */
export function Amount({ value, assetCode, decimals }: { value: string | number; assetCode?: string; decimals?: number }) {
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {formatAmount(value, decimals)}
      {assetCode ? ` ${assetCode}` : ""}
    </span>
  );
}

/** Truncated address; the full value stays available as the title and to assistive technology. */
export function Address({ value }: { value: string }) {
  return (
    <abbr title={value} aria-label={value} style={{ textDecoration: "none", fontFamily: "monospace" }}>
      {truncateAddress(value)}
    </abbr>
  );
}

/** Read-only value with a copy button and a polite "Copied" confirmation. */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div>
      <span>{label}</span>{" "}
      <code>{truncateAddress(value, 6, 6)}</code>{" "}
      <button type="button" onClick={() => void copy()} aria-label={`Copy ${label}`}>
        Copy
      </button>
      <span role="status" aria-live="polite">{copied ? "Copied" : ""}</span>
    </div>
  );
}

/** Deterministic coloured circle with the address's first letters. */
export function Avatar({ address, size = 32 }: { address: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, borderRadius: "50%", background: `hsl(${addressHue(address)} 55% 35%)`, color: "#fff", fontSize: size / 2.5, fontWeight: 600 }}
    >
      {address.slice(0, 2).toUpperCase()}
    </span>
  );
}
