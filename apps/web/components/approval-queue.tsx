import { RenderJobTable } from '@/components/render-job-table';
import type { RenderJob } from '@/lib/types';

export function ApprovalQueue({ jobs }: { jobs: RenderJob[] }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Human Approval Queue</h2>
        <p className="text-sm text-muted-foreground">No audit log, no approval.</p>
      </div>
      <RenderJobTable jobs={jobs} interactive />
    </section>
  );
}
