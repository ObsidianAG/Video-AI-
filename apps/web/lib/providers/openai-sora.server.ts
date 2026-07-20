/**
 * OpenAI Sora video generation adapter — fail-closed.
 *
 * API reference: https://platform.openai.com/docs/api-reference/video
 * Endpoint: POST https://api.openai.com/v1/video/generations
 * Models: sora-1.0-hd, sora-1.0-sd
 * Poll: GET https://api.openai.com/v1/video/generations/{id}
 */
import 'server-only';

import { z } from 'zod';
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

const OPENAI_API_BASE = 'https://api.openai.com/v1';

const SoraJobSchema = z.object({
  id: z.string().min(1),
  object: z.string(),
  status: z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled']),
  model: z.string().min(1),
  created_at: z.number().int().positive(),
  output: z
    .array(z.object({ url: z.string().url(), content_type: z.string().default('video/mp4') }))
    .optional()
    .nullable(),
  error: z.object({ code: z.string().optional(), message: z.string().optional() }).optional().nullable(),
});
type SoraJob = z.infer<typeof SoraJobSchema>;

const SoraErrorSchema = z.object({
  error: z.object({ message: z.string(), type: z.string().optional(), code: z.string().optional() }),
});

function getApiKey(): string {
  const key = process.env['OPENAI_API_KEY'];
  if (!key || key.trim() === '') {
    throw new ConfigurationError('OPENAI_API_KEY is not set. Cannot call OpenAI Sora API.');
  }
  return key.trim();
}

function bearerHeader(token: string): string { return 'Bearer ' + token; }

async function openaiPost(path: string, body: Record<string, unknown>, apiKey: string): Promise<Response> {
  return fetch(OPENAI_API_BASE + path, {
    method: 'POST',
    headers: { Authorization: bearerHeader(apiKey), 'Content-Type': 'application/json', 'OpenAI-Beta': 'video-v1' },
    body: JSON.stringify(body),
  });
}

async function openaiGet(path: string, apiKey: string): Promise<Response> {
  return fetch(OPENAI_API_BASE + path, {
    method: 'GET',
    headers: { Authorization: bearerHeader(apiKey), 'OpenAI-Beta': 'video-v1' },
  });
}

function parseSoraStatus(status: SoraJob['status']): ProviderResult['provider_status'] {
  const map: Record<SoraJob['status'], ProviderResult['provider_status']> = {
    queued: 'queued', running: 'running', succeeded: 'succeeded', failed: 'failed', cancelled: 'cancelled',
  };
  return map[status] ?? 'unknown';
}

function toProviderResult(job: SoraJob): ProviderResult {
  const firstOutput = job.output?.[0] ?? null;
  return {
    provider_label: 'openai_video',
    provider_model_id: job.model,
    provider_job_id: job.id,
    provider_status: parseSoraStatus(job.status),
    provider_url: firstOutput?.url ?? null,
    raw_response: job,
    retrieved_at: new Date().toISOString(),
  };
}

async function handleErrorResponse(res: Response): Promise<DomainError> {
  let body: unknown;
  try { body = await res.json(); } catch { body = await res.text(); }
  const parsed = SoraErrorSchema.safeParse(body);
  const message = parsed.success ? parsed.data.error.message : 'OpenAI API error ' + res.status;
  return new DomainError('PROVIDER_ERROR', message, { retryable: res.status === 429 || res.status >= 500 });
}

export const openAiSoraProvider: VideoProvider = {
  label: 'openai_video',

  async submitJob(input: SubmitJobInput): Promise<Result<ProviderResult, DomainError>> {
    const apiKey = getApiKey();
    const model = (input.settings['model'] as string | undefined) ?? 'sora-1.0-hd';
    const n = (input.settings['n'] as number | undefined) ?? 1;
    const duration = (input.settings['duration'] as number | undefined) ?? 5;
    const resolution = (input.settings['resolution'] as string | undefined) ?? '480p';

    const res = await openaiPost('/video/generations', { model, prompt: input.prompt, n, duration, resolution }, apiKey);
    if (!res.ok) return { ok: false, error: await handleErrorResponse(res) };

    const rawBody = await res.json();
    const parsed = SoraJobSchema.safeParse(rawBody);
    if (!parsed.success) {
      return { ok: false, error: new DomainError('PROVIDER_RESPONSE_INVALID', 'OpenAI Sora response schema mismatch: ' + parsed.error.message, { retryable: false }) };
    }
    return { ok: true, value: toProviderResult(parsed.data) };
  },

  async getJobStatus(input: GetJobStatusInput): Promise<Result<ProviderResult, DomainError>> {
    const apiKey = getApiKey();
    const res = await openaiGet('/video/generations/' + input.providerJobId, apiKey);
    if (!res.ok) return { ok: false, error: await handleErrorResponse(res) };

    const rawBody = await res.json();
    const parsed = SoraJobSchema.safeParse(rawBody);
    if (!parsed.success) {
      return { ok: false, error: new DomainError('PROVIDER_RESPONSE_INVALID', 'OpenAI Sora status response schema mismatch: ' + parsed.error.message, { retryable: false }) };
    }
    return { ok: true, value: toProviderResult(parsed.data) };
  },

  async fetchArtifact(input: FetchArtifactInput): Promise<Result<FetchArtifactResult, DomainError>> {
    const apiKey = getApiKey();
    const res = await fetch(input.providerUrl, {
      headers: { Authorization: bearerHeader(apiKey) },
      signal: input.signal ?? null,
    });

    if (!res.ok) {
      return { ok: false, error: new DomainError('PROVIDER_ERROR', 'Failed to fetch OpenAI artifact: HTTP ' + res.status, { retryable: res.status >= 500 }) };
    }

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
