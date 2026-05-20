import { notFound } from 'next/navigation';
import { AuditLogTable } from '@/components/audit-log-table';
import { EvidenceChecklist } from '@/components/evidence-checklist';
import { SceneCard } from '@/components/scene-card';
import { getEvidenceChecklist, getProjectById, getRenderJobsByProjectId, getShotPlanByProjectId, listEvidenceEvents } from '@/lib/mock-store';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = getProjectById(projectId);
  const shotPlan = getShotPlanByProjectId(projectId);

  if (!project || !shotPlan) {
    notFound();
  }

  const jobs = getRenderJobsByProjectId(projectId);
  const events = listEvidenceEvents().filter((event) => event.entityId.includes(projectId) || jobs.some((job) => job.id === event.entityId));

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card/60 p-5">
        <h2 className="text-2xl font-semibold">{project.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{shotPlan.logline}</p>
        <p className="mt-1 text-xs text-muted-foreground">Owner: {project.owner} · Created: {new Date(project.createdAt).toLocaleString()}</p>
      </section>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold">Scene Timeline</h3>
        {shotPlan.scenes.map((scene) => (
          <SceneCard key={scene.id} scene={scene} />
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-5">
        <h3 className="text-xl font-semibold">Prompt History & Mock Render Versions</h3>
        <div className="mt-3 space-y-3">
          {jobs.map((job) => (
            <article key={job.id} className="rounded-lg border border-border bg-background/60 p-3">
              <p className="text-sm font-medium">{job.shotId}</p>
              <p className="mt-1 text-xs text-muted-foreground">Prompt: {job.prompt}</p>
              <p className="mt-1 text-xs text-muted-foreground">Artifact: {job.artifactUri ?? 'pending'}</p>
              <div className="mt-2">
                <EvidenceChecklist checklist={getEvidenceChecklist(job)} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <AuditLogTable events={events} />
    </div>
  );
}
