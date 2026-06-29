'use client';

import { registerSchema } from '@mixmatch/shared';
import Link from 'next/link';
import { AuthForm, type AuthFormValues } from '@/components/AuthForm';
import { registerUser } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function SignupPage() {
  const { user, setAuth, logout } = useAuth();

  const handleSubmit = async (values: AuthFormValues) => {
    const result = registerSchema.safeParse(values);
    if (!result.success) {
      throw new Error(result.error.issues[0]?.message ?? 'Invalid input');
    }

    const response = await registerUser(result.data);
    setAuth(response);
  };

  if (user) {
    return (
      <main>
        <h1>Account created</h1>
        <p>Signed in as {user.email}</p>
        <button onClick={logout}>Log out</button>
      </main>
    );
  }

  return (
    <main>
      <AuthForm title="Create account" submitLabel="Create account" onSubmit={handleSubmit} />
      <p>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
