// ============================================================
// Job State Machine
// ============================================================

export const JOB_STATES = [
  "CREATED",
  "QUEUED",
  "STARTED",
  "PROVIDER_RUNNING",
  "UPLOADING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;

export type JobState = (typeof JOB_STATES)[number];

export const TERMINAL_JOB_STATES: ReadonlySet<JobState> = new Set([
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

export const ACTIVE_JOB_STATES: ReadonlySet<JobState> = new Set([
  "QUEUED",
  "STARTED",
  "PROVIDER_RUNNING",
  "UPLOADING",
]);

export interface JobTransition {
  from: JobState;
  to: JobState;
  at: string; // ISO-8601
  triggeredBy: string; // actor id or system
  meta?: Record<string, unknown>;
}

// Valid state machine edges
export const VALID_JOB_TRANSITIONS: ReadonlyMap<JobState, ReadonlySet<JobState>> = new Map([
  ["CREATED", new Set(["QUEUED", "CANCELLED"])],
  ["QUEUED", new Set(["STARTED", "CANCELLED"])],
  ["STARTED", new Set(["PROVIDER_RUNNING", "FAILED", "CANCELLED"])],
  ["PROVIDER_RUNNING", new Set(["UPLOADING", "FAILED", "CANCELLED"])],
  ["UPLOADING", new Set(["SUCCEEDED", "FAILED"])],
  ["SUCCEEDED", new Set()],
  ["FAILED", new Set(["QUEUED"])], // retry path
  ["CANCELLED", new Set()],
]);

// ============================================================
// Provider Adapter Interface
// ============================================================

export type ProviderName = "veo" | "kling" | "anthropic" | "vllm" | "gemini";

export interface ProviderCapabilities {
  textToVideo: boolean;
  imageToVideo: boolean;
  textToText: boolean;
}

export interface GenerateVideoParams {
  prompt: string;
  imageUrl?: string;
  durationSeconds: number;
  aspectRatio: "16:9" | "9:16" | "1:1";
  fps?: 24 | 30 | 60;
  seed?: number;
  providerParams?: Record<string, unknown>;
}

export interface GenerateTextParams {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ProviderResult {
  provider: ProviderName;
  operationId: string; // provider-side job id
  status: "PENDING" | "RUNNING" | "COMPLETE" | "ERROR";
  videoUrl?: string;
  textOutput?: string;
  errorCode?: string;
  errorMessage?: string;
  usageMetadata?: Record<string, unknown>;
}

export interface ProviderAdapter {
  readonly name: ProviderName;
  readonly capabilities: ProviderCapabilities;
  generateVideo(params: GenerateVideoParams): Promise<ProviderResult>;
  generateText(params: GenerateTextParams): Promise<ProviderResult>;
  pollStatus(operationId: string): Promise<ProviderResult>;
  cancel(operationId: string): Promise<void>;
}

// ============================================================
// API Request / Response Types
// ============================================================

// --- Auth ---
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  name: string;
}

// --- Projects ---
export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: "ACTIVE" | "ARCHIVED";
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

// --- Assets ---
export interface UploadUrlRequest {
  filename: string;
  contentType: string;
  projectId: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  assetId: string;
  expiresAt: string;
}

export interface ConfirmAssetRequest {
  assetId: string;
}

export interface Asset {
  id: string;
  projectId: string;
  userId: string;
  filename: string;
  contentType: string;
  sizeBytes: number | null;
  storageKey: string;
  publicUrl: string | null;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  createdAt: string;
}

// --- Prompts ---
export interface Prompt {
  id: string;
  projectId: string;
  text: string;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// --- Jobs ---
export interface CreateJobRequest {
  projectId: string;
  promptId: string;
  provider: ProviderName;
  jobType: "TEXT_TO_VIDEO" | "IMAGE_TO_VIDEO" | "TEXT_TO_TEXT";
  inputAssetId?: string;
  params: GenerateVideoParams | GenerateTextParams;
  idempotencyKey: string;
}

export interface Job {
  id: string;
  projectId: string;
  userId: string;
  promptId: string;
  provider: ProviderName;
  jobType: "TEXT_TO_VIDEO" | "IMAGE_TO_VIDEO" | "TEXT_TO_TEXT";
  state: JobState;
  inputAssetId: string | null;
  outputAssetId: string | null;
  providerOperationId: string | null;
  params: Record<string, unknown>;
  idempotencyKey: string;
  attemptCount: number;
  maxAttempts: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CancelJobRequest {
  reason?: string;
}

// --- SSE Job Events ---
export type JobEventType =
  | "JOB_STATE_CHANGED"
  | "JOB_PROGRESS"
  | "JOB_LOG"
  | "JOB_COMPLETE"
  | "JOB_ERROR";

export interface JobSSEEvent {
  type: JobEventType;
  jobId: string;
  state: JobState;
  progress?: number; // 0-100
  message?: string;
  outputAssetId?: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
}

// --- Versions ---
export interface Version {
  id: string;
  projectId: string;
  jobId: string;
  assetId: string;
  versionNumber: number;
  label: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// --- Exports ---
export interface CreateExportRequest {
  projectId: string;
  versionIds: string[];
  format: "MP4" | "MOV" | "WEBM";
  resolution: "1080p" | "4K" | "720p";
  fps: 24 | 30 | 60;
}

export interface Export {
  id: string;
  projectId: string;
  userId: string;
  versionIds: string[];
  format: "MP4" | "MOV" | "WEBM";
  resolution: "1080p" | "4K" | "720p";
  fps: 24 | 30 | 60;
  status: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
  outputUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

// --- Pagination ---
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================
// Audit Event Types
// ============================================================

export const AUDIT_ACTIONS = [
  "USER_LOGIN",
  "USER_LOGOUT",
  "PROJECT_CREATED",
  "PROJECT_UPDATED",
  "PROJECT_DELETED",
  "ASSET_UPLOADED",
  "ASSET_CONFIRMED",
  "JOB_CREATED",
  "JOB_STATE_CHANGED",
  "JOB_CANCELLED",
  "VERSION_CREATED",
  "EXPORT_CREATED",
  "EXPORT_COMPLETED",
  "CONTROL_SNAPSHOT_READ",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditEvent {
  id: string;
  userId: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  meta: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// ============================================================
// QNEO Control Snapshot Types
// ============================================================

export interface QNEOMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
}

export interface QNEOProviderHealth {
  provider: ProviderName;
  healthy: boolean;
  latencyMs: number | null;
  errorRate: number; // 0-1
  lastCheckedAt: string;
}

export interface QNEOJobQueueStats {
  queueDepth: number;
  processingCount: number;
  dlqDepth: number;
  avgWaitMs: number | null;
}

export interface QNEOControlSnapshot {
  snapshotId: string;
  computedAt: string;
  ttlSeconds: number;
  systemHealthScore: number; // 0-100, V(x) value
  providerHealth: QNEOProviderHealth[];
  jobQueueStats: QNEOJobQueueStats;
  activeJobCount: number;
  metrics: QNEOMetric[];
  alerts: string[];
}

// ============================================================
// Internal service types (media service <-> api)
// ============================================================

export interface ExecuteJobRequest {
  jobId: string;
  provider: ProviderName;
  jobType: "TEXT_TO_VIDEO" | "IMAGE_TO_VIDEO" | "TEXT_TO_TEXT";
  params: Record<string, unknown>;
  callbackUrl: string;
  idempotencyKey: string;
}

export interface ExecuteJobResponse {
  accepted: boolean;
  mediaJobId: string;
  estimatedDurationMs?: number;
}

export interface JobCallbackPayload {
  jobId: string;
  mediaJobId: string;
  state: JobState;
  outputUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  usageMetadata?: Record<string, unknown>;
}
