import { describe, expect, it } from 'vitest';
import { PROOF_GATES, proofIsComplete, type ProofGateOutcome } from './index.js';
import {
  evaluateIntegrity,
  evaluateStorage,
  evaluateConformance,
  assertReadyForUser,
  FORBIDDEN_DIRECT_EDGES,
  isProviderClaim,
  type GateOutcome,
  type IntegrityEvidence,
  type StorageEvidence,
  type ConformanceEvidence,
} from './gates.js';
import { canTransition, type VideoJobState } from '../states.js';

const TS = '2026-01-01T00:00:00.000Z';
const VALID_SHA = 'a'.repeat(64);

// ── Helpers ──────────────────────────────────────────────────────────────

const allPass = (): ProofGateOutcome[] =>
  PROOF_GATES.map((gate) => ({
    gate,
    passed: true,
    evidenceRef: `evidence://${gate}`,
    checkedAt: new Date().toISOString(),
  }));

const goodIntegrity = (): IntegrityEvidence => ({
  bytes_written: 1_048_576,
  sha256_hash: VALID_SHA,
  probe_succeeded: true,
  probe_duration_seconds: 5.0,
  probe_width: 1920,
  probe_height: 1080,
  container_complete: true,
});

const goodStorage = (): StorageEvidence => ({
  storage_key: 'jobs/job-1/artifact.mp4',
  head_exists: true,
  head_size_bytes: 1_048_576,
  downloaded_size_bytes: 1_048_576,
  stored_checksum_sha256: VALID_SHA,
  content_hash: VALID_SHA,
});

const goodConformance = (): ConformanceEvidence => ({
  job_id: 'aaaaaaaa-0000-0000-0000-000000000001',
  artifact_job_id_claim: 'aaaaaaaa-0000-0000-0000-000000000001',
  requested_duration_seconds: 5.0,
  probed_duration_seconds: 5.1,
  duration_tolerance_seconds: 0.5,
  requested_width: 1920,
  probed_width: 1920,
  requested_height: 1080,
  probed_height: 1080,
});

const passOutcome = (gate: GateOutcome['gate']): GateOutcome => ({
  gate,
  verdict: 'PASS',
  evidenceRefs: [],
  reason: null,
  checkedAt: TS,
});

const failOutcome = (gate: GateOutcome['gate'], reason = 'test'): GateOutcome => ({
  gate,
  verdict: 'FAIL',
  evidenceRefs: [],
  reason,
  checkedAt: TS,
});

const inconclusiveOutcome = (gate: GateOutcome['gate'], reason = 'test'): GateOutcome => ({
  gate,
  verdict: 'INCONCLUSIVE',
  evidenceRefs: [],
  reason,
  checkedAt: TS,
});

// ── Existing proofIsComplete tests ────────────────────────────────────────

describe('proof completeness', () => {
  it('requires all 7 gates in order, all passing', () => {
    expect(proofIsComplete(allPass())).toBe(true);
  });

  it('fails when one gate is missing', () => {
    const outcomes = allPass().slice(0, 6);
    expect(proofIsComplete(outcomes)).toBe(false);
  });

  it('fails when one gate failed', () => {
    const outcomes = allPass();
    outcomes[3] = { ...outcomes[3]!, passed: false, reason: 'hash mismatch' };
    expect(proofIsComplete(outcomes)).toBe(false);
  });

  it('fails when gates are out of order', () => {
    const outcomes = allPass();
    [outcomes[2], outcomes[3]] = [outcomes[3]!, outcomes[2]!];
    expect(proofIsComplete(outcomes)).toBe(false);
  });
});

// ── G-INT: Artifact integrity ─────────────────────────────────────────────

