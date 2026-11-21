"use client";

import { useState, type ButtonHTMLAttributes, type FocusEvent, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a busy state and blocks clicks while an action is in flight. */
  loading?: boolean;
}

const VARIANTS: Record<ButtonVariant, { color: string; background: string; border: string }> = {
  primary: { color: "#ffffff", background: "var(--mm-color-primary, #4f46e5)", border: "transparent" },
  secondary: { color: "var(--mm-color-text, #171717)", background: "transparent", border: "var(--mm-color-border, #d1d5db)" },
  ghost: { color: "var(--mm-color-primary, #4f46e5)", background: "transparent", border: "transparent" },
  danger: { color: "#ffffff", background: "#b91c1c", border: "transparent" },
};

const SIZES: Record<ButtonSize, { padding: string; fontSize: number }> = {
  sm: { padding: "4px 10px", fontSize: 13 },
  md: { padding: "8px 16px", fontSize: 15 },
  lg: { padding: "12px 24px", fontSize: 17 },
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  style,
  onFocus,
  onBlur,
  ...rest
}: ButtonProps) {
  const [focusVisible, setFocusVisible] = useState(false);
  const inactive = disabled || loading;
  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <button
      {...rest}
      type={type}
      disabled={inactive}
      aria-busy={loading || undefined}
      onFocus={(event: FocusEvent<HTMLButtonElement>) => {
        setFocusVisible(event.currentTarget.matches(":focus-visible"));
        onFocus?.(event);
      }}
      onBlur={(event: FocusEvent<HTMLButtonElement>) => {
        setFocusVisible(false);
        onBlur?.(event);
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 8,
        border: `1px solid ${v.border}`,
        color: v.color,
        background: v.background,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 600,
        cursor: inactive ? "not-allowed" : "pointer",
        opacity: inactive ? 0.6 : 1,
        outline: focusVisible ? "3px solid var(--mm-color-focus, #2563eb)" : "none",
        outlineOffset: 2,
        ...style,
      }}
    >
      {loading ? <span aria-hidden="true">…</span> : null}
      {children}
    </button>
  );
}
