'use client';

import { useMemo, useState } from 'react';
import { ErrorState } from '@/components/error-state';
import { ShotPlanViewer } from '@/components/shot-plan-viewer';
import type { ShotPlan } from '@/lib/types';

type FormState = {
  projectTitle: string;
  directorIdea: string;
  genre: string;
  mood: string;
  targetAudience: string;
  visualStyle: string;
  cameraStyle: string;
  duration: string;
  aspectRatio: string;
  safetyRightsConfirmed: boolean;
};

const initialState: FormState = {
  projectTitle: 'CineForge Test Project',
  directorIdea: 'A detective races to decode a message before sunrise in a neon mega-city.',
  genre: 'Sci-Fi Thriller',
  mood: 'Tense',
  targetAudience: 'Adult streaming audience',
  visualStyle: 'Cinematic neon noir',
  cameraStyle: 'Steadicam with controlled push-ins',
  duration: '90 seconds',
  aspectRatio: '2.39:1',
  safetyRightsConfirmed: false,
};

export function ShotPlanForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [plan, setPlan] = useState<ShotPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => Boolean(form.safetyRightsConfirmed), [form.safetyRightsConfirmed]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/vllm/shot-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as {
        shotPlan?: ShotPlan;
        error?: string;
        detail?: string;
      };

      if (!response.ok || !payload.shotPlan) {
        throw new Error(payload.error ?? payload.detail ?? 'Shot plan generation failed.');
      }

      setPlan(payload.shotPlan);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const bind = (key: keyof FormState) => ({
    value: typeof form[key] === 'boolean' ? undefined : String(form[key]),
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value })),
  });

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-border bg-card/60 p-5">
        <h2 className="text-lg font-semibold">Generate Shot Plan with vLLM</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">Project title<input className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" {...bind('projectTitle')} /></label>
          <label className="text-sm">Genre<input className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" {...bind('genre')} /></label>
          <label className="text-sm">Mood<input className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" {...bind('mood')} /></label>
          <label className="text-sm">Target audience<input className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" {...bind('targetAudience')} /></label>
          <label className="text-sm">Visual style<input className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" {...bind('visualStyle')} /></label>
          <label className="text-sm">Camera style<input className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" {...bind('cameraStyle')} /></label>
          <label className="text-sm">Duration<input className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" {...bind('duration')} /></label>
          <label className="text-sm">Aspect ratio<input className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2" {...bind('aspectRatio')} /></label>
        </div>
        <label className="text-sm">Director idea
          <textarea className="mt-1 min-h-28 w-full rounded-md border border-border bg-background px-3 py-2" {...bind('directorIdea')} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.safetyRightsConfirmed}
            onChange={(event) => setForm((prev) => ({ ...prev, safetyRightsConfirmed: event.target.checked }))}
          />
          I confirm safety, rights, and likeness compliance.
        </label>
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="inline-flex w-fit items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate Shot Plan with vLLM'}
        </button>
      </form>

      {error ? <ErrorState title="Shot plan generation failed" description={error} /> : null}
      {plan ? <ShotPlanViewer plan={plan} /> : null}
    </div>
  );
}
