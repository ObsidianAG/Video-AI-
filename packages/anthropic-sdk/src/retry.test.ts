import { describe, expect, it } from 'vitest';
import { evaluateRetry, withRetry } from './retry.js';
import type { RetryContext } from './retry.js';

// ---------------------------------------------------------------------------
// evaluateRetry
// ---------------------------------------------------------------------------

describe('evaluateRetry – non-429 responses', () => {
  const statuses = [200, 400, 401, 403, 404, 500, 503];

  for (const status of statuses) {
    it(`does not retry on HTTP ${status}`, () => {
      const decision = evaluateRetry({ status, headers: {} });
      expect(decision.shouldRetry).toBe(false);
      expect(decision.waitMs).toBe(0);
      expect(decision.retryAfterSeconds).toBeNull();
    });
  }
});

describe('evaluateRetry – 429 with retry-after header', () => {
  it('recommends retry with correct wait time', () => {
    const decision = evaluateRetry({
      status: 429,
      headers: { 'retry-after': '30' },
    });
    expect(decision.shouldRetry).toBe(true);
    expect(decision.retryAfterSeconds).toBe(30);
    expect(decision.waitMs).toBe(30_000);
  });

  it('converts fractional retry-after seconds to milliseconds', () => {
    const decision = evaluateRetry({
      status: 429,
      headers: { 'retry-after': '1.5' },
    });
    expect(decision.shouldRetry).toBe(true);
    // Math.ceil(1.5 * 1000) = Math.ceil(1500) = 1500
    expect(decision.waitMs).toBe(1_500);
  });

  it('rounds up sub-millisecond fractional seconds', () => {
    const decision = evaluateRetry({
      status: 429,
      headers: { 'retry-after': '1.0001' },
    });
    expect(decision.shouldRetry).toBe(true);
    // Math.ceil(1.0001 * 1000) = Math.ceil(1000.1) = 1001
    expect(decision.waitMs).toBe(1_001);
  });

  it('handles retry-after = 0', () => {
    const decision = evaluateRetry({
      status: 429,
      headers: { 'retry-after': '0' },
    });
    expect(decision.shouldRetry).toBe(true);
    expect(decision.waitMs).toBe(0);
  });

  it('handles large retry-after values', () => {
    const decision = evaluateRetry({
      status: 429,
      headers: { 'retry-after': '3600' },
    });
    expect(decision.waitMs).toBe(3_600_000);
  });
});

describe('evaluateRetry – 429 without retry-after header', () => {
  it('recommends retry but waitMs is 0', () => {
    const decision = evaluateRetry({ status: 429, headers: {} });
    expect(decision.shouldRetry).toBe(true);
    expect(decision.waitMs).toBe(0);
    expect(decision.retryAfterSeconds).toBeNull();
  });

  it('handles malformed retry-after gracefully', () => {
    const decision = evaluateRetry({
      status: 429,
      headers: { 'retry-after': 'not-a-number' },
    });
    expect(decision.shouldRetry).toBe(true);
    expect(decision.waitMs).toBe(0);
    expect(decision.retryAfterSeconds).toBeNull();
  });
});

describe('evaluateRetry – native Headers', () => {
  it('reads retry-after from native Headers object', () => {
    const h = new Headers();
    h.set('retry-after', '45');
    const decision = evaluateRetry({ status: 429, headers: h });
    expect(decision.retryAfterSeconds).toBe(45);
    expect(decision.waitMs).toBe(45_000);
  });
});

// ---------------------------------------------------------------------------
// withRetry – 429 retry loop
// ---------------------------------------------------------------------------

describe('withRetry', () => {
  it('returns immediately on a 200 response (no retry)', async () => {
    let callCount = 0;
    const fn = async (): Promise<RetryContext> => {
      callCount++;
      return { status: 200, headers: {} };
    };
    const ctx = await withRetry(fn);
    expect(ctx.status).toBe(200);
    expect(callCount).toBe(1);
  });

  it('retries on 429 and returns the final response', async () => {
    let callCount = 0;
    const responses: RetryContext[] = [
      { status: 429, headers: { 'retry-after': '1' } },
      { status: 429, headers: { 'retry-after': '1' } },
      { status: 200, headers: {} },
    ];
    const fn = async (): Promise<RetryContext> => {
      return responses[callCount++]!;
    };
    const noopSleep = async (_ms: number) => {};
    const ctx = await withRetry(fn, { sleep: noopSleep });
    expect(ctx.status).toBe(200);
    expect(callCount).toBe(3);
  });

  it('stops after maxAttempts even if still getting 429', async () => {
    let callCount = 0;
    const fn = async (): Promise<RetryContext> => {
      callCount++;
      return { status: 429, headers: { 'retry-after': '1' } };
    };
    const noopSleep = async (_ms: number) => {};
    const ctx = await withRetry(fn, { maxAttempts: 3, sleep: noopSleep });
    expect(callCount).toBe(3);
    expect(ctx.status).toBe(429);
  });

  it('calls sleep with the retry-after wait time', async () => {
    const sleptMs: number[] = [];
    const sleep = async (ms: number) => {
      sleptMs.push(ms);
    };
    let callCount = 0;
    const fn = async (): Promise<RetryContext> => {
      if (callCount++ === 0) return { status: 429, headers: { 'retry-after': '10' } };
      return { status: 200, headers: {} };
    };
    await withRetry(fn, { sleep });
    expect(sleptMs).toHaveLength(1);
    expect(sleptMs[0]).toBe(10_000);
  });

  it('does not sleep when retry-after is absent (waitMs=0)', async () => {
    const sleptMs: number[] = [];
    const sleep = async (ms: number) => {
      sleptMs.push(ms);
    };
    let callCount = 0;
    const fn = async (): Promise<RetryContext> => {
      if (callCount++ === 0) return { status: 429, headers: {} };
      return { status: 200, headers: {} };
    };
    await withRetry(fn, { sleep });
    // sleep should not be called when waitMs is 0
    expect(sleptMs).toHaveLength(0);
  });

  it('uses maxAttempts = 3 by default', async () => {
    let callCount = 0;
    const fn = async (): Promise<RetryContext> => {
      callCount++;
      return { status: 429, headers: {} };
    };
    await withRetry(fn, { sleep: async () => {} });
    expect(callCount).toBe(3);
  });
});
