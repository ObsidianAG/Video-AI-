import { describe, expect, it } from 'vitest';
import { Registry } from 'prom-client';
import { METRIC_NAMES, METRIC_PREFIX, registerVideoMetrics, PROM_EXAMPLES } from './index.js';

describe('metrics contract', () => {
  it('uses the text_to_video_ prefix for every metric name', () => {
    for (const name of Object.values(METRIC_NAMES)) {
      expect(name.startsWith(METRIC_PREFIX)).toBe(true);
    }
  });

  it('registers every metric with prom-client without collisions', async () => {
    const registry = new Registry();
    const m = registerVideoMetrics(registry);
    expect(m).toBeDefined();
    const exported = await registry.metrics();
    for (const name of Object.values(METRIC_NAMES)) {
      expect(exported).toContain(name);
    }
  });

  it('exposes the documented Prometheus example query', () => {
    expect(PROM_EXAMPLES.providerLatencyP95).toContain('histogram_quantile(0.95');
    expect(PROM_EXAMPLES.providerLatencyP95).toContain(
      'text_to_video_provider_latency_seconds_bucket',
    );
  });
});
