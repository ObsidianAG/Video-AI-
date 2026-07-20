'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface JobStatusBadgeProps {
  state: string;
}

const STATE_COLORS: Record<string, string> = {
  PROMPT_RECEIVED: 'text-blue-400 bg-blue-400/10',
  SAFETY_REVIEWED: 'text-blue-400 bg-blue-400/10',
  JOB_CREATED: 'text-blue-400 bg-blue-400/10',
  PROVIDER_SELECTED: 'text-blue-400 bg-blue-400/10',
  PROVIDER_SUBMITTED: 'text-yellow-400 bg-yellow-400/10',
  PROVIDER_RUNNING: 'text-yellow-400 bg-yellow-400/10',
  PROVIDER_COMPLETED: 'text-green-400 bg-green-400/10',
  ARTIFACT_DOWNLOADED: 'text-green-400 bg-green-400/10',
  ARTIFACT_STORED: 'text-green-400 bg-green-400/10',
  ARTIFACT_HASHED: 'text-green-400 bg-green-400/10',
  ARTIFACT_VERIFIED: 'text-green-400 bg-green-400/10',
  AUDIT_RECORDED: 'text-green-400 bg-green-400/10',
  READY_FOR_USER: 'text-emerald-400 bg-emerald-400/10',
  FAILED: 'text-red-400 bg-red-400/10',
  BLOCKED: 'text-orange-400 bg-orange-400/10',
  EXPIRED: 'text-gray-400 bg-gray-400/10',
};

const STATE_LABELS: Record<string, string> = {
  PROMPT_RECEIVED: 'Received',
  SAFETY_REVIEWED: 'Safety checked',
  JOB_CREATED: 'Created',
  PROVIDER_SELECTED: 'Provider selected',
  PROVIDER_SUBMITTED: 'Submitted',
  PROVIDER_RUNNING: 'Generating…',
  PROVIDER_COMPLETED: 'Done at provider',
  ARTIFACT_DOWNLOADED: 'Downloading',
  ARTIFACT_STORED: 'Stored',
  ARTIFACT_HASHED: 'Verified (hash)',
  ARTIFACT_VERIFIED: 'Verified',
  AUDIT_RECORDED: 'Audited',
  READY_FOR_USER: 'Ready',
  FAILED: 'Failed',
  BLOCKED: 'Blocked',
  EXPIRED: 'Expired',
};

export function StatusBadge({ state }: JobStatusBadgeProps) {
  const color = STATE_COLORS[state] ?? 'text-gray-400 bg-gray-400/10';
  const label = STATE_LABELS[state] ?? state;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {state === 'PROVIDER_RUNNING' && (
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
      )}
      {label}
    </span>
  );
}

// --- Job Card ---

interface Job {
  id: string;
  prompt: string;
  state: string;
  provider_label: string | null;
  failure_reason: string | null;
  created_at: string;
  stored_artifact_url: string | null;
  mime_type: string | null;
}

interface JobCardProps {
  job: Job;
  onSelect?: (id: string) => void;
}

export function JobCard({ job, onSelect }: JobCardProps) {
  const isReady = job.state === 'READY_FOR_USER' && job.stored_artifact_url;
  const isFailed = job.state === 'FAILED';
  const isRunning = ['PROVIDER_SUBMITTED', 'PROVIDER_RUNNING', 'PROVIDER_COMPLETED',
    'ARTIFACT_DOWNLOADED', 'ARTIFACT_STORED', 'ARTIFACT_HASHED', 'ARTIFACT_VERIFIED',
    'AUDIT_RECORDED'].includes(job.state);

  return (
    <div
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={() => onSelect?.(job.id)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.(job.id)}
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-border bg-muted/30 transition hover:border-primary/50 ${onSelect ? 'cursor-pointer' : ''}`}
    >
      {/* Video thumbnail or placeholder */}
      <div className="aspect-video w-full overflow-hidden bg-muted/60 flex items-center justify-center">
        {isReady && job.stored_artifact_url ? (
          <video
            src={job.stored_artifact_url}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            {isRunning && (
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            )}
            {isFailed && <span className="text-2xl">✗</span>}
            {!isRunning && !isFailed && <span className="text-2xl opacity-30">▶</span>}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
            {job.prompt}
          </p>
          <StatusBadge state={job.state} />
        </div>

        {isFailed && job.failure_reason && (
          <p className="text-xs text-destructive line-clamp-2">{job.failure_reason}</p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{job.provider_label?.replace('_', ' ') ?? '—'}</span>
          <span>{new Date(job.created_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// --- Job List (polling) ---

interface JobListProps {
  newJobId?: string;
  onSelect?: (id: string) => void;
}

export function JobList({ newJobId, onSelect }: JobListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs?limit=20');
      const data = (await res.json()) as {
        ok: boolean;
        jobs?: Job[];
        error?: { code: string; message: string };
      };

      if (!res.ok || !data.ok) {
        setError(data.error?.message ?? 'Failed to load jobs.');
        return;
      }

      setJobs(data.jobs ?? []);
      setError(null);
    } catch {
      setError('Network error loading jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();

    // Poll every 5 seconds when there are active jobs
    intervalRef.current = setInterval(() => {
      void fetchJobs();
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchJobs, newJobId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aspect-video rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
        <p className="text-lg font-medium mb-2">No videos yet</p>
        <p className="text-sm">Generate your first video above.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job) =>
        onSelect !== undefined ? (
          <JobCard key={job.id} job={job} onSelect={onSelect} />
        ) : (
          <JobCard key={job.id} job={job} />
        ),
      )}
    </div>
  );
}
