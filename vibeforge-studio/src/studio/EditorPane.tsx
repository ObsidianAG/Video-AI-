import { lazy, Suspense } from "react";
import { useThemeStore } from "../lib/store/theme";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

interface EditorPaneProps {
  code: string;
  onChange: (code: string) => void;
}

export function EditorPane({ code, onChange }: EditorPaneProps) {
  const theme = useThemeStore((s) => s.theme);
  
  const monacoTheme = theme === "daybreak" ? "light" : "vs-dark";
  
  return (
    <div className="h-full w-full">
      <Suspense fallback={<div className="flex h-full items-center justify-center text-[var(--muted)]">Loading editor...</div>}>
        <MonacoEditor
          language="html"
          value={code}
          onChange={(value) => onChange(value ?? "")}
          theme={monacoTheme}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
          }}
        />
      </Suspense>
    </div>
  );
}
