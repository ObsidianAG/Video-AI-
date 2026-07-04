import { describe, expect, it } from 'vitest';
import {
  BATCH_MAX_REQUESTS,
  BATCH_MAX_BYTES,
  validateBatchRequestCount,
  validateBatchBodySize,
  validateBatch,
  batchBodyBytes,
} from './batches.js';

// ---------------------------------------------------------------------------
// Limit constants
// ---------------------------------------------------------------------------

describe('batch limit constants', () => {
  it('BATCH_MAX_REQUESTS is 100,000', () => {
    expect(BATCH_MAX_REQUESTS).toBe(100_000);
  });

  it('BATCH_MAX_BYTES is 256 MiB (268,435,456 bytes)', () => {
    expect(BATCH_MAX_BYTES).toBe(256 * 1024 * 1024);
    expect(BATCH_MAX_BYTES).toBe(268_435_456);
  });
});

// ---------------------------------------------------------------------------
// validateBatchRequestCount
// ---------------------------------------------------------------------------

describe('validateBatchRequestCount', () => {
  it('accepts exactly 1 request', () => {
    expect(validateBatchRequestCount(1).ok).toBe(true);
  });

  it('accepts exactly 100,000 requests', () => {
    expect(validateBatchRequestCount(100_000).ok).toBe(true);
  });

  it('rejects 100,001 requests', () => {
    const result = validateBatchRequestCount(100_001);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('TOO_MANY_REQUESTS');
      expect((result.error as { count: number }).count).toBe(100_001);
      expect((result.error as { limit: number }).limit).toBe(100_000);
    }
  });

  it('rejects 0 requests (empty batch)', () => {
    const result = validateBatchRequestCount(0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('EMPTY_BATCH');
    }
  });

  it('rejects very large counts', () => {
    expect(validateBatchRequestCount(1_000_000).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateBatchBodySize
// ---------------------------------------------------------------------------

describe('validateBatchBodySize', () => {
  it('accepts 0 bytes', () => {
    expect(validateBatchBodySize(0).ok).toBe(true);
  });

  it('accepts exactly 256 MiB', () => {
    expect(validateBatchBodySize(BATCH_MAX_BYTES).ok).toBe(true);
  });

  it('rejects 256 MiB + 1 byte', () => {
    const result = validateBatchBodySize(BATCH_MAX_BYTES + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('BODY_TOO_LARGE');
      expect((result.error as { bytes: number }).bytes).toBe(BATCH_MAX_BYTES + 1);
    }
  });

  it('rejects payloads well over 256 MiB', () => {
    expect(validateBatchBodySize(BATCH_MAX_BYTES * 2).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateBatch – combined guard
// ---------------------------------------------------------------------------

describe('validateBatch', () => {
  it('passes when count and size are both within limits', () => {
    expect(validateBatch(50_000, BATCH_MAX_BYTES / 2).ok).toBe(true);
  });

  it('fails on count violation first', () => {
    const result = validateBatch(200_000, 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('TOO_MANY_REQUESTS');
  });

  it('fails on size violation when count is valid', () => {
    const result = validateBatch(1, BATCH_MAX_BYTES + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('BODY_TOO_LARGE');
  });

  it('fails on empty batch', () => {
    const result = validateBatch(0, 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('EMPTY_BATCH');
  });
});

// ---------------------------------------------------------------------------
// batchBodyBytes
// ---------------------------------------------------------------------------

describe('batchBodyBytes', () => {
  it('returns byte length of JSON-encoded payload', () => {
    const payload = { requests: [{ custom_id: 'r1', params: {} }] };
    const bytes = batchBodyBytes(payload);
    const expected = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
    expect(bytes).toBe(expected);
  });

  it('counts multi-byte UTF-8 characters correctly', () => {
    const payload = { text: '日本語テスト' }; // 3-byte characters
    const bytes = batchBodyBytes(payload);
    expect(bytes).toBeGreaterThan(JSON.stringify(payload).length);
  });

  it('returns 0 for null payload (serialised as "null")', () => {
    // JSON.stringify(null) = "null" = 4 bytes
    expect(batchBodyBytes(null)).toBe(4);
  });
});
