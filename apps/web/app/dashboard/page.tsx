"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/auth-context";
import { evaluateProtectedRouteGuard } from "@/auth/session-continuity";

export default function DashboardPage() {
  const router = useRouter();
  const { user, session, isAuthenticated, isBootstrapping, signOut } = useAuth();
  const guard = evaluateProtectedRouteGuard(session);

  useEffect(() => {
    if (isBootstrapping) return;
    if (!guard.allowed) {
      router.replace("/login");
    }
  }, [guard.allowed, isBootstrapping, router]);

  if (isBootstrapping || !isAuthenticated || !guard.allowed) {
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
