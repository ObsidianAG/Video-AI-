/**
 * Verification-first gate families.
 *
 * Core principle: a provider's `status: completed` is a **claim**.
 * A verified outcome is an artifact independently retrieved, integrity-checked,
 * conformance-checked, and evidence-bound by *our* gates. The two are never
 * treated as equivalent.
 *
 * Illegal edge: PROVIDER_COMPLETED → READY_FOR_USER has no direct transition.
 * A provider claim can only move a job *into verification*, never *into success*.
 *
 * §3: The gate evaluators are pure functions — no I/O, no clock calls in the
 * evaluation logic itself. `checkedAt` is an explicit parameter so callers
 * can supply a stable timestamp; it defaults to the current instant for
 * production use.
 *
 * §4: Four gate families:
 *   G-INT   — Artifact integrity  (bytes, hash, media probe, container completeness)
 *   G-STORE — Storage validation  (HEAD check, size, checksum metadata)
 *   G-CONF  — Conformance         (duration / dimensions / job_id binding)
 *   G-READY — Fail-closed readiness gate (default: NOT_READY)
 */

import { DomainError } from '../errors.js';
import { err, ok, type Result } from '../result.js';

// ── 3-valued verdict ──────────────────────────────────────────────────────

/**
 * Three-valued gate verdict. **No verdict defaults to PASS.**
 *
 * - `PASS`        — evidence positively confirms the property.
 * - `FAIL`        — evidence positively refutes the property (artifact bad).
 *                   Maps to REJECTED state; the artifact must not be released.
 * - `INCONCLUSIVE`— evidence is absent or the probe could not run; we cannot
 *                   distinguish a valid artifact from a corrupt one.
 *                   Maps to HOLD state, never to READY.
 */
export type GateVerdict = 'PASS' | 'FAIL' | 'INCONCLUSIVE';

export type GateName = 'G-INT' | 'G-STORE' | 'G-CONF' | 'G-READY';

export interface GateOutcome {
  readonly gate: GateName;
  readonly verdict: GateVerdict;
  /** References to the pieces of evidence that informed the verdict. */
  readonly evidenceRefs: readonly string[];
  /** Human-readable reason when verdict ≠ PASS; null on PASS. */
  readonly reason: string | null;
  readonly checkedAt: string;
}

// ── G-INT: Artifact integrity ─────────────────────────────────────────────

/**
 * Evidence inputs for G-INT.
 *
 * All numeric fields: NaN is coerced to worst-case (FAIL) via the
 * `!(x > 0)` pattern, which is true for NaN, 0, and negatives.
 */
export interface IntegrityEvidence {
  /** Bytes received from the provider download stream. */
  readonly bytes_written: number;
  /**
   * SHA-256 hex string computed over the full downloaded byte stream.
   * Must be a 64-character lowercase hex string.
   */
  readonly sha256_hash: string | null;
  /**
   * True iff the media probe (e.g. ffprobe) ran to successful completion.
   * False or absent → INCONCLUSIVE (we cannot assert integrity without a probe).
   */
  readonly probe_succeeded: boolean;
  /** Duration in seconds from the media probe; null if probe did not run. */
  readonly probe_duration_seconds: number | null;
  /** Pixel width from the media probe; null if probe did not run. */
  readonly probe_width: number | null;
  /** Pixel height from the media probe; null if probe did not run. */
  readonly probe_height: number | null;
  /**
   * True iff the container is structurally complete.
   * For MP4: moov atom present and valid EOF.
   * Null means the probe did not check completeness (tolerated; not a FAIL).
   * False means the probe confirmed the container is truncated → FAIL.
   */
  readonly container_complete: boolean | null;
}

const SHA256_RE = /^[0-9a-f]{64}$/;

/**
 * G-INT — Evaluate artifact integrity from pre-collected evidence.
 *
 * Pure function: evaluation logic is deterministic given the inputs.
 * The `checkedAt` timestamp is explicit so callers can control it in tests.
 */
