import { jsx as _jsx } from "react/jsx-runtime";
import { lazy, Suspense } from "react";
const Landing = lazy(() => import("./pages/Landing"));
const Studio = lazy(() => import("./studio/Studio"));
export function Routes() {
    const path = window.location.pathname;
    return (_jsx(Suspense, { fallback: _jsx("div", { className: "flex h-screen items-center justify-center text-[var(--muted)]", children: "Loading\u2026" }), children: path === "/studio" ? _jsx(Studio, {}) : _jsx(Landing, {}) }));
}
