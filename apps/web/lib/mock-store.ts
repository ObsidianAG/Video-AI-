import { createHash, randomUUID } from 'node:crypto';
import type {
  CacheOptMetric,
  EvidenceEvent,
  EvidenceStatus,
  Project,
  RenderJob,
  Scene,
  Shot,
  ShotPlan,
  VllmRuntimeMetric,
} from '@/lib/types';

const nowIso = () => new Date().toISOString();

const projects: Project[] = [
  {
    id: 'proj-night-train',
    title: 'Night Train to Halo City',
    type: 'feature_film',
    status: 'active',
    createdAt: '2026-05-15T08:00:00.000Z',
    owner: 'Armen',
  },
  {
    id: 'proj-neon-pitch',
    title: 'Neon Signal',
    type: 'pitch',
    status: 'in_review',
    createdAt: '2026-05-17T09:10:00.000Z',
    owner: 'Studio Team',
  },
];

const seedScenes = (): Scene[] => [
  {
    id: 'scene-1',
    sceneNumber: 1,
    title: 'Station Arrival',
    summary: 'Lead arrives at a rain-soaked platform and receives a coded note.',
    location: 'Metro Platform 7',
    timeOfDay: 'Night',
    emotionalPurpose: 'Introduce urgency and isolation.',
    shots: [
      {
        id: 'shot-1',
        shotNumber: 1,
        shotType: 'Wide Establishing',
        cameraMovement: 'Slow dolly in',
        lens: '24mm',
        lighting: 'Neon rim light and practical sodium lamps',
        subject: 'Lead actor and incoming train',
        action: 'Train rolls in as lead scans crowd for contact.',
        continuityNotes: 'Rain level must remain heavy in all angles.',
        renderPrompt:
          'Cinematic rainy metro platform at night, neon reflections, train entering frame, anamorphic flare, dramatic moody lighting',
        safetyNotes: 'No strobe patterns. Keep platform safety line visible.',
      },
      {
        id: 'shot-2',
        shotNumber: 2,
        shotType: 'Close-up',
        cameraMovement: 'Static with micro handheld texture',
        lens: '50mm',
        lighting: 'Key from practical sign overhead',
        subject: 'Lead actor hand holding coded note',
        action: 'Water droplets smear ink as code appears.',
        continuityNotes: 'Note must remain folded once then opened.',
        renderPrompt:
          'Extreme close-up of wet paper note in gloved hand, rain droplets, cyberpunk color palette, film grain',
        safetyNotes: 'No copyrighted logos in the note texture.',
      },
    ],
  },
];

const shotPlans: ShotPlan[] = [
  {
    id: 'plan-1',
    projectId: 'proj-night-train',
    title: 'Night Train Sequence Plan',
    logline: 'An investigator decodes a message before the last train leaves Halo City.',
    genre: 'Sci-Fi Thriller',
    mood: 'Tense',
    scenes: seedScenes(),
    createdAt: '2026-05-18T12:00:00.000Z',
  },
];

const renderJobs: RenderJob[] = [
  {
    id: 'job-1',
    projectId: 'proj-night-train',
    shotId: 'shot-1',
    provider: 'mock-provider',
    providerJobId: 'mock-job-1001',
    status: 'completed',
    prompt:
      'Cinematic rainy metro platform at night, neon reflections, train entering frame, anamorphic flare, dramatic moody lighting',
    artifactUri: 'mock://vault/proj-night-train/shot-1/v1.mp4',
    artifactSha256: createHash('sha256').update('job-1-artifact').digest('hex'),
    evidenceStatus: 'complete',
    createdAt: '2026-05-18T12:03:00.000Z',
    completedAt: '2026-05-18T12:05:00.000Z',
    approvedAt: null,
    rejectedAt: null,
  },
];

const evidenceEvents: EvidenceEvent[] = [
  {
    id: 'audit-1',
    entityType: 'render_job',
    entityId: 'job-1',
    eventType: 'ARTIFACT_VERIFIED',
    actor: 'system',
    timestamp: '2026-05-18T12:05:10.000Z',
    evidence: {
      artifactUri: 'mock://vault/proj-night-train/shot-1/v1.mp4',
      artifactSha256: renderJobs[0].artifactSha256,
    },
  },
];

export const listProjects = (): Project[] => [...projects];
export const listShotPlans = (): ShotPlan[] => [...shotPlans];
export const listRenderJobs = (): RenderJob[] => [...renderJobs];
export const listEvidenceEvents = (): EvidenceEvent[] => [...evidenceEvents];

