import { CheckCircle2, CircleOff, LoaderCircle } from 'lucide-react';

export type EvidenceChecklistState = {
  completed: boolean;
  providerJobId: boolean;
  artifactUri: boolean;
  artifactSha256: boolean;
  auditLog: boolean;
};

export function EvidenceChecklist({ checklist }: { checklist: EvidenceChecklistState }) {
  const rows = [
    ['Render completed', checklist.completed],
    ['Provider Job ID', checklist.providerJobId],
    ['Artifact URI', checklist.artifactUri],
    ['SHA-256 hash', checklist.artifactSha256],
    ['Audit log event', checklist.auditLog],
  ];

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Evidence Checklist</p>
      {rows.map(([label, ok]) => (
        <div key={label} className="flex items-center justify-between text-sm">
          <span>{label}</span>
          {ok ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : label === 'Render completed' ? (
            <LoaderCircle className="h-4 w-4 animate-spin text-amber-400" />
          ) : (
            <CircleOff className="h-4 w-4 text-rose-400" />
          )}
        </div>
      ))}
    </div>
  );
}
