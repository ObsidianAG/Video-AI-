/**
 * Google Vertex AI — VEO 3 video generation adapter — fail-closed.
 *
 * API reference: https://cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos
 * Endpoint: POST https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/
 *           locations/{LOCATION}/publishers/google/models/veo-003:predictLongRunning
 * Requires: GOOGLE_VERTEX_PROJECT, GOOGLE_VERTEX_LOCATION, GOOGLE_APPLICATION_CREDENTIALS
 */
import 'server-only';

import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { DomainError } from '@video-ai/core';
import { ConfigurationError } from '@/lib/config.server';
import type {
  VideoProvider,
  SubmitJobInput,
  GetJobStatusInput,
  FetchArtifactInput,
  FetchArtifactResult,
  ProviderResult,
} from '@video-ai/core/providers';
import type { Result } from '@video-ai/core';

interface VeoConfig { project: string; location: string; credentialsPath: string; }

function getVeoConfig(): VeoConfig {
  const project = process.env['GOOGLE_VERTEX_PROJECT'];
  const location = process.env['GOOGLE_VERTEX_LOCATION'];
  const credentialsPath = process.env['GOOGLE_APPLICATION_CREDENTIALS'];
  const missing: string[] = [];
  if (!project) missing.push('GOOGLE_VERTEX_PROJECT');
  if (!location) missing.push('GOOGLE_VERTEX_LOCATION');
  if (!credentialsPath) missing.push('GOOGLE_APPLICATION_CREDENTIALS');
  if (missing.length > 0) throw new ConfigurationError('Google Vertex VEO missing: ' + missing.join(', '));
  return { project: project!, location: location!, credentialsPath: credentialsPath! };
}