export const evaluateIntegrity = (
  ev: IntegrityEvidence,
  checkedAt: string = new Date().toISOString(),
): GateOutcome => {
  const refs: string[] = [];

  // NaN-safe: `!(x > 0)` is true for NaN, 0, and negatives — all fail-close.
  if (!(ev.bytes_written > 0)) {
    return {
      gate: 'G-INT',
      verdict: 'FAIL',
      evidenceRefs: [],
      reason: `bytes_written is ${ev.bytes_written} — must be > 0`,
      checkedAt,
    };
  }
  refs.push(`bytes_written:${ev.bytes_written}`);

  if (ev.sha256_hash === null || !SHA256_RE.test(ev.sha256_hash)) {
    return {
      gate: 'G-INT',
      verdict: 'FAIL',
      evidenceRefs: refs,
      reason: `sha256_hash is invalid: ${ev.sha256_hash ?? 'null'}`,
      checkedAt,
    };
  }
  refs.push(`sha256:${ev.sha256_hash}`);

  // Probe did not run → INCONCLUSIVE: we cannot assert integrity without it.
  if (!ev.probe_succeeded) {
    return {
      gate: 'G-INT',
      verdict: 'INCONCLUSIVE',
      evidenceRefs: refs,
      reason: 'Media probe did not complete — cannot confirm artifact integrity',
      checkedAt,
    };
  }

  // NaN-safe duration, width, height checks.
  if (!(ev.probe_duration_seconds! > 0)) {
    return {
      gate: 'G-INT',
      verdict: 'FAIL',
      evidenceRefs: refs,
      reason: `probe_duration_seconds is ${ev.probe_duration_seconds} — must be > 0`,
      checkedAt,
    };
  }
  if (!(ev.probe_width! > 0)) {
    return {
      gate: 'G-INT',
      verdict: 'FAIL',
      evidenceRefs: refs,
      reason: `probe_width is ${ev.probe_width} — must be > 0`,
      checkedAt,
    };
  }
  if (!(ev.probe_height! > 0)) {
    return {
      gate: 'G-INT',
      verdict: 'FAIL',
      evidenceRefs: refs,
      reason: `probe_height is ${ev.probe_height} — must be > 0`,
      checkedAt,
    };
  }
  refs.push(`dim:${ev.probe_width}x${ev.probe_height}`);
  refs.push(`dur:${ev.probe_duration_seconds}s`);

  // container_complete === false means the probe positively detected truncation.
  // null means the probe did not check (tolerated; not a FAIL).
  if (ev.container_complete === false) {
    return {
      gate: 'G-INT',
      verdict: 'FAIL',
      evidenceRefs: refs,
      reason: 'Container is incomplete (e.g. missing moov atom / invalid EOF)',
      checkedAt,
    };
  }

  return { gate: 'G-INT', verdict: 'PASS', evidenceRefs: refs, reason: null, checkedAt };
};

// ── G-STORE: Storage validation ───────────────────────────────────────────

/**
 * Evidence inputs for G-STORE.
 *
 * Key constraint from the spec (§4 G-STORE):
 *   "S3 multipart ETag is not an MD5; never use ETag as the integrity hash,
 *    use stored checksum metadata."
 *
 * `stored_checksum_sha256` must be sourced from storage checksum metadata
 * (e.g. `x-amz-checksum-sha256`), **not** from the ETag header.
 */
export interface StorageEvidence {
  /** The key under which the object is stored. */
  readonly storage_key: string;
  /**
   * True iff HEAD returned HTTP 200; false iff 404/410; null iff the HEAD
   * probe itself could not run (network error, timeout, etc.).
   * null → INCONCLUSIVE.
   */
  readonly head_exists: boolean | null;
  /**
   * Content-Length from the HEAD response.
   * Null if the response did not include this header.
   */
  readonly head_size_bytes: number | null;
  /** Bytes written to storage during the download/upload step. */
  readonly downloaded_size_bytes: number;
  /**
   * SHA-256 from storage checksum metadata (NOT the ETag).
   * Null if the storage backend did not return checksum metadata.
   */
  readonly stored_checksum_sha256: string | null;
  /** SHA-256 computed while downloading (the content_hash evidence). */
  readonly content_hash: string | null;
}

