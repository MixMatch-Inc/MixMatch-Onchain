"use client";

import { useState } from "react";
import Link from "next/link";
import { useLogin } from "../hooks/useLogin";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading, error } = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ email, password });
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <h1 className="headline">Sign in to MixMatch</h1>
        <p className="lede">Welcome back. Enter your credentials to continue.</p>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="you@example.com"
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
              disabled={loading}
              placeholder="Enter your password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
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
