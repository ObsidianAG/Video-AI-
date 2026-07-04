import { jsx as _jsx } from "react/jsx-runtime";
import { lazy, Suspense } from "react";
import { useThemeStore } from "../lib/store/theme";
const MonacoEditor = lazy(() => import("@monaco-editor/react"));
export function EditorPane({ code, onChange }) {
    const theme = useThemeStore((s) => s.theme);
    const monacoTheme = theme === "daybreak" ? "light" : "vs-dark";
    return (_jsx("div", { className: "h-full w-full", children: _jsx(Suspense, { fallback: _jsx("div", { className: "flex h-full items-center justify-center text-[var(--muted)]", children: "Loading editor..." }), children: _jsx(MonacoEditor, { language: "html", value: code, onChange: (value) => onChange(value ?? ""), theme: monacoTheme, options: {
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                } }) }) }));
}
