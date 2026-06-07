import { NextResponse } from 'next/server';
import { createMockRenderJob, getProjectById, getShotById } from '@/lib/mock-store';
import { createMockRenderJobSchema } from '@/lib/schemas';

export const runtime = 'nodejs';

export const POST = async (request: Request): Promise<NextResponse> => {
  const body = await request.json().catch(() => null);
  const parsed = createMockRenderJobSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid render job payload.', issues: parsed.error.issues }, { status: 422 });
  }

  const project = getProjectById(parsed.data.projectId);
  const shot = getShotById(parsed.data.shotId);

  if (!project || !shot) {
    return NextResponse.json({ error: 'Project or shot not found.' }, { status: 404 });
  }

  const job = createMockRenderJob(parsed.data);

  return NextResponse.json({
    ok: true,
    message: 'Mock render job created from queued to completed with evidence chain.',
    job,
  });
};
