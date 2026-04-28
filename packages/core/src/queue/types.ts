import type { Result } from '../result.js';
import type { DomainError } from '../errors.js';

export const JOB_QUEUES = [
  'video.submit',
  'video.poll',
  'video.fetch_artifact',
  'video.store',
  'video.hash',
  'video.verify',
  'video.audit',
  'video.finalize',
  'video.webhook',
] as const;
export type JobQueueName = (typeof JOB_QUEUES)[number];

export interface EnqueueOptions {
  readonly idempotencyKey?: string;
  readonly delayMs?: number;
  readonly attempts?: number;
  readonly backoff?: { type: 'exponential' | 'fixed'; delayMs: number };
  readonly priority?: number;
}

export interface QueueJob<T> {
  readonly id: string;
  readonly queue: JobQueueName;
  readonly payload: T;
  readonly enqueued_at: string;
  readonly attempts_made: number;
}

export interface JobHandlerContext {
  readonly jobId: string;
  readonly attempt: number;
  readonly signal: AbortSignal;
  readonly log: (level: 'debug' | 'info' | 'warn' | 'error', msg: string, data?: unknown) => void;
}

export type JobHandler<T> = (
  job: QueueJob<T>,
  ctx: JobHandlerContext,
) => Promise<Result<void, DomainError>>;

/**
 * Queue contract. BullMQ is the intended backing implementation; Temporal or
 * SQS adapters may also implement it. No backing runtime is wired in this slice.
 */
export interface Queue {
  readonly name: JobQueueName;
  enqueue<T>(payload: T, options?: EnqueueOptions): Promise<Result<{ jobId: string }, DomainError>>;
  size(): Promise<number>;
  drain(): Promise<void>;
}

export interface Worker<T> {
  readonly queue: JobQueueName;
  readonly concurrency: number;
  start(handler: JobHandler<T>): Promise<void>;
  stop(graceMs: number): Promise<void>;
}

export interface QueueRuntime {
  queue(name: JobQueueName): Queue;
  worker<T>(name: JobQueueName, concurrency: number): Worker<T>;
  health(): Promise<{ ok: boolean; details: Record<string, unknown> }>;
}
