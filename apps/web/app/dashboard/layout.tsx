import Link from 'next/link';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">MixMatch dashboard</h1>
            <p className="text-sm text-zinc-500">Discovery and bookings</p>
          </div>
          <nav className="flex items-center gap-3 text-sm text-zinc-700">
            <Link href="/dashboard" className="hover:text-zinc-900">
              Overview
            </Link>
            <Link href="/dashboard/discover" className="hover:text-zinc-900">
              Discover
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
