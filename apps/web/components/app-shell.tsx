import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,_rgba(86,32,120,0.25),_rgba(5,8,14,1)_55%)] text-foreground">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-6">
        <Topbar />
        {children}
      </main>
    </div>
  );
}
