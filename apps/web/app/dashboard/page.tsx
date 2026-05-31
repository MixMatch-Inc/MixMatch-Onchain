"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/auth-context";

export default function DashboardPage() {
  const router = useRouter();
  const { user, session, isAuthenticated, signOut } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <main className="page-shell">
        <section className="hero-card">
          <h1 className="headline">Loading session…</h1>
          <p className="lede">Checking authentication state before redirect.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <h1 className="headline">Welcome back, {user?.name}</h1>
        <p className="lede">
          Your session is active for role {user?.role}.
        </p>
        <div className="success-state">
          <p>
            User ID: {session?.user.id}
          </p>
          <p>Onboarding complete: {session?.session.onboardingCompleted ? "Yes" : "No"}</p>
          <p>Session issued at: {session?.session.issuedAt}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            signOut();
            router.push("/login");
          }}
        >
          Sign out
        </button>
      </section>
    </main>
  );
}
