import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search } from "lucide-react";

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

const COMMANDS: Command[] = [
  { id: "studio", label: "Open Studio", shortcut: "⌘S", action: () => window.location.pathname = "/studio" },
  { id: "landing", label: "Back to Landing", shortcut: "⌘H", action: () => window.location.pathname = "/" },
  { id: "theme-aurora", label: "Theme: Aurora", action: () => {} },
  { id: "theme-daybreak", label: "Theme: Daybreak", action: () => {} },
  { id: "theme-synthwave", label: "Theme: Synthwave", action: () => {} },
  { id: "theme-terminal", label: "Theme: Terminal", action: () => {} },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const filtered = COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );
  
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setSelected(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  
  const onSelect = (cmd: Command) => {
    cmd.action();
    setOpen(false);
    setQuery("");
    setSelected(0);
  };
  
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
            <motion.div
              role="dialog"
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-[600px] rounded-[16px] bg-[var(--surface)] border border-[var(--line)] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--line)]">
                <Search className="h-5 w-5 text-[var(--muted)]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSelected((s) => Math.min(s + 1, filtered.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSelected((s) => Math.max(s - 1, 0));
                    } else if (e.key === "Enter" && filtered[selected]) {
                      onSelect(filtered[selected]);
                    }
                  }}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
                />
              </div>
              <div className="max-h-[400px] overflow-y-auto p-2">
                {filtered.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    onClick={() => onSelect(cmd)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                      i === selected
                        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "text-[var(--ink)] hover:bg-[var(--line)]"
                    }`}
                  >
                    <span>{cmd.label}</span>
                    {cmd.shortcut && (
                      <span className="text-xs text-[var(--muted)]">{cmd.shortcut}</span>
                    )}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="px-3 py-8 text-center text-[var(--muted)]">
                    No commands found
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
