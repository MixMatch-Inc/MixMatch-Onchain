import { forwardRef, useId, type CSSProperties, type InputHTMLAttributes } from "react";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  /** Always visible hint under the input. */
  helperText?: string;
  /** Error message; when set the field is marked invalid and the message is announced. */
  error?: string;
  id?: string;
}

const labelStyle: CSSProperties = { display: "block", fontWeight: 500, marginBottom: "var(--mm-space-1, 4px)" };
const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "var(--mm-space-2, 8px)",
  fontSize: "var(--mm-font-size-md, 16px)",
  color: "var(--mm-color-foreground, #0f172a)",
  background: "var(--mm-color-background, #ffffff)",
  border: "1px solid var(--mm-color-border, #e2e8f0)",
  borderRadius: "var(--mm-radius-md, 8px)",
};
const helperStyle: CSSProperties = { margin: "var(--mm-space-1, 4px) 0 0", fontSize: "var(--mm-font-size-sm, 14px)", color: "var(--mm-color-muted, #64748b)" };
const errorStyle: CSSProperties = { ...helperStyle, color: "var(--mm-color-danger, #b91c1c)" };

/**
 * Text input with a programmatically associated label, helper text and error (`aria-describedby`,
 * `aria-invalid`). The error is rendered with `role="alert"` so it is announced when it appears.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, helperText, error, id, style, required, ...rest },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div style={{ marginBottom: "var(--mm-space-3, 12px)" }}>
      <label htmlFor={inputId} style={labelStyle}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <input
        {...rest}
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        style={{ ...inputStyle, ...(error ? { borderColor: "var(--mm-color-danger, #b91c1c)" } : null), ...style }}
      />
      {helperText ? (
        <p id={helperId} style={helperStyle}>
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" style={errorStyle}>
          {error}
        </p>
      ) : null}
    </div>
  );
});
