"use client";

import { useState, useTransition } from "react";
import type { AuditEvent } from "@/types";

interface Props {
  resourceId?: string;
  resourceType?: string;
}

export function AuditDrawer({ resourceId, resourceType }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleOpen(): void {
    setOpen(true);
    if (events.length === 0) {
      startTransition(async () => {
        try {
          const params = new URLSearchParams();
          if (resourceId) params.set("resource_id", resourceId);
          if (resourceType) params.set("resource_type", resourceType);

          const response = await fetch(`/api/audit-proxy?${params.toString()}`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = (await response.json()) as AuditEvent[];
          setEvents(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load audit events");
        }
      });
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
      >
        Audit Log
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <aside className="w-96 overflow-y-auto bg-background shadow-xl border-l border-border">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="font-semibold">Audit Log</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 hover:bg-accent"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              {isPending && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse rounded-md bg-muted h-12" />
                  ))}
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {!isPending && events.length === 0 && !error && (
                <p className="text-sm text-muted-foreground">No audit events found.</p>
              )}

              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-md border border-border p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{event.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {event.resourceType}
                    {event.resourceId ? ` · ${event.resourceId.slice(0, 8)}…` : ""}
                  </p>
                  {event.ipAddress && (
                    <p className="text-xs text-muted-foreground">IP: {event.ipAddress}</p>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
