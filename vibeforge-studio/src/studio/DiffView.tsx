import { useStudioStore } from "../lib/store/studio";

export function DiffView() {
  const pendingDiff = useStudioStore((s) => s.pendingDiff);
  const applyDiff = useStudioStore((s) => s.applyDiff);
  const discardDiff = useStudioStore((s) => s.discardDiff);
  
  if (!pendingDiff) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[800px] max-h-[600px] rounded-[16px] bg-[var(--surface)] border border-[var(--line)] shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--line)]">
          <h3 className="text-lg font-bold text-[var(--ink)]">Review Changes</h3>
          <p className="text-sm text-[var(--muted)] mt-1">Code will be replaced. Apply to continue or discard to keep current.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 p-6 overflow-y-auto max-h-[400px]">
          <div>
            <div className="text-xs font-medium text-[var(--muted)] mb-2">BEFORE</div>
            <pre className="text-xs bg-[var(--bg)] p-4 rounded-lg overflow-x-auto border border-[var(--line)] text-[var(--ink)]">
              {pendingDiff.before}
            </pre>
          </div>
          <div>
            <div className="text-xs font-medium text-[var(--muted)] mb-2">AFTER</div>
            <pre className="text-xs bg-[var(--bg)] p-4 rounded-lg overflow-x-auto border border-[var(--line)] text-[var(--ink)]">
              {pendingDiff.after}
            </pre>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[var(--line)] flex items-center justify-end gap-3">
          <button
            onClick={discardDiff}
            className="px-4 py-2 rounded-lg border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
          >
            Discard
          </button>
          <button
            onClick={applyDiff}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg)] font-medium hover:opacity-90 transition-opacity"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
