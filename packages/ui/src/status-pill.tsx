import type { ReactNode } from "react";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

// Foreground/background pairs chosen for >= 4.5:1 contrast on their own tint (light and dark share the pair).
const TONES: Record<StatusTone, { fg: string; bg: string }> = {
  success: { fg: "#0b5d1e", bg: "#dcfce7" },
  warning: { fg: "#7a4a00", bg: "#fef3c7" },
  danger: { fg: "#8f1111", bg: "#fee2e2" },
  info: { fg: "#1e3a8a", bg: "#dbeafe" },
  neutral: { fg: "#374151", bg: "#e5e7eb" },
};

export interface StatusPillProps {
  tone: StatusTone;
  label: ReactNode;
  icon?: string;
}

/** Status badge: colour + icon + text, so meaning never depends on colour alone (#1418). */
export function StatusPill({ tone, label, icon }: StatusPillProps) {
  const { fg, bg } = TONES[tone];
  return (
    <span
      data-tone={tone}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: 13, fontWeight: 600, color: fg, background: bg }}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {label}
    </span>
  );
}
