import { describe, expect, it } from 'vitest';
import {
  VIDEO_JOB_STATES,
  TERMINAL_STATES,
  canTransition,
  allowedNextStates,
  type VideoJobState,
} from './states.js';

describe('video job state machine', () => {
  it('exposes all 16 documented states', () => {
    expect(VIDEO_JOB_STATES).toHaveLength(16);
  });

  it('walks the full happy path end-to-end', () => {
    const happy: VideoJobState[] = [
      'PROMPT_RECEIVED',
      'SAFETY_REVIEWED',
      'JOB_CREATED',
      'PROVIDER_SELECTED',
      'PROVIDER_SUBMITTED',
      'PROVIDER_RUNNING',
      'PROVIDER_COMPLETED',
      'ARTIFACT_DOWNLOADED',
      'ARTIFACT_STORED',
      'ARTIFACT_HASHED',
      'ARTIFACT_VERIFIED',
      'AUDIT_RECORDED',
      'READY_FOR_USER',
    ];
    for (let i = 0; i < happy.length - 1; i++) {
      expect(canTransition(happy[i]!, happy[i + 1]!)).toBe(true);
    }
  });

  it('rejects skipping ARTIFACT_VERIFIED on the way to READY_FOR_USER', () => {
    expect(canTransition('ARTIFACT_STORED', 'READY_FOR_USER')).toBe(false);
    expect(canTransition('ARTIFACT_HASHED', 'READY_FOR_USER')).toBe(false);
    expect(canTransition('ARTIFACT_VERIFIED', 'READY_FOR_USER')).toBe(false);
    expect(canTransition('AUDIT_RECORDED', 'READY_FOR_USER')).toBe(true);
  });

  it('rejects backwards transitions', () => {
    expect(canTransition('PROVIDER_RUNNING', 'PROVIDER_SUBMITTED')).toBe(false);
    expect(canTransition('READY_FOR_USER', 'PROVIDER_SUBMITTED')).toBe(false);
  });

  it('rejects self transitions', () => {
    for (const s of VIDEO_JOB_STATES) {
      expect(canTransition(s, s)).toBe(false);
    }
  });

  it('allows FAILED/BLOCKED/EXPIRED from every non-terminal state', () => {
    for (const s of VIDEO_JOB_STATES) {
      if (TERMINAL_STATES.has(s)) continue;
      expect(canTransition(s, 'FAILED')).toBe(true);
      expect(canTransition(s, 'BLOCKED')).toBe(true);
      expect(canTransition(s, 'EXPIRED')).toBe(true);
    }
  });

  it('terminal states have no outgoing transitions', () => {
    for (const t of TERMINAL_STATES) {
      expect(allowedNextStates(t).size).toBe(0);
    }
  });
});
