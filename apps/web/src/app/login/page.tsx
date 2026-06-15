'use client';

import { loginSchema } from '@mixmatch/shared';
import Link from 'next/link';
import { AuthForm, type AuthFormValues } from '@/components/AuthForm';
import { loginUser } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { user, setAuth, logout } = useAuth();

  const handleSubmit = async (values: AuthFormValues) => {
    const result = loginSchema.safeParse(values);
    if (!result.success) {
      throw new Error(result.error.issues[0]?.message ?? 'Invalid input');
    }

    const response = await loginUser(result.data);
    setAuth(response);
  };

  if (user) {
    return (
      <main>
        <h1>You are logged in</h1>
        <p>Signed in as {user.email}</p>
        <button onClick={logout}>Log out</button>
      </main>
    );
  }

  return (
    <main>
      <AuthForm title="Log in" submitLabel="Log in" onSubmit={handleSubmit} />
      <p>
        Need an account? <Link href="/signup">Create one</Link>
      </p>
    </main>
  );
}
