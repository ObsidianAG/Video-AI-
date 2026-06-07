import { StatusBadge } from '@/components/status-badge';
import type { RenderJob } from '@/lib/types';

export function AssetVaultTable({ jobs }: { jobs: RenderJob[] }) {
  const approvedAssets = jobs.filter((job) => job.status === 'approved' || job.status === 'completed');

  return (
    <section className="rounded-xl border border-border bg-card/60 p-5">
      <h2 className="text-xl font-semibold">Asset Vault</h2>
      <p className="mt-1 text-sm text-muted-foreground">No hash, no asset.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="pb-2">Asset</th>
              <th className="pb-2">Artifact URI</th>
              <th className="pb-2">SHA-256</th>
              <th className="pb-2">Provider Job</th>
              <th className="pb-2">Created</th>
              <th className="pb-2">Approval</th>
              <th className="pb-2">Download</th>
            </tr>
          </thead>
          <tbody>
            {approvedAssets.map((job) => {
              const approved = job.status === 'approved';
              return (
                <tr key={job.id} className="border-t border-border/70 align-top">
                  <td className="py-2">{job.shotId}</td>
                  <td className="py-2 break-all">{job.artifactUri}</td>
                  <td className="py-2 break-all">{job.artifactSha256}</td>
                  <td className="py-2">{job.providerJobId}</td>
                  <td className="py-2">{new Date(job.createdAt).toLocaleString()}</td>
                  <td className="py-2"><StatusBadge label={job.status} tone={approved ? 'success' : 'warning'} /></td>
                  <td className="py-2">
                    <button
                      disabled={!approved}
                      className="rounded-md border border-border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
