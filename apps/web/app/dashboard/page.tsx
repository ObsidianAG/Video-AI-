import { AuditLogTable } from '@/components/audit-log-table';
import { ProviderHealthCard } from '@/components/provider-health-card';
import { StatusBadge } from '@/components/status-badge';
import { getDashboardSnapshot } from '@/lib/mock-store';

export default function DashboardPage() {
  const snapshot = getDashboardSnapshot();
  const cards = [
    ['Active projects', snapshot.activeProjects],
    ['Active shot plans', snapshot.activeShotPlans],
    ['Mock render jobs', snapshot.mockRenderJobs],
    ['Pending approvals', snapshot.pendingApprovals],
    ['Failed jobs', snapshot.failedJobs],
    ['Evidence completion score', `${snapshot.evidenceCompletionScore}%`],
    ['Mock cost estimate', '$182.40'],
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card/60 p-5">
        <h2 className="text-2xl font-semibold">AI creates. Evidence proves. Humans approve.</h2>
        <p className="mt-2 text-sm text-muted-foreground">Studio command center for production-safe decisioning.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <StatusBadge label="No evidence = no truth" tone="warning" />
          <StatusBadge label="No hash = no asset" tone="warning" />
          <StatusBadge label="No audit log = no approval" tone="warning" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-xl border border-border bg-card/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ProviderHealthCard provider="vLLM Runtime" status="healthy" detail="Ready at /v1 with schema-enforced shot planning." />
        <ProviderHealthCard provider="Mock Provider" status="healthy" detail="Mock render queues simulating completed artifacts with hashes." />
        <ProviderHealthCard provider="Safety Policy" status="warning" detail="Human approval required before export in all workflows." />
      </section>

      <AuditLogTable events={snapshot.recentAuditEvents} />
    </div>
  );
}
