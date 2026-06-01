"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/auth-context";
import { login, AuthClientError } from "@/auth/auth-client";
import { extractAuthNotices, formatThrottleMessage } from "@/auth/use-auth-notices";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || submitting) return;
    setSubmitting(true);
    setError(null);
    setRetryAfter(null);

    try {
      const session = await login({ email: email.trim(), password });
      signIn(session);
      router.push("/dashboard");
    } catch (caught) {
      if (caught instanceof AuthClientError) {
        const notices = extractAuthNotices(caught);
        const throttleMsg = formatThrottleMessage(notices.throttleNotice);
        setError(throttleMsg ?? notices.displayMessage ?? caught.message);
        if (notices.throttleNotice?.retryAfter) {
          setRetryAfter(notices.throttleNotice.retryAfter);
        }
      } else {
        setError(caught instanceof Error ? caught.message : "Sign in failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isThrottled = retryAfter !== null;

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
              disabled={submitting || isThrottled}
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
              disabled={submitting || isThrottled}
              minLength={8}
            />
          </div>

          {error && (
            <div className={isThrottled ? "throttle-notice" : "error-message"}>
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting || isThrottled || !email.trim() || !password}>
            {submitting ? "Signing in..." : isThrottled ? "Try again later" : "Sign in"}
          </button>

          <p style={{ textAlign: "center", marginTop: "1rem", color: "var(--muted)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ color: "var(--accent)", fontWeight: 600 }}>
              Create one
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
