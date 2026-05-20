import type { VllmRuntimeMetric } from '@/lib/types';

export function ObservabilityCards({ metrics }: { metrics: VllmRuntimeMetric[] }) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card/60 p-5">
      <div>
        <h2 className="text-xl font-semibold">Mock Prometheus Observability</h2>
        <p className="text-sm text-muted-foreground">
          Prometheus watches the system. It does not create content. It tells us whether the AI brain is healthy.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.id} className="rounded-lg border border-border bg-background/70 p-3">
            <p className="text-xs uppercase text-muted-foreground">{metric.metricName}</p>
            <p className="mt-2 text-xl font-semibold">{metric.value} {metric.unit}</p>
            <p className="mt-1 text-xs text-muted-foreground">Status: {metric.status}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
