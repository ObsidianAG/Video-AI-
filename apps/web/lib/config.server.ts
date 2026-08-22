/**
 * Server-side configuration — fail-closed.
 *
 * This module reads required environment variables at call-time (not module
 * load time) so Next.js can still build with missing vars. Every read that
 * hits a missing required var throws a descriptive error that bubbles through
 * the API route as a 503, never reaching the client in raw form.
 *
 * NEVER import this file in client components. The proof scanner enforces the
 * 'server-only' import.
 */
import 'server-only';

export interface DatabaseConfig {
  readonly url: string;
}

export interface ProviderConfig {
  readonly openaiApiKey: string | null;
  readonly googleVertexProject: string | null;
  readonly googleVertexLocation: string | null;
  readonly googleApplicationCredentials: string | null;
  readonly klingApiKey: string | null;
  readonly replicateApiToken: string | null;
  readonly runwayApiKey: string | null;
  readonly falKey: string | null;
}

/** Throws with exact blocker message if DATABASE_URL is not set. */
export function requireDatabaseConfig(): DatabaseConfig {
  const url = process.env['DATABASE_URL'];
  if (!url || url.trim() === '') {
    throw new ConfigurationError(
      'DATABASE_URL is not set. ' +
        'Set it to a valid PostgreSQL connection string, e.g. ' +
        '******host:5432/video_ai',
    );
  }
  return { url: url.trim() };
}

/** Returns partial provider config — null fields mean that provider is unavailable. */
export function readProviderConfig(): ProviderConfig {
  return {
    openaiApiKey: process.env['OPENAI_API_KEY'] ?? null,
    googleVertexProject: process.env['GOOGLE_VERTEX_PROJECT'] ?? null,
    googleVertexLocation: process.env['GOOGLE_VERTEX_LOCATION'] ?? null,
    googleApplicationCredentials: process.env['GOOGLE_APPLICATION_CREDENTIALS'] ?? null,
    klingApiKey: process.env['KLING_API_KEY'] ?? null,
    replicateApiToken: process.env['REPLICATE_API_TOKEN'] ?? null,
    runwayApiKey: process.env['RUNWAY_API_KEY'] ?? null,
    falKey: process.env['FAL_KEY'] ?? null,
  };
}

/** Thrown when a required environment variable is missing. */
export class ConfigurationError extends Error {
  readonly code = 'CONFIGURATION_ERROR' as const;
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/** Checks which providers have the minimum required credentials. */
export function getConfiguredProviders(cfg: ProviderConfig): string[] {
  const providers: string[] = [];

  if (cfg.openaiApiKey) {
    providers.push('openai_video');
  }

  const hasVertexCreds =
    cfg.googleVertexProject &&
    cfg.googleVertexLocation &&
    cfg.googleApplicationCredentials;
  if (hasVertexCreds) {
    providers.push('google_vertex_veo');
  }

  if (cfg.klingApiKey) {
    providers.push('kling');
  }

  if (cfg.replicateApiToken) {
    providers.push('replicate');
  }

  if (cfg.runwayApiKey) {
    providers.push('runway');
  }

  if (cfg.falKey) {
    providers.push('fal');
  }

  return providers;
}
