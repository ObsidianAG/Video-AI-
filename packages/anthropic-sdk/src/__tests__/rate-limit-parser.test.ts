import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateLimitParser } from '../rate-limit-parser.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHeaders(
  overrides: Record<string, string | null> = {},
): { get(name: string): string | null } {
  const defaults: Record<string, string> = {
    'anthropic-ratelimit-requests-limit': '1000',
    'anthropic-ratelimit-requests-remaining': '800',
    'anthropic-ratelimit-requests-reset': '2030-01-01T00:01:00Z',
    'anthropic-ratelimit-tokens-limit': '80000',
    'anthropic-ratelimit-tokens-remaining': '60000',
    'anthropic-ratelimit-tokens-reset': '2030-01-01T00:01:00Z',
    'anthropic-ratelimit-input-tokens-limit': '60000',
    'anthropic-ratelimit-input-tokens-remaining': '50000',
    'anthropic-ratelimit-input-tokens-reset': '2030-01-01T00:01:00Z',
    'anthropic-ratelimit-output-tokens-limit': '20000',
    'anthropic-ratelimit-output-tokens-remaining': '15000',
    'anthropic-ratelimit-output-tokens-reset': '2030-01-01T00:01:00Z',
    'x-request-id': 'req_test123',
  };
  const map: Record<string, string | null> = { ...defaults, ...overrides };
  return { get: (name: string) => map[name] ?? null };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RateLimitParser', () => {
  let parser: RateLimitParser;

  beforeEach(() => {
    parser = new RateLimitParser();
  });

  it('starts with null latestState', () => {
    expect(parser.latestState).toBeNull();
  });

  it('parses all 14 headers correctly', () => {
    const hdrs = makeHeaders({ 'retry-after': '30' });
    const state = parser.parse(hdrs);

    expect(state.requests.limit).toBe(1000);
    expect(state.requests.remaining).toBe(800);
    expect(state.tokens.limit).toBe(80000);
    expect(state.tokens.remaining).toBe(60000);
    expect(state.inputTokens.limit).toBe(60000);
    expect(state.inputTokens.remaining).toBe(50000);
    expect(state.outputTokens.limit).toBe(20000);
    expect(state.outputTokens.remaining).toBe(15000);
    expect(state.retryAfterSeconds).toBe(30);
    expect(state.requestId).toBe('req_test123');
    expect(state.capturedAt).toBeGreaterThan(0);
  });

  it('stores the latest state on the parser', () => {
    const state = parser.parse(makeHeaders());
    expect(parser.latestState).toBe(state);
  });

  it('emits stateUpdate on every parse', () => {
    const spy = vi.fn();
    parser.on('stateUpdate', spy);
    parser.parse(makeHeaders());
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits THROTTLE when requests bucket < 20%', () => {
    const spy = vi.fn();
    parser.on('THROTTLE', spy);
    // remaining=100, limit=1000 → 10% < 20%
    parser.parse(
      makeHeaders({ 'anthropic-ratelimit-requests-remaining': '100' }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'requests' }),
    );
  });

  it('emits THROTTLE when tokens bucket < 20%', () => {
    const spy = vi.fn();
    parser.on('THROTTLE', spy);
    // remaining=5000, limit=80000 → 6.25% < 20%
    parser.parse(
      makeHeaders({ 'anthropic-ratelimit-tokens-remaining': '5000' }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'tokens' }),
    );
  });

  it('emits THROTTLE when inputTokens bucket < 20%', () => {
    const spy = vi.fn();
    parser.on('THROTTLE', spy);
    parser.parse(
      makeHeaders({ 'anthropic-ratelimit-input-tokens-remaining': '1000' }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'inputTokens' }),
    );
  });

  it('emits THROTTLE when outputTokens bucket < 20%', () => {
    const spy = vi.fn();
    parser.on('THROTTLE', spy);
    parser.parse(
      makeHeaders({ 'anthropic-ratelimit-output-tokens-remaining': '100' }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'outputTokens' }),
    );
  });

  it('does NOT emit THROTTLE when all buckets are above 20%', () => {
    const spy = vi.fn();
    parser.on('THROTTLE', spy);
    parser.parse(makeHeaders()); // all at ~75-80%
    expect(spy).not.toHaveBeenCalled();
  });

  it('emits rateLimited on 429 with retry-after', () => {
    const spy = vi.fn();
    parser.on('rateLimited', spy);
    parser.parse(makeHeaders({ 'retry-after': '60' }), 429);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ retryAfterSeconds: 60 }),
    );
  });

  it('does NOT emit rateLimited on 200 with retry-after header', () => {
    const spy = vi.fn();
    parser.on('rateLimited', spy);
    parser.parse(makeHeaders({ 'retry-after': '60' }), 200);
    expect(spy).not.toHaveBeenCalled();
  });

  it('does NOT emit rateLimited on 429 without retry-after header', () => {
    const spy = vi.fn();
    parser.on('rateLimited', spy);
    parser.parse(makeHeaders({ 'retry-after': null }), 429);
    expect(spy).not.toHaveBeenCalled();
  });

  it('lowestRemainingPct returns null before first parse', () => {
    expect(parser.lowestRemainingPct()).toBeNull();
  });

  it('lowestRemainingPct returns the minimum percentage', () => {
    // requests: 100/1000 = 10%, others are ~75%
    parser.parse(
      makeHeaders({ 'anthropic-ratelimit-requests-remaining': '100' }),
    );
    expect(parser.lowestRemainingPct()).toBeCloseTo(10, 0);
  });

  it('handles missing headers gracefully (zeros)', () => {
    const empty = { get: (_: string) => null };
    const state = parser.parse(empty);
    expect(state.requests.limit).toBe(0);
    expect(state.retryAfterSeconds).toBeNull();
    expect(state.requestId).toBeNull();
  });

  it('handles invalid reset date gracefully (null)', () => {
    const state = parser.parse(
      makeHeaders({ 'anthropic-ratelimit-requests-reset': 'not-a-date' }),
    );
    expect(state.requests.reset).toBeNull();
  });
});
