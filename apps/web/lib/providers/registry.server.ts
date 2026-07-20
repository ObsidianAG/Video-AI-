/**
 * Provider registry — server-side only.
 *
 * Returns only providers whose required environment variables are set.
 */
import 'server-only';

import { readProviderConfig, getConfiguredProviders } from '@/lib/config.server';
import { openAiSoraProvider } from '@/lib/providers/openai-sora.server';
import { googleVeoProvider } from '@/lib/providers/google-veo.server';
import { klingProvider } from '@/lib/providers/kling.server';
import type { VideoProvider, ProviderLabel, ProviderRegistry } from '@video-ai/core/providers';

const ALL_PROVIDERS: ReadonlyMap<ProviderLabel, VideoProvider> = new Map<ProviderLabel, VideoProvider>([
  ['openai_video', openAiSoraProvider],
  ['google_vertex_veo', googleVeoProvider],
  ['kling', klingProvider],
]);

export function buildProviderRegistry(): ProviderRegistry {
  const cfg = readProviderConfig();
  const configured = new Set(getConfiguredProviders(cfg));

  const available = new Map<ProviderLabel, VideoProvider>();
  for (const [label, provider] of ALL_PROVIDERS) {
    if (configured.has(label)) available.set(label, provider);
  }

  return {
    get(label: ProviderLabel): VideoProvider {
      const p = available.get(label);
      if (!p) throw new Error('Provider "' + label + '" is not available. Configured: ' + [...available.keys()].join(', '));
      return p;
    },
    has(label: ProviderLabel): boolean { return available.has(label); },
    list(): readonly ProviderLabel[] { return [...available.keys()]; },
  };
}

export const PROVIDER_DISPLAY: Record<ProviderLabel, { name: string; description: string; requiredEnvVars: string[] }> = {
  openai_video: { name: 'OpenAI Sora', description: 'High-quality video generation from text prompts.', requiredEnvVars: ['OPENAI_API_KEY'] },
  google_vertex_veo: { name: 'Google VEO 3', description: "Google's state-of-the-art video generation model.", requiredEnvVars: ['GOOGLE_VERTEX_PROJECT', 'GOOGLE_VERTEX_LOCATION', 'GOOGLE_APPLICATION_CREDENTIALS'] },
  kling: { name: 'Kling AI', description: 'Fast, high-quality text-to-video generation.', requiredEnvVars: ['KLING_API_KEY'] },
  replicate: { name: 'Replicate', description: 'Access to open-source video models.', requiredEnvVars: ['REPLICATE_API_TOKEN'] },
  runway: { name: 'Runway', description: 'Professional-grade AI video generation.', requiredEnvVars: ['RUNWAY_API_KEY'] },
  fal: { name: 'fal.ai', description: 'Fast inference for video generation models.', requiredEnvVars: ['FAL_KEY'] },
};