describe('evaluateIntegrity (G-INT)', () => {
  it('PASS when all evidence is valid', () => {
    const r = evaluateIntegrity(goodIntegrity(), TS);
    expect(r.verdict).toBe('PASS');
    expect(r.gate).toBe('G-INT');
    expect(r.reason).toBeNull();
    expect(r.evidenceRefs.length).toBeGreaterThan(0);
  });

  it('FAIL on zero bytes (provider completed but produced nothing)', () => {
    const r = evaluateIntegrity({ ...goodIntegrity(), bytes_written: 0 }, TS);
    expect(r.verdict).toBe('FAIL');
    expect(r.reason).toMatch(/bytes_written/);
  });

  it('FAIL on negative bytes', () => {
    const r = evaluateIntegrity({ ...goodIntegrity(), bytes_written: -1 }, TS);
    expect(r.verdict).toBe('FAIL');
  });

  it('FAIL on NaN bytes — NaN coerced to worst-case', () => {
    const r = evaluateIntegrity({ ...goodIntegrity(), bytes_written: NaN }, TS);
    expect(r.verdict).toBe('FAIL');
    expect(r.reason).toMatch(/bytes_written/);
  });

  it('FAIL on null sha256_hash', () => {
    const r = evaluateIntegrity({ ...goodIntegrity(), sha256_hash: null }, TS);
    expect(r.verdict).toBe('FAIL');
    expect(r.reason).toMatch(/sha256_hash/);
  });

  it('FAIL on sha256_hash wrong length', () => {
    const r = evaluateIntegrity({ ...goodIntegrity(), sha256_hash: 'abc' }, TS);
    expect(r.verdict).toBe('FAIL');
  });

  it('FAIL on sha256_hash with uppercase chars', () => {
    const r = evaluateIntegrity({ ...goodIntegrity(), sha256_hash: 'A'.repeat(64) }, TS);
    expect(r.verdict).toBe('FAIL');
  });

  it('INCONCLUSIVE (not FAIL) when probe did not run — cannot distinguish valid from corrupt', () => {
    // Critical invariant: probe failure → HOLD, not REJECTED.
    // We cannot assert the artifact is bad without probe output.
    const r = evaluateIntegrity({ ...goodIntegrity(), probe_succeeded: false }, TS);
    expect(r.verdict).toBe('INCONCLUSIVE');
    expect(r.reason).toMatch(/probe/i);
  });

  it('FAIL on zero probe_duration_seconds — provider completed but duration is 0', () => {
    const r = evaluateIntegrity({ ...goodIntegrity(), probe_duration_seconds: 0 }, TS);
    expect(r.verdict).toBe('FAIL');
    expect(r.reason).toMatch(/probe_duration_seconds/);
  });

  it('FAIL on NaN probe_duration_seconds — NaN coerced to worst-case', () => {
    const r = evaluateIntegrity({ ...goodIntegrity(), probe_duration_seconds: NaN }, TS);
    expect(r.verdict).toBe('FAIL');
  });

  it('FAIL on zero probe_width', () => {
    const r = evaluateIntegrity({ ...goodIntegrity(), probe_width: 0 }, TS);
    expect(r.verdict).toBe('FAIL');
    expect(r.reason).toMatch(/probe_width/);
  });

  it('FAIL on zero probe_height', () => {
    const r = evaluateIntegrity({ ...goodIntegrity(), probe_height: 0 }, TS);
    expect(r.verdict).toBe('FAIL');
  });

  it('FAIL on NaN probe_width — NaN coerced to worst-case', () => {
    const r = evaluateIntegrity({ ...goodIntegrity(), probe_width: NaN }, TS);
    expect(r.verdict).toBe('FAIL');
  });

  it('FAIL when container_complete is false (truncated file)', () => {
    const r = evaluateIntegrity({ ...goodIntegrity(), container_complete: false }, TS);
    expect(r.verdict).toBe('FAIL');
    expect(r.reason).toMatch(/incomplete/i);
  });

  it('PASS when container_complete is null (probe did not check completeness)', () => {
    const r = evaluateIntegrity({ ...goodIntegrity(), container_complete: null }, TS);
    expect(r.verdict).toBe('PASS');
  });

  it('checkedAt appears in the outcome', () => {
    const r = evaluateIntegrity(goodIntegrity(), TS);
    expect(r.checkedAt).toBe(TS);
  });
});

// ── G-STORE: Storage validation ───────────────────────────────────────────

