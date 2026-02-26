import React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, error, ...props }, ref) => {
    const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
      <div className="w-full">
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-800">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition ${
            error
              ? 'border-red-500 bg-red-50 text-slate-900 focus:border-red-600'
              : 'border-slate-300 bg-white text-slate-900 focus:border-slate-500'
          }`}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
