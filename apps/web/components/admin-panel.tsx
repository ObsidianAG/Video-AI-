'use client';

import { useState } from 'react';
import { AuditLogTable } from '@/components/audit-log-table';
import { CacheOptCards } from '@/components/cacheopt-cards';
import { ObservabilityCards } from '@/components/observability-cards';
import type { CacheOptMetric, EvidenceEvent, VllmRuntimeMetric } from '@/lib/types';

type Tab = 'provider' | 'vllm' | 'safety' | 'rights' | 'audit' | 'observability' | 'cacheopt';

export function AdminPanel({
  events,
  runtimeMetrics,
  cacheoptMetrics,
}: {
  events: EvidenceEvent[];
  runtimeMetrics: VllmRuntimeMetric[];
  cacheoptMetrics: CacheOptMetric[];
}) {
  const [tab, setTab] = useState<Tab>('provider');
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'provider', label: 'Provider Settings' },
    { id: 'vllm', label: 'vLLM Settings' },
    { id: 'safety', label: 'Safety Policy' },
    { id: 'rights', label: 'Rights / Likeness Policy' },
    { id: 'audit', label: 'Audit Logs' },
    { id: 'observability', label: 'Observability' },
    { id: 'cacheopt', label: 'CACHEOPT Runtime' },
  ];

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card/60 p-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            onClick={() => setTab(entry.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${tab === entry.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'provider' ? (
        <p className="text-sm text-muted-foreground">VIDEO_PROVIDER_MODE=mock. Next step: server-side provider adapters and queue workers.</p>
      ) : null}
      {tab === 'vllm' ? (
        <p className="text-sm text-muted-foreground">Configured via VLLM_BASE_URL, VLLM_API_KEY, VLLM_MODEL. Browser never calls vLLM directly.</p>
      ) : null}
      {tab === 'safety' ? (
        <p className="text-sm text-muted-foreground">Policy: No evidence = no truth. Human approval required before export.</p>
      ) : null}
      {tab === 'rights' ? (
        <p className="text-sm text-muted-foreground">Rights and likeness confirmation gate is enforced in generation input validation.</p>
      ) : null}
      {tab === 'audit' ? <AuditLogTable events={events} /> : null}
      {tab === 'observability' ? <ObservabilityCards metrics={runtimeMetrics} /> : null}
      {tab === 'cacheopt' ? <CacheOptCards metrics={cacheoptMetrics} /> : null}
    </section>
  );
}
