import { getControlSnapshot } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import type { QNEOControlSnapshot } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ControlPage(): Promise<React.JSX.Element> {
  await requireAuth();

  let snapshot: QNEOControlSnapshot | null = null;
  let error: string | null = null;

  try {
    snapshot = await getControlSnapshot();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load control snapshot";
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">QNEO Digital Twin</h1>
        <p className="text-sm text-muted-foreground">
          Read-only live system state — computed server-side
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {snapshot && (
        <div className="space-y-6">
          {/* Health Score */}
          <div className="rounded-lg border border-border p-6">
            <h2 className="mb-4 text-lg font-semibold">System Health</h2>
            <div className="flex items-center gap-4">
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold ${
                  snapshot.systemHealthScore >= 80
                    ? "bg-green-100 text-green-800"
                    : snapshot.systemHealthScore >= 50
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {snapshot.systemHealthScore}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">V(x) Health Score</p>
                <p className="text-xs text-muted-foreground">
                  Snapshot: {new Date(snapshot.computedAt).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">TTL: {snapshot.ttlSeconds}s</p>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {snapshot.alerts.length > 0 && (
            <div className="rounded-lg border border-border p-6">
              <h2 className="mb-4 text-lg font-semibold text-destructive">Alerts</h2>
              <ul className="space-y-2">
                {snapshot.alerts.map((alert, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    <span>⚠</span>
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Provider Health */}
          <div className="rounded-lg border border-border p-6">
            <h2 className="mb-4 text-lg font-semibold">Provider Health</h2>
            <div className="space-y-3">
              {snapshot.providerHealth.map((p) => (
                <div
                  key={p.provider}
                  className="flex items-center justify-between rounded-md bg-muted/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${p.healthy ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <span className="font-medium capitalize">{p.provider}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {p.latencyMs !== null && <span>{p.latencyMs.toFixed(0)}ms</span>}
                    <span>Error rate: {(p.errorRate * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Queue Stats */}
          <div className="rounded-lg border border-border p-6">
            <h2 className="mb-4 text-lg font-semibold">Job Queue</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Queue Depth" value={snapshot.jobQueueStats.queueDepth} />
              <StatCard label="Processing" value={snapshot.jobQueueStats.processingCount} />
              <StatCard label="Dead Letter" value={snapshot.jobQueueStats.dlqDepth} />
              <StatCard label="Active Jobs" value={snapshot.activeJobCount} />
            </div>
          </div>

          {/* Metrics */}
          <div className="rounded-lg border border-border p-6">
            <h2 className="mb-4 text-lg font-semibold">Metrics</h2>
            <div className="space-y-2">
              {snapshot.metrics.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{m.name}</span>
                  <span className="font-medium">
                    {m.value} {m.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="rounded-md bg-muted/50 p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
