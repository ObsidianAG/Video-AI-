import { describe, expect, it } from 'vitest';
import {
  ALL_RATE_LIMIT_HEADERS,
  RATE_LIMIT_HEADER_COUNT,
  RATELIMIT_HEADERS,
  PRIORITY_HEADERS,
  RETRY_AFTER,
  parseAnthropicRateLimits,
  parseResetDate,
  presentRateLimitHeaders,
} from './headers.js';

// ---------------------------------------------------------------------------
// Header inventory
// ---------------------------------------------------------------------------

describe('header constants', () => {
  it('has exactly 19 tracked headers (1 + 12 + 6)', () => {
    expect(RATE_LIMIT_HEADER_COUNT).toBe(19);
    expect(ALL_RATE_LIMIT_HEADERS).toHaveLength(19);
  });

  it('includes retry-after', () => {
    expect(ALL_RATE_LIMIT_HEADERS).toContain(RETRY_AFTER);
  });

  it('has exactly 12 anthropic-ratelimit-* headers', () => {
    expect(RATELIMIT_HEADERS).toHaveLength(12);
    for (const h of RATELIMIT_HEADERS) {
      expect(h).toMatch(/^anthropic-ratelimit-/);
    }
  });

  it('has exactly 6 anthropic-priority-* headers', () => {
    expect(PRIORITY_HEADERS).toHaveLength(6);
    for (const h of PRIORITY_HEADERS) {
      expect(h).toMatch(/^anthropic-priority-/);
    }
  });

  it('covers all four ratelimit sub-resources', () => {
    const names = RATELIMIT_HEADERS.join(' ');
    expect(names).toContain('requests');
    expect(names).toContain('tokens');
    expect(names).toContain('input-tokens');
    expect(names).toContain('output-tokens');
  });

  it('covers both priority sub-resources', () => {
    const names = PRIORITY_HEADERS.join(' ');
    expect(names).toContain('requests');
    expect(names).toContain('tokens');
  });
});

// ---------------------------------------------------------------------------
// parseResetDate – malformed reset dates
// ---------------------------------------------------------------------------

