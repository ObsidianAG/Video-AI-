import { EventEmitter } from 'node:events';
import { z } from 'zod';
declare const RateLimitBucketSchema: z.ZodObject<{
    limit: z.ZodNumber;
    remaining: z.ZodNumber;
    /** ISO-8601 reset timestamp */
    reset: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    remaining: number;
    reset: string | null;
}, {
    limit: number;
    remaining: number;
    reset: string | null;
}>;
export type RateLimitBucket = z.infer<typeof RateLimitBucketSchema>;
export declare const RateLimitStateSchema: z.ZodObject<{
    /** Requests-per-minute bucket */
    requests: z.ZodObject<{
        limit: z.ZodNumber;
        remaining: z.ZodNumber;
        /** ISO-8601 reset timestamp */
        reset: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        remaining: number;
        reset: string | null;
    }, {
        limit: number;
        remaining: number;
        reset: string | null;
    }>;
    /** Aggregate tokens-per-minute bucket */
    tokens: z.ZodObject<{
        limit: z.ZodNumber;
        remaining: z.ZodNumber;
        /** ISO-8601 reset timestamp */
        reset: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        remaining: number;
        reset: string | null;
    }, {
        limit: number;
        remaining: number;
        reset: string | null;
    }>;
    /** Input tokens-per-minute bucket */
    inputTokens: z.ZodObject<{
        limit: z.ZodNumber;
        remaining: z.ZodNumber;
        /** ISO-8601 reset timestamp */
        reset: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        remaining: number;
        reset: string | null;
    }, {
        limit: number;
        remaining: number;
        reset: string | null;
    }>;
    /** Output tokens-per-minute bucket */
    outputTokens: z.ZodObject<{
        limit: z.ZodNumber;
        remaining: z.ZodNumber;
        /** ISO-8601 reset timestamp */
        reset: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        remaining: number;
        reset: string | null;
    }, {
        limit: number;
        remaining: number;
        reset: string | null;
    }>;
    /** Retry-After delay in seconds (present on 429 responses) */
    retryAfterSeconds: z.ZodNullable<z.ZodNumber>;
    /** Unix-ms timestamp when this state was captured */
    capturedAt: z.ZodNumber;
    /** Unique identifier echoed from the x-request-id header */
    requestId: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    requests: {
        limit: number;
        remaining: number;
        reset: string | null;
    };
    tokens: {
        limit: number;
        remaining: number;
        reset: string | null;
    };
    inputTokens: {
        limit: number;
        remaining: number;
        reset: string | null;
    };
    outputTokens: {
        limit: number;
        remaining: number;
        reset: string | null;
    };
    retryAfterSeconds: number | null;
    capturedAt: number;
    requestId: string | null;
}, {
    requests: {
        limit: number;
        remaining: number;
        reset: string | null;
    };
    tokens: {
        limit: number;
        remaining: number;
        reset: string | null;
    };
    inputTokens: {
        limit: number;
        remaining: number;
        reset: string | null;
    };
    outputTokens: {
        limit: number;
        remaining: number;
        reset: string | null;
    };
    retryAfterSeconds: number | null;
    capturedAt: number;
    requestId: string | null;
}>;
export type RateLimitState = z.infer<typeof RateLimitStateSchema>;
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
export declare class RateLimitParser extends EventEmitter<RateLimitParserEvents> {
    private _latestState;
    get latestState(): RateLimitState | null;
    /**
     * Parse headers from an HTTP response.  Accepts any object with a
     * `get(name: string): string | null` method (Web Fetch Headers,
     * node-fetch, or the Anthropic SDK's response object).
     */
    parse(headers: {
        get(name: string): string | null | undefined;
    }, httpStatus?: number): RateLimitState;
    /**
     * Returns the percentage remaining (0–100) for the most constrained bucket,
     * or null when no state has been parsed yet.
     */
    lowestRemainingPct(): number | null;
}
export {};
//# sourceMappingURL=rate-limit-parser.d.ts.map