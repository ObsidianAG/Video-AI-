/**
 * Token-bucket throttle for Anthropic rate limits.
 *
 * Rule: when any tracked bucket's `remaining` falls below 20% of its `limit`,
 * the throttle engages and requests must wait until the bucket resets.
 *
 * "Below 20%" is defined as: remaining / limit < 0.20
 * i.e. strictly less than one-fifth of capacity remains.
 */

import type { AnthropicRateLimits, RateLimitBucket } from './headers.js';

// ---------------------------------------------------------------------------
// Threshold
// ---------------------------------------------------------------------------

/** Fraction below which a bucket is considered "low" and throttling engages. */
export const THROTTLE_THRESHOLD = 0.2;

// ---------------------------------------------------------------------------
// Bucket assessment
// ---------------------------------------------------------------------------

export interface BucketStatus {
  /** Descriptive name of the bucket (e.g. "requests", "inputTokens"). */
  readonly name: string;
  /** Current fill fraction: remaining / limit. `null` when data is absent. */
  readonly fraction: number | null;
  /** Whether this bucket is currently below the throttle threshold. */
  readonly throttled: boolean;
  /** When the bucket resets; `null` when unknown. */
  readonly resetAt: Date | null;
}

const assessBucket = (name: string, bucket: RateLimitBucket): BucketStatus => {
  if (bucket.limit == null || bucket.remaining == null || bucket.limit <= 0) {
    return { name, fraction: null, throttled: false, resetAt: bucket.reset };
  }
  const fraction = bucket.remaining / bucket.limit;
  return {
    name,
    fraction,
    throttled: fraction < THROTTLE_THRESHOLD,
    resetAt: bucket.reset,
  };
};

// ---------------------------------------------------------------------------
// Throttle decision
// ---------------------------------------------------------------------------

export interface ThrottleDecision {
  /** Whether any bucket requires throttling. */
  readonly shouldThrottle: boolean;
  /**
   * Milliseconds to wait before the next safe attempt.
   * Derived from the earliest reset time among all throttled buckets.
   * Returns `0` when no throttling is needed.
   */
  readonly waitMs: number;
  /** Per-bucket status for logging / debugging. */
  readonly buckets: readonly BucketStatus[];
}

/**
 * Evaluate all parsed rate-limit buckets and decide whether to throttle.
 *
 * @param limits  - Parsed rate-limit state from `parseAnthropicRateLimits`.
 * @param now     - Current time (injectable for testing; defaults to `Date.now()`).
 * @returns       A throttle decision including recommended wait time.
 */
export const evaluateThrottle = (
  limits: AnthropicRateLimits,
  now: number = Date.now(),
): ThrottleDecision => {
  const buckets: BucketStatus[] = [
    assessBucket('requests', limits.requests),
    assessBucket('tokens', limits.tokens),
    assessBucket('inputTokens', limits.inputTokens),
    assessBucket('outputTokens', limits.outputTokens),
    assessBucket('priorityRequests', limits.priorityRequests),
    assessBucket('priorityTokens', limits.priorityTokens),
  ];

  const throttled = buckets.filter((b) => b.throttled);
  const shouldThrottle = throttled.length > 0;

  if (!shouldThrottle) {
    return { shouldThrottle: false, waitMs: 0, buckets };
  }

  // Find the earliest reset time among throttled buckets to minimise wait.
  let earliestReset: Date | null = null;
  for (const b of throttled) {
    if (b.resetAt == null) continue;
    if (earliestReset == null || b.resetAt.getTime() < earliestReset.getTime()) {
      earliestReset = b.resetAt;
    }
  }

  const waitMs = earliestReset != null ? Math.max(0, earliestReset.getTime() - now) : 0;

  return { shouldThrottle: true, waitMs, buckets };
};

// ---------------------------------------------------------------------------
// Async helper
// ---------------------------------------------------------------------------

/**
 * If the throttle is engaged, waits until the recommended reset time.
 * Safe to call unconditionally: returns immediately when not throttled.
 *
 * @param limits  - Parsed rate-limit state.
 * @param sleep   - Injectable sleep implementation (defaults to `setTimeout`).
 */
export const applyThrottle = async (
  limits: AnthropicRateLimits,
  sleep: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<ThrottleDecision> => {
  const decision = evaluateThrottle(limits);
  if (decision.shouldThrottle && decision.waitMs > 0) {
    await sleep(decision.waitMs);
  }
  return decision;
};
