import { z } from 'zod';
import type { Result } from '../result.js';
import type { DomainError } from '../errors.js';

/**
 * Internal provider label. NEVER conflate this with a provider's model id.
 * Add a new label here only after the provider's docs and live API have been
 * verified for the target account, region, and model.
 */
export const PROVIDER_LABELS = [
  'openai_video',
  'google_vertex_veo',
  'replicate',
  'runway',
  'kling',
  'fal',
] as const;

export type ProviderLabel = (typeof PROVIDER_LABELS)[number];

export const ProviderStatusSchema = z.enum([
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
  'unknown',
]);
export type ProviderStatus = z.infer<typeof ProviderStatusSchema>;

export const ProviderResultSchema = z.object({
  provider_label: z.string().min(1),
  provider_model_id: z.string().min(1),
  provider_job_id: z.string().min(1),
  provider_status: ProviderStatusSchema,
  provider_url: z.string().url().nullable(),
  raw_response: z.unknown(),
  retrieved_at: z.string().datetime(),
});
export type ProviderResult = z.infer<typeof ProviderResultSchema>;

export interface SubmitJobInput {
  readonly jobId: string;
  readonly userId: string;
  readonly prompt: string;
  readonly modelId: string;
  readonly settings: Readonly<Record<string, unknown>>;
  readonly idempotencyKey: string;
  readonly webhookUrl?: string;
  readonly signal?: AbortSignal;
}

export interface GetJobStatusInput {
  readonly providerJobId: string;
  readonly signal?: AbortSignal;
}

export interface FetchArtifactInput {
  readonly providerJobId: string;
  readonly providerUrl: string;
  /**
   * Implementations MUST stream into the provided sink rather than buffering
   * the whole video. The sink returns the number of bytes written so the
   * caller can cross-check against any provider-reported size.
   */
  readonly sink: (chunk: Uint8Array) => Promise<void> | void;
  readonly signal?: AbortSignal;
}

export interface FetchArtifactResult {
  readonly bytes_written: number;
  readonly mime_type: string;
  readonly provider_url: string;
  readonly provider_reported_size_bytes: number | null;
}

/**
 * Every concrete provider implementation MUST implement this interface and
 * MUST be wired only on the server.
 *
 * Implementations MUST NOT:
 *   - read API keys from any non-server context
 *   - return synthesized/fake responses
 *   - mark a job complete without provider_status === 'succeeded'
 *   - return a provider_url that points to anything other than the provider's
 *     own infrastructure
 */
export interface VideoProvider {
  readonly label: ProviderLabel;

  submitJob(input: SubmitJobInput): Promise<Result<ProviderResult, DomainError>>;

  getJobStatus(input: GetJobStatusInput): Promise<Result<ProviderResult, DomainError>>;

  fetchArtifact(input: FetchArtifactInput): Promise<Result<FetchArtifactResult, DomainError>>;
}

export interface ProviderRegistry {
  get(label: ProviderLabel): VideoProvider;
  has(label: ProviderLabel): boolean;
  list(): readonly ProviderLabel[];
}
