import { describe, expect, it } from 'vitest';
import { PROOF_GATES, proofIsComplete, type ProofGateOutcome } from './index.js';

const allPass = (): ProofGateOutcome[] =>
  PROOF_GATES.map((gate) => ({
    gate,
    passed: true,
    evidenceRef: `evidence://${gate}`,
    checkedAt: new Date().toISOString(),
  }));

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
