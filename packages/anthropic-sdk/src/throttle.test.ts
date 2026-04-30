import { describe, expect, it } from 'vitest';
import { THROTTLE_THRESHOLD, evaluateThrottle, applyThrottle } from './throttle.js';
import type { AnthropicRateLimits } from './headers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const resetIn = (ms: number): Date => new Date(Date.now() + ms);

const makeLimits = (overrides: Partial<AnthropicRateLimits> = {}): AnthropicRateLimits => ({
  retryAfterSeconds: null,
  requests: { limit: 1000, remaining: 900, reset: null },
  tokens: { limit: 100_000, remaining: 90_000, reset: null },
  inputTokens: { limit: 80_000, remaining: 72_000, reset: null },
  outputTokens: { limit: 20_000, remaining: 18_000, reset: null },
  priorityRequests: { limit: 200, remaining: 180, reset: null },
  priorityTokens: { limit: 50_000, remaining: 45_000, reset: null },
  ...overrides,
});

// ---------------------------------------------------------------------------
// THROTTLE_THRESHOLD constant
// ---------------------------------------------------------------------------

describe('THROTTLE_THRESHOLD', () => {
  it('is 0.2 (20%)', () => {
    expect(THROTTLE_THRESHOLD).toBe(0.2);
  });
});

// ---------------------------------------------------------------------------
// evaluateThrottle – no throttling needed
// ---------------------------------------------------------------------------

describe('evaluateThrottle – healthy buckets', () => {
  it('does not throttle when all buckets are above 20%', () => {
    const decision = evaluateThrottle(makeLimits());
    expect(decision.shouldThrottle).toBe(false);
    expect(decision.waitMs).toBe(0);
  });

  it('returns one BucketStatus per tracked bucket (6 total)', () => {
    const decision = evaluateThrottle(makeLimits());
    expect(decision.buckets).toHaveLength(6);
  });

  it('reports correct fraction for a healthy bucket', () => {
    const decision = evaluateThrottle(makeLimits());
    // requests: 900/1000 = 0.9
    const req = decision.buckets.find((b) => b.name === 'requests')!;
    expect(req.fraction).toBeCloseTo(0.9);
    expect(req.throttled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// evaluateThrottle – throttle triggers at < 20%
// ---------------------------------------------------------------------------

describe('evaluateThrottle – throttle trigger', () => {
  it('throttles when requests remaining < 20% of limit', () => {
    const resetAt = resetIn(5_000);
    const limits = makeLimits({
      requests: { limit: 1000, remaining: 199, reset: resetAt }, // 19.9% < 20%
    });
    const decision = evaluateThrottle(limits);
    expect(decision.shouldThrottle).toBe(true);
  });

  it('does NOT throttle when remaining is exactly 20%', () => {
    const limits = makeLimits({
      requests: { limit: 1000, remaining: 200, reset: null }, // exactly 20%
    });
    const decision = evaluateThrottle(limits);
    expect(decision.shouldThrottle).toBe(false);
  });

  it('throttles when token bucket remaining < 20%', () => {
    const limits = makeLimits({
      tokens: { limit: 100_000, remaining: 19_999, reset: resetIn(3_000) },
    });
    expect(evaluateThrottle(limits).shouldThrottle).toBe(true);
  });

  it('throttles when inputTokens remaining < 20%', () => {
    const limits = makeLimits({
      inputTokens: { limit: 80_000, remaining: 15_999, reset: resetIn(2_000) },
    });
    expect(evaluateThrottle(limits).shouldThrottle).toBe(true);
  });

  it('throttles when outputTokens remaining < 20%', () => {
    const limits = makeLimits({
      outputTokens: { limit: 20_000, remaining: 3_999, reset: resetIn(1_000) },
    });
    expect(evaluateThrottle(limits).shouldThrottle).toBe(true);
  });

  it('throttles when priorityRequests remaining < 20%', () => {
    const limits = makeLimits({
      priorityRequests: { limit: 200, remaining: 39, reset: resetIn(4_000) },
    });
    expect(evaluateThrottle(limits).shouldThrottle).toBe(true);
  });

  it('throttles when priorityTokens remaining < 20%', () => {
    const limits = makeLimits({
      priorityTokens: { limit: 50_000, remaining: 9_999, reset: resetIn(4_000) },
    });
    expect(evaluateThrottle(limits).shouldThrottle).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// evaluateThrottle – waitMs calculation
// ---------------------------------------------------------------------------

describe('evaluateThrottle – waitMs', () => {
  it('returns a positive waitMs when reset is in the future', () => {
    const resetAt = resetIn(5_000);
    const limits = makeLimits({
      requests: { limit: 1000, remaining: 50, reset: resetAt },
    });
    const decision = evaluateThrottle(limits, Date.now());
    expect(decision.waitMs).toBeGreaterThan(0);
    expect(decision.waitMs).toBeLessThanOrEqual(5_000);
  });

  it('returns 0 waitMs when reset is in the past', () => {
    const resetAt = new Date(Date.now() - 1_000);
    const limits = makeLimits({
      requests: { limit: 1000, remaining: 10, reset: resetAt },
    });
    const decision = evaluateThrottle(limits, Date.now());
    expect(decision.waitMs).toBe(0);
  });

  it('picks the earliest reset time when multiple buckets are throttled', () => {
    const now = Date.now();
    const soon = new Date(now + 2_000);
    const later = new Date(now + 8_000);
    const limits = makeLimits({
      requests: { limit: 1000, remaining: 10, reset: later },
      tokens: { limit: 100_000, remaining: 100, reset: soon },
    });
    const decision = evaluateThrottle(limits, now);
    // waitMs should be derived from the soonest reset (~2s)
    expect(decision.waitMs).toBeLessThanOrEqual(2_100);
    expect(decision.waitMs).toBeGreaterThan(1_000);
  });

  it('returns 0 waitMs when throttled bucket has no reset date', () => {
    const limits = makeLimits({
      requests: { limit: 1000, remaining: 10, reset: null },
    });
    const decision = evaluateThrottle(limits);
    expect(decision.shouldThrottle).toBe(true);
    expect(decision.waitMs).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// evaluateThrottle – null/missing limit data
// ---------------------------------------------------------------------------

describe('evaluateThrottle – null data', () => {
  it('does not throttle when limit is null (no data)', () => {
    const limits = makeLimits({
      requests: { limit: null, remaining: null, reset: null },
    });
    const decision = evaluateThrottle(limits);
    const req = decision.buckets.find((b) => b.name === 'requests')!;
    expect(req.fraction).toBeNull();
    expect(req.throttled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyThrottle – async
// ---------------------------------------------------------------------------

describe('applyThrottle', () => {
  it('returns immediately when not throttled', async () => {
    let slept = false;
    const sleep = async (_ms: number) => {
      slept = true;
    };
    const limits = makeLimits();
    const decision = await applyThrottle(limits, sleep);
    expect(decision.shouldThrottle).toBe(false);
    expect(slept).toBe(false);
  });

  it('calls sleep with waitMs when throttled', async () => {
    let sleptMs = 0;
    const sleep = async (ms: number) => {
      sleptMs = ms;
    };
    const resetAt = resetIn(3_000);
    const limits = makeLimits({
      requests: { limit: 1000, remaining: 10, reset: resetAt },
    });
    const decision = await applyThrottle(limits, sleep);
    expect(decision.shouldThrottle).toBe(true);
    expect(sleptMs).toBeGreaterThan(0);
  });
});
