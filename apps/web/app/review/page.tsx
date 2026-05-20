import { ApprovalQueue } from '@/components/approval-queue';
import { listRenderJobs } from '@/lib/mock-store';

export default function ReviewPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card/60 p-5">
        <h2 className="text-2xl font-semibold">Review Queue</h2>
        <p className="mt-2 text-sm text-muted-foreground">Human approval is required before export.</p>
      </section>
      <ApprovalQueue jobs={listRenderJobs()} />
    </div>
  );
}
