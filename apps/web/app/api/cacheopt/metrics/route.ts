import { NextResponse } from 'next/server';
import { getMockCacheOptMetrics } from '@/lib/mock-store';

export const runtime = 'nodejs';

export const GET = (): NextResponse => {
  return NextResponse.json({ ok: true, metrics: getMockCacheOptMetrics() });
};
