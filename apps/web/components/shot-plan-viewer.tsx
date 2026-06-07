'use client';

import { useState } from 'react';
import { SceneCard } from '@/components/scene-card';
import type { ShotPlan } from '@/lib/types';

export function ShotPlanViewer({ plan }: { plan: ShotPlan }) {
  const [message, setMessage] = useState<string>('');

  const createMockRender = async (shotId: string, prompt: string) => {
    const response = await fetch('/api/mock-render-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: plan.projectId,
        shotId,
        prompt,
      }),
    });
    if (response.ok) {
      setMessage('Mock render job created with evidence receipt.');
      return;
    }
    setMessage('Render job creation failed.');
  };

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card/60 p-5">
      <div>
        <h3 className="text-xl font-semibold">{plan.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{plan.logline}</p>
        <p className="mt-1 text-xs text-muted-foreground">Genre: {plan.genre} · Mood: {plan.mood}</p>
      </div>
      {message ? <p className="rounded-md bg-muted px-3 py-2 text-xs">{message}</p> : null}
      <div className="space-y-3">
        {plan.scenes.map((scene) => (
          <div key={scene.id} className="space-y-2">
            <SceneCard scene={scene} />
            <div className="flex flex-wrap gap-2">
              {scene.shots.map((shot) => (
                <button
                  key={shot.id}
                  onClick={() => createMockRender(shot.id, shot.renderPrompt)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium"
                >
                  Create Mock Render Job · Shot {shot.shotNumber}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
