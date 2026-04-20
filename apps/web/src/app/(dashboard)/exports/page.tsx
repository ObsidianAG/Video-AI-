import Link from "next/link";
import { listProjects } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import type { Export } from "@/types";

export default async function ExportsPage(): Promise<React.JSX.Element> {
  await requireAuth();

  // Exports are keyed by project; show per-project summary
  const projectsData = await listProjects(1, 50).catch(() => ({ items: [], total: 0 }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Export Manager</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage video exports across your projects
        </p>
      </div>

      {projectsData.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <p className="mb-4 text-muted-foreground">No projects found</p>
          <Link
            href="/dashboard"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go to projects
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projectsData.items.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium">{project.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <Link
                href={`/projects/${project.id}/compare`}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
              >
                Export versions
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
