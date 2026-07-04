/**
 * Anthropic Message Batches guard.
 *
 * Hard limits (from Anthropic docs, checked 2026-04-30):
 *   - Maximum 100,000 requests per batch.
 *   - Maximum 256 MiB (268,435,456 bytes) total serialised body.
 *
 * References:
 *   https://docs.anthropic.com/en/api/creating-message-batches
 */

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

/** Maximum number of individual requests in a single Message Batch. */
export const BATCH_MAX_REQUESTS = 100_000;

/** Maximum serialised body size for a Message Batch (256 MiB in bytes). */
export const BATCH_MAX_BYTES = 256 * 1024 * 1024; // 268,435,456

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export type BatchValidationError =
  | { readonly kind: 'TOO_MANY_REQUESTS'; readonly count: number; readonly limit: number }
  | { readonly kind: 'BODY_TOO_LARGE'; readonly bytes: number; readonly limit: number }
  | { readonly kind: 'EMPTY_BATCH' };

export type BatchValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: BatchValidationError };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate the number of requests in a Message Batch against the 100K limit.
 */
export const validateBatchRequestCount = (count: number): BatchValidationResult => {
  if (count === 0) {
    return { ok: false, error: { kind: 'EMPTY_BATCH' } };
  }
  if (count > BATCH_MAX_REQUESTS) {
    return {
      ok: false,
      error: { kind: 'TOO_MANY_REQUESTS', count, limit: BATCH_MAX_REQUESTS },
    };
  }
  return { ok: true };
};

/**
 * Validate the serialised body size of a Message Batch against the 256 MiB limit.
 * Pass the byte length of the JSON-encoded batch body.
 */
export const validateBatchBodySize = (bytes: number): BatchValidationResult => {
  if (bytes > BATCH_MAX_BYTES) {
    return {
      ok: false,
      error: { kind: 'BODY_TOO_LARGE', bytes, limit: BATCH_MAX_BYTES },
    };
  }
  return { ok: true };
};

/**
 * Combined guard: validate both request count and body size.
 * Returns the first violation encountered (count checked before size).
 */
export const validateBatch = (count: number, bodyBytes: number): BatchValidationResult => {
  const countResult = validateBatchRequestCount(count);
  if (!countResult.ok) return countResult;
  return validateBatchBodySize(bodyBytes);
};

/**
 * Compute the byte length of a serialisable batch payload.
 * Uses `TextEncoder` (available in Node ≥ 11 and all modern browsers).
 */
export const batchBodyBytes = (payload: unknown): number =>
  new TextEncoder().encode(JSON.stringify(payload)).byteLength;
