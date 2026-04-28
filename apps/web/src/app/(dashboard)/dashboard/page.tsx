import Link from "next/link";
import { listProjects } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import type { Project } from "@/types";

export default async function DashboardPage(): Promise<React.JSX.Element> {
  await requireAuth();

  let projectsData: { items: Project[]; total: number } = { items: [], total: 0 };
  let fetchError: string | null = null;

  try {
    projectsData = await listProjects(1, 20);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load projects";
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projectsData.total} project{projectsData.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Project
        </Link>
      </div>

      {fetchError && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {fetchError}
        </div>
      )}

      {projectsData.items.length === 0 && !fetchError ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <p className="mb-4 text-muted-foreground">No projects yet</p>
          <Link
            href="/dashboard/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projectsData.items.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }): React.JSX.Element {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-ring hover:bg-accent/50">
        <div className="mb-3 flex items-start justify-between">
          <h2 className="font-semibold group-hover:text-primary">{project.name}</h2>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              project.status === "ACTIVE"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {project.status}
          </span>
        </div>
        {project.description && (
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {new Date(project.createdAt).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}
