import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StatusChip } from "../components/ui/StatusChip";
import { useStudioStore } from "../lib/store/studio";
import { useThemeStore } from "../lib/store/theme";
export function StatusBar() {
    const mode = useStudioStore((s) => s.mode);
    const runState = useStudioStore((s) => s.runState);
    const code = useStudioStore((s) => s.code);
    const { theme, setTheme } = useThemeStore();
    return (_jsxs("div", { className: "flex items-center justify-between px-4 py-2 border-t border-[var(--line)] bg-[var(--surface)] text-xs", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx(StatusChip, { mode: mode }), _jsxs("span", { className: "text-[var(--muted)]", children: ["State: ", runState] }), _jsxs("span", { className: "text-[var(--muted)]", children: [code.length, " chars"] })] }), _jsx("div", { className: "flex items-center gap-2", children: _jsxs("select", { value: theme, onChange: (e) => setTheme(e.target.value), className: "rounded bg-[var(--bg)] px-2 py-1 text-xs border border-[var(--line)] text-[var(--ink)]", children: [_jsx("option", { value: "aurora", children: "Aurora" }), _jsx("option", { value: "daybreak", children: "Daybreak" }), _jsx("option", { value: "synthwave", children: "Synthwave" }), _jsx("option", { value: "terminal", children: "Terminal" })] }) })] }));
}
