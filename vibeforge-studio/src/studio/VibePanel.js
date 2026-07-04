import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useStudioStore } from "../lib/store/studio";
import { streamGenerate } from "../lib/ai/stream";
import { showToast } from "../components/ui/Toast";
import { Skeleton } from "../components/ui/Skeleton";
import { Sparkles, StopCircle, FileText } from "lucide-react";
import { useState, useRef } from "react";
export function VibePanel({ onOpenTemplates }) {
    const prompt = useStudioStore((s) => s.prompt);
    const setPrompt = useStudioStore((s) => s.setPrompt);
    const code = useStudioStore((s) => s.code);
    const setCode = useStudioStore((s) => s.setCode);
    const mode = useStudioStore((s) => s.mode);
    const setMode = useStudioStore((s) => s.setMode);
    const runState = useStudioStore((s) => s.runState);
    const setRunState = useStudioStore((s) => s.setRunState);
    const commitSnapshot = useStudioStore((s) => s.commitSnapshot);
    const setPendingDiff = useStudioStore((s) => s.setPendingDiff);
    const [transcript, setTranscript] = useState("");
    const abortRef = useRef(null);
    const handleGenerate = async () => {
        if (!prompt.trim()) {
            showToast("Please enter a prompt");
            return;
        }
        setMode("LIVE");
        setRunState("streaming");
        setTranscript("");
        const controller = new AbortController();
        abortRef.current = controller;
        let accumulated = "";
        try {
            for await (const chunk of streamGenerate(prompt, controller.signal)) {
                accumulated += chunk;
                setTranscript(accumulated);
            }
            if (code.trim() && accumulated.trim()) {
                setPendingDiff({ before: code, after: accumulated });
            }
            else {
                setCode(accumulated);
                commitSnapshot(accumulated, prompt);
            }
            setRunState("idle");
            showToast("Generation complete");
        }
        catch (err) {
            if (err instanceof Error && err.name === "AbortError") {
                showToast("Generation stopped");
            }
            else {
                setRunState("error");
                showToast("Generation failed — proxy may be disarmed");
                console.error(err);
            }
        }
        finally {
            abortRef.current = null;
        }
    };
    const handleStop = () => {
        if (abortRef.current) {
            abortRef.current.abort();
            setRunState("idle");
        }
    };
    return (_jsxs("div", { className: "h-full w-80 border-r border-[var(--line)] bg-[var(--surface)] flex flex-col", children: [_jsxs("div", { className: "p-4 border-b border-[var(--line)]", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(Sparkles, { className: "h-5 w-5 text-[var(--accent)]" }), _jsx("span", { className: "font-bold text-[var(--ink)]", children: "Vibe Panel" })] }), _jsx("textarea", { value: prompt, onChange: (e) => setPrompt(e.target.value), placeholder: "Describe what you want to build...", className: "w-full h-32 p-3 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" }), _jsxs("div", { className: "mt-4 flex gap-2", children: [runState === "streaming" ? (_jsxs("button", { onClick: handleStop, className: "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors", children: [_jsx(StopCircle, { className: "h-4 w-4" }), "Stop"] })) : (_jsxs("button", { onClick: handleGenerate, disabled: !prompt.trim(), className: "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg)] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed", children: [_jsx(Sparkles, { className: "h-4 w-4" }), "Generate"] })), _jsx("button", { onClick: onOpenTemplates, className: "p-2 rounded-lg border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)] transition-colors", title: "Load DEMO template", children: _jsx(FileText, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "mt-3 text-xs text-[var(--muted)]", children: [_jsxs("div", { children: ["Mode: ", mode] }), _jsx("div", { children: "Model: claude-sonnet-4-6" })] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4", children: [_jsx("div", { className: "text-xs font-medium text-[var(--muted)] mb-2", children: "STREAMING TRANSCRIPT" }), runState === "streaming" && !transcript && (_jsxs("div", { className: "space-y-2", children: [_jsx(Skeleton, { className: "h-4 w-full" }), _jsx(Skeleton, { className: "h-4 w-3/4" }), _jsx(Skeleton, { className: "h-4 w-full" })] })), transcript && (_jsx("pre", { className: "text-xs text-[var(--ink)] whitespace-pre-wrap break-words font-mono", children: transcript })), runState === "idle" && !transcript && (_jsx("p", { className: "text-xs text-[var(--muted)]", children: "Click Generate to start streaming." }))] })] }));
}
