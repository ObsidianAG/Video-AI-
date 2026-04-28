"use client";

import { useState } from "react";
import type { Version } from "@/types";

interface Props {
  versions: Version[];
}

export function VersionCompare({ versions }: Props): React.JSX.Element {
  const [leftId, setLeftId] = useState<string>(versions[0]?.id ?? "");
  const [rightId, setRightId] = useState<string>(versions[1]?.id ?? "");

  const left = versions.find((v) => v.id === leftId);
  const right = versions.find((v) => v.id === rightId);

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Version A</label>
          <select
            value={leftId}
            onChange={(e) => setLeftId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id} disabled={v.id === rightId}>
                v{v.versionNumber}
                {v.label ? ` — ${v.label}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 text-muted-foreground">vs</div>

        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Version B</label>
          <select
            value={rightId}
            onChange={(e) => setRightId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id} disabled={v.id === leftId}>
                v{v.versionNumber}
                {v.label ? ` — ${v.label}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <VersionPanel version={left} label="A" />
        <VersionPanel version={right} label="B" />
      </div>

      {/* Metadata diff */}
      {left && right && (
        <div className="rounded-lg border border-border p-4">
          <h3 className="mb-3 text-sm font-semibold">Metadata Comparison</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Version A</p>
              <p className="mt-1">v{left.versionNumber}</p>
              <p className="text-muted-foreground">{new Date(left.createdAt).toLocaleString()}</p>
              {left.label && <p className="text-muted-foreground">{left.label}</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Version B</p>
              <p className="mt-1">v{right.versionNumber}</p>
              <p className="text-muted-foreground">{new Date(right.createdAt).toLocaleString()}</p>
              {right.label && <p className="text-muted-foreground">{right.label}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VersionPanel({
  version,
  label,
}: {
  version: Version | undefined;
  label: string;
}): React.JSX.Element {
  if (!version) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
        <span className="text-sm text-muted-foreground">Select version {label}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Version {label} — v{version.versionNumber}
        </span>
      </div>
      <div className="aspect-video overflow-hidden rounded-lg border border-border bg-black">
        {/* Asset URL would come from the asset record — shown as placeholder canvas */}
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Asset ID: {version.assetId}
        </div>
      </div>
    </div>
  );
}
