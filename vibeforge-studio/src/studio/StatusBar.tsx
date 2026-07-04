import { StatusChip } from "../components/ui/StatusChip";
import { useStudioStore } from "../lib/store/studio";
import { useThemeStore, type Theme } from "../lib/store/theme";

export function StatusBar() {
  const mode = useStudioStore((s) => s.mode);
  const runState = useStudioStore((s) => s.runState);
  const code = useStudioStore((s) => s.code);
  const { theme, setTheme } = useThemeStore();
  
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--line)] bg-[var(--surface)] text-xs">
      <div className="flex items-center gap-4">
        <StatusChip mode={mode} />
        <span className="text-[var(--muted)]">State: {runState}</span>
        <span className="text-[var(--muted)]">{code.length} chars</span>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
          className="rounded bg-[var(--bg)] px-2 py-1 text-xs border border-[var(--line)] text-[var(--ink)]"
        >
          <option value="aurora">Aurora</option>
          <option value="daybreak">Daybreak</option>
          <option value="synthwave">Synthwave</option>
          <option value="terminal">Terminal</option>
        </select>
      </div>
    </div>
  );
}
