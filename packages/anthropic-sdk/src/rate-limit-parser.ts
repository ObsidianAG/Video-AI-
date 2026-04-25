import { EventEmitter } from 'node:events';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const RateLimitBucketSchema = z.object({
  limit: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  /** ISO-8601 reset timestamp */
  reset: z.string().datetime({ offset: true }).nullable(),
});

export type RateLimitBucket = z.infer<typeof RateLimitBucketSchema>;

export const RateLimitStateSchema = z.object({
  /** Requests-per-minute bucket */
  requests: RateLimitBucketSchema,
  /** Aggregate tokens-per-minute bucket */
  tokens: RateLimitBucketSchema,
  /** Input tokens-per-minute bucket */
  inputTokens: RateLimitBucketSchema,
  /** Output tokens-per-minute bucket */
  outputTokens: RateLimitBucketSchema,
  /** Retry-After delay in seconds (present on 429 responses) */
  retryAfterSeconds: z.number().nonnegative().nullable(),
  /** Unix-ms timestamp when this state was captured */
  capturedAt: z.number().int().positive(),
  /** Unique identifier echoed from the x-request-id header */
  requestId: z.string().nullable(),
});

export type RateLimitState = z.infer<typeof RateLimitStateSchema>;

// ---------------------------------------------------------------------------
// Throttle threshold (20 %)
// ---------------------------------------------------------------------------

const THROTTLE_THRESHOLD = 0.2;

function isBelowThreshold(bucket: RateLimitBucket): boolean {
  if (bucket.limit === 0) return false;
  return bucket.remaining / bucket.limit < THROTTLE_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export interface ThrottleEvent {
  reason: 'requests' | 'tokens' | 'inputTokens' | 'outputTokens';
  state: RateLimitState;
}

export interface RateLimitedEvent {
  retryAfterSeconds: number;
  state: RateLimitState;
}

export interface RateLimitParserEvents {
  THROTTLE: [event: ThrottleEvent];
  rateLimited: [event: RateLimitedEvent];
  stateUpdate: [state: RateLimitState];
}

// ---------------------------------------------------------------------------
// Parser implementation
// ---------------------------------------------------------------------------

/**
 * Parses Anthropic rate-limit response headers into a validated
 * {@link RateLimitState}, emits THROTTLE signals when any bucket drops below
 * 20 % remaining, and emits rateLimited when a 429 is encountered.
 *
 * All 14 Anthropic rate-limit-related headers are supported:
 *   anthropic-ratelimit-requests-limit
 *   anthropic-ratelimit-requests-remaining
 *   anthropic-ratelimit-requests-reset
 *   anthropic-ratelimit-tokens-limit
 *   anthropic-ratelimit-tokens-remaining
 *   anthropic-ratelimit-tokens-reset
 *   anthropic-ratelimit-input-tokens-limit
 *   anthropic-ratelimit-input-tokens-remaining
 *   anthropic-ratelimit-input-tokens-reset
 *   anthropic-ratelimit-output-tokens-limit
 *   anthropic-ratelimit-output-tokens-remaining
 *   anthropic-ratelimit-output-tokens-reset
 *   retry-after
 *   x-request-id
 */
export class RateLimitParser extends EventEmitter<RateLimitParserEvents> {
  private _latestState: RateLimitState | null = null;

  get latestState(): RateLimitState | null {
    return this._latestState;
  }

  /**
   * Parse headers from an HTTP response.  Accepts any object with a
   * `get(name: string): string | null` method (Web Fetch Headers,
   * node-fetch, or the Anthropic SDK's response object).
   */
  parse(
    headers: { get(name: string): string | null | undefined },
    httpStatus?: number,
  ): RateLimitState {
    const h = (name: string): string | null =>
      headers.get(name) ?? null;

    const intOrZero = (v: string | null): number =>
      v !== null ? (parseInt(v, 10) || 0) : 0;

    const nullableDate = (v: string | null): string | null => {
      if (!v) return null;
      // Anthropic returns ISO-8601; validate it can be parsed
      return Number.isFinite(Date.parse(v)) ? v : null;
    };

    const retryAfterRaw = h('retry-after');
    const retryAfterSeconds =
      retryAfterRaw !== null ? (parseFloat(retryAfterRaw) || 0) : null;

    const raw: RateLimitState = {
      requests: {
        limit: intOrZero(h('anthropic-ratelimit-requests-limit')),
        remaining: intOrZero(h('anthropic-ratelimit-requests-remaining')),
        reset: nullableDate(h('anthropic-ratelimit-requests-reset')),
      },
      tokens: {
        limit: intOrZero(h('anthropic-ratelimit-tokens-limit')),
        remaining: intOrZero(h('anthropic-ratelimit-tokens-remaining')),
        reset: nullableDate(h('anthropic-ratelimit-tokens-reset')),
      },
      inputTokens: {
        limit: intOrZero(h('anthropic-ratelimit-input-tokens-limit')),
        remaining: intOrZero(h('anthropic-ratelimit-input-tokens-remaining')),
        reset: nullableDate(h('anthropic-ratelimit-input-tokens-reset')),
      },
      outputTokens: {
        limit: intOrZero(h('anthropic-ratelimit-output-tokens-limit')),
        remaining: intOrZero(h('anthropic-ratelimit-output-tokens-remaining')),
        reset: nullableDate(h('anthropic-ratelimit-output-tokens-reset')),
      },
      retryAfterSeconds,
      capturedAt: Date.now(),
      requestId: h('x-request-id'),
    };

    const state = RateLimitStateSchema.parse(raw);
    this._latestState = state;
    this.emit('stateUpdate', state);

    // Emit THROTTLE if any bucket is below the threshold
    const bucketChecks: Array<{
      reason: 'requests' | 'tokens' | 'inputTokens' | 'outputTokens';
      bucket: RateLimitBucket;
    }> = [
      { reason: 'requests', bucket: state.requests },
      { reason: 'tokens', bucket: state.tokens },
      { reason: 'inputTokens', bucket: state.inputTokens },
      { reason: 'outputTokens', bucket: state.outputTokens },
    ];

    for (const { reason, bucket } of bucketChecks) {
      if (isBelowThreshold(bucket)) {
        this.emit('THROTTLE', { reason, state });
      }
    }

    // Emit rateLimited on 429 with a retry-after value
    const retryAfter = state.retryAfterSeconds;
    if (httpStatus === 429 && retryAfter !== null) {
      this.emit('rateLimited', {
        retryAfterSeconds: retryAfter,
        state,
      });
    }

    return state;
  }

  /**
   * Returns the percentage remaining (0–100) for the most constrained bucket,
   * or null when no state has been parsed yet.
   */
  lowestRemainingPct(): number | null {
    const s = this._latestState;
    if (!s) return null;
    const buckets: RateLimitBucket[] = [s.requests, s.tokens, s.inputTokens, s.outputTokens];
    const pcts = buckets
      .filter((b) => b.limit > 0)
      .map((b) => (b.remaining / b.limit) * 100);
    return pcts.length > 0 ? Math.min(...pcts) : null;
  }
}
