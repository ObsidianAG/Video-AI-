import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from '../circuit-breaker.js';
import { RateLimitParser } from '../rate-limit-parser.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 100 });
  });

  it('starts in CLOSED state', () => {
    expect(breaker.state).toBe('CLOSED');
  });

  it('assertClosed does not throw in CLOSED state', () => {
    expect(() => breaker.assertClosed()).not.toThrow();
  });

  it('opens after failureThreshold consecutive failures', () => {
    for (let i = 0; i < 3; i++) {
      breaker.recordFailure(new Error('boom'));
    }
    expect(breaker.state).toBe('OPEN');
  });

  it('does not open before reaching the threshold', () => {
    breaker.recordFailure(new Error('boom'));
    breaker.recordFailure(new Error('boom'));
    expect(breaker.state).toBe('CLOSED');
  });

  it('assertClosed throws CircuitOpenError when OPEN', () => {
    for (let i = 0; i < 3; i++) breaker.recordFailure(new Error('boom'));
    expect(() => breaker.assertClosed()).toThrow(CircuitOpenError);
  });

  it('opens immediately on 429 regardless of failure count', () => {
    breaker.recordFailure(new Error('rate limited'), 429);
    expect(breaker.state).toBe('OPEN');
    expect(breaker.failureCount).toBe(0);
  });

  it('transitions to HALF_OPEN after resetTimeoutMs', async () => {
    for (let i = 0; i < 3; i++) breaker.recordFailure(new Error('boom'));
    expect(breaker.state).toBe('OPEN');
    await new Promise((r) => setTimeout(r, 150));
    expect(breaker.state).toBe('HALF_OPEN');
  });

  it('closes from HALF_OPEN on recordSuccess', async () => {
    for (let i = 0; i < 3; i++) breaker.recordFailure(new Error('boom'));
    await new Promise((r) => setTimeout(r, 150));
    breaker.recordSuccess();
    expect(breaker.state).toBe('CLOSED');
  });

  it('resets failureCount on recordSuccess', () => {
    breaker.recordFailure(new Error('boom'));
    breaker.recordSuccess();
    expect(breaker.failureCount).toBe(0);
  });

  it('emits open event when circuit opens', () => {
    const spy = vi.fn();
    breaker.on('open', spy);
    for (let i = 0; i < 3; i++) breaker.recordFailure(new Error('boom'));
    expect(spy).toHaveBeenCalledOnce();
  });

  it('emits halfOpen event after reset timeout', async () => {
    const spy = vi.fn();
    breaker.on('halfOpen', spy);
    for (let i = 0; i < 3; i++) breaker.recordFailure(new Error('boom'));
    await new Promise((r) => setTimeout(r, 150));
    expect(spy).toHaveBeenCalledOnce();
  });

  it('emits close event when transitioning to CLOSED from HALF_OPEN', async () => {
    const spy = vi.fn();
    breaker.on('close', spy);
    for (let i = 0; i < 3; i++) breaker.recordFailure(new Error('boom'));
    await new Promise((r) => setTimeout(r, 150));
    breaker.recordSuccess();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('calls onStateChange callback on transitions', () => {
    const cb = vi.fn();
    const b = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 50,
      onStateChange: cb,
    });
    b.recordFailure(new Error('boom'));
    expect(cb).toHaveBeenCalledWith('CLOSED', 'OPEN');
  });

  it('does not open twice for the same sequence of failures', () => {
    const spy = vi.fn();
    breaker.on('open', spy);
    for (let i = 0; i < 6; i++) breaker.recordFailure(new Error('boom'));
    expect(spy).toHaveBeenCalledOnce();
  });

  describe('integrate with RateLimitParser', () => {
    it('opens when RateLimitParser emits THROTTLE', () => {
      const parser = new RateLimitParser();
      breaker.integrate(parser);

      parser.emit('THROTTLE', {
        reason: 'tokens',
        state: {} as never,
      });

      expect(breaker.state).toBe('OPEN');
    });

    it('opens when RateLimitParser emits rateLimited', () => {
      const parser = new RateLimitParser();
      breaker.integrate(parser);

      parser.emit('rateLimited', {
        retryAfterSeconds: 30,
        state: {} as never,
      });

      expect(breaker.state).toBe('OPEN');
    });

    it('does not react to THROTTLE when openOnThrottle is false', () => {
      const parser = new RateLimitParser();
      const b = new CircuitBreaker({
        failureThreshold: 3,
        openOnThrottle: false,
      });
      b.integrate(parser);

      parser.emit('THROTTLE', { reason: 'tokens', state: {} as never });
      expect(b.state).toBe('CLOSED');
    });
  });
});
