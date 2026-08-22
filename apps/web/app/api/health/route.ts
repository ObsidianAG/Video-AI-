import { NextResponse } from 'next/server';
import { readProviderConfig, getConfiguredProviders } from '@/lib/config.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = (): NextResponse => {
  const dbConfigured = !!process.env['DATABASE_URL'];
  const providerCfg = readProviderConfig();
  const configuredProviders = getConfiguredProviders(providerCfg);

  return NextResponse.json({
    ok: true,
    service: 'video-ai-web',
    database: dbConfigured ? 'configured' : 'not_configured',
    providers: {
      configured: configuredProviders,
      count: configuredProviders.length,
    },
    ready: dbConfigured && configuredProviders.length > 0,
  });
};
