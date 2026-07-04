import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useStudioStore } from "../lib/store/studio";
import { Clock } from "lucide-react";
export function HistoryRail() {
    const history = useStudioStore((s) => s.history);
    const forkFromSnapshot = useStudioStore((s) => s.forkFromSnapshot);
    if (history.length === 0) {
        return (_jsxs("div", { className: "h-full w-64 border-l border-[var(--line)] bg-[var(--surface)] p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4 text-[var(--muted)]", children: [_jsx(Clock, { className: "h-4 w-4" }), _jsx("span", { className: "text-sm font-medium", children: "History" })] }), _jsx("p", { className: "text-xs text-[var(--muted)]", children: "No snapshots yet. Generate code to create history." })] }));
    }
    return (_jsxs("div", { className: "h-full w-64 border-l border-[var(--line)] bg-[var(--surface)] p-4 overflow-y-auto", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4 text-[var(--muted)]", children: [_jsx(Clock, { className: "h-4 w-4" }), _jsx("span", { className: "text-sm font-medium", children: "History" })] }), _jsx("div", { className: "space-y-2", children: history.map((snapshot) => (_jsxs("button", { onClick: () => forkFromSnapshot(snapshot.id), className: "w-full text-left p-3 rounded-lg border border-[var(--line)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors", children: [_jsx("div", { className: "text-xs text-[var(--muted)] mb-1", children: new Date(snapshot.timestamp).toLocaleTimeString() }), _jsx("div", { className: "text-sm text-[var(--ink)] line-clamp-2", children: snapshot.prompt || "Untitled" })] }, snapshot.id))) })] }));
}
