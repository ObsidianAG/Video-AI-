'use client';

import { useMemo, useState } from 'react';
import { EvidenceChecklist } from '@/components/evidence-checklist';
import { StatusBadge } from '@/components/status-badge';
import { getEvidenceChecklistFromRenderJob, toneFromJobStatus } from '@/components/render-job-utils';
import type { RenderJob } from '@/lib/types';

export function RenderJobTable({ jobs, interactive = false }: { jobs: RenderJob[]; interactive?: boolean }) {
  const [rows, setRows] = useState<RenderJob[]>(jobs);

  const ordered = useMemo(
    () => [...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [rows],
  );

  const mutate = async (id: string, action: 'approve' | 'reject') => {
    const endpoint = action === 'approve' ? `/api/render-jobs/${id}/approve` : `/api/render-jobs/${id}/reject`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: action === 'reject' ? JSON.stringify({ reason: 'Needs revision for continuity consistency.' }) : undefined,
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { job: RenderJob };
    setRows((current) => current.map((job) => (job.id === id ? payload.job : job)));
  };

  return (
    <div className="space-y-4">
      {ordered.map((job) => {
        const checklist = getEvidenceChecklistFromRenderJob(job);
        const canApprove =
          job.status === 'completed' &&
          checklist.providerJobId &&
          checklist.artifactUri &&
          checklist.artifactSha256 &&
          checklist.auditLog;

        return (
          <article key={job.id} className="rounded-xl border border-border bg-card/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold">Shot {job.shotId}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{job.prompt}</p>
              </div>
              <StatusBadge label={job.status} tone={toneFromJobStatus(job.status)} />
            </div>
            <dl className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
              <div><dt className="font-medium text-foreground">Provider Job ID</dt><dd>{job.providerJobId ?? '—'}</dd></div>
              <div><dt className="font-medium text-foreground">Artifact URI</dt><dd className="break-all">{job.artifactUri ?? '—'}</dd></div>
              <div><dt className="font-medium text-foreground">SHA-256</dt><dd className="break-all">{job.artifactSha256 ?? '—'}</dd></div>
            </dl>
            <div className="mt-3">
              <EvidenceChecklist checklist={checklist} />
            </div>
            {interactive ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={!canApprove}
                  onClick={() => mutate(job.id, 'approve')}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => mutate(job.id, 'reject')}
                  className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Reject
                </button>
                <button
                  onClick={() => mutate(job.id, 'reject')}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold"
                >
                  Request revision
                </button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
