import { type Meter } from '@opentelemetry/api';
export declare const TOKEN_TYPES: readonly ["input", "cache_creation", "cache_read", "output", "total"];
export type TokenType = (typeof TOKEN_TYPES)[number];
export interface TokenUsageSnapshot {
    input: number;
    cache_creation: number;
    cache_read: number;
    output: number;
    total: number;
    /** Cache hit rate at the time this snapshot was recorded (0–1). */
    cacheHitRate: number;
}
export interface TokenTelemetryOptions {
    /**
     * OpenTelemetry Meter to use.  Falls back to the global meter provider.
     */
    meter?: Meter;
    /**
     * Name of the OTel meter (used when meter is not provided directly).
     * @default '@ai-video/anthropic-sdk'
     */
    meterName?: string;
    /**
     * When true, enables a Prometheus-compatible text exposition endpoint
     * via the `prometheusText()` method.  Requires the optional `prom-client`
     * peer dependency.
     * @default false
     */
    enablePrometheus?: boolean;
}
/**
 * Records per-token-type histograms and a cache-hit-rate gauge using the
 * OpenTelemetry Metrics API.  Optionally also mirrors the data to Prometheus
 * via the `prom-client` peer dependency.
 */
export declare class TokenTelemetry {
    private readonly _meter;
    private readonly _histograms;
    private _cacheHitRateGauge;
    private _currentCacheHitRate;
    private _promEnabled;
    private _promCounters;
    private _promGauge;
    private _promClient;
    constructor(options?: TokenTelemetryOptions);
    /**
     * Record token usage from a single API response.
     * Call this after every successful Anthropic API call.
     */
    record(snapshot: TokenUsageSnapshot): void;
    /**
     * Initialise the Prometheus instruments.  Must be called (and awaited) if
     * `enablePrometheus` was set to true.
     */
    initPrometheus(): Promise<void>;
    /**
     * Returns the current Prometheus text exposition (all metrics).
     * Requires `enablePrometheus: true` and {@link initPrometheus} to have been
     * awaited.
     */
    prometheusText(): Promise<string>;
    private _initOtel;
}
//# sourceMappingURL=token-telemetry.d.ts.map