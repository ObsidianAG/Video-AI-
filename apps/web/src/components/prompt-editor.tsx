"use client";

import { useState, useTransition } from "react";

interface Props {
  projectId: string;
  onJobSubmitted?: (jobId: string) => void;
}

const PROVIDER_OPTIONS = [
  { value: "veo", label: "Veo (Vertex AI)" },
  { value: "kling", label: "Kling" },
] as const;

type Provider = (typeof PROVIDER_OPTIONS)[number]["value"];

export function PromptEditor({ projectId, onJobSubmitted }: Props): React.JSX.Element {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<Provider>("veo");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const charCount = prompt.length;
  const maxChars = 2000;
  const isOverLimit = charCount > maxChars;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!prompt.trim() || isOverLimit) return;

    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/jobs-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            provider,
            jobType: "TEXT_TO_VIDEO",
            params: {
              prompt: prompt.trim(),
              durationSeconds: duration,
              aspectRatio,
            },
          }),
        });

        if (!response.ok) {
          const data = (await response.json()) as { detail?: string };
          setError(data.detail ?? "Failed to submit job");
          return;
        }

        const job = (await response.json()) as { id: string };
        setPrompt("");
        onJobSubmitted?.(job.id);
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Describe the video you want to generate…"
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Prompt"
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>PDM-aware prompt — be specific about motion, lighting, and composition</span>
          <span className={isOverLimit ? "text-destructive" : ""}>
            {charCount}/{maxChars}
          </span>
        </div>
      </div>

      {/* Options row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          >
            {PROVIDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Duration (s)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Aspect Ratio</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as typeof aspectRatio)}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
          >
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || !prompt.trim() || isOverLimit}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? "Generating…" : "Generate Video"}
      </button>
    </form>
  );
}
