import type { Shot } from '@/lib/types';

export function ShotCard({ shot }: { shot: Shot }) {
  return (
    <article className="rounded-lg border border-border bg-background/70 p-4">
      <h5 className="text-sm font-semibold">Shot {shot.shotNumber}: {shot.shotType}</h5>
      <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <div><dt className="font-medium text-foreground">Camera</dt><dd>{shot.cameraMovement}</dd></div>
        <div><dt className="font-medium text-foreground">Lens</dt><dd>{shot.lens}</dd></div>
        <div><dt className="font-medium text-foreground">Lighting</dt><dd>{shot.lighting}</dd></div>
        <div><dt className="font-medium text-foreground">Subject</dt><dd>{shot.subject}</dd></div>
      </dl>
      <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Action:</span> {shot.action}</p>
      <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Continuity:</span> {shot.continuityNotes}</p>
      <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Safety:</span> {shot.safetyNotes}</p>
      <p className="mt-2 rounded bg-muted px-2 py-1 text-xs"><span className="font-medium">Provider Prompt:</span> {shot.renderPrompt}</p>
    </article>
  );
}
