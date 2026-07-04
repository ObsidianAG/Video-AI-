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
    const onMessage = (e: MessageEvent) => {
      if (e.data?.vf === nonce) {
        const { kind, args } = e.data;
        console.log(`[preview:${kind}]`, ...args);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [nonce]);
  
  return (
    <div className="h-screen flex flex-col bg-[var(--bg)]">
      <nav className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.pathname = "/"}
            className="p-2 rounded-lg hover:bg-[var(--line)] transition-colors"
            title="Back to landing"
          >
            <Home className="h-5 w-5 text-[var(--muted)]" />
          </button>
          <span className="font-bold text-[var(--ink)]">VibeForge Studio</span>
        </div>
        <button
          onClick={() => setNonce(Date.now().toString())}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)] transition-colors text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Preview
        </button>
      </nav>
      
      <div className="flex-1 flex overflow-hidden">
        <VibePanel onOpenTemplates={() => setShowTemplates(true)} />
        
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 border-r border-[var(--line)]">
            <EditorPane code={code} onChange={setCode} />
          </div>
          <div className="flex-1">
            <PreviewPane code={code} nonce={nonce} />
          </div>
        </div>
        
        <HistoryRail />
      </div>
      
      <StatusBar />
      
      <DiffView />
      {showTemplates && <TemplateGallery onClose={() => setShowTemplates(false)} />}
      <Toast />
      <CommandPalette />
    </div>
  );
}
