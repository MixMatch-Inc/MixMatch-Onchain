"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserRole, type SignupRequest } from "@themixmatch/types";
import { register, AuthClientError } from "@/auth/auth-client";
import { useAuth } from "@/auth/auth-context";
import { extractAuthNotices, formatThrottleMessage } from "@/auth/use-auth-notices";

export default function SignupPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setRetryAfter(null);

    const payload: SignupRequest = {
      email,
      password,
      role: role as UserRole,
    };

    try {
      const session = await register(payload);
      signIn(session);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof AuthClientError) {
        const notices = extractAuthNotices(err);
        const throttleMsg = formatThrottleMessage(notices.throttleNotice);
        setError(throttleMsg ?? notices.displayMessage ?? err.message);
        if (notices.throttleNotice?.retryAfter) {
          setRetryAfter(notices.throttleNotice.retryAfter);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isThrottled = retryAfter !== null;

  return (
    <main className="page-shell">
      <section className="hero-card">
        <h1 className="headline">Create your MixMatch account</h1>
        <p className="lede">
          Create a secure auth session and continue to your dashboard.
        </p>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading || isThrottled}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading || isThrottled}
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              required
              disabled={loading || isThrottled}
            >
              <option value="">Select your role</option>
              <option value={UserRole.DJ}>DJ</option>
              <option value={UserRole.PLANNER}>Planner</option>
              <option value={UserRole.MUSIC_LOVER}>Music Lover</option>
            </select>
          </div>

          {error && (
            <div className={isThrottled ? "throttle-notice" : "error-message"}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || isThrottled}>
            {loading ? "Creating account..." : isThrottled ? "Try again later" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
