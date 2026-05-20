import { NextResponse } from 'next/server';
import { listEvidenceEvents } from '@/lib/mock-store';

export const runtime = 'nodejs';

export const GET = (): NextResponse => {
  return NextResponse.json({ ok: true, auditEvents: listEvidenceEvents() });
};
