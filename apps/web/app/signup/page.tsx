"use client";

import { useState } from "react";
import { UserRole, type SignupRequest, type ApiSuccess, type ApiError, type AuthResponse, type SessionBootstrap } from "@themixmatch/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ token: string; user: any; session: SessionBootstrap } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role } as SignupRequest),
      });

      const data = (await res.json()) as ApiSuccess<{ token: string; user: AuthResponse["user"]; session: SessionBootstrap }> | ApiError;

      if (!data.success) {
        setError(data.message);
        return;
      }

      setSuccess(data.data);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <h1 className="headline">Create your MixMatch account</h1>
        <p className="lede">
          Sign up to get started with MixMatch.
        </p>

        {success ? (
          <div className="success-state">
            <h2>Welcome, {success.user.name}!</h2>
            <p>Your account has been created successfully.</p>
            <p>Token: {success.token.slice(0, 20)}...</p>
          </div>
        ) : (
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
              minLength={8}
            />
          </div>
          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              required
              disabled={loading}
            >
              <option value="">Select your role</option>
              <option value={UserRole.DJ}>DJ</option>
              <option value={UserRole.PLANNER}>Planner</option>
              <option value={UserRole.MUSIC_LOVER}>Music Lover</option>
            </select>
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
        )}
      </section>
    </main>
  );
}
