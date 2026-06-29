'use client';

import { type FormEvent, useState } from 'react';

export interface AuthFormValues {
  email: string;
  password: string;
}

export interface AuthFormProps {
  title: string;
  submitLabel: string;
  onSubmit: (values: AuthFormValues) => Promise<void>;
  fieldErrors?: Partial<Record<'email' | 'password', string>>;
  passwordAutoComplete?: string;
}

export function AuthForm({ title, submitLabel, onSubmit, fieldErrors, passwordAutoComplete }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit({ email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label={title} noValidate>
      <h1>{title}</h1>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
        {fieldErrors?.email && <p role="alert">{fieldErrors.email}</p>}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={passwordAutoComplete ?? 'current-password'}
          required
        />
        {fieldErrors?.password && <p role="alert">{fieldErrors.password}</p>}
      </div>

      {error && <p role="alert">{error}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Please wait…' : submitLabel}
      </button>
    </form>
  );
}