describe('evaluateStorage (G-STORE)', () => {
  it('PASS when HEAD confirms presence and sizes match', () => {
    const r = evaluateStorage(goodStorage(), TS);
    expect(r.verdict).toBe('PASS');
    expect(r.reason).toBeNull();
  });

  it('INCONCLUSIVE when HEAD probe could not run (null head_exists)', () => {
    // HEAD timeout/network error → HOLD, not REJECTED.
    const r = evaluateStorage({ ...goodStorage(), head_exists: null }, TS);
    expect(r.verdict).toBe('INCONCLUSIVE');
    expect(r.reason).toMatch(/HEAD probe/i);
  });

  it('FAIL when object not found at the expected key', () => {
    const r = evaluateStorage({ ...goodStorage(), head_exists: false }, TS);
    expect(r.verdict).toBe('FAIL');
    expect(r.reason).toMatch(/not found/i);
  });

  it('FAIL on Content-Length mismatch', () => {
    const r = evaluateStorage({ ...goodStorage(), head_size_bytes: 999 }, TS);
    expect(r.verdict).toBe('FAIL');
    expect(r.reason).toMatch(/Content-Length/);
  });

  it('FAIL on NaN Content-Length — NaN !== downloaded_size_bytes', () => {
    const r = evaluateStorage({ ...goodStorage(), head_size_bytes: NaN }, TS);
    expect(r.verdict).toBe('FAIL');
  });

  it('FAIL when stored checksum does not match content_hash', () => {
    const r = evaluateStorage(
      { ...goodStorage(), stored_checksum_sha256: 'b'.repeat(64) },
      TS,
    );
    expect(r.verdict).toBe('FAIL');
    expect(r.reason).toMatch(/checksum/i);
  });

  it('PASS when stored_checksum_sha256 is null (backend did not return checksum metadata)', () => {
    // Not all storage backends return checksum metadata; skip the check.
    const r = evaluateStorage(
      { ...goodStorage(), stored_checksum_sha256: null },
      TS,
    );
    expect(r.verdict).toBe('PASS');
  });

  it('PASS when head_size_bytes is null (HEAD did not include Content-Length)', () => {
    const r = evaluateStorage({ ...goodStorage(), head_size_bytes: null }, TS);
    expect(r.verdict).toBe('PASS');
  });

  it('storage_key appears in evidence refs', () => {
    const r = evaluateStorage(goodStorage(), TS);
    expect(r.evidenceRefs.some((ref) => ref.includes('jobs/job-1'))).toBe(true);
  });
});

// ── G-CONF: Conformance ───────────────────────────────────────────────────

