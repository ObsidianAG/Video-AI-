import Link from "next/link";
import { requireAuth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const user = await requireAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-bold">
              VEO3
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Projects
            </Link>
            <Link
              href="/exports"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Exports
            </Link>
            <Link
              href="/control"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Control
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

function LogoutButton(): React.JSX.Element {
  return (
    <form action="/api/auth/logout-action" method="POST">
      <button
        type="submit"
        className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        Sign out
      </button>
    </form>
  );
}
