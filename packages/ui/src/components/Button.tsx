import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-700',
  secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300',
  danger: 'bg-red-600 text-white hover:bg-red-500',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', type = 'button', disabled, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition ${
        variantClasses[variant]
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      {...props}
    />
  ),
);

Button.displayName = 'Button';
