import { Activity } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';

export function ProviderHealthCard({
  provider,
  status,
  detail,
}: {
  provider: string;
  status: 'healthy' | 'warning' | 'down';
  detail: string;
}) {
  const tone = status === 'healthy' ? 'success' : status === 'warning' ? 'warning' : 'danger';

  return (
    <article className="rounded-xl border border-border bg-card/60 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4" />
          {provider}
        </h3>
        <StatusBadge label={status} tone={tone} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{detail}</p>
    </article>
  );
}
