import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// Enums
// ============================================================

export const jobStateEnum = pgEnum("job_state", [
  "CREATED",
  "QUEUED",
  "STARTED",
  "PROVIDER_RUNNING",
  "UPLOADING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

export const providerEnum = pgEnum("provider_name", [
  "veo",
  "kling",
  "anthropic",
  "vllm",
  "gemini",
]);

export const jobTypeEnum = pgEnum("job_type", [
  "TEXT_TO_VIDEO",
  "IMAGE_TO_VIDEO",
  "TEXT_TO_TEXT",
]);

export const projectStatusEnum = pgEnum("project_status", ["ACTIVE", "ARCHIVED"]);

export const assetStatusEnum = pgEnum("asset_status", ["PENDING", "CONFIRMED", "FAILED"]);

export const exportStatusEnum = pgEnum("export_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETE",
  "FAILED",
]);

export const exportFormatEnum = pgEnum("export_format", ["MP4", "MOV", "WEBM"]);

export const exportResolutionEnum = pgEnum("export_resolution", ["1080p", "4K", "720p"]);

export const auditActionEnum = pgEnum("audit_action", [
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
]);

// ============================================================
// Tables
// ============================================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 320 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 50 }).notNull().default("user"),
    emailVerified: boolean("email_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
  }),
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: projectStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index("projects_user_id_idx").on(t.userId),
    statusIdx: index("projects_status_idx").on(t.status),
  }),
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    filename: varchar("filename", { length: 512 }).notNull(),
    contentType: varchar("content_type", { length: 255 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    storageKey: text("storage_key").notNull(),
    publicUrl: text("public_url"),
    status: assetStatusEnum("status").notNull().default("PENDING"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdIdx: index("assets_project_id_idx").on(t.projectId),
    userIdIdx: index("assets_user_id_idx").on(t.userId),
    storageKeyIdx: uniqueIndex("assets_storage_key_idx").on(t.storageKey),
  }),
);

export const prompts = pgTable(
  "prompts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    text: text("text").notNull(),
    version: integer("version").notNull().default(1),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdIdx: index("prompts_project_id_idx").on(t.projectId),
    versionIdx: index("prompts_version_idx").on(t.projectId, t.version),
  }),
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    promptId: uuid("prompt_id")
      .notNull()
      .references(() => prompts.id),
    provider: providerEnum("provider").notNull(),
    jobType: jobTypeEnum("job_type").notNull(),
    state: jobStateEnum("state").notNull().default("CREATED"),
    inputAssetId: uuid("input_asset_id").references(() => assets.id),
    outputAssetId: uuid("output_asset_id").references(() => assets.id),
    providerOperationId: text("provider_operation_id"),
    params: jsonb("params").notNull().default({}),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    errorCode: varchar("error_code", { length: 100 }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    projectIdIdx: index("jobs_project_id_idx").on(t.projectId),
    userIdIdx: index("jobs_user_id_idx").on(t.userId),
    stateIdx: index("jobs_state_idx").on(t.state),
    idempotencyKeyIdx: uniqueIndex("jobs_idempotency_key_idx").on(t.idempotencyKey),
    createdAtIdx: index("jobs_created_at_idx").on(t.createdAt),
  }),
);

export const versions = pgTable(
  "versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id),
    versionNumber: integer("version_number").notNull(),
    label: varchar("label", { length: 255 }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectIdIdx: index("versions_project_id_idx").on(t.projectId),
    versionNumberIdx: uniqueIndex("versions_project_version_idx").on(
      t.projectId,
      t.versionNumber,
    ),
  }),
);

export const exports = pgTable(
  "exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    versionIds: jsonb("version_ids").notNull().$type<string[]>(),
    format: exportFormatEnum("format").notNull(),
    resolution: exportResolutionEnum("resolution").notNull(),
    fps: integer("fps").notNull(),
    status: exportStatusEnum("status").notNull().default("PENDING"),
    outputUrl: text("output_url"),
    outputStorageKey: text("output_storage_key"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    projectIdIdx: index("exports_project_id_idx").on(t.projectId),
    userIdIdx: index("exports_user_id_idx").on(t.userId),
    statusIdx: index("exports_status_idx").on(t.status),
  }),
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: auditActionEnum("action").notNull(),
    resourceType: varchar("resource_type", { length: 100 }).notNull(),
    resourceId: uuid("resource_id"),
    meta: jsonb("meta").notNull().default({}),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index("audit_events_user_id_idx").on(t.userId),
    actionIdx: index("audit_events_action_idx").on(t.action),
    resourceIdx: index("audit_events_resource_idx").on(t.resourceType, t.resourceId),
    createdAtIdx: index("audit_events_created_at_idx").on(t.createdAt),
  }),
);

export const controlSnapshots = pgTable(
  "control_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    snapshotId: varchar("snapshot_id", { length: 255 }).notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull(),
    systemHealthScore: integer("system_health_score").notNull(),
    providerHealth: jsonb("provider_health").notNull().default([]),
    jobQueueStats: jsonb("job_queue_stats").notNull().default({}),
    activeJobCount: integer("active_job_count").notNull().default(0),
    metrics: jsonb("metrics").notNull().default([]),
    alerts: jsonb("alerts").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    snapshotIdIdx: index("control_snapshots_snapshot_id_idx").on(t.snapshotId),
    computedAtIdx: index("control_snapshots_computed_at_idx").on(t.computedAt),
  }),
);

// ============================================================
// Relations
// ============================================================

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  assets: many(assets),
  prompts: many(prompts),
  jobs: many(jobs),
  exports: many(exports),
  auditEvents: many(auditEvents),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  assets: many(assets),
  prompts: many(prompts),
  jobs: many(jobs),
  versions: many(versions),
  exports: many(exports),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  project: one(projects, { fields: [assets.projectId], references: [projects.id] }),
  user: one(users, { fields: [assets.userId], references: [users.id] }),
}));

export const promptsRelations = relations(prompts, ({ one, many }) => ({
  project: one(projects, { fields: [prompts.projectId], references: [projects.id] }),
  user: one(users, { fields: [prompts.userId], references: [users.id] }),
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  project: one(projects, { fields: [jobs.projectId], references: [projects.id] }),
  user: one(users, { fields: [jobs.userId], references: [users.id] }),
  prompt: one(prompts, { fields: [jobs.promptId], references: [prompts.id] }),
  inputAsset: one(assets, { fields: [jobs.inputAssetId], references: [assets.id] }),
  outputAsset: one(assets, { fields: [jobs.outputAssetId], references: [assets.id] }),
  versions: many(versions),
}));

export const versionsRelations = relations(versions, ({ one }) => ({
  project: one(projects, { fields: [versions.projectId], references: [projects.id] }),
  job: one(jobs, { fields: [versions.jobId], references: [jobs.id] }),
  asset: one(assets, { fields: [versions.assetId], references: [assets.id] }),
}));

export const exportsRelations = relations(exports, ({ one }) => ({
  project: one(projects, { fields: [exports.projectId], references: [projects.id] }),
  user: one(users, { fields: [exports.userId], references: [users.id] }),
}));

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  user: one(users, { fields: [auditEvents.userId], references: [users.id] }),
}));
