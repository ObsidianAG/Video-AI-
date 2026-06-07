import type { RenderJob, RenderJobStatus } from '@/lib/types';

export const toneFromJobStatus = (status: RenderJobStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  if (status === 'approved') return 'success';
  if (status === 'completed') return 'info';
  if (status === 'failed' || status === 'rejected') return 'danger';
  if (status === 'in_progress' || status === 'queued') return 'warning';
  return 'default';
};

export const getEvidenceChecklistFromRenderJob = (job: RenderJob) => ({
  completed: job.status === 'completed' || job.status === 'approved',
  providerJobId: Boolean(job.providerJobId),
  artifactUri: Boolean(job.artifactUri),
  artifactSha256: Boolean(job.artifactSha256),
  auditLog: job.evidenceStatus === 'complete',
});
