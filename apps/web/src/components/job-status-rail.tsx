"use client";

import { useEffect, useRef, useState } from "react";
import { useJobStream } from "@/hooks/useJobStream";
import type { Job } from "@/types";

interface Props {
  projectId: string;
}

interface JobWithStream {
  job: Job;
  progress: number;
  latestMessage: string | null;
}

export function JobStatusRail({ projectId }: Props): React.JSX.Element {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs(): Promise<void> {
      try {
        const response = await fetch(
          `/api/jobs-proxy?project_id=${projectId}&page_size=10`,
        );
        if (response.ok) {
          const data = (await response.json()) as { items: Job[] };
          setJobs(data.items);
        }
      } catch {
        // fail silently — show empty state
      } finally {
        setLoading(false);
      }
    }
    void fetchJobs();
  }, [projectId]);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-md bg-muted h-16" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No jobs yet. Submit a generation request to see progress here.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {jobs.map((job) => (
        <JobStatusCard key={job.id} job={job} />
      ))}
    </div>
  );
}

function JobStatusCard({ job }: { job: Job }): React.JSX.Element {
  const { state, progress, message } = useJobStream(job.id, job.state);

  const stateColor: Record<string, string> = {
    SUCCEEDED: "text-green-600",
    FAILED: "text-red-600",
    CANCELLED: "text-gray-500",
    PROVIDER_RUNNING: "text-blue-600",
    UPLOADING: "text-yellow-600",
    QUEUED: "text-blue-400",
    STARTED: "text-blue-500",
    CREATED: "text-gray-400",
  };

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium capitalize">{job.provider}</span>
        <span className={`text-xs font-semibold ${stateColor[state] ?? "text-muted-foreground"}`}>
          {state}
        </span>
      </div>

      {progress !== null && progress > 0 && (
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {message && (
        <p className="text-xs text-muted-foreground truncate">{message}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {new Date(job.createdAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
