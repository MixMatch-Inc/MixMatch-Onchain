export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Your protected dashboard is ready. Additional role-specific modules can
          be mounted here without changing the auth flow.
        </p>
      </section>
    </main>
  );
}
