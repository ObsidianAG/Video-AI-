import { NextResponse } from 'next/server';
import { rejectRenderJob } from '@/lib/mock-store';
import { rejectRenderJobSchema } from '@/lib/schemas';

export const runtime = 'nodejs';

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = rejectRenderJobSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid rejection payload.', issues: parsed.error.issues }, { status: 422 });
  }

  const rejected = rejectRenderJob(id, parsed.data.reason, parsed.data.actor);
  if (!rejected) {
    return NextResponse.json({ error: 'Render job not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, job: rejected });
};
