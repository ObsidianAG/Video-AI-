"use client";

import type { Version } from "@/types";

interface Props {
  projectId: string;
  versions: Version[];
}

export function TimelineEditor({ projectId, versions }: Props): React.JSX.Element {
  if (versions.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
        No versions yet — submit a generation job to see your timeline
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Timeline header */}
      <div className="flex bg-muted/50 border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Shot Timeline
        </span>
      </div>

      {/* Track */}
      <div className="relative overflow-x-auto">
        <div className="flex gap-2 p-3 min-w-max">
          {versions.map((version, index) => (
            <TimelineClip key={version.id} version={version} index={index} />
          ))}
        </div>
      </div>

      {/* Playhead indicator */}
      <div className="border-t border-border bg-muted/20 px-3 py-2 flex items-center gap-2">
        <button
          className="rounded px-2 py-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          aria-label="Play"
        >
          ▶ Play
        </button>
        <span className="text-xs text-muted-foreground">
          {versions.length} clip{versions.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

function TimelineClip({
  version,
  index,
}: {
  version: Version;
  index: number;
}): React.JSX.Element {
  return (
    <div
      className="group relative flex h-16 w-32 cursor-pointer flex-col justify-between overflow-hidden rounded border border-border bg-card px-2 py-1.5 hover:border-ring hover:bg-accent/50"
      title={`v${version.versionNumber}${version.label ? ` — ${version.label}` : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
        <span className="rounded bg-muted px-1 text-xs">v{version.versionNumber}</span>
      </div>
      {version.label && (
        <p className="truncate text-xs text-muted-foreground">{version.label}</p>
      )}
      <p className="text-xs text-muted-foreground/60">
        {new Date(version.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}
