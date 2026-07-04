import { useStudioStore } from "../lib/store/studio";
import { Clock } from "lucide-react";

export function HistoryRail() {
  const history = useStudioStore((s) => s.history);
  const forkFromSnapshot = useStudioStore((s) => s.forkFromSnapshot);
  
  if (history.length === 0) {
    return (
      <div className="h-full w-64 border-l border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex items-center gap-2 mb-4 text-[var(--muted)]">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">History</span>
        </div>
        <p className="text-xs text-[var(--muted)]">No snapshots yet. Generate code to create history.</p>
      </div>
    );
  }
  
  return (
    <div className="h-full w-64 border-l border-[var(--line)] bg-[var(--surface)] p-4 overflow-y-auto">
      <div className="flex items-center gap-2 mb-4 text-[var(--muted)]">
        <Clock className="h-4 w-4" />
        <span className="text-sm font-medium">History</span>
      </div>
      <div className="space-y-2">
        {history.map((snapshot) => (
          <button
            key={snapshot.id}
            onClick={() => forkFromSnapshot(snapshot.id)}
            className="w-full text-left p-3 rounded-lg border border-[var(--line)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors"
          >
            <div className="text-xs text-[var(--muted)] mb-1">
              {new Date(snapshot.timestamp).toLocaleTimeString()}
            </div>
            <div className="text-sm text-[var(--ink)] line-clamp-2">
              {snapshot.prompt || "Untitled"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
