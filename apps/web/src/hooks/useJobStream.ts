"use client";

import { useEffect, useRef, useState } from "react";
import type { JobSSEEvent, JobState } from "@/types";

interface JobStreamState {
  state: JobState;
  progress: number | null;
  message: string | null;
  outputAssetId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

const TERMINAL_STATES: ReadonlySet<JobState> = new Set([
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

/**
 * Subscribes to the SSE stream for a job.
 * Automatically closes the connection on terminal state or component unmount.
 */
export function useJobStream(
  jobId: string,
  initialState: JobState,
): JobStreamState {
  const [streamState, setStreamState] = useState<JobStreamState>({
    state: initialState,
    progress: null,
    message: null,
    outputAssetId: null,
    errorCode: null,
    errorMessage: null,
  });

  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Don't connect for already-terminal jobs
    if (TERMINAL_STATES.has(initialState)) return;

    const es = new EventSource(`/api/jobs/${jobId}/stream-proxy`);
    esRef.current = es;

    es.onmessage = (event: MessageEvent<string>) => {
      let data: JobSSEEvent;
      try {
        data = JSON.parse(event.data) as JobSSEEvent;
      } catch {
        return;
      }

      setStreamState({
        state: data.state,
        progress: data.progress ?? null,
        message: data.message ?? null,
        outputAssetId: data.outputAssetId ?? null,
        errorCode: data.errorCode ?? null,
        errorMessage: data.errorMessage ?? null,
      });

      if (TERMINAL_STATES.has(data.state)) {
        es.close();
      }
    };

    es.onerror = () => {
      // EventSource will auto-reconnect; on terminal, we close manually above
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [jobId, initialState]);

  return streamState;
}
