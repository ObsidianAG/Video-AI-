import { Suspense } from 'react';
import Link from 'next/link';
import { JobDetailClient } from './JobDetailClient';

export const metadata = {
  title: 'Job Detail — Video AI',
};

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight hover:opacity-80 transition">
            Video AI
          </Link>
          <Link
            href="/jobs"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition"
          >
            ← My Videos
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <Suspense fallback={<div className="text-muted-foreground text-sm">Loading…</div>}>
          <JobDetailClient jobId={id} />
        </Suspense>
      </main>
    </div>
  );
}
