import { forwardRef, useId, type CSSProperties, type InputHTMLAttributes, type ReactNode } from "react";

const rowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--mm-space-2, 8px)", marginBottom: "var(--mm-space-2, 8px)" };
const inputStyle: CSSProperties = { width: 18, height: 18, accentColor: "var(--mm-color-primary, #4f46e5)" };

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> & { label: ReactNode; id?: string };

/** Native checkbox with a clickable label; keyboard and screen-reader behaviour come from the element. */
export const Checkbox = forwardRef<HTMLInputElement, BaseProps>(function Checkbox({ label, id, ...rest }, ref) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div style={rowStyle}>
      <input {...rest} ref={ref} id={inputId} type="checkbox" style={inputStyle} />
      <label htmlFor={inputId}>{label}</label>
    </div>
  );
});

/**
 * Switch: a checkbox with `role="switch"` (announced as "on/off"). Space toggles it like any checkbox.
 */
export const Switch = forwardRef<HTMLInputElement, BaseProps>(function Switch({ label, id, ...rest }, ref) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div style={rowStyle}>
      <input {...rest} ref={ref} id={inputId} type="checkbox" role="switch" style={inputStyle} />
      <label htmlFor={inputId}>{label}</label>
    </div>
  );
});

export interface RadioOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** Group label, announced by screen readers (rendered in a `<legend>`). */
  legend: string;
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
}

/** Radio group in a `<fieldset>`; arrow keys move between options natively. */
export function RadioGroup({ legend, name, options, value, onChange, error }: RadioGroupProps) {
  const groupId = useId();
  const errorId = error ? `${groupId}-error` : undefined;
  return (
    <fieldset aria-describedby={errorId} aria-invalid={error ? true : undefined} style={{ border: 0, padding: 0, margin: 0 }}>
      <legend style={{ fontWeight: 500, marginBottom: "var(--mm-space-1, 4px)" }}>{legend}</legend>
      {options.map((option) => {
        const id = `${groupId}-${option.value}`;
        return (
          <div key={option.value} style={rowStyle}>
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={value === undefined ? undefined : value === option.value}
              disabled={option.disabled}
              onChange={() => onChange?.(option.value)}
              style={inputStyle}
            />
            <label htmlFor={id}>{option.label}</label>
          </div>
        );
      })}
      {error ? (
        <p id={errorId} role="alert" style={{ color: "var(--mm-color-danger, #b91c1c)", margin: 0 }}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  label: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
  id?: string;
}

/** Native `<select>` with label, helper and error wiring (native keyboard and mobile pickers). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, helperText, error, id, ...rest },
  ref,
) {
  const generated = useId();
  const selectId = id ?? generated;
  const helperId = helperText ? `${selectId}-helper` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  return (
    <div style={{ marginBottom: "var(--mm-space-3, 12px)" }}>
      <label htmlFor={selectId} style={{ display: "block", fontWeight: 500, marginBottom: "var(--mm-space-1, 4px)" }}>
        {label}
      </label>
      <select
        {...rest}
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={[helperId, errorId].filter(Boolean).join(" ") || undefined}
        style={{ display: "block", width: "100%", padding: "var(--mm-space-2, 8px)", borderRadius: "var(--mm-radius-md, 8px)", border: "1px solid var(--mm-color-border, #e2e8f0)" }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? <p id={helperId} style={{ margin: "4px 0 0", color: "var(--mm-color-muted, #64748b)" }}>{helperText}</p> : null}
      {error ? <p id={errorId} role="alert" style={{ margin: "4px 0 0", color: "var(--mm-color-danger, #b91c1c)" }}>{error}</p> : null}
    </div>
  );
});