/**
 * G-STORE — Evaluate storage validation from pre-collected evidence.
 *
 * Pure function. INCONCLUSIVE only when the HEAD probe could not run.
 */
export const evaluateStorage = (
  ev: StorageEvidence,
  checkedAt: string = new Date().toISOString(),
): GateOutcome => {
  const refs: string[] = [`key:${ev.storage_key}`];

  // HEAD probe did not run → we cannot confirm or deny presence.
  if (ev.head_exists === null) {
    return {
      gate: 'G-STORE',
      verdict: 'INCONCLUSIVE',
      evidenceRefs: refs,
      reason: 'HEAD probe did not complete — cannot confirm storage presence',
      checkedAt,
    };
  }

  if (!ev.head_exists) {
    return {
      gate: 'G-STORE',
      verdict: 'FAIL',
      evidenceRefs: refs,
      reason: `Object not found at storage key: ${ev.storage_key}`,
      checkedAt,
    };
  }
  refs.push('head:exists');

  // Content-Length mismatch — NaN-safe: `!==` catches NaN on either side.
  if (ev.head_size_bytes !== null && ev.head_size_bytes !== ev.downloaded_size_bytes) {
    return {
      gate: 'G-STORE',
      verdict: 'FAIL',
      evidenceRefs: refs,
      reason:
        `Content-Length (${ev.head_size_bytes}) does not match ` +
        `downloaded byte count (${ev.downloaded_size_bytes})`,
      checkedAt,
    };
  }
  if (ev.head_size_bytes !== null) refs.push(`head_size:${ev.head_size_bytes}`);

  // Stored checksum vs content_hash: only compared when both are present.
  // If the backend does not return checksum metadata, we cannot fail on it.
  if (
    ev.stored_checksum_sha256 !== null &&
    ev.content_hash !== null &&
    ev.stored_checksum_sha256 !== ev.content_hash
  ) {
    return {
      gate: 'G-STORE',
      verdict: 'FAIL',
      evidenceRefs: refs,
      reason:
        `Storage checksum (${ev.stored_checksum_sha256}) does not match ` +
        `content hash (${ev.content_hash})`,
      checkedAt,
    };
  }
  if (ev.stored_checksum_sha256 !== null) refs.push(`checksum:${ev.stored_checksum_sha256}`);

  return { gate: 'G-STORE', verdict: 'PASS', evidenceRefs: refs, reason: null, checkedAt };
};

// ── G-CONF: Conformance ───────────────────────────────────────────────────

/**
 * Evidence inputs for G-CONF.
 *
 * G-CONF checks **structural** conformance only (duration, dimensions,
 * job_id binding). Semantic correctness (right scene, right style) is
 * explicitly out of scope — see §7 of the design specification. A valid MP4
 * of the wrong scene can pass G-CONF; human/eval review handles that.
 */
export interface ConformanceEvidence {
  /** Our job_id — the binding anchor. Every constraint check refers to this. */
  readonly job_id: string;
  /**
   * job_id embedded in artifact or sidecar metadata, if the provider supplies
   * it. Null means the provider did not embed it — this is tolerated (absence ≠
   * FAIL). Present but mismatched → FAIL.
   */
  readonly artifact_job_id_claim: string | null;
  /** Duration we requested in seconds; null if we did not specify one. */
  readonly requested_duration_seconds: number | null;
  /** Duration the probe measured; null if the probe did not run. */
  readonly probed_duration_seconds: number | null;
  /** |probed - requested| must be ≤ this value for a duration PASS. */
  readonly duration_tolerance_seconds: number;
  /** Width we requested in pixels; null if we did not constrain it. */
  readonly requested_width: number | null;
  /** Width the probe measured; null if the probe did not run. */
  readonly probed_width: number | null;
  /** Height we requested in pixels; null if we did not constrain it. */
  readonly requested_height: number | null;
  /** Height the probe measured; null if the probe did not run. */
  readonly probed_height: number | null;
}

