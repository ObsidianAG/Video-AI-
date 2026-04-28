import { notFound } from "next/navigation";
import { getProject, listVersions } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { VersionCompare } from "@/components/version-compare";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ComparePage({ params }: Props): Promise<React.JSX.Element> {
  await requireAuth();
  const { id } = await params;

  let project;
  try {
    project = await getProject(id);
  } catch {
    notFound();
  }

  const versions = await listVersions(id).catch(() => []);

  if (versions.length < 2) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-lg font-semibold">Not enough versions</h2>
        <p className="mt-2 text-muted-foreground">
          You need at least 2 versions to compare. Generate more videos in the editor.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Compare Versions — {project.name}</h1>
      <VersionCompare versions={versions} />
    </div>
  );
}