describe('evaluateConformance (G-CONF)', () => {
  it('PASS when all dimensions, duration, and job_id match', () => {
    const r = evaluateConformance(goodConformance(), TS);
    expect(r.verdict).toBe('PASS');
    expect(r.reason).toBeNull();
  });

  it('FAIL on job_id binding mismatch — artifact does not belong to our job', () => {
    const r = evaluateConformance(
      { ...goodConformance(), artifact_job_id_claim: 'different-job-id' },
      TS,
    );
    expect(r.verdict).toBe('FAIL');
    expect(r.reason).toMatch(/job_id/i);
  });

  it('PASS when artifact_job_id_claim is null (provider did not embed it)', () => {
    const r = evaluateConformance(
      { ...goodConformance(), artifact_job_id_claim: null },
      TS,
    );
    expect(r.verdict).toBe('PASS');
  });

  it('FAIL when probed duration exceeds tolerance', () => {
    const r = evaluateConformance(
      { ...goodConformance(), probed_duration_seconds: 10.0 },
      TS,
    );
    expect(r.verdict).toBe('FAIL');
    expect(r.reason).toMatch(/duration/i);
  });

  it('FAIL on NaN probed_duration_seconds — NaN coerced to worst-case', () => {
    const r = evaluateConformance(
      { ...goodConformance(), probed_duration_seconds: NaN },
      TS,
    );
    expect(r.verdict).toBe('FAIL');
  });

  it('INCONCLUSIVE when duration was requested but probe returned none', () => {
    const r = evaluateConformance(
      { ...goodConformance(), probed_duration_seconds: null },
      TS,
    );
    expect(r.verdict).toBe('INCONCLUSIVE');
    expect(r.reason).toMatch(/duration/i);
  });

  it('FAIL on width mismatch', () => {
    const r = evaluateConformance({ ...goodConformance(), probed_width: 1280 }, TS);
    expect(r.verdict).toBe('FAIL');
    expect(r.reason).toMatch(/width/i);
  });

  it('INCONCLUSIVE when width was requested but probe returned none', () => {
    const r = evaluateConformance({ ...goodConformance(), probed_width: null }, TS);
    expect(r.verdict).toBe('INCONCLUSIVE');
  });

  it('FAIL on height mismatch', () => {
    const r = evaluateConformance({ ...goodConformance(), probed_height: 720 }, TS);
    expect(r.verdict).toBe('FAIL');
    expect(r.reason).toMatch(/height/i);
  });

  it('INCONCLUSIVE when height was requested but probe returned none', () => {
    const r = evaluateConformance({ ...goodConformance(), probed_height: null }, TS);
    expect(r.verdict).toBe('INCONCLUSIVE');
  });

  it('PASS when no dimensions or duration were requested (unconstrained job)', () => {
    const r = evaluateConformance(
      {
        job_id: 'aaaaaaaa-0000-0000-0000-000000000002',
        artifact_job_id_claim: null,
        requested_duration_seconds: null,
        probed_duration_seconds: null,
        duration_tolerance_seconds: 0.5,
        requested_width: null,
        probed_width: null,
        requested_height: null,
        probed_height: null,
      },
      TS,
    );
    expect(r.verdict).toBe('PASS');
  });

  it('duration within tolerance passes', () => {
    // 5.0 requested, 5.4 probed, tolerance 0.5 → delta 0.4 ≤ 0.5 → PASS
    const r = evaluateConformance(
      { ...goodConformance(), probed_duration_seconds: 5.4 },
      TS,
    );
    expect(r.verdict).toBe('PASS');
  });

  it('duration exactly at tolerance boundary passes', () => {
    // 5.0 requested, 5.5 probed, tolerance 0.5 → delta 0.5 ≤ 0.5 → PASS
    const r = evaluateConformance(
      { ...goodConformance(), probed_duration_seconds: 5.5 },
      TS,
    );
    expect(r.verdict).toBe('PASS');
  });
});

// ── G-READY: Fail-closed readiness gate ──────────────────────────────────

describe('assertReadyForUser (G-READY fail-closed gate)', () => {
  it('READY when all three gates PASS — only happy path', () => {
    const result = assertReadyForUser(
      passOutcome('G-INT'),
      passOutcome('G-STORE'),
      passOutcome('G-CONF'),
    );
    expect(result.ok).toBe(true);
  });

  it('NOT_READY when G-INT fails', () => {
    const result = assertReadyForUser(
      failOutcome('G-INT', 'zero bytes'),
      passOutcome('G-STORE'),
      passOutcome('G-CONF'),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.retryable).toBe(false);
      expect(result.error.message).toMatch(/G-INT/);
    }
  });

  it('NOT_READY when G-STORE fails', () => {
    const result = assertReadyForUser(
      passOutcome('G-INT'),
      failOutcome('G-STORE', 'not found'),
      passOutcome('G-CONF'),
    );
    expect(result.ok).toBe(false);
  });

  it('NOT_READY when G-CONF fails', () => {
    const result = assertReadyForUser(
      passOutcome('G-INT'),
      passOutcome('G-STORE'),
      failOutcome('G-CONF', 'dimension mismatch'),
    );
    expect(result.ok).toBe(false);
  });

  it('NOT_READY when G-INT is INCONCLUSIVE — blocks even though other gates PASS', () => {
    // INCONCLUSIVE → HOLD (retryable), never READY.
    const result = assertReadyForUser(
      inconclusiveOutcome('G-INT', 'probe did not run'),
      passOutcome('G-STORE'),
      passOutcome('G-CONF'),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.retryable).toBe(true);
      expect(result.error.message).toMatch(/inconclusive/i);
    }
  });

  it('NOT_READY when G-STORE is INCONCLUSIVE', () => {
    const result = assertReadyForUser(
      passOutcome('G-INT'),
      inconclusiveOutcome('G-STORE', 'HEAD probe failed'),
      passOutcome('G-CONF'),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.retryable).toBe(true);
  });

  it('NOT_READY when all three gates FAIL — non-retryable', () => {
    const result = assertReadyForUser(
      failOutcome('G-INT'),
      failOutcome('G-STORE'),
      failOutcome('G-CONF'),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.retryable).toBe(false);
      expect(result.error.message).toMatch(/failed gate/i);
    }
  });

  it('INCONCLUSIVE takes priority over FAIL when both present (→ retryable)', () => {
    // If one gate is INCONCLUSIVE and another is FAIL, we go to HOLD (retryable)
    // because we cannot confidently conclude the artifact is bad.
    const result = assertReadyForUser(
      inconclusiveOutcome('G-INT'),
      failOutcome('G-STORE'),
      passOutcome('G-CONF'),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.retryable).toBe(true);
  });
});

