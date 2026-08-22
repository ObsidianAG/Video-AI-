'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ProviderInfo } from '../app/api/providers/route.js';

interface GenerateFormProps {
  onJobCreated?: (jobId: string) => void;
}

const EXAMPLES = [
  'A serene mountain lake at golden hour, mist rising from the water, surrounding peaks dusted with snow',
  'A futuristic city street at night with neon lights reflecting on wet pavement, people walking with umbrellas',
  'Slow motion waves crashing on a rocky coastline at sunset, spray catching the light',
  'A time-lapse of flowers blooming in a sunlit meadow, bees visiting each blossom',
  'A close-up of a master chef plating a gourmet dish, sauce applied with precision',
];

export function GenerateForm({ onJobCreated }: GenerateFormProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    fetch('/api/providers')
      .then((r) => r.json())
      .then((data: { providers?: ProviderInfo[] }) => {
        if (data.providers) {
          setProviders(data.providers);
          const first = data.providers.find((p) => p.configured);
          if (first) setSelectedProvider(first.label);
        }
      })
      .catch(() => undefined);
  }, []);

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
      setCharCount(e.target.value.length);
      if (error) setError(null);
    },
    [error],
  );

  const handleExample = useCallback((example: string) => {
    setPrompt(example);
    setCharCount(example.length);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!prompt.trim()) {
        setError('Please enter a prompt.');
        return;
      }
      if (!selectedProvider) {
        setError('No provider is configured. Set a provider API key and restart.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompt.trim(), provider: selectedProvider }),
        });

        const data = (await res.json()) as {
          ok: boolean;
          job?: { id: string };
          error?: { code: string; message: string };
        };

        if (!res.ok || !data.ok) {
          setError(data.error?.message ?? 'Failed to create job.');
          return;
        }

        if (data.job?.id) {
          onJobCreated?.(data.job.id);
          setPrompt('');
          setCharCount(0);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [prompt, selectedProvider, onJobCreated],
  );

  const configuredProviders = providers.filter((p) => p.configured);
  const unconfiguredProviders = providers.filter((p) => !p.configured);

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Provider status banner */}
      {providers.length > 0 && configuredProviders.length === 0 && (
        <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm">
          <p className="font-medium text-yellow-400">⚠ No providers configured</p>
          <p className="mt-1 text-yellow-400/80">
            Set at least one provider API key to enable video generation:
          </p>
          <ul className="mt-2 space-y-1 text-yellow-400/70">
            {unconfiguredProviders.map((p) => (
              <li key={p.label} className="font-mono">
                {p.missingEnvVars.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Prompt textarea */}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={handlePromptChange}
            placeholder="Describe the video you want to create…"
            rows={5}
            maxLength={4000}
            disabled={loading}
            className="w-full resize-none rounded-xl border border-border bg-muted/50 px-5 py-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 transition"
          />
          <span className="absolute bottom-3 right-4 text-xs text-muted-foreground">
            {charCount}/4000
          </span>
        </div>

        {/* Example prompts */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Try:</span>
          {EXAMPLES.slice(0, 3).map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => handleExample(ex)}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground transition truncate max-w-[200px]"
            >
              {ex.substring(0, 45)}…
            </button>
          ))}
        </div>

        {/* Provider selector */}
        {configuredProviders.length > 1 && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground shrink-0">Provider:</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              disabled={loading}
              className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              {configuredProviders.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {configuredProviders.length === 1 && (
          <p className="text-xs text-muted-foreground">
            Provider: <span className="text-foreground">{configuredProviders[0]!.name}</span>
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || configuredProviders.length === 0 || !prompt.trim()}
          className="w-full rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40 transition"
        >
          {loading ? 'Submitting…' : 'Generate Video'}
        </button>
      </form>
    </div>
  );
}