/**
 * G-CONF — Evaluate conformance from pre-collected evidence.
 *
 * Pure function. INCONCLUSIVE only when a constraint was set but the probe
 * value needed to check it is absent.
 */
export const evaluateConformance = (
  ev: ConformanceEvidence,
  checkedAt: string = new Date().toISOString(),
): GateOutcome => {
  const refs: string[] = [`job_id:${ev.job_id}`];

  // job_id binding: if present in artifact metadata, it must match.
  if (ev.artifact_job_id_claim !== null && ev.artifact_job_id_claim !== ev.job_id) {
    return {
      gate: 'G-CONF',
      verdict: 'FAIL',
      evidenceRefs: refs,
      reason:
        `Artifact job_id claim (${ev.artifact_job_id_claim}) does not match ` +
        `our job_id (${ev.job_id})`,
      checkedAt,
    };
  }
  if (ev.artifact_job_id_claim !== null) refs.push(`artifact_job_id:${ev.artifact_job_id_claim}`);

  // Duration conformance.
  if (ev.requested_duration_seconds !== null) {
    if (ev.probed_duration_seconds === null) {
      return {
        gate: 'G-CONF',
        verdict: 'INCONCLUSIVE',
        evidenceRefs: refs,
        reason: 'Duration was requested but the probe did not return a duration',
        checkedAt,
      };
    }
    // NaN-safe: `Math.abs(NaN - x)` is NaN; `!(NaN <= tol)` is true → FAIL.
    const delta = Math.abs(ev.probed_duration_seconds - ev.requested_duration_seconds);
    if (!(delta <= ev.duration_tolerance_seconds)) {
      return {
        gate: 'G-CONF',
        verdict: 'FAIL',
        evidenceRefs: refs,
        reason:
          `Duration mismatch: probed ${ev.probed_duration_seconds}s vs ` +
          `requested ${ev.requested_duration_seconds}s ` +
          `(tolerance ±${ev.duration_tolerance_seconds}s)`,
        checkedAt,
      };
    }
    refs.push(`dur_probed:${ev.probed_duration_seconds}s`);
  }

  // Width conformance.
  if (ev.requested_width !== null) {
    if (ev.probed_width === null) {
      return {
        gate: 'G-CONF',
        verdict: 'INCONCLUSIVE',
        evidenceRefs: refs,
        reason: 'Width was requested but the probe did not return a width',
        checkedAt,
      };
    }
    if (ev.probed_width !== ev.requested_width) {
      return {
        gate: 'G-CONF',
        verdict: 'FAIL',
        evidenceRefs: refs,
        reason: `Width mismatch: probed ${ev.probed_width}px vs requested ${ev.requested_width}px`,
        checkedAt,
      };
    }
    refs.push(`width:${ev.probed_width}`);
  }

  // Height conformance.
  if (ev.requested_height !== null) {
    if (ev.probed_height === null) {
      return {
        gate: 'G-CONF',
        verdict: 'INCONCLUSIVE',
        evidenceRefs: refs,
        reason: 'Height was requested but the probe did not return a height',
        checkedAt,
      };
    }
    if (ev.probed_height !== ev.requested_height) {
      return {
        gate: 'G-CONF',
        verdict: 'FAIL',
        evidenceRefs: refs,
        reason: `Height mismatch: probed ${ev.probed_height}px vs requested ${ev.requested_height}px`,
        checkedAt,
      };
    }
    refs.push(`height:${ev.probed_height}`);
  }

  return { gate: 'G-CONF', verdict: 'PASS', evidenceRefs: refs, reason: null, checkedAt };
};

// ── G-READY: Fail-closed readiness gate ──────────────────────────────────

