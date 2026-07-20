/**
 * Kling AI video generation adapter — fail-closed.
 *
 * API reference: https://docs.klingai.com/api-reference
 * Base URL: https://api.klingai.com
 * Auth: KLING_API_KEY
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

const KLING_API_BASE = 'https://api.klingai.com';

function getApiKey(): string {
  const key = process.env['KLING_API_KEY'];
  if (!key || key.trim() === '') throw new ConfigurationError('KLING_API_KEY is not set.');
  return key.trim();
}

function bearerHeader(token: string): string { return 'Bearer ' + token; }

const KlingTaskSchema = z.object({
  task_id: z.string().min(1),
  task_status: z.enum(['submitted', 'processing', 'succeed', 'failed']),
  task_status_msg: z.string().optional().nullable(),
  task_result: z.object({
    videos: z.array(z.object({ id: z.string().min(1), url: z.string().url(), duration: z.string().optional() })).optional().nullable(),
  }).optional().nullable(),
});
const KlingResponseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  data: KlingTaskSchema.optional().nullable(),
});
type KlingTask = z.infer<typeof KlingTaskSchema>;

function klingStatusToProvider(status: KlingTask['task_status']): ProviderResult['provider_status'] {
  const map = { submitted: 'queued', processing: 'running', succeed: 'succeeded', failed: 'failed' } as const;
  return map[status] ?? 'unknown';
}

function toProviderResult(task: KlingTask, model: string): ProviderResult {
  const firstVideo = task.task_result?.videos?.[0] ?? null;
  return { provider_label: 'kling', provider_model_id: model, provider_job_id: task.task_id, provider_status: klingStatusToProvider(task.task_status), provider_url: firstVideo?.url ?? null, raw_response: task, retrieved_at: new Date().toISOString() };
}

async function handleKlingResponse(res: Response): Promise<Result<KlingTask, DomainError>> {
  if (!res.ok) {
    let message = 'Kling API error ' + res.status;
    try { const b = (await res.json()) as { message?: string }; if (b.message) message = b.message; } catch { /* ignore */ }
    return { ok: false, error: new DomainError('PROVIDER_ERROR', message, { retryable: res.status === 429 || res.status >= 500 }) };
  }
  const rawBody = await res.json();
  const envelope = KlingResponseSchema.safeParse(rawBody);
  if (!envelope.success) return { ok: false, error: new DomainError('PROVIDER_RESPONSE_INVALID', 'Kling response schema mismatch: ' + envelope.error.message, { retryable: false }) };
  if (envelope.data.code !== 0 || !envelope.data.data) {
    return { ok: false, error: new DomainError('PROVIDER_ERROR', envelope.data.message ?? 'Kling API returned code ' + envelope.data.code, { retryable: false }) };
  }
  return { ok: true, value: envelope.data.data };
}

export const klingProvider: VideoProvider = {
  label: 'kling',

  async submitJob(input: SubmitJobInput): Promise<Result<ProviderResult, DomainError>> {
    const apiKey = getApiKey();
    const model = (input.settings['model'] as string | undefined) ?? 'kling-v1';
    const res = await fetch(KLING_API_BASE + '/v1/videos/text2video', {
      method: 'POST',
      headers: { Authorization: bearerHeader(apiKey), 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_name: model, prompt: input.prompt, duration: (input.settings['duration'] as number | undefined) ?? 5, aspect_ratio: (input.settings['aspectRatio'] as string | undefined) ?? '16:9', mode: (input.settings['mode'] as string | undefined) ?? 'std' }),
      signal: input.signal ?? null,
    });
    const result = await handleKlingResponse(res);
    if (!result.ok) return result;
    return { ok: true, value: toProviderResult(result.value, model) };
  },

  async getJobStatus(input: GetJobStatusInput): Promise<Result<ProviderResult, DomainError>> {
    const apiKey = getApiKey();
    const res = await fetch(KLING_API_BASE + '/v1/videos/text2video/' + input.providerJobId, {
      headers: { Authorization: bearerHeader(apiKey) },
      signal: input.signal ?? null,
    });
    const result = await handleKlingResponse(res);
    if (!result.ok) return result;
    return { ok: true, value: toProviderResult(result.value, 'kling-v1') };
  },

  async fetchArtifact(input: FetchArtifactInput): Promise<Result<FetchArtifactResult, DomainError>> {
    getApiKey(); // verify config is present
    const res = await fetch(input.providerUrl, { signal: input.signal ?? null });
    if (!res.ok) return { ok: false, error: new DomainError('PROVIDER_ERROR', 'Failed to fetch Kling artifact: HTTP ' + res.status, { retryable: res.status >= 500 }) };
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