export const getProjectById = (projectId: string): Project | undefined =>
  projects.find((project) => project.id === projectId);

export const getShotPlanByProjectId = (projectId: string): ShotPlan | undefined =>
  shotPlans.find((plan) => plan.projectId === projectId);

export const getRenderJobsByProjectId = (projectId: string): RenderJob[] =>
  renderJobs.filter((job) => job.projectId === projectId);

export const getShotById = (shotId: string): Shot | undefined => {
  for (const plan of shotPlans) {
    for (const scene of plan.scenes) {
      const shot = scene.shots.find((candidate) => candidate.id === shotId);
      if (shot) {
        return shot;
      }
    }
  }
  return undefined;
};

export const getEvidenceChecklist = (job: RenderJob) => {
  const hasAuditLog = evidenceEvents.some((event) => event.entityId === job.id);
  return {
    completed: job.status === 'completed',
    providerJobId: Boolean(job.providerJobId),
    artifactUri: Boolean(job.artifactUri),
    artifactSha256: Boolean(job.artifactSha256),
    auditLog: hasAuditLog,
  };
};

export const canApproveRenderJob = (job: RenderJob): boolean => {
  const evidence = getEvidenceChecklist(job);
  return (
    job.status === 'completed' &&
    evidence.providerJobId &&
    evidence.artifactUri &&
    evidence.artifactSha256 &&
    evidence.auditLog
  );
};

const deriveEvidenceStatus = (job: RenderJob): EvidenceStatus => {
  const checklist = getEvidenceChecklist(job);
  const values = Object.values(checklist);
  if (values.every(Boolean)) {
    return 'complete';
  }
  if (values.some(Boolean)) {
    return 'partial';
  }
  return 'missing';
};

export const createShotPlanForProject = (projectId: string, plan: Omit<ShotPlan, 'id' | 'createdAt' | 'projectId'>): ShotPlan => {
  const normalizedScenes = plan.scenes.map((scene, sceneIndex) => ({
    ...scene,
    id: scene.id || randomUUID(),
    sceneNumber: scene.sceneNumber || sceneIndex + 1,
    shots: scene.shots.map((shot, shotIndex) => ({
      ...shot,
      id: shot.id || randomUUID(),
      shotNumber: shot.shotNumber || shotIndex + 1,
    })),
  }));

  const created: ShotPlan = {
    ...plan,
    id: randomUUID(),
    projectId,
    createdAt: nowIso(),
    scenes: normalizedScenes,
  };

  shotPlans.unshift(created);
  evidenceEvents.unshift({
    id: randomUUID(),
    entityType: 'shot_plan',
    entityId: created.id,
    eventType: 'SHOT_PLAN_GENERATED',
    actor: 'vllm_runtime',
    timestamp: nowIso(),
    evidence: {
      schemaValidated: true,
      sceneCount: created.scenes.length,
    },
  });

  return created;
};

export const createMockRenderJob = ({
  projectId,
  shotId,
  prompt,
}: {
  projectId: string;
  shotId: string;
  prompt: string;
}): RenderJob => {
  const createdAt = nowIso();
  const providerJobId = `mock-job-${Date.now().toString().slice(-8)}`;
  const artifactUri = `mock://vault/${projectId}/${shotId}/${randomUUID()}.mp4`;
  const artifactSha256 = createHash('sha256').update(`${projectId}:${shotId}:${createdAt}`).digest('hex');

  const job: RenderJob = {
    id: randomUUID(),
    projectId,
    shotId,
    provider: 'mock-provider',
    providerJobId,
    status: 'completed',
    prompt,
    artifactUri,
    artifactSha256,
    evidenceStatus: 'partial',
    createdAt,
    completedAt: nowIso(),
    approvedAt: null,
    rejectedAt: null,
  };

  renderJobs.unshift(job);
  evidenceEvents.unshift({
    id: randomUUID(),
    entityType: 'render_job',
    entityId: job.id,
    eventType: 'AUDIT_RECORDED',
    actor: 'mock_provider_runtime',
    timestamp: nowIso(),
    evidence: {
      providerJobId,
      artifactUri,
      artifactSha256,
      // TODO(real integration): persist immutable evidence chain in PostgreSQL and object metadata in S3/R2.
    },
  });

  job.evidenceStatus = deriveEvidenceStatus(job);
  return job;
};