interface ServiceAccountKey { client_email: string; private_key: string; token_uri: string; }
const ServiceAccountSchema = z.object({
  client_email: z.string().email(),
  private_key: z.string().min(1),
  token_uri: z.string().url(),
});

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getAccessToken(credentialsPath: string): Promise<string> {
  const cached = tokenCache.get(credentialsPath);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  let keyData: ServiceAccountKey;
  try {
    const raw = readFileSync(credentialsPath, 'utf8');
    const parsed = ServiceAccountSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw new ConfigurationError('Invalid service account key at ' + credentialsPath);
    keyData = parsed.data;
  } catch (err) {
    if (err instanceof ConfigurationError) throw err;
    throw new ConfigurationError('Cannot read credentials at ' + credentialsPath + ': ' + (err instanceof Error ? err.message : String(err)));
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: keyData.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: keyData.token_uri,
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const signingInput = header + '.' + payload;
  const { createSign } = await import('node:crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(keyData.private_key, 'base64url');
  const jwt = signingInput + '.' + signature;

  const res = await fetch(keyData.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error('Failed to get Google access token: ' + res.status + ' ' + body);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(credentialsPath, { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 });
  return data.access_token;
}

function bearerHeader(token: string): string { return 'Bearer ' + token; }

const VeoOperationSchema = z.object({
  name: z.string().min(1),
  done: z.boolean().optional().default(false),
  error: z.object({ code: z.number().optional(), message: z.string().optional() }).optional().nullable(),
  response: z.object({
    videos: z.array(z.object({ uri: z.string().min(1), mimeType: z.string().default('video/mp4') })).optional().nullable(),
  }).optional().nullable(),
});
type VeoOperation = z.infer<typeof VeoOperationSchema>;

function operationToProviderResult(op: VeoOperation, model: string): ProviderResult {
  const done = op.done ?? false;
  const firstVideo = op.response?.videos?.[0] ?? null;
  let status: ProviderResult['provider_status'];
  if (!done) status = 'running';
  else if (op.error) status = 'failed';
  else if (firstVideo) status = 'succeeded';
  else status = 'unknown';
  return { provider_label: 'google_vertex_veo', provider_model_id: model, provider_job_id: op.name, provider_status: status, provider_url: firstVideo?.uri ?? null, raw_response: op, retrieved_at: new Date().toISOString() };
}

async function tryGetToken(cfg: VeoConfig): Promise<Result<string, DomainError>> {
  try { return { ok: true, value: await getAccessToken(cfg.credentialsPath) }; }
  catch (err) { return { ok: false, error: new DomainError('PROVIDER_UNAVAILABLE', err instanceof Error ? err.message : String(err), { retryable: false }) }; }
}

export const googleVeoProvider: VideoProvider = {
  label: 'google_vertex_veo',

  async submitJob(input: SubmitJobInput): Promise<Result<ProviderResult, DomainError>> {
    const cfg = getVeoConfig();
    const tokenResult = await tryGetToken(cfg);
    if (!tokenResult.ok) return tokenResult;

    const model = (input.settings['model'] as string | undefined) ?? 'veo-003';
    const endpoint = 'https://' + cfg.location + '-aiplatform.googleapis.com/v1/projects/' + cfg.project + '/locations/' + cfg.location + '/publishers/google/models/' + model + ':predictLongRunning';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: bearerHeader(tokenResult.value), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: input.prompt }],
        parameters: { aspectRatio: (input.settings['aspectRatio'] as string | undefined) ?? '16:9', durationSeconds: (input.settings['durationSeconds'] as number | undefined) ?? 5 },
      }),
      signal: input.signal ?? null,
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: new DomainError('PROVIDER_ERROR', 'Google VEO error ' + res.status + ': ' + body, { retryable: res.status === 429 || res.status >= 500 }) };
    }
    const rawBody = await res.json();
    const parsed = VeoOperationSchema.safeParse(rawBody);
    if (!parsed.success) return { ok: false, error: new DomainError('PROVIDER_RESPONSE_INVALID', 'Google VEO response schema mismatch: ' + parsed.error.message, { retryable: false }) };
    return { ok: true, value: operationToProviderResult(parsed.data, model) };
  },

  async getJobStatus(input: GetJobStatusInput): Promise<Result<ProviderResult, DomainError>> {
    const cfg = getVeoConfig();
    const tokenResult = await tryGetToken(cfg);
    if (!tokenResult.ok) return tokenResult;

    const url = 'https://' + cfg.location + '-aiplatform.googleapis.com/v1/' + input.providerJobId;
    const res = await fetch(url, { headers: { Authorization: bearerHeader(tokenResult.value) }, signal: input.signal ?? null });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: new DomainError('PROVIDER_ERROR', 'Google VEO status error ' + res.status + ': ' + body, { retryable: res.status >= 500 }) };
    }
    const rawBody = await res.json();
    const parsed = VeoOperationSchema.safeParse(rawBody);
    if (!parsed.success) return { ok: false, error: new DomainError('PROVIDER_RESPONSE_INVALID', 'Google VEO status schema mismatch: ' + parsed.error.message, { retryable: false }) };
    const modelMatch = /models\/([^/]+)/.exec(input.providerJobId);
    return { ok: true, value: operationToProviderResult(parsed.data, modelMatch?.[1] ?? 'veo-003') };
  },

  async fetchArtifact(input: FetchArtifactInput): Promise<Result<FetchArtifactResult, DomainError>> {
    const cfg = getVeoConfig();
    const tokenResult = await tryGetToken(cfg);
    if (!tokenResult.ok) return tokenResult;

    const res = await fetch(input.providerUrl, { headers: { Authorization: bearerHeader(tokenResult.value) }, signal: input.signal ?? null });
    if (!res.ok) return { ok: false, error: new DomainError('PROVIDER_ERROR', 'Failed to fetch VEO artifact: HTTP ' + res.status, { retryable: res.status >= 500 }) };

    const contentType = res.headers.get('content-type') ?? 'video/mp4';
    const contentLength = res.headers.get('content-length');
    let bytesWritten = 0;
    if (res.body) {
      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await input.sink(value);
        bytesWritten += value.byteLength;
      }
    }
    return { ok: true, value: { bytes_written: bytesWritten, mime_type: contentType, provider_url: input.providerUrl, provider_reported_size_bytes: contentLength ? parseInt(contentLength, 10) : null } };
  },
};
