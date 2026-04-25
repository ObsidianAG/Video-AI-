import { EventEmitter } from 'node:events';
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
export class CircuitBreaker extends EventEmitter {
    _state = 'CLOSED';
    _failureCount = 0;
    _openedAt = null;
    _resetTimer = null;
    _failureThreshold;
    _resetTimeoutMs;
    _openOnThrottle;
    _onStateChange;
    constructor(options = {}) {
        super();
        this._failureThreshold = options.failureThreshold ?? 5;
        this._resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
        this._openOnThrottle = options.openOnThrottle ?? true;
        this._onStateChange = options.onStateChange ?? undefined;
    }
    get state() {
        return this._state;
    }
    get failureCount() {
        return this._failureCount;
    }
    /**
     * Wire this circuit breaker to a {@link RateLimitParser} so that THROTTLE
     * events automatically open the circuit.
     */
    integrate(parser) {
        if (this._openOnThrottle) {
            parser.on('THROTTLE', (event) => {
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
    assertClosed() {
        if (this._state === 'OPEN') {
            throw new CircuitOpenError(`Circuit breaker is OPEN (failures=${this._failureCount})`);
        }
    }
    /**
     * Record a successful API call.  Resets the failure count and closes the
     * circuit if it was HALF_OPEN.
     */
    recordSuccess() {
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
    recordFailure(error, httpStatus) {
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
    _open(reason) {
        if (this._state === 'OPEN')
            return;
        this._openedAt = Date.now();
        this._transition('OPEN');
        this.emit('open', reason);
        this._scheduleReset();
    }
    _scheduleReset() {
        if (this._resetTimer)
            clearTimeout(this._resetTimer);
        this._resetTimer = setTimeout(() => {
            this._resetTimer = null;
            this._transition('HALF_OPEN');
            this.emit('halfOpen');
        }, this._resetTimeoutMs);
        // Allow Node.js process to exit even if the timer is pending
        if (typeof this._resetTimer === 'object' && this._resetTimer !== null) {
            this._resetTimer.unref?.();
        }
    }
    _transition(next) {
        const prev = this._state;
        if (prev === next)
            return;
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
    name = 'CircuitOpenError';
    constructor(message) {
        super(message);
    }
}
//# sourceMappingURL=circuit-breaker.js.map