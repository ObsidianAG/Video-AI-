import { AssetVaultTable } from '@/components/asset-vault-table';
import { listRenderJobs } from '@/lib/mock-store';

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card/60 p-5">
        <h2 className="text-2xl font-semibold">Asset Vault</h2>
        <p className="mt-2 text-sm text-muted-foreground">Approved assets only. Frontend state is never production truth.</p>
      </section>
      <AssetVaultTable jobs={listRenderJobs()} />
    </div>
  );
}
