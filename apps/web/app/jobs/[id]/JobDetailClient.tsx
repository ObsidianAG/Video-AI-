'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { StatusBadge } from '@/components/JobComponents';

interface StateHistoryEntry {
  from_state: string | null;
  to_state: string;
  reason: string | null;
  occurred_at: string;
}

interface Artifact {
  stored_artifact_url: string;
  verification_status: string;
  mime_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  verified_at: string | null;
  audit_event_id: string | null;
}

interface JobDetail {
  id: string;
  prompt: string;
  state: string;
  state_reason: string | null;
  provider_label: string | null;
  provider_model_id: string | null;
  failure_reason: string | null;
  created_at: string;
  state_updated_at: string;
  history: StateHistoryEntry[];
  artifact: Artifact | null;
  isReadyForUser: boolean;
}

const TERMINAL_STATES = new Set(['READY_FOR_USER', 'FAILED', 'BLOCKED', 'EXPIRED']);
const POLL_INTERVAL_MS = 3000;

interface JobDetailClientProps {
  jobId: string;
}

export function JobDetailClient({ jobId }: JobDetailClientProps) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = (await res.json()) as {
        ok: boolean;
        job?: JobDetail;
        error?: { code: string; message: string };
      };

      if (!res.ok || !data.ok) {
        setError(data.error?.message ?? 'Failed to load job.');
        return;
      }

      if (data.job) {
        setJob(data.job);
        if (TERMINAL_STATES.has(data.job.state)) {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }
    } catch {
      setError('Network error loading job.');
    }
  }, [jobId]);

  useEffect(() => {
    void fetchJob();

    intervalRef.current = setInterval(() => {
      void fetchJob();
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchJob]);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-2/3 rounded-lg bg-muted" />
        <div className="aspect-video w-full rounded-xl bg-muted" />
      </div>
    );
  }

  const bytesFmt = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground font-mono mb-1">{job.id}</p>
          <h1 className="text-xl font-semibold leading-snug">{job.prompt}</h1>
        </div>
        <StatusBadge state={job.state} />
      </div>

      {/* Video player */}
      {job.isReadyForUser && job.artifact?.stored_artifact_url ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <video
            src={job.artifact.stored_artifact_url}
            controls
            className="w-full"
            preload="auto"
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
          {!TERMINAL_STATES.has(job.state) && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm">Processing…</p>
            </div>
          )}
          {job.state === 'FAILED' && (
            <div className="text-center px-6">
              <p className="text-destructive font-medium mb-2">Generation failed</p>
              {job.failure_reason && (
                <p className="text-sm text-muted-foreground">{job.failure_reason}</p>
              )}
            </div>
          )}
          {job.state === 'BLOCKED' && (
            <p className="text-sm text-orange-400">This job was blocked by safety review.</p>
          )}
          {job.state === 'EXPIRED' && (
            <p className="text-sm text-muted-foreground">This job has expired.</p>
          )}
        </div>
      )}

      {/* Artifact info */}
      {job.artifact && (
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <h2 className="text-sm font-semibold mb-4">Artifact</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground text-xs">Status</dt>
              <dd className="font-medium capitalize">{job.artifact.verification_status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Size</dt>
              <dd className="font-medium">{bytesFmt(job.artifact.file_size_bytes)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">MIME type</dt>
              <dd className="font-medium">{job.artifact.mime_type}</dd>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-muted-foreground text-xs mb-1">SHA-256</dt>
              <dd className="font-mono text-xs break-all">{job.artifact.sha256_hash}</dd>
            </div>
            {job.artifact.audit_event_id && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-muted-foreground text-xs mb-1">Audit event ID</dt>
                <dd className="font-mono text-xs">{job.artifact.audit_event_id}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* State history */}
      <div className="rounded-xl border border-border bg-muted/30 p-5">
        <h2 className="text-sm font-semibold mb-4">State history</h2>
        <ol className="relative border-l border-border ml-2 space-y-4">
          {job.history.map((entry, i) => (
            <li key={i} className="ml-4">
              <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full border border-border bg-background" />
              <div className="flex items-start gap-2 flex-wrap">
                <StatusBadge state={entry.to_state} />
                {entry.reason && (
                  <span className="text-xs text-muted-foreground">{entry.reason}</span>
                )}
              </div>
              <time className="mt-1 block text-xs text-muted-foreground">
                {new Date(entry.occurred_at).toLocaleString()}
              </time>
            </li>
          ))}
        </ol>
      </div>

      {/* Provider info */}
      <div className="rounded-xl border border-border bg-muted/30 p-5">
        <h2 className="text-sm font-semibold mb-3">Provider</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Label</dt>
            <dd>{job.provider_label ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Model</dt>
            <dd>{job.provider_model_id ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Created at</dt>
            <dd>{new Date(job.created_at).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Last updated</dt>
            <dd>{new Date(job.state_updated_at).toLocaleString()}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
