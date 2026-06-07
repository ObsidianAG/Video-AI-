import { NextResponse } from 'next/server';
import { approveRenderJob, canApproveRenderJob, listRenderJobs } from '@/lib/mock-store';

export const runtime = 'nodejs';

export const POST = async (
  _: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> => {
  const { id } = await params;
  const existing = listRenderJobs().find((job) => job.id === id);

  if (!existing) {
    return NextResponse.json({ error: 'Render job not found.' }, { status: 404 });
  }

  if (!canApproveRenderJob(existing)) {
    return NextResponse.json(
      {
        error: 'Approval denied. Missing required evidence.',
        required: ['status=completed', 'providerJobId', 'artifactUri', 'artifactSha256', 'audit_event'],
      },
      { status: 409 },
    );
  }

  const approved = approveRenderJob(id);
  if (!approved) {
    return NextResponse.json({ error: 'Approval failed.' }, { status: 409 });
  }

  return NextResponse.json({ ok: true, job: approved });
};
