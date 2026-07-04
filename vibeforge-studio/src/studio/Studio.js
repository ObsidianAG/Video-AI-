import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useStudioStore } from "../lib/store/studio";
import { VibePanel } from "./VibePanel";
import { EditorPane } from "./EditorPane";
import { PreviewPane } from "./PreviewPane";
import { HistoryRail } from "./HistoryRail";
import { DiffView } from "./DiffView";
import { TemplateGallery } from "./TemplateGallery";
import { StatusBar } from "./StatusBar";
import { Toast } from "../components/ui/Toast";
import { CommandPalette } from "../components/ui/CommandPalette";
import { RefreshCw, Home } from "lucide-react";
export default function Studio() {
    const code = useStudioStore((s) => s.code);
    const setCode = useStudioStore((s) => s.setCode);
    const [nonce, setNonce] = useState(Date.now().toString());
    const [showTemplates, setShowTemplates] = useState(false);
    useEffect(() => {
        const onMessage = (e) => {
            if (e.data?.vf === nonce) {
                const { kind, args } = e.data;
                console.log(`[preview:${kind}]`, ...args);
            }
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [nonce]);
    return (_jsxs("div", { className: "h-screen flex flex-col bg-[var(--bg)]", children: [_jsxs("nav", { className: "flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[var(--surface)]", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { onClick: () => window.location.pathname = "/", className: "p-2 rounded-lg hover:bg-[var(--line)] transition-colors", title: "Back to landing", children: _jsx(Home, { className: "h-5 w-5 text-[var(--muted)]" }) }), _jsx("span", { className: "font-bold text-[var(--ink)]", children: "VibeForge Studio" })] }), _jsxs("button", { onClick: () => setNonce(Date.now().toString()), className: "flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)] transition-colors text-sm", children: [_jsx(RefreshCw, { className: "h-4 w-4" }), "Refresh Preview"] })] }), _jsxs("div", { className: "flex-1 flex overflow-hidden", children: [_jsx(VibePanel, { onOpenTemplates: () => setShowTemplates(true) }), _jsxs("div", { className: "flex-1 flex overflow-hidden", children: [_jsx("div", { className: "flex-1 border-r border-[var(--line)]", children: _jsx(EditorPane, { code: code, onChange: setCode }) }), _jsx("div", { className: "flex-1", children: _jsx(PreviewPane, { code: code, nonce: nonce }) })] }), _jsx(HistoryRail, {})] }), _jsx(StatusBar, {}), _jsx(DiffView, {}), showTemplates && _jsx(TemplateGallery, { onClose: () => setShowTemplates(false) }), _jsx(Toast, {}), _jsx(CommandPalette, {})] }));
}
