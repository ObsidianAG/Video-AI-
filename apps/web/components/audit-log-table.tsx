import type { EvidenceEvent } from '@/lib/types';

export function AuditLogTable({ events }: { events: EvidenceEvent[] }) {
  return (
    <section className="rounded-xl border border-border bg-card/60 p-5">
      <h2 className="text-xl font-semibold">Audit Events</h2>
      <p className="mt-1 text-sm text-muted-foreground">No receipt, no truth.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="pb-2">Event</th>
              <th className="pb-2">Entity</th>
              <th className="pb-2">Actor</th>
              <th className="pb-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-t border-border/70">
                <td className="py-2">{event.eventType}</td>
                <td className="py-2">{event.entityType}:{event.entityId}</td>
                <td className="py-2">{event.actor}</td>
                <td className="py-2">{new Date(event.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
