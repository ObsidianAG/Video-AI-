import { EventEmitter } from 'node:events';
import type { RateLimitParser, ThrottleEvent } from './rate-limit-parser.js';

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /**
   * Number of consecutive failures before the breaker opens.
   * @default 5
   */
  failureThreshold?: number;
  /**
   * Milliseconds to wait in OPEN state before transitioning to HALF_OPEN.
   * @default 30_000
   */
  resetTimeoutMs?: number;
  /**
   * If true, also open the circuit when any rate-limit bucket drops below the
   * 20 % threshold (requires a {@link RateLimitParser} to be provided).
   * @default true
   */
  openOnThrottle?: boolean;
  /**
   * Optional callback invoked whenever the circuit state changes.
   */
  onStateChange?: (prev: CircuitState, next: CircuitState) => void;
}

export interface CircuitBreakerEvents {
  open: [reason: string];
  halfOpen: [];
  close: [];
}

/**
 * Shared circuit breaker that trips on 429 responses and on rate-limit
 * throttle signals emitted by {@link RateLimitParser}.
 *
 * Usage:
 * ```ts
 * const breaker = new CircuitBreaker({ failureThreshold: 3 });
 * breaker.integrate(rateLimitParser);
 *
 * // Before every API call:
 * breaker.assertClosed(); // throws CircuitOpenError when OPEN
 *
 * // After a successful API call:
 * breaker.recordSuccess();
 *
 * // After a failure (pass httpStatus to trigger 429 logic):
 * breaker.recordFailure(error, httpStatus);
 * ```
 */
export class CircuitBreaker extends EventEmitter<CircuitBreakerEvents> {
  private _state: CircuitState = 'CLOSED';
  private _failureCount = 0;
  private _openedAt: number | null = null;
  private _resetTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly _failureThreshold: number;
  private readonly _resetTimeoutMs: number;
  private readonly _openOnThrottle: boolean;
  private readonly _onStateChange:
    | ((prev: CircuitState, next: CircuitState) => void)
    | undefined;

  constructor(options: CircuitBreakerOptions = {}) {
    super();
    this._failureThreshold = options.failureThreshold ?? 5;
    this._resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this._openOnThrottle = options.openOnThrottle ?? true;
    this._onStateChange = options.onStateChange ?? undefined;
  }

  get state(): CircuitState {
    return this._state;
  }

  get failureCount(): number {
    return this._failureCount;
  }

  /**
   * Wire this circuit breaker to a {@link RateLimitParser} so that THROTTLE
   * events automatically open the circuit.
   */
  integrate(parser: RateLimitParser): this {
    if (this._openOnThrottle) {
      parser.on('THROTTLE', (event: ThrottleEvent) => {
        this._open(`throttle:${event.reason}`);
      });
      parser.on('rateLimited', () => {
        this._open('rateLimited:429');
      });
    }
    return this;
  }

  /**
   * Throws a {@link CircuitOpenError} when the breaker is OPEN.
   * In HALF_OPEN state the call is allowed through (probe request).
   */
  assertClosed(): void {
    if (this._state === 'OPEN') {
      throw new CircuitOpenError(
        `Circuit breaker is OPEN (failures=${this._failureCount})`,
      );
    }
  }

  /**
   * Record a successful API call.  Resets the failure count and closes the
   * circuit if it was HALF_OPEN.
   */
  recordSuccess(): void {
    this._failureCount = 0;
    if (this._state === 'HALF_OPEN') {
      this._transition('CLOSED');
    }
  }

  /**
   * Record a failed API call.  Automatically detects 429 status codes and
   * increments the failure counter, opening the circuit when the threshold
   * is reached.
   */
  recordFailure(error: unknown, httpStatus?: number): void {
    const is429 = httpStatus === 429;
    if (is429) {
      this._open('failure:429');
      return;
    }

    this._failureCount += 1;
    if (this._failureCount >= this._failureThreshold) {
      this._open(`failure:threshold(${this._failureCount})`);
    }
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private _open(reason: string): void {
    if (this._state === 'OPEN') return;
    this._openedAt = Date.now();
    this._transition('OPEN');
    this.emit('open', reason);
    this._scheduleReset();
  }

  private _scheduleReset(): void {
    if (this._resetTimer) clearTimeout(this._resetTimer);
    this._resetTimer = setTimeout(() => {
      this._resetTimer = null;
      this._transition('HALF_OPEN');
      this.emit('halfOpen');
    }, this._resetTimeoutMs);
    // Allow Node.js process to exit even if the timer is pending
    if (typeof this._resetTimer === 'object' && this._resetTimer !== null) {
      (this._resetTimer as ReturnType<typeof setTimeout>).unref?.();
    }
  }

  private _transition(next: CircuitState): void {
    const prev = this._state;
    if (prev === next) return;
    this._state = next;
    this._onStateChange?.(prev, next);
    if (next === 'CLOSED') {
      this.emit('close');
    }
  }
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class CircuitOpenError extends Error {
  override readonly name = 'CircuitOpenError';
  constructor(message: string) {
    super(message);
  }
}
