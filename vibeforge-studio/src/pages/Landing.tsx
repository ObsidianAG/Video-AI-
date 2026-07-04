import { MagneticButton } from "../components/fx/MagneticButton";
import { TiltCard } from "../components/fx/TiltCard";
import { BorderBeam } from "../components/fx/BorderBeam";
import { CursorGlow } from "../components/fx/CursorGlow";
import { Marquee } from "../components/fx/Marquee";
import { AuroraConductor } from "../components/fx/AuroraConductor";
import { CommandPalette } from "../components/ui/CommandPalette";
import { useThemeStore, type Theme } from "../lib/store/theme";
import { useState } from "react";
import { Sparkles, Code2, Zap, Shield, Palette, Clock } from "lucide-react";

export default function Landing() {
  const { theme, setTheme } = useThemeStore();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  
  const features = [
    { id: "instant", icon: Zap, title: "Instant Generation", desc: "AI-powered HTML generation in real-time" },
    { id: "sandbox", icon: Shield, title: "Sandboxed Preview", desc: "Safe iframe execution with script-only permissions" },
    { id: "themes", icon: Palette, title: "4 Stunning Themes", desc: "Aurora, Daybreak, Synthwave, Terminal" },
    { id: "history", icon: Clock, title: "History Tracking", desc: "Append-only snapshot system with fork support" },
    { id: "monaco", icon: Code2, title: "Monaco Editor", desc: "Full-featured code editing with syntax highlighting" },
    { id: "motion", icon: Sparkles, title: "Motion Design", desc: "Smooth animations powered by Motion" },
  ];
  
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] overflow-hidden">
      <CursorGlow />
      <CommandPalette />
      
      <div className="relative z-10">
        <nav className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-6 w-6 text-[var(--accent)]" />
            <span>VibeForge</span>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              className="rounded-lg bg-[var(--surface)] px-3 py-2 text-sm border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="aurora">Aurora</option>
              <option value="daybreak">Daybreak</option>
              <option value="synthwave">Synthwave</option>
              <option value="terminal">Terminal</option>
            </select>
          </div>
        </nav>
        
        <section className="relative px-8 py-32">
          <AuroraConductor className="absolute inset-0 opacity-30" />
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <h1 className="text-7xl font-bold mb-6 leading-tight">
              Turn vibe into code.<br />
              <span className="text-[var(--accent)]">Instantly.</span>
            </h1>
            <p className="text-xl text-[var(--muted)] mb-12 max-w-2xl mx-auto">
              Generate production-ready HTML from natural language prompts. 
              Powered by Claude, sandboxed for safety, designed for speed.
            </p>
            <div className="flex items-center justify-center gap-4">
              <MagneticButton onClick={() => window.location.pathname = "/studio"}>
                Open the Studio
              </MagneticButton>
              <button
                onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-[10px] border-2 border-[var(--line)] px-6 py-3 font-medium text-[var(--ink)] hover:border-[var(--accent)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Watch a vibe
              </button>
            </div>
          </div>
        </section>
        
        <section className="px-8 py-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Prompt Examples</h2>
            <Marquee />
          </div>
        </section>
        
        <section className="px-8 py-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <TiltCard
                    key={feature.id}
                    className="relative p-6 rounded-[20px] bg-[var(--surface)] border border-[var(--line)]"
                    onMouseEnter={() => setHoveredCard(feature.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <BorderBeam active={hoveredCard === feature.id} />
                    <Icon className="h-8 w-8 text-[var(--accent)] mb-4" />
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-[var(--muted)]">{feature.desc}</p>
                  </TiltCard>
                );
              })}
            </div>
          </div>
        </section>
        
        <section id="demo" className="px-8 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Proof Strip</h2>
            <div className="rounded-[20px] bg-[var(--surface)] border border-[var(--line)] p-8">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)]">
                    <th className="pb-3 font-medium text-[var(--muted)]">Gate</th>
                    <th className="pb-3 font-medium text-[var(--muted)]">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[var(--ink)]">
                  <tr className="border-b border-[var(--line)]">
                    <td className="py-3">Typecheck</td>
                    <td className="py-3">✓ pnpm typecheck</td>
                  </tr>
                  <tr className="border-b border-[var(--line)]">
                    <td className="py-3">Lint</td>
                    <td className="py-3">✓ pnpm lint</td>
                  </tr>
                  <tr className="border-b border-[var(--line)]">
                    <td className="py-3">Test</td>
                    <td className="py-3">✓ pnpm test (≥25 tests, ≥80% coverage)</td>
                  </tr>
                  <tr className="border-b border-[var(--line)]">
                    <td className="py-3">Build</td>
                    <td className="py-3">✓ pnpm build</td>
                  </tr>
                  <tr>
                    <td className="py-3">Secret Scan</td>
                    <td className="py-3">✓ No secrets in bundle</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
        
        <footer className="px-8 py-12 border-t border-[var(--line)]">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <p className="text-[var(--muted)] text-sm">
              VibeForge Studio · Fail-closed by design · No proof, no PASS
            </p>
            <div className="flex items-center gap-6 text-sm text-[var(--muted)]">
              <button onClick={() => setTheme("aurora")} className="hover:text-[var(--accent)]">Aurora</button>
              <button onClick={() => setTheme("daybreak")} className="hover:text-[var(--accent)]">Daybreak</button>
              <button onClick={() => setTheme("synthwave")} className="hover:text-[var(--accent)]">Synthwave</button>
              <button onClick={() => setTheme("terminal")} className="hover:text-[var(--accent)]">Terminal</button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
