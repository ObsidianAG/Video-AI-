import { metrics, ValueType, } from '@opentelemetry/api';
// ---------------------------------------------------------------------------
// Token types tracked
// ---------------------------------------------------------------------------
export const TOKEN_TYPES = [
    'input',
    'cache_creation',
    'cache_read',
    'output',
    'total',
];
async function loadPromClient() {
    // Dynamic import so prom-client remains optional
    return import('prom-client');
}
// ---------------------------------------------------------------------------
// Telemetry class
// ---------------------------------------------------------------------------
/**
 * Records per-token-type histograms and a cache-hit-rate gauge using the
 * OpenTelemetry Metrics API.  Optionally also mirrors the data to Prometheus
 * via the `prom-client` peer dependency.
 */
export class TokenTelemetry {
    _meter;
    _histograms = new Map();
    _cacheHitRateGauge;
    _currentCacheHitRate = 0;
    // Prometheus mirrors (optional)
    _promEnabled;
    _promCounters = null;
    _promGauge = null;
    _promClient = null;
    constructor(options = {}) {
        this._meter =
            options.meter ??
                metrics.getMeterProvider().getMeter(options.meterName ?? '@ai-video/anthropic-sdk');
        this._promEnabled = options.enablePrometheus ?? false;
        this._initOtel();
    }
    // --------------------------------------------------------------------------
    // Public API
    // --------------------------------------------------------------------------
    /**
     * Record token usage from a single API response.
     * Call this after every successful Anthropic API call.
     */
    record(snapshot) {
        this._currentCacheHitRate = snapshot.cacheHitRate;
        for (const type of TOKEN_TYPES) {
            const value = snapshot[type];
            this._histograms.get(type)?.record(value, { token_type: type });
        }
        if (this._promEnabled && this._promCounters && this._promClient) {
            for (const type of TOKEN_TYPES) {
                const counter = this._promCounters.get(type);
                if (counter) {
                    counter.inc({ token_type: type }, snapshot[type]);
                }
            }
            if (this._promGauge) {
                this._promGauge.set({ metric: 'cache_hit_rate' }, snapshot.cacheHitRate);
            }
        }
    }
    /**
     * Initialise the Prometheus instruments.  Must be called (and awaited) if
     * `enablePrometheus` was set to true.
     */
    async initPrometheus() {
        if (!this._promEnabled)
            return;
        this._promClient = await loadPromClient();
        const counters = new Map();
        for (const type of TOKEN_TYPES) {
            counters.set(type, new this._promClient.Counter({
                name: `anthropic_tokens_total_${type}`,
                help: `Total ${type} tokens consumed`,
                labelNames: ['token_type'],
            }));
        }
        this._promCounters = counters;
        this._promGauge = new this._promClient.Gauge({
            name: 'anthropic_cache_hit_rate',
            help: 'Anthropic prompt cache hit rate (0–1)',
            labelNames: ['metric'],
        });
    }
    /**
     * Returns the current Prometheus text exposition (all metrics).
     * Requires `enablePrometheus: true` and {@link initPrometheus} to have been
     * awaited.
     */
    async prometheusText() {
        if (!this._promEnabled || !this._promClient) {
            throw new Error('Prometheus support is not enabled. Set enablePrometheus: true and call initPrometheus().');
        }
        return this._promClient.register.metrics();
    }
    // --------------------------------------------------------------------------
    // Private helpers
    // --------------------------------------------------------------------------
    _initOtel() {
        for (const type of TOKEN_TYPES) {
            const hist = this._meter.createHistogram(`anthropic.tokens.${type}`, {
                description: `Anthropic API ${type} token count per request`,
                unit: 'tokens',
                valueType: ValueType.INT,
            });
            this._histograms.set(type, hist);
        }
        this._cacheHitRateGauge = this._meter.createObservableGauge('anthropic.cache.hit_rate', {
            description: 'Anthropic prompt cache hit rate (0–1)',
            valueType: ValueType.DOUBLE,
        });
        this._cacheHitRateGauge.addCallback((result) => {
            result.observe(this._currentCacheHitRate, {
                metric: 'cache_hit_rate',
            });
        });
    }
}
//# sourceMappingURL=token-telemetry.js.map