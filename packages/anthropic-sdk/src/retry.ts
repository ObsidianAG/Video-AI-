/**
 * 429 retry-after handler.
 *
 * When Anthropic returns HTTP 429, the `retry-after` header contains the
 * number of seconds to wait before re-sending the request.  This module
 * provides a typed wrapper around that behaviour.
 */

import { parseAnthropicRateLimits } from './headers.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetryContext {
  /** HTTP status code of the response. */
  readonly status: number;
  /** Response headers (native `Headers` or a plain record). */
  readonly headers: Headers | Readonly<Record<string, string | null | undefined>>;
}

export interface RetryDecision {
  /** Whether the caller should retry this request. */
  readonly shouldRetry: boolean;
  /**
   * Milliseconds to wait before retrying.
   * `0` when `shouldRetry` is `false` or when the server did not provide a
   * `retry-after` header (caller should use its own back-off strategy).
   */
  readonly waitMs: number;
  /** The raw `retry-after` value in seconds, or `null` if absent. */
  readonly retryAfterSeconds: number | null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Inspect an HTTP response context and decide whether to retry.
 *
 * Only HTTP 429 (Too Many Requests) triggers a retry recommendation.
 * The wait time is derived from the `retry-after` header; when absent,
 * `waitMs` is `0` and the caller should apply its own back-off.
 */
export const evaluateRetry = (ctx: RetryContext): RetryDecision => {
  if (ctx.status !== 429) {
    return { shouldRetry: false, waitMs: 0, retryAfterSeconds: null };
  }

  const limits = parseAnthropicRateLimits(ctx.headers);
  const retryAfterSeconds = limits.retryAfterSeconds;
  const waitMs = retryAfterSeconds != null ? Math.ceil(retryAfterSeconds * 1000) : 0;

  return { shouldRetry: true, waitMs, retryAfterSeconds };
};

// ---------------------------------------------------------------------------
// Async helper
// ---------------------------------------------------------------------------

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3). */
  readonly maxAttempts?: number;
  /**
   * Injectable sleep implementation (defaults to `setTimeout`).
   * Provided so tests can run synchronously via fake timers or by passing
   * a no-op.
   */
  readonly sleep?: (ms: number) => Promise<void>;
}

/**
 * Execute `fn` and automatically retry on HTTP 429, honouring the
 * `retry-after` header for the wait period.
 *
 * @param fn       - Async function that performs the HTTP request and returns a
 *                   `RetryContext`.  The return value is wrapped so callers can
 *                   access the final response.
 * @param options  - Retry behaviour options.
 * @returns        The last `RetryContext` received (success or exhausted retries).
 */
export const withRetry = async <T extends RetryContext>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> => {
  const maxAttempts = options.maxAttempts ?? 3;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  let lastCtx: T | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const ctx = await fn();
    lastCtx = ctx;

    const decision = evaluateRetry(ctx);
    if (!decision.shouldRetry) return ctx;

    const isLastAttempt = attempt === maxAttempts - 1;
    if (isLastAttempt) break;

    if (decision.waitMs > 0) {
      await sleep(decision.waitMs);
    }
  }

  return lastCtx!;
};
