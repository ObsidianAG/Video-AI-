export type ProjectType = 'feature_film' | 'commercial' | 'episodic' | 'pitch' | 'previs' | 'vfx';
export type ProjectStatus = 'active' | 'in_review' | 'blocked' | 'archived';

export type Project = {
  id: string;
  title: string;
  type: ProjectType;
  status: ProjectStatus;
  createdAt: string;
  owner: string;
};

export type Shot = {
  id: string;
  shotNumber: number;
  shotType: string;
  cameraMovement: string;
  lens: string;
  lighting: string;
  subject: string;
  action: string;
  continuityNotes: string;
  renderPrompt: string;
  safetyNotes: string;
};

export type Scene = {
  id: string;
  sceneNumber: number;
  title: string;
  summary: string;
  location: string;
  timeOfDay: string;
  emotionalPurpose: string;
  shots: Shot[];
};

export type ShotPlan = {
  id: string;
  projectId: string;
  title: string;
  logline: string;
  genre: string;
  mood: string;
  scenes: Scene[];
  createdAt: string;
};

export type RenderJobStatus =
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'approved';

export type EvidenceStatus = 'missing' | 'partial' | 'complete';

export type RenderJob = {
  id: string;
  projectId: string;
  shotId: string;
  provider: string;
  providerJobId: string | null;
  status: RenderJobStatus;
  prompt: string;
  artifactUri: string | null;
  artifactSha256: string | null;
  evidenceStatus: EvidenceStatus;
  createdAt: string;
  completedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
};

export type EvidenceEvent = {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  actor: string;
  timestamp: string;
  evidence: Record<string, unknown>;
};

export type VllmRuntimeMetric = {
  id: string;
  metricName: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
};

export type CacheOptMetric = {
  id: string;
  confidencePaddingScore: number;
  kvCacheUsage: number;
  preemptionRisk: number;
  strategy: 'swap' | 'recompute';
  memorySavedEstimate: number;
  timestamp: string;
};
