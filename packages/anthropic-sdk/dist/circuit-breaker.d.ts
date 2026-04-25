import { EventEmitter } from 'node:events';
import type { RateLimitParser } from './rate-limit-parser.js';
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
export declare class CircuitBreaker extends EventEmitter<CircuitBreakerEvents> {
    private _state;
    private _failureCount;
    private _openedAt;
    private _resetTimer;
    private readonly _failureThreshold;
    private readonly _resetTimeoutMs;
    private readonly _openOnThrottle;
    private readonly _onStateChange;
    constructor(options?: CircuitBreakerOptions);
    get state(): CircuitState;
    get failureCount(): number;
    /**
     * Wire this circuit breaker to a {@link RateLimitParser} so that THROTTLE
     * events automatically open the circuit.
     */
    integrate(parser: RateLimitParser): this;
    /**
     * Throws a {@link CircuitOpenError} when the breaker is OPEN.
     * In HALF_OPEN state the call is allowed through (probe request).
     */
    assertClosed(): void;
    /**
     * Record a successful API call.  Resets the failure count and closes the
     * circuit if it was HALF_OPEN.
     */
    recordSuccess(): void;
    /**
     * Record a failed API call.  Automatically detects 429 status codes and
     * increments the failure counter, opening the circuit when the threshold
     * is reached.
     */
    recordFailure(error: unknown, httpStatus?: number): void;
    private _open;
    private _scheduleReset;
    private _transition;
}
export declare class CircuitOpenError extends Error {
    readonly name = "CircuitOpenError";
    constructor(message: string);
}
//# sourceMappingURL=circuit-breaker.d.ts.map