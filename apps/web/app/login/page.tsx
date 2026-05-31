"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth/auth-context";
import { login } from "@/auth/auth-client";
import { AuthClientError } from "@/auth/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const session = await login({ email: email.trim(), password });
      signIn(session);
      router.push("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof AuthClientError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Sign in failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <h1 className="headline">Sign in to MixMatch</h1>
        <p className="lede">
          Enter your credentials to resume your session.
        </p>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={submitting}
              minLength={8}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={submitting || !email.trim() || !password}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}