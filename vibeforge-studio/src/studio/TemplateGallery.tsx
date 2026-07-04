import { demoFixtures } from "../lib/ai/demoFixtures";
import { useStudioStore } from "../lib/store/studio";
import { X } from "lucide-react";

interface TemplateGalleryProps {
  onClose: () => void;
}

export function TemplateGallery({ onClose }: TemplateGalleryProps) {
  const setCode = useStudioStore((s) => s.setCode);
  const setPrompt = useStudioStore((s) => s.setPrompt);
  const setMode = useStudioStore((s) => s.setMode);
  const commitSnapshot = useStudioStore((s) => s.commitSnapshot);
  
  const loadFixture = (fixtureId: string) => {
    const fixture = demoFixtures.find((f) => f.id === fixtureId);
    if (!fixture) return;
    
    setMode("DEMO");
    setCode(fixture.code);
    setPrompt(fixture.prompt);
    commitSnapshot(fixture.code, fixture.prompt);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[900px] max-h-[700px] rounded-[16px] bg-[var(--surface)] border border-[var(--line)] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)]">
          <h3 className="text-lg font-bold text-[var(--ink)]">DEMO Templates</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--line)] transition-colors"
          >
            <X className="h-5 w-5 text-[var(--muted)]" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto max-h-[600px]">
          {demoFixtures.map((fixture) => (
            <button
              key={fixture.id}
              onClick={() => loadFixture(fixture.id)}
              className="w-full text-left p-4 rounded-lg border border-[var(--line)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors"
            >
              <h4 className="text-base font-bold text-[var(--ink)] mb-1">{fixture.name}</h4>
              <p className="text-sm text-[var(--muted)]">{fixture.prompt}</p>
              <div className="mt-2 text-xs text-[var(--muted)] bg-amber-500/10 text-amber-400 px-2 py-1 rounded inline-block">
                DEMO fixture — verdict cap: HOLD
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
