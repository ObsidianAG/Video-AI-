import { ShotCard } from '@/components/shot-card';
import type { Scene } from '@/lib/types';

export function SceneCard({ scene }: { scene: Scene }) {
  return (
    <section className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-semibold">Scene {scene.sceneNumber}: {scene.title}</h4>
        <span className="text-xs text-muted-foreground">{scene.location} · {scene.timeOfDay}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{scene.summary}</p>
      <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Emotional purpose:</span> {scene.emotionalPurpose}</p>
      <div className="mt-3 grid gap-3">
        {scene.shots.map((shot) => (
          <ShotCard key={shot.id} shot={shot} />
        ))}
      </div>
    </section>
  );
}
