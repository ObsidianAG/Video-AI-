import Link from 'next/link';
import { JobList } from '@/components/JobComponents';

export const metadata = {
  title: 'My Videos — Video AI',
  description: 'All your generated videos.',
};

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight hover:opacity-80 transition"
          >
            Video AI
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition"
          >
            + Generate
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="mb-8 text-2xl font-semibold">My Videos</h1>
        <JobList />
      </main>
    </div>
  );
}
