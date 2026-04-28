import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = (): NextResponse => {
  return NextResponse.json({
    ok: true,
    service: 'video-ai-web',
    foundation_slice: true,
    proof_required: true,
  });
};
