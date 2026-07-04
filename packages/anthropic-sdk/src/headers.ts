/**
 * Anthropic rate-limit header parsing.
 *
 * Full coverage: 19 headers total
 *   - 1  retry-after
 *   - 12 anthropic-ratelimit-* (requests/tokens/input-tokens/output-tokens × limit/remaining/reset)
 *   - 6  anthropic-priority-*  (requests/tokens × limit/remaining/reset)
 */

// ---------------------------------------------------------------------------
// Header name constants
// ---------------------------------------------------------------------------

export const RETRY_AFTER = 'retry-after';

export const RATELIMIT_HEADERS = [
  'anthropic-ratelimit-requests-limit',
  'anthropic-ratelimit-requests-remaining',
  'anthropic-ratelimit-requests-reset',
  'anthropic-ratelimit-tokens-limit',
  'anthropic-ratelimit-tokens-remaining',
  'anthropic-ratelimit-tokens-reset',
  'anthropic-ratelimit-input-tokens-limit',
  'anthropic-ratelimit-input-tokens-remaining',
  'anthropic-ratelimit-input-tokens-reset',
  'anthropic-ratelimit-output-tokens-limit',
  'anthropic-ratelimit-output-tokens-remaining',
  'anthropic-ratelimit-output-tokens-reset',
] as const;

export const PRIORITY_HEADERS = [
  'anthropic-priority-requests-limit',
  'anthropic-priority-requests-remaining',
  'anthropic-priority-requests-reset',
  'anthropic-priority-tokens-limit',
  'anthropic-priority-tokens-remaining',
  'anthropic-priority-tokens-reset',
] as const;

export const ALL_RATE_LIMIT_HEADERS = [
  RETRY_AFTER,
  ...RATELIMIT_HEADERS,
  ...PRIORITY_HEADERS,
] as const;

export type RateLimitHeaderName = (typeof ALL_RATE_LIMIT_HEADERS)[number];

/** Total number of tracked rate-limit headers: 1 + 12 + 6 = 19. */
export const RATE_LIMIT_HEADER_COUNT = ALL_RATE_LIMIT_HEADERS.length;

// ---------------------------------------------------------------------------
// Parsed types
// ---------------------------------------------------------------------------

export interface RateLimitBucket {
  /** Maximum allowed in the window. */
  readonly limit: number | null;
  /** Remaining capacity. */
  readonly remaining: number | null;
  /** UTC ISO-8601 timestamp at which the bucket resets. `null` when the header
   *  is absent or could not be parsed as a valid date. */
  readonly reset: Date | null;
}

export interface AnthropicRateLimits {
  /** Seconds to wait before retrying (from `retry-after`). `null` if absent. */
  readonly retryAfterSeconds: number | null;

  /** RPM bucket from `anthropic-ratelimit-requests-*`. */
  readonly requests: RateLimitBucket;

  /** Combined-TPM bucket from `anthropic-ratelimit-tokens-*`. */
  readonly tokens: RateLimitBucket;

  /** Input-TPM bucket from `anthropic-ratelimit-input-tokens-*`. */
  readonly inputTokens: RateLimitBucket;

  /** Output-TPM bucket from `anthropic-ratelimit-output-tokens-*`. */
  readonly outputTokens: RateLimitBucket;

  /** Priority RPM bucket from `anthropic-priority-requests-*`. */
  readonly priorityRequests: RateLimitBucket;

  /** Priority TPM bucket from `anthropic-priority-tokens-*`. */
  readonly priorityTokens: RateLimitBucket;
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/** Parse an integer header value; returns `null` for absent or non-integer. */
const parseIntHeader = (value: string | null | undefined): number | null => {
  if (value == null || value.trim() === '') return null;
  const n = Number(value.trim());
  return Number.isFinite(n) && Number.isInteger(n) ? n : null;
};

/**
 * Parse a reset timestamp from an ISO-8601 string.
 * Returns `null` for absent, empty, or non-parseable values rather than
 * throwing, so callers can handle malformed reset dates gracefully.
 */
export const parseResetDate = (value: string | null | undefined): Date | null => {
  if (value == null || value.trim() === '') return null;
  const d = new Date(value.trim());
  return Number.isNaN(d.getTime()) ? null : d;
};

const parseBucket = (
  headers: Readonly<Record<string, string | null | undefined>>,
  prefix: string,
): RateLimitBucket => ({
  limit: parseIntHeader(headers[`${prefix}-limit`]),
  remaining: parseIntHeader(headers[`${prefix}-remaining`]),
  reset: parseResetDate(headers[`${prefix}-reset`]),
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract all 19 Anthropic rate-limit headers from a `Headers`-like object or
 * a plain `Record<string, string>`.
 *
 * Header names are matched case-insensitively via `Headers.get()` when a
 * native `Headers` object is supplied.  When a plain record is supplied,
 * keys are lowercased before lookup so callers do not need to normalise.
 */
export const parseAnthropicRateLimits = (
  source: Headers | Readonly<Record<string, string | null | undefined>>,
): AnthropicRateLimits => {
  const get = (name: string): string | null => {
    if (source instanceof Headers) return source.get(name);
    const lc = name.toLowerCase();
    // Check both exact and lowercase key.
    const record = source as Readonly<Record<string, string | null | undefined>>;
    const val = record[name] ?? record[lc];
    return val ?? null;
  };

  // Build a record so parseBucket can access by key.
  const h: Record<string, string | null> = {};
  for (const name of ALL_RATE_LIMIT_HEADERS) {
    h[name] = get(name);
  }

  const retryAfterRaw = h[RETRY_AFTER];
  const retryAfterNum = retryAfterRaw != null ? Number(retryAfterRaw.trim()) : NaN;
  const retryAfterSeconds =
    Number.isFinite(retryAfterNum) && retryAfterNum >= 0 ? retryAfterNum : null;

  return {
    retryAfterSeconds,
    requests: parseBucket(h, 'anthropic-ratelimit-requests'),
    tokens: parseBucket(h, 'anthropic-ratelimit-tokens'),
    inputTokens: parseBucket(h, 'anthropic-ratelimit-input-tokens'),
    outputTokens: parseBucket(h, 'anthropic-ratelimit-output-tokens'),
    priorityRequests: parseBucket(h, 'anthropic-priority-requests'),
    priorityTokens: parseBucket(h, 'anthropic-priority-tokens'),
  };
};

/**
 * Returns the names of every rate-limit header present in `source`.
 * Useful for logging / observability.
 */
export const presentRateLimitHeaders = (
  source: Headers | Readonly<Record<string, string | null | undefined>>,
): RateLimitHeaderName[] => {
  const present: RateLimitHeaderName[] = [];
  for (const name of ALL_RATE_LIMIT_HEADERS) {
    const val =
      source instanceof Headers
        ? source.get(name)
        : ((source as Readonly<Record<string, string | null | undefined>>)[name] ?? null);
    if (val != null) present.push(name);
  }
  return present;
};
