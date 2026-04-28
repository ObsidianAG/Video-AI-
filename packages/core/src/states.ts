export const VIDEO_JOB_STATES = [
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
  'FAILED',
  'BLOCKED',
  'EXPIRED',
] as const;

export type VideoJobState = (typeof VIDEO_JOB_STATES)[number];

export const TERMINAL_STATES: ReadonlySet<VideoJobState> = new Set([
  'READY_FOR_USER',
  'FAILED',
  'BLOCKED',
  'EXPIRED',
]);

export const READY_STATE: VideoJobState = 'READY_FOR_USER';

/**
 * Allowed forward transitions. A state may also transition to FAILED, BLOCKED,
 * or EXPIRED at any non-terminal step. Those edges are added programmatically
 * below so the happy path stays readable.
 */
const HAPPY_PATH: ReadonlyArray<readonly [VideoJobState, VideoJobState]> = [
  ['PROMPT_RECEIVED', 'SAFETY_REVIEWED'],
  ['SAFETY_REVIEWED', 'JOB_CREATED'],
  ['JOB_CREATED', 'PROVIDER_SELECTED'],
  ['PROVIDER_SELECTED', 'PROVIDER_SUBMITTED'],
  ['PROVIDER_SUBMITTED', 'PROVIDER_RUNNING'],
  ['PROVIDER_RUNNING', 'PROVIDER_COMPLETED'],
  ['PROVIDER_COMPLETED', 'ARTIFACT_DOWNLOADED'],
  ['ARTIFACT_DOWNLOADED', 'ARTIFACT_STORED'],
  ['ARTIFACT_STORED', 'ARTIFACT_HASHED'],
  ['ARTIFACT_HASHED', 'ARTIFACT_VERIFIED'],
  ['ARTIFACT_VERIFIED', 'AUDIT_RECORDED'],
  ['AUDIT_RECORDED', 'READY_FOR_USER'],
];

const buildTransitions = (): ReadonlyMap<VideoJobState, ReadonlySet<VideoJobState>> => {
  const map = new Map<VideoJobState, Set<VideoJobState>>();
  for (const state of VIDEO_JOB_STATES) map.set(state, new Set());

  for (const [from, to] of HAPPY_PATH) {
    map.get(from)!.add(to);
  }

  // Any non-terminal state can fall to FAILED, BLOCKED, or EXPIRED.
  for (const state of VIDEO_JOB_STATES) {
    if (TERMINAL_STATES.has(state)) continue;
    map.get(state)!.add('FAILED');
    map.get(state)!.add('BLOCKED');
    map.get(state)!.add('EXPIRED');
  }

  return new Map([...map].map(([k, v]) => [k, v as ReadonlySet<VideoJobState>]));
};

const TRANSITIONS = buildTransitions();

export const canTransition = (from: VideoJobState, to: VideoJobState): boolean => {
  if (from === to) return false;
  return TRANSITIONS.get(from)?.has(to) ?? false;
};

export const allowedNextStates = (from: VideoJobState): ReadonlySet<VideoJobState> =>
  TRANSITIONS.get(from) ?? new Set();

export const isReadyForUser = (state: VideoJobState): boolean => state === READY_STATE;

/**
 * READY_FOR_USER is only meaningful when paired with proof. The frontend MUST
 * also confirm artifact.verification_status === 'verified' AND a non-null
 * audit_event_id before rendering a playable video.
 */
export const READY_REQUIRES_PROOF = ['ARTIFACT_VERIFIED', 'AUDIT_RECORDED'] as const;
