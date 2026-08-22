import { NextResponse } from 'next/server';
import { readProviderConfig, getConfiguredProviders } from '@/lib/config.server';
import { PROVIDER_DISPLAY } from '@/lib/providers/registry.server';
import type { ProviderLabel } from '@video-ai/core/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface ProviderInfo {
  label: string;
  name: string;
  description: string;
  configured: boolean;
  missingEnvVars: string[];
}

export const GET = (): NextResponse => {
  const cfg = readProviderConfig();
  const configured = new Set(getConfiguredProviders(cfg));

  const providers: ProviderInfo[] = (Object.keys(PROVIDER_DISPLAY) as ProviderLabel[]).map(
    (label) => {
      const display = PROVIDER_DISPLAY[label]!;
      const isConfigured = configured.has(label);
      const missingEnvVars = isConfigured
        ? []
        : display.requiredEnvVars.filter((v) => !process.env[v]);

      return {
        label,
        name: display.name,
        description: display.description,
        configured: isConfigured,
        missingEnvVars,
      };
    },
  );

  return NextResponse.json({
    providers,
    configuredCount: configured.size,
    totalCount: providers.length,
  });
};
