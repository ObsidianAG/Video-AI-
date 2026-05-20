import Link from 'next/link';
import { StatusBadge } from '@/components/status-badge';
import { getProjectStats, listProjects } from '@/lib/mock-store';

export default function ProjectsPage() {
  const projects = listProjects();

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold">Projects</h2>
        <p className="text-sm text-muted-foreground">Feature film, commercial, episodic, pitch, previs, and VFX workflows.</p>
      </section>
      <div className="overflow-x-auto rounded-xl border border-border bg-card/60 p-4">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="pb-2">Project title</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Shot plans</th>
              <th className="pb-2">Mock renders</th>
              <th className="pb-2">Approval %</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const stats = getProjectStats(project.id);
              return (
                <tr key={project.id} className="border-t border-border/70">
                  <td className="py-2">
                    <Link href={`/projects/${project.id}`} className="font-medium text-sky-300 hover:underline">
                      {project.title}
                    </Link>
                  </td>
                  <td className="py-2">{project.type.replace('_', ' ')}</td>
                  <td className="py-2"><StatusBadge label={project.status} tone="info" /></td>
                  <td className="py-2">{stats.shotPlanCount}</td>
                  <td className="py-2">{stats.mockRenderCount}</td>
                  <td className="py-2">{stats.approvalPercentage}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
