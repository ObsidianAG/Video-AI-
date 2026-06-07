import type { CacheOptMetric } from '@/lib/types';

const cards = [
  {
    key: 'C',
    title: 'Confidence-based Padding',
    explanation: 'Predicts likely output length and adds safety padding.',
  },
  {
    key: 'A',
    title: 'Allocation / KV Cache Allocation',
    explanation: 'Tracks and reuses KV cache memory efficiently.',
  },
  {
    key: 'P',
    title: 'Preemption Policy',
    explanation: 'When memory pressure is high, decides which request should pause first.',
  },
  {
    key: 'S',
    title: 'Strategy for Preemption',
    explanation: 'Chooses swap or recompute depending on sequence length and cost.',
  },
];

export function CacheOptCards({ metrics }: { metrics: CacheOptMetric[] }) {
  const latest = metrics[0];

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card/60 p-5">
      <div>
        <h2 className="text-xl font-semibold">CACHEOPT Runtime</h2>
        <p className="text-sm text-muted-foreground">CACHEOPT protects the memory runway.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {cards.map((card) => (
          <article key={card.key} className="rounded-lg border border-border bg-background/70 p-4">
            <p className="text-xs uppercase text-muted-foreground">{card.key}</p>
            <h3 className="mt-1 font-semibold">{card.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{card.explanation}</p>
          </article>
        ))}
      </div>
      {latest ? (
        <div className="rounded-lg border border-border bg-background/60 p-4 text-sm text-muted-foreground">
          <p>Traffic comes in → vLLM schedules requests → KV cache fills → CACHEOPT rules reduce memory waste → Prometheus watches health.</p>
          <p className="mt-2">Confidence padding: {latest.confidencePaddingScore} · KV usage: {Math.round(latest.kvCacheUsage * 100)}% · Preemption risk: {Math.round(latest.preemptionRisk * 100)}% · Strategy: {latest.strategy} · Memory saved estimate: {latest.memorySavedEstimate}%</p>
        </div>
      ) : null}
    </section>
  );
}
