import {
  type Meter,
  type ObservableGauge,
  type Histogram,
  metrics,
  ValueType,
} from '@opentelemetry/api';

// ---------------------------------------------------------------------------
// Token types tracked
// ---------------------------------------------------------------------------

export const TOKEN_TYPES = [
  'input',
  'cache_creation',
  'cache_read',
  'output',
  'total',
] as const;

export type TokenType = (typeof TOKEN_TYPES)[number];

// ---------------------------------------------------------------------------
// Snapshot type
// ---------------------------------------------------------------------------

export interface TokenUsageSnapshot {
  input: number;
  cache_creation: number;
  cache_read: number;
  output: number;
  total: number;
  /** Cache hit rate at the time this snapshot was recorded (0–1). */
  cacheHitRate: number;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Prometheus lazy import helper
// ---------------------------------------------------------------------------

interface PromClient {
  Counter: new (opts: {
    name: string;
    help: string;
    labelNames?: string[];
  }) => { inc(labels: Record<string, string>, value: number): void };
  Gauge: new (opts: {
    name: string;
    help: string;
    labelNames?: string[];
  }) => { set(labels: Record<string, string>, value: number): void };
  register: { metrics(): Promise<string> };
}

async function loadPromClient(): Promise<PromClient> {
  // Dynamic import so prom-client remains optional
  return import('prom-client') as Promise<PromClient>;
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
  private readonly _meter: Meter;
  private readonly _histograms: Map<TokenType, Histogram> = new Map();
  private _cacheHitRateGauge!: ObservableGauge;
  private _currentCacheHitRate = 0;

  // Prometheus mirrors (optional)
  private _promEnabled: boolean;
  private _promCounters: Map<TokenType, unknown> | null = null;
  private _promGauge: unknown | null = null;
  private _promClient: PromClient | null = null;

  constructor(options: TokenTelemetryOptions = {}) {
    this._meter =
      options.meter ??
      metrics.getMeterProvider().getMeter(
        options.meterName ?? '@ai-video/anthropic-sdk',
      );
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
  record(snapshot: TokenUsageSnapshot): void {
    this._currentCacheHitRate = snapshot.cacheHitRate;

    for (const type of TOKEN_TYPES) {
      const value = snapshot[type];
      this._histograms.get(type)?.record(value, { token_type: type });
    }

    if (this._promEnabled && this._promCounters && this._promClient) {
      for (const type of TOKEN_TYPES) {
        const counter = this._promCounters.get(type) as
          | { inc(labels: Record<string, string>, value: number): void }
          | undefined;
        if (counter) {
          counter.inc({ token_type: type }, snapshot[type]);
        }
      }
      if (this._promGauge) {
        (
          this._promGauge as {
            set(labels: Record<string, string>, value: number): void;
          }
        ).set({ metric: 'cache_hit_rate' }, snapshot.cacheHitRate);
      }
    }
  }

  /**
   * Initialise the Prometheus instruments.  Must be called (and awaited) if
   * `enablePrometheus` was set to true.
   */
  async initPrometheus(): Promise<void> {
    if (!this._promEnabled) return;
    this._promClient = await loadPromClient();

    const counters = new Map<TokenType, unknown>();
    for (const type of TOKEN_TYPES) {
      counters.set(
        type,
        new this._promClient.Counter({
          name: `anthropic_tokens_total_${type}`,
          help: `Total ${type} tokens consumed`,
          labelNames: ['token_type'],
        }),
      );
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
  async prometheusText(): Promise<string> {
    if (!this._promEnabled || !this._promClient) {
      throw new Error(
        'Prometheus support is not enabled. Set enablePrometheus: true and call initPrometheus().',
      );
    }
    return this._promClient.register.metrics();
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private _initOtel(): void {
    for (const type of TOKEN_TYPES) {
      const hist = this._meter.createHistogram(
        `anthropic.tokens.${type}`,
        {
          description: `Anthropic API ${type} token count per request`,
          unit: 'tokens',
          valueType: ValueType.INT,
        },
      );
      this._histograms.set(type, hist);
    }

    this._cacheHitRateGauge = this._meter.createObservableGauge(
      'anthropic.cache.hit_rate',
      {
        description: 'Anthropic prompt cache hit rate (0–1)',
        valueType: ValueType.DOUBLE,
      },
    );

    this._cacheHitRateGauge.addCallback((result) => {
      result.observe(this._currentCacheHitRate, {
        metric: 'cache_hit_rate',
      });
    });
  }
}
