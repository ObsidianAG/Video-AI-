import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function StatusChip({ mode }) {
    return (_jsxs("span", { className: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${mode === "LIVE"
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-amber-500/20 text-amber-400"}`, children: [_jsx("span", { className: `h-1.5 w-1.5 rounded-full ${mode === "LIVE" ? "bg-emerald-400" : "bg-amber-400"} animate-pulse` }), mode === "LIVE" ? "LIVE" : "DEMO — fixture output · verdict cap: HOLD"] }));
}