export const approveRenderJob = (id: string, actor = 'human_reviewer'): RenderJob | null => {
  const job = renderJobs.find((entry) => entry.id === id);
  if (!job || !canApproveRenderJob(job)) {
    return null;
  }
  job.status = 'approved';
  job.approvedAt = nowIso();
  job.evidenceStatus = deriveEvidenceStatus(job);
  evidenceEvents.unshift({
    id: randomUUID(),
    entityType: 'render_job',
    entityId: id,
    eventType: 'APPROVED',
    actor,
    timestamp: nowIso(),
    evidence: {
      approvalGatePassed: true,
    },
  });
  return job;
};

export const rejectRenderJob = (id: string, reason: string, actor = 'human_reviewer'): RenderJob | null => {
  const job = renderJobs.find((entry) => entry.id === id);
  if (!job) {
    return null;
  }
  job.status = 'rejected';
  job.rejectedAt = nowIso();
  job.evidenceStatus = deriveEvidenceStatus(job);
  evidenceEvents.unshift({
    id: randomUUID(),
    entityType: 'render_job',
    entityId: id,
    eventType: 'REJECTED',
    actor,
    timestamp: nowIso(),
    evidence: {
      reason,
    },
  });
  return job;
};

export const getDashboardSnapshot = () => {
  const jobs = listRenderJobs();
  const shotPlanCount = shotPlans.length;
  const pendingApprovals = jobs.filter((job) => job.status === 'completed').length;
  const failedJobs = jobs.filter((job) => job.status === 'failed').length;
  const evidenceComplete = jobs.filter((job) => job.evidenceStatus === 'complete').length;
  const evidenceCompletionScore = jobs.length ? Math.round((evidenceComplete / jobs.length) * 100) : 0;

  return {
    activeProjects: projects.filter((project) => project.status !== 'archived').length,
    activeShotPlans: shotPlanCount,
    mockRenderJobs: jobs.length,
    pendingApprovals,
    failedJobs,
    evidenceCompletionScore,
    recentAuditEvents: evidenceEvents.slice(0, 6),
  };
};

export const getMockRuntimeMetrics = (): VllmRuntimeMetric[] => {
  const timestamp = nowIso();
  return [
    { id: 'metric-running', metricName: 'requestsRunning', value: 4, unit: 'req', status: 'healthy', timestamp },
    { id: 'metric-waiting', metricName: 'requestsWaiting', value: 2, unit: 'req', status: 'healthy', timestamp },
    { id: 'metric-kv', metricName: 'kvCacheUsage', value: 67, unit: '%', status: 'warning', timestamp },
    {
      id: 'metric-ttft',
      metricName: 'timeToFirstToken',
      value: 182,
      unit: 'ms',
      status: 'healthy',
      timestamp,
    },
    { id: 'metric-queue', metricName: 'queueLatency', value: 260, unit: 'ms', status: 'warning', timestamp },
    {
      id: 'metric-success',
      metricName: 'requestSuccessRate',
      value: 98.2,
      unit: '%',
      status: 'healthy',
      timestamp,
    },
    { id: 'metric-failed', metricName: 'failedRequests', value: 1, unit: 'req', status: 'warning', timestamp },
    {
      id: 'metric-throughput',
      metricName: 'tokenThroughput',
      value: 1420,
      unit: 'tok/s',
      status: 'healthy',
      timestamp,
    },
  ];
};

export const getMockCacheOptMetrics = (): CacheOptMetric[] => [
  {
    id: 'cacheopt-latest',
    confidencePaddingScore: 0.86,
    kvCacheUsage: 0.67,
    preemptionRisk: 0.24,
    strategy: 'swap',
    memorySavedEstimate: 17.2,
    timestamp: nowIso(),
  },
];

export const getProjectStats = (projectId: string) => {
  const projectJobs = getRenderJobsByProjectId(projectId);
  const plans = shotPlans.filter((plan) => plan.projectId === projectId);
  const approved = projectJobs.filter((job) => job.status === 'approved').length;

  return {
    shotPlanCount: plans.length,
    mockRenderCount: projectJobs.length,
    approvalPercentage: projectJobs.length ? Math.round((approved / projectJobs.length) * 100) : 0,
  };
};

// TODO(real integrations): replace this in-memory repository with PostgreSQL persistence, S3/R2 artifact storage,
// FastAPI orchestration, and provider adapters (OpenAI, Veo, Runway, Luma, Kling, fal.ai).
// TODO(observability): wire Prometheus metrics ingestion and Grafana dashboards for production runtime telemetry.
