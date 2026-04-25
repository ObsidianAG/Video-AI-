import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  metrics,
  createNoopMeter,
  type Meter,
} from '@opentelemetry/api';
import { TokenTelemetry } from '../token-telemetry.js';
import type { TokenUsageSnapshot } from '../token-telemetry.js';

// ---------------------------------------------------------------------------
// Use a no-op meter so tests don't require a real OTel SDK setup
// ---------------------------------------------------------------------------

function makeTestMeter(): Meter {
  return createNoopMeter();
}

const baseSnapshot: TokenUsageSnapshot = {
  input: 100,
  cache_creation: 50,
  cache_read: 200,
  output: 300,
  total: 650,
  cacheHitRate: 0.75,
};

describe('TokenTelemetry', () => {
  it('constructs without errors using a no-op meter', () => {
    expect(
      () => new TokenTelemetry({ meter: makeTestMeter() }),
    ).not.toThrow();
  });

  it('record() does not throw for all token types', () => {
    const telemetry = new TokenTelemetry({ meter: makeTestMeter() });
    expect(() => telemetry.record(baseSnapshot)).not.toThrow();
  });

  it('record() updates currentCacheHitRate used by gauge callback', () => {
    const telemetry = new TokenTelemetry({ meter: makeTestMeter() });
    telemetry.record({ ...baseSnapshot, cacheHitRate: 0.42 });
    // Access private field via cast for assertion
    expect(
      (telemetry as unknown as { _currentCacheHitRate: number })
        ._currentCacheHitRate,
    ).toBe(0.42);
  });

  it('record() handles zero values without throwing', () => {
    const telemetry = new TokenTelemetry({ meter: makeTestMeter() });
    expect(() =>
      telemetry.record({
        input: 0,
        cache_creation: 0,
        cache_read: 0,
        output: 0,
        total: 0,
        cacheHitRate: 0,
      }),
    ).not.toThrow();
  });

  it('histograms are created for all 5 token types', () => {
    const createHistogramSpy = vi.fn().mockReturnValue({
      record: vi.fn(),
    });
    const fakeGauge = { addCallback: vi.fn() };
    const createObservableGaugeSpy = vi
      .fn()
      .mockReturnValue(fakeGauge);

    const fakeMeter: Meter = {
      createHistogram: createHistogramSpy,
      createObservableGauge: createObservableGaugeSpy,
    } as unknown as Meter;

    new TokenTelemetry({ meter: fakeMeter });

    expect(createHistogramSpy).toHaveBeenCalledTimes(5);
    const names = createHistogramSpy.mock.calls.map(
      (call: [string, ...unknown[]]) => call[0],
    );
    expect(names).toContain('anthropic.tokens.input');
    expect(names).toContain('anthropic.tokens.cache_creation');
    expect(names).toContain('anthropic.tokens.cache_read');
    expect(names).toContain('anthropic.tokens.output');
    expect(names).toContain('anthropic.tokens.total');
  });

  it('cache_hit_rate observable gauge is created', () => {
    const createHistogramSpy = vi.fn().mockReturnValue({ record: vi.fn() });
    const createObservableGaugeSpy = vi
      .fn()
      .mockReturnValue({ addCallback: vi.fn() });

    const fakeMeter: Meter = {
      createHistogram: createHistogramSpy,
      createObservableGauge: createObservableGaugeSpy,
    } as unknown as Meter;

    new TokenTelemetry({ meter: fakeMeter });

    expect(createObservableGaugeSpy).toHaveBeenCalledWith(
      'anthropic.cache.hit_rate',
      expect.any(Object),
    );
  });

  it('prometheusText() throws when Prometheus is not enabled', async () => {
    const telemetry = new TokenTelemetry({
      meter: makeTestMeter(),
      enablePrometheus: false,
    });
    await expect(telemetry.prometheusText()).rejects.toThrow(
      'Prometheus support is not enabled',
    );
  });

  it('uses a custom meterName when meter is not provided', () => {
    const getMeterSpy = vi.spyOn(
      metrics.getMeterProvider(),
      'getMeter',
    ).mockReturnValue(makeTestMeter());

    new TokenTelemetry({ meterName: 'custom-meter-name' });

    expect(getMeterSpy).toHaveBeenCalledWith('custom-meter-name');
    getMeterSpy.mockRestore();
  });

  it('falls back to default meterName when neither meter nor meterName provided', () => {
    const getMeterSpy = vi.spyOn(
      metrics.getMeterProvider(),
      'getMeter',
    ).mockReturnValue(makeTestMeter());

    new TokenTelemetry({});

    expect(getMeterSpy).toHaveBeenCalledWith('@ai-video/anthropic-sdk');
    getMeterSpy.mockRestore();
  });
});
