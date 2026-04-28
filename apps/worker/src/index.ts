import type { queue } from '@video-ai/core';

/**
 * Worker entrypoint placeholder. NO queue runtime is wired.
 *
 * To go from this placeholder to a real worker:
 *   1. Pick a queue runtime (BullMQ + Redis is the intended default).
 *   2. Implement `QueueRuntime` from @video-ai/core/queue.
 *   3. Implement handlers for each queue listed in `JOB_QUEUES`.
 *   4. Wire metrics from @video-ai/core/metrics into every handler.
 *   5. Connect the storage adapter (S3/R2/Vercel Blob/...) and provider
 *      adapter implementations after they have been verified against live
 *      provider docs and accounts.
 *   6. Replace this `bootstrap()` with a real start that registers handlers
 *      and exposes /healthz + /metrics on a TCP port.
 */
export const bootstrap = async (): Promise<never> => {
  throw new Error(
    'Worker runtime is not wired. Implement a QueueRuntime adapter from ' +
      '@video-ai/core/queue and register handlers before invoking bootstrap().',
  );
};

export type QueueName = queue.JobQueueName;

if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  bootstrap().catch((e: unknown) => {
    const message = e instanceof Error ? e.message : String(e);
    process.stderr.write(`worker: ${message}\n`);
    process.exit(2);
  });
}
