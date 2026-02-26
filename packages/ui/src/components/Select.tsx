import React from 'react';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, id, options, placeholder, error, ...props }, ref) => {
    const selectId = id ?? `select-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
      <div className="w-full">
        <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-slate-800">
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${selectId}-error` : undefined}
          className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition ${
            error
              ? 'border-red-500 bg-red-50 text-slate-900 focus:border-red-600'
              : 'border-slate-300 bg-white text-slate-900 focus:border-slate-500'
          }`}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error ? (
          <p id={`${selectId}-error`} className="mt-1 text-xs text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Select.displayName = 'Select';
