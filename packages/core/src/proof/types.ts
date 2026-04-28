import { z } from 'zod';
import type { Result } from '../result.js';
import type { DomainError } from '../errors.js';
import type { ProviderLabel, ProviderResult } from '../providers/types.js';
import type { StorageProvider, StoredObject } from '../storage/types.js';

/**
 * The 7 proof checks that must ALL pass before an artifact is considered
 * "verified" and READY_FOR_USER. Order is enforced; skipping is forbidden.
 */
export const PROOF_GATES = [
  'PROVIDER_COMPLETED',
  'ARTIFACT_DOWNLOADED',
  'ARTIFACT_STORED',
  'ARTIFACT_HASHED',
  'ARTIFACT_VERIFIED_EXISTS',
  'AUDIT_RECORDED',
  'DB_VERIFICATION_STATUS_VERIFIED',
] as const;
export type ProofGate = (typeof PROOF_GATES)[number];

export const ArtifactProofSchema = z.object({
  job_id: z.string().uuid(),
  user_id: z.string().uuid(),
  provider_label: z.string().min(1),
  provider_model_id: z.string().min(1),
  provider_job_id: z.string().min(1),
  provider_status: z.string().min(1),
  provider_url: z.string().nullable(),
  stored_artifact_url: z.string().min(1),
  storage_key: z.string().min(1),
  sha256_hash: z.string().regex(/^[0-9a-f]{64}$/),
  mime_type: z.string().min(1),
  file_size_bytes: z.number().int().positive(),
  created_at: z.string().datetime(),
  verification_status: z.literal('verified'),
  audit_event_id: z.string().uuid(),
});
export type ArtifactProof = z.infer<typeof ArtifactProofSchema>;

export interface DownloadInput {
  readonly providerResult: ProviderResult;
  readonly providerLabel: ProviderLabel;
  readonly destinationKey: string;
  readonly destinationBucket: string;
  readonly storage: StorageProvider;
  readonly signal?: AbortSignal;
}

export interface DownloadResult {
  readonly bytes_written: number;
  readonly mime_type: string;
  readonly storage_key: string;
  readonly storage_bucket: string;
  readonly sha256_hash: string;
}

export interface AuditInput {
  readonly jobId: string;
  readonly userId: string;
  readonly artifactId: string;
  readonly proof: Omit<ArtifactProof, 'audit_event_id'>;
}

export interface AuditResult {
  readonly audit_event_id: string;
  readonly hash_chain: string;
  readonly occurred_at: string;
}

/**
 * The artifact proof pipeline contract. The implementation MUST run each step
 * in order and MUST persist evidence at every step. Skipping any step yields
 * FAIL_CLOSED.
 */
export interface ArtifactPipeline {
  download(input: DownloadInput): Promise<Result<DownloadResult, DomainError>>;

  verifyExists(input: {
    storage: StorageProvider;
    storage_bucket: string;
    storage_key: string;
    expected_size_bytes: number;
  }): Promise<Result<StoredObject, DomainError>>;

  writeAudit(input: AuditInput): Promise<Result<AuditResult, DomainError>>;

  markVerified(input: {
    artifactId: string;
    auditEventId: string;
  }): Promise<Result<ArtifactProof, DomainError>>;
}

export interface ProofGateOutcome {
  readonly gate: ProofGate;
  readonly passed: boolean;
  readonly evidenceRef: string | null;
  readonly checkedAt: string;
  readonly reason?: string;
}

export const proofIsComplete = (outcomes: readonly ProofGateOutcome[]): boolean => {
  if (outcomes.length !== PROOF_GATES.length) return false;
  for (let i = 0; i < PROOF_GATES.length; i++) {
    const expected = PROOF_GATES[i];
    const actual = outcomes[i];
    if (!actual || actual.gate !== expected || !actual.passed) return false;
  }
  return true;
};
