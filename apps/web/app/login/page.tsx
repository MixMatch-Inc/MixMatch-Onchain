"use client";

import { useRouter } from "next/navigation";
import React, { type FormEvent, useState } from "react";
import { login } from "../../auth/auth-client";
import { saveAuthSession } from "../../auth/auth-storage";
import { AuthClientError } from "../../auth/auth-client";

export default function LoginPage() {
  const router = useRouter();
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
      await saveAuthSession(session);
      router.push("/");
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
    <main style={{ maxWidth: 400, margin: "0 auto", padding: "3rem 1rem" }}>
      <h1>Sign in</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
        <button type="submit" disabled={submitting || !email.trim() || !password}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {error && <p style={{ color: "#b91c1c", marginTop: "1rem" }}>{error}</p>}
    </main>
  );
}
