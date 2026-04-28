import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, listJobs, listVersions } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import type { Job, Version } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props): Promise<React.JSX.Element> {
  await requireAuth();
  const { id } = await params;

  let project;
  try {
    project = await getProject(id);
  } catch {
    notFound();
  }

  const [jobsData, versions] = await Promise.allSettled([
    listJobs(id, 1, 10),
    listVersions(id),
  ]);

  const jobs = jobsData.status === "fulfilled" ? jobsData.value.items : [];
  const versionList = versions.status === "fulfilled" ? versions.value : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          Projects
        </Link>
        <span>/</span>
        <span className="text-foreground">{project.name}</span>
      </div>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/projects/${id}/editor`}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Open Editor
          </Link>
          {versionList.length > 1 && (
            <Link
              href={`/projects/${id}/compare`}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Compare Versions
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Jobs */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Recent Jobs</h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs yet</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>

        {/* Versions */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Versions</h2>
          {versionList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No versions yet</p>
          ) : (
            <div className="space-y-3">
              {versionList.map((version) => (
                <VersionRow key={version.id} version={version} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function JobRow({ job }: { job: Job }): React.JSX.Element {
  const stateColors: Record<string, string> = {
    SUCCEEDED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-800",
    QUEUED: "bg-blue-100 text-blue-800",
    STARTED: "bg-blue-100 text-blue-800",
    PROVIDER_RUNNING: "bg-yellow-100 text-yellow-800",
    UPLOADING: "bg-yellow-100 text-yellow-800",
    CREATED: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium">{job.provider}</p>
        <p className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</p>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${stateColors[job.state] ?? "bg-muted"}`}
      >
        {job.state}
      </span>
    </div>
  );
}

function VersionRow({ version }: { version: Version }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium">
          v{version.versionNumber}
          {version.label ? ` — ${version.label}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(version.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
