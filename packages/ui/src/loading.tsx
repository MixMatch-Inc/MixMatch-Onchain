import type { CSSProperties } from "react";

const keyframes = "@keyframes mm-spin{to{transform:rotate(360deg)}}@keyframes mm-pulse{50%{opacity:.5}}@media (prefers-reduced-motion: reduce){.mm-spinner,.mm-skeleton{animation:none!important}}";

export interface SpinnerProps {
  /** Accessible name announced to screen readers. */
  label?: string;
  size?: number;
}

/** Indeterminate loading indicator (`role="status"`). Honours `prefers-reduced-motion`. */
export function Spinner({ label = "Loading", size = 20 }: SpinnerProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    border: "2px solid var(--mm-color-border, #e2e8f0)",
    borderTopColor: "var(--mm-color-primary, #4f46e5)",
    borderRadius: "50%",
    display: "inline-block",
    animation: "mm-spin 0.8s linear infinite",
  };
  return (
    <span role="status" aria-live="polite" style={{ display: "inline-flex", alignItems: "center" }}>
      <style>{keyframes}</style>
      <span className="mm-spinner" aria-hidden="true" style={style} />
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{label}</span>
    </span>
  );
}

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
}

/** Placeholder block shown while content loads. Decorative: hidden from assistive technology. */
export function Skeleton({ width = "100%", height = 16 }: SkeletonProps) {
  return (
    <span
      className="mm-skeleton"
      aria-hidden="true"
      style={{ display: "block", width, height, borderRadius: "var(--mm-radius-sm, 4px)", background: "var(--mm-color-border, #e2e8f0)", animation: "mm-pulse 1.4s ease-in-out infinite" }}
    />
  );
}

/** List skeleton: `rows` placeholder lines, with one polite status message for screen readers. */
export function SkeletonList({ rows = 3, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <style>{keyframes}</style>
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{label}</span>
      <div style={{ display: "grid", gap: 8 }}>
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} height={48} />
        ))}
      </div>
    </div>
  );
}