/**
 * G-READY — Fail-closed readiness gate.
 *
 * **Default verdict: NOT_READY.**
 * READY only when ALL three gates (G-INT, G-STORE, G-CONF) are `PASS` with
 * no `INCONCLUSIVE` among them.
 *
 * Caller MUST advance the job to `READY_FOR_USER` only after this returns
 * `ok(true)`. Any other return value must block release.
 *
 * `retryable: true` on the returned error means the caller may re-run
 * verification (→ HOLD). `retryable: false` means the artifact is bad
 * and the job should be moved to FAILED/REJECTED.
 */
export const assertReadyForUser = (
  integrity: GateOutcome,
  storage: GateOutcome,
  conformance: GateOutcome,
): Result<true, DomainError> => {
  const inconclusive: string[] = [];
  const failed: string[] = [];

  for (const outcome of [integrity, storage, conformance] as const) {
    if (outcome.verdict === 'INCONCLUSIVE') {
      inconclusive.push(`${outcome.gate}: ${outcome.reason ?? 'INCONCLUSIVE'}`);
    } else if (outcome.verdict === 'FAIL') {
      failed.push(`${outcome.gate}: ${outcome.reason ?? 'FAIL'}`);
    }
  }

  // INCONCLUSIVE takes priority: we cannot tell good from bad → HOLD, retryable.
  if (inconclusive.length > 0) {
    return err(
      new DomainError(
        'STORAGE_VERIFY_FAILED',
        `G-READY: NOT_READY — inconclusive gate(s): ${inconclusive.join('; ')}`,
        { retryable: true, details: { inconclusive } },
      ),
    );
  }

  if (failed.length > 0) {
    return err(
      new DomainError(
        'STORAGE_VERIFY_FAILED',
        `G-READY: NOT_READY — failed gate(s): ${failed.join('; ')}`,
        { retryable: false, details: { failed } },
      ),
    );
  }

  return ok(true);
};

// ── Forbidden direct edges — claim ≠ outcome ──────────────────────────────

/**
 * Transitions that are **explicitly illegal** per the verification-first design
 * (§3 of the design specification).
 *
 * Key invariant: `PROVIDER_COMPLETED` represents a provider *claim*. A claim
 * can only move a job into verification, never directly into success.
 * `PROVIDER_COMPLETED → READY_FOR_USER` has no direct transition.
 *
 * The existing `canTransition()` in `packages/core/src/states.ts` already
 * rejects all of these edges. This list makes the policy explicit and
 * machine-testable as a named contract: any regression in `canTransition()`
 * that re-opens one of these edges must fail the test in `proof.test.ts`.
 */
export const FORBIDDEN_DIRECT_EDGES = [
  // Provider claim → success (the forbidden shortcut)
  ['PROVIDER_COMPLETED', 'READY_FOR_USER'],
  ['PROVIDER_COMPLETED', 'ARTIFACT_VERIFIED'],
  // Pre-completion states skipping verification
  ['PROVIDER_SUBMITTED', 'READY_FOR_USER'],
  ['PROVIDER_SUBMITTED', 'ARTIFACT_VERIFIED'],
  ['PROVIDER_RUNNING', 'READY_FOR_USER'],
  ['PROVIDER_RUNNING', 'ARTIFACT_VERIFIED'],
  // Within the verification chain, can't jump over steps to reach READY_FOR_USER
  ['ARTIFACT_STORED', 'READY_FOR_USER'],
  ['ARTIFACT_HASHED', 'READY_FOR_USER'],
  // ARTIFACT_VERIFIED must still go through AUDIT_RECORDED first
  ['ARTIFACT_VERIFIED', 'READY_FOR_USER'],
] as const;

/**
 * True iff the job state represents a provider *claim* that the artifact
 * was produced, as opposed to a verified outcome.
 *
 * A job in a claim state MUST NOT be treated as deliverable. Use this in
 * routing and presentation logic to enforce claim/outcome separation.
 */
export const isProviderClaim = (state: string): boolean => state === 'PROVIDER_COMPLETED';
