import { notFound } from "next/navigation";
import { getProject, listVersions } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { TimelineEditor } from "@/components/timeline-editor";
import { PromptEditor } from "@/components/prompt-editor";
import { JobStatusRail } from "@/components/job-status-rail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditorPage({ params }: Props): Promise<React.JSX.Element> {
  await requireAuth();
  const { id } = await params;

  let project;
  try {
    project = await getProject(id);
  } catch {
    notFound();
  }

  const versionsResult = await listVersions(id).catch(() => []);

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Left panel: Timeline + Prompt editor */}
      <div className="flex flex-1 flex-col overflow-hidden border-r border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{project.name}</h2>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Timeline
            </h3>
            <TimelineEditor projectId={id} versions={versionsResult} />
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Prompt
            </h3>
            <PromptEditor projectId={id} />
          </section>
        </div>
      </div>

      {/* Right panel: Job status rail */}
      <div className="w-80 flex-shrink-0 overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Job Queue</h3>
        </div>
        <JobStatusRail projectId={id} />
      </div>
    </div>
  );
}
