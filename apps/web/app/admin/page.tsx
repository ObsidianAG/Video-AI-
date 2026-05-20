import Link from 'next/link';
import { AdminPanel } from '@/components/admin-panel';
import { getMockCacheOptMetrics, getMockRuntimeMetrics, listEvidenceEvents } from '@/lib/mock-store';

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card/60 p-5">
        <h2 className="text-2xl font-semibold">Enterprise Control Room</h2>
        <p className="mt-2 text-sm text-muted-foreground">Prometheus watches the AI fire.</p>
        <Link href="/admin/observability" className="mt-3 inline-block text-sm text-sky-300 hover:underline">
          Open observability route
        </Link>
      </section>
      <AdminPanel
        events={listEvidenceEvents()}
        runtimeMetrics={getMockRuntimeMetrics()}
        cacheoptMetrics={getMockCacheOptMetrics()}
      />
    </div>
  );
}
