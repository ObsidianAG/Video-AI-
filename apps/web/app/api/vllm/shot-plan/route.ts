import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { shotPlanInputSchema } from '@/lib/schemas';
import { createShotPlanForProject, getProjectById, listProjects } from '@/lib/mock-store';
import { generateShotPlanFromVllm } from '@/lib/vllm';

export const runtime = 'nodejs';

export const POST = async (request: Request): Promise<NextResponse> => {
  const body = await request.json().catch(() => null);
  const parsedInput = shotPlanInputSchema.safeParse(body);

  if (!parsedInput.success) {
    return NextResponse.json(
      {
        error: 'Invalid input payload.',
        issues: parsedInput.error.issues,
      },
      { status: 422 },
    );
  }

  try {
    const output = await generateShotPlanFromVllm(parsedInput.data);
    const project =
      getProjectById((body as { projectId?: string })?.projectId ?? '') ?? listProjects()[0];

    const persisted = createShotPlanForProject(project?.id ?? randomUUID(), {
      title: output.title,
      logline: output.logline,
      genre: output.genre,
      mood: output.mood,
      scenes: output.scenes.map((scene) => ({
        ...scene,
        id: randomUUID(),
        shots: scene.shots.map((shot) => ({ ...shot, id: randomUUID() })),
      })),
    });

    return NextResponse.json({
      ok: true,
      shotPlan: persisted,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Shot plan generation failed validation or provider execution.',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 422 },
    );
  }
};
