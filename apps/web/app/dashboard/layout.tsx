import { LogoutButton } from '@/components/logout-button';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-medium text-zinc-900">MixMatch</p>
            <p className="text-xs text-zinc-500">Protected dashboard</p>
          </div>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
