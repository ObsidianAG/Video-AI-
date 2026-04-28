import { z } from 'zod';
import type { Result } from '../result.js';
import type { DomainError } from '../errors.js';

export const STORAGE_PROVIDERS = ['s3', 'r2', 'vercel_blob', 'gcs', 'azure_blob'] as const;
export type StorageProviderLabel = (typeof STORAGE_PROVIDERS)[number];

export const StoredObjectSchema = z.object({
  storage_provider: z.enum(STORAGE_PROVIDERS),
  storage_bucket: z.string().min(1),
  storage_key: z.string().min(1),
  stored_artifact_url: z.string().min(1),
  mime_type: z.string().min(1),
  file_size_bytes: z.number().int().positive(),
  sha256_hash: z.string().regex(/^[0-9a-f]{64}$/),
  uploaded_at: z.string().datetime(),
});
export type StoredObject = z.infer<typeof StoredObjectSchema>;

export interface PutObjectInput {
  readonly bucket: string;
  readonly key: string;
  readonly mimeType: string;
  /** A Node.js Readable or Web ReadableStream. The implementation must declare which it accepts. */
  readonly body: AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>;
  readonly expectedSize?: number;
  readonly metadata?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
}

export interface PutObjectResult {
  readonly storage_key: string;
  readonly storage_bucket: string;
  readonly stored_artifact_url: string;
  readonly etag: string | null;
  readonly file_size_bytes: number;
}

export interface HeadObjectInput {
  readonly bucket: string;
  readonly key: string;
  readonly signal?: AbortSignal;
}

export interface HeadObjectResult {
  readonly exists: boolean;
  readonly file_size_bytes: number | null;
  readonly mime_type: string | null;
  readonly etag: string | null;
}

export interface SignedUrlInput {
  readonly bucket: string;
  readonly key: string;
  readonly expiresInSeconds: number;
  readonly responseContentType?: string;
}

/**
 * Storage backends (S3, R2, Vercel Blob, GCS, Azure Blob) MUST implement this
 * interface. No backend implementation is wired in this slice.
 */
export interface StorageProvider {
  readonly label: StorageProviderLabel;

  putObject(input: PutObjectInput): Promise<Result<PutObjectResult, DomainError>>;

  headObject(input: HeadObjectInput): Promise<Result<HeadObjectResult, DomainError>>;

  getSignedReadUrl(input: SignedUrlInput): Promise<Result<string, DomainError>>;
}
