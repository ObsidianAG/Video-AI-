import { CacheOptCards } from '@/components/cacheopt-cards';
import { ObservabilityCards } from '@/components/observability-cards';
import { getMockCacheOptMetrics, getMockRuntimeMetrics } from '@/lib/mock-store';

export default function AdminObservabilityPage() {
  return (
    <div className="space-y-6">
      <ObservabilityCards metrics={getMockRuntimeMetrics()} />
      <CacheOptCards metrics={getMockCacheOptMetrics()} />
    </div>
  );
}