// ── Forbidden edges — claim ≠ outcome ─────────────────────────────────────

describe('FORBIDDEN_DIRECT_EDGES — provider claim ≠ verified outcome', () => {
  it('every forbidden edge is rejected by canTransition()', () => {
    // This test is the machine-readable contract that the state machine enforces
    // the claim/outcome separation. Any regression in canTransition() that
    // re-opens one of these edges will fail here.
    for (const [from, to] of FORBIDDEN_DIRECT_EDGES) {
      expect(
        canTransition(from as VideoJobState, to as VideoJobState),
        `Expected forbidden edge ${from} → ${to} to be rejected by canTransition()`,
      ).toBe(false);
    }
  });

  it('PROVIDER_COMPLETED → READY_FOR_USER is specifically unreachable (key invariant)', () => {
    // Separately named so a bisect surfaces this as the root cause.
    expect(canTransition('PROVIDER_COMPLETED', 'READY_FOR_USER')).toBe(false);
  });

  it('PROVIDER_COMPLETED → ARTIFACT_VERIFIED is unreachable (skips verification steps)', () => {
    expect(canTransition('PROVIDER_COMPLETED', 'ARTIFACT_VERIFIED')).toBe(false);
  });

  it('ARTIFACT_VERIFIED → READY_FOR_USER is unreachable (must pass AUDIT_RECORDED first)', () => {
    expect(canTransition('ARTIFACT_VERIFIED', 'READY_FOR_USER')).toBe(false);
  });

  it('the only path to READY_FOR_USER is AUDIT_RECORDED', () => {
    const legalPredecessors = (
      ['AUDIT_RECORDED'] satisfies VideoJobState[]
    );
    // Every other non-terminal state must NOT be able to reach READY_FOR_USER.
    const allStates: VideoJobState[] = [
      'PROMPT_RECEIVED', 'SAFETY_REVIEWED', 'JOB_CREATED',
      'PROVIDER_SELECTED', 'PROVIDER_SUBMITTED', 'PROVIDER_RUNNING',
      'PROVIDER_COMPLETED', 'ARTIFACT_DOWNLOADED', 'ARTIFACT_STORED',
      'ARTIFACT_HASHED', 'ARTIFACT_VERIFIED', 'AUDIT_RECORDED',
    ];
    for (const state of allStates) {
      const expected = legalPredecessors.includes(state as 'AUDIT_RECORDED');
      expect(
        canTransition(state, 'READY_FOR_USER'),
        `${state} → READY_FOR_USER: expected canTransition=${String(expected)}`,
      ).toBe(expected);
    }
  });
});

// ── isProviderClaim ───────────────────────────────────────────────────────

describe('isProviderClaim', () => {
  it('identifies PROVIDER_COMPLETED as a claim state', () => {
    expect(isProviderClaim('PROVIDER_COMPLETED')).toBe(true);
  });

  it('does not classify verified/ready states as claims', () => {
    expect(isProviderClaim('ARTIFACT_VERIFIED')).toBe(false);
    expect(isProviderClaim('AUDIT_RECORDED')).toBe(false);
    expect(isProviderClaim('READY_FOR_USER')).toBe(false);
  });

  it('does not classify failure terminals as claims', () => {
    expect(isProviderClaim('FAILED')).toBe(false);
    expect(isProviderClaim('BLOCKED')).toBe(false);
  });
});