describe('parseResetDate', () => {
  it('parses a valid ISO-8601 timestamp', () => {
    const d = parseResetDate('2026-04-30T01:00:00Z');
    expect(d).toBeInstanceOf(Date);
    expect(d!.getTime()).toBeGreaterThan(0);
  });

  it('returns null for an empty string', () => {
    expect(parseResetDate('')).toBeNull();
  });

  it('returns null for a whitespace-only string', () => {
    expect(parseResetDate('   ')).toBeNull();
  });

  it('returns null for a null value', () => {
    expect(parseResetDate(null)).toBeNull();
  });

  it('returns null for an undefined value', () => {
    expect(parseResetDate(undefined)).toBeNull();
  });

  it('returns null for a totally malformed string', () => {
    expect(parseResetDate('not-a-date')).toBeNull();
  });

  it('returns null for a partial date missing time', () => {
    // "2026-04-30" alone parses as UTC midnight, which is valid – but
    // "2026-99-99" is not.
    expect(parseResetDate('2026-99-99')).toBeNull();
  });

  it('returns null for numeric garbage', () => {
    expect(parseResetDate('abc123xyz')).toBeNull();
  });

  it('returns null for a date that overflows JS Date', () => {
    // Far-future date string that new Date() treats as Invalid Date.
    expect(parseResetDate('9999-99-99T99:99:99Z')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseAnthropicRateLimits – from plain record
// ---------------------------------------------------------------------------

describe('parseAnthropicRateLimits (plain record)', () => {
  const fullRecord: Record<string, string> = {
    'retry-after': '30',
    'anthropic-ratelimit-requests-limit': '1000',
    'anthropic-ratelimit-requests-remaining': '750',
    'anthropic-ratelimit-requests-reset': '2026-04-30T00:00:30Z',
    'anthropic-ratelimit-tokens-limit': '100000',
    'anthropic-ratelimit-tokens-remaining': '80000',
    'anthropic-ratelimit-tokens-reset': '2026-04-30T00:01:00Z',
    'anthropic-ratelimit-input-tokens-limit': '80000',
    'anthropic-ratelimit-input-tokens-remaining': '70000',
    'anthropic-ratelimit-input-tokens-reset': '2026-04-30T00:01:00Z',
    'anthropic-ratelimit-output-tokens-limit': '20000',
    'anthropic-ratelimit-output-tokens-remaining': '16000',
    'anthropic-ratelimit-output-tokens-reset': '2026-04-30T00:01:00Z',
    'anthropic-priority-requests-limit': '200',
    'anthropic-priority-requests-remaining': '150',
    'anthropic-priority-requests-reset': '2026-04-30T00:01:00Z',
    'anthropic-priority-tokens-limit': '50000',
    'anthropic-priority-tokens-remaining': '40000',
    'anthropic-priority-tokens-reset': '2026-04-30T00:01:00Z',
  };

  it('parses retry-after correctly', () => {
    const limits = parseAnthropicRateLimits(fullRecord);
    expect(limits.retryAfterSeconds).toBe(30);
  });

  it('parses requests bucket', () => {
    const limits = parseAnthropicRateLimits(fullRecord);
    expect(limits.requests.limit).toBe(1000);
    expect(limits.requests.remaining).toBe(750);
    expect(limits.requests.reset).toBeInstanceOf(Date);
  });

  it('parses tokens bucket', () => {
    const limits = parseAnthropicRateLimits(fullRecord);
    expect(limits.tokens.limit).toBe(100_000);
    expect(limits.tokens.remaining).toBe(80_000);
  });

  it('parses input-tokens bucket', () => {
    const limits = parseAnthropicRateLimits(fullRecord);
    expect(limits.inputTokens.limit).toBe(80_000);
    expect(limits.inputTokens.remaining).toBe(70_000);
  });

  it('parses output-tokens bucket', () => {
    const limits = parseAnthropicRateLimits(fullRecord);
    expect(limits.outputTokens.limit).toBe(20_000);
    expect(limits.outputTokens.remaining).toBe(16_000);
  });

  it('parses priority-requests bucket', () => {
    const limits = parseAnthropicRateLimits(fullRecord);
    expect(limits.priorityRequests.limit).toBe(200);
    expect(limits.priorityRequests.remaining).toBe(150);
  });

  it('parses priority-tokens bucket', () => {
    const limits = parseAnthropicRateLimits(fullRecord);
    expect(limits.priorityTokens.limit).toBe(50_000);
    expect(limits.priorityTokens.remaining).toBe(40_000);
  });

  it('returns nulls when headers are absent', () => {
    const limits = parseAnthropicRateLimits({});
    expect(limits.retryAfterSeconds).toBeNull();
    expect(limits.requests.limit).toBeNull();
    expect(limits.requests.remaining).toBeNull();
    expect(limits.requests.reset).toBeNull();
  });

  it('returns null for malformed integer headers', () => {
    const limits = parseAnthropicRateLimits({
      'anthropic-ratelimit-requests-limit': 'not-a-number',
    });
    expect(limits.requests.limit).toBeNull();
  });

  it('returns null reset for malformed date', () => {
    const limits = parseAnthropicRateLimits({
      'anthropic-ratelimit-requests-reset': 'bad-date!!',
    });
    expect(limits.requests.reset).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseAnthropicRateLimits – from native Headers
// ---------------------------------------------------------------------------

describe('parseAnthropicRateLimits (native Headers)', () => {
  it('parses from a native Headers object', () => {
    const h = new Headers();
    h.set('retry-after', '10');
    h.set('anthropic-ratelimit-requests-limit', '500');
    h.set('anthropic-ratelimit-requests-remaining', '100');
    h.set('anthropic-ratelimit-requests-reset', '2026-04-30T00:02:00Z');

    const limits = parseAnthropicRateLimits(h);
    expect(limits.retryAfterSeconds).toBe(10);
    expect(limits.requests.limit).toBe(500);
    expect(limits.requests.remaining).toBe(100);
    expect(limits.requests.reset).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// presentRateLimitHeaders
// ---------------------------------------------------------------------------

describe('presentRateLimitHeaders', () => {
  it('lists only headers that are present', () => {
    const present = presentRateLimitHeaders({
      'retry-after': '5',
      'anthropic-ratelimit-tokens-limit': '1000',
    });
    expect(present).toContain('retry-after');
    expect(present).toContain('anthropic-ratelimit-tokens-limit');
    expect(present).not.toContain('anthropic-ratelimit-requests-limit');
  });

  it('returns empty array when no headers present', () => {
    expect(presentRateLimitHeaders({})).toHaveLength(0);
  });

  it('reads present headers from a native Headers object', () => {
    const h = new Headers();
    h.set('retry-after', '5');
    h.set('anthropic-priority-tokens-limit', '10000');
    const present = presentRateLimitHeaders(h);
    expect(present).toContain('retry-after');
    expect(present).toContain('anthropic-priority-tokens-limit');
    expect(present).not.toContain('anthropic-ratelimit-requests-limit');
  });
});
