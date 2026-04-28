-- 0001_init.sql
-- Initial schema for the Video-AI text-to-video platform.
-- All tables use parameterized inserts via the application; this file is
-- declarative only. No application data is seeded.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'video_job_state') THEN
    CREATE TYPE video_job_state AS ENUM (
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
      'EXPIRED'
    );
  END IF;
END$$;

-- =============================================================================
-- USERS
-- =============================================================================

CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL UNIQUE,
  display_name    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX users_email_idx ON users (lower(email));

-- =============================================================================
-- VIDEO JOBS
-- =============================================================================

CREATE TABLE video_jobs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  prompt             text NOT NULL CHECK (char_length(prompt) BETWEEN 1 AND 4000),
  settings           jsonb NOT NULL DEFAULT '{}'::jsonb,
  state              video_job_state NOT NULL DEFAULT 'PROMPT_RECEIVED',
  state_reason       text,
  state_updated_at   timestamptz NOT NULL DEFAULT now(),
  provider_label     text,
  provider_model_id  text,
  failure_reason     text,
  expires_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX video_jobs_user_id_idx ON video_jobs (user_id);
CREATE INDEX video_jobs_state_idx ON video_jobs (state);
CREATE INDEX video_jobs_created_at_idx ON video_jobs (created_at DESC);

-- =============================================================================
-- STATE HISTORY (append-only by convention)
-- =============================================================================

CREATE TABLE video_job_state_history (
  id           bigserial PRIMARY KEY,
  job_id       uuid NOT NULL REFERENCES video_jobs(id) ON DELETE CASCADE,
  from_state   video_job_state,
  to_state     video_job_state NOT NULL,
  reason       text,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX video_job_state_history_job_id_idx ON video_job_state_history (job_id, occurred_at);

-- =============================================================================
-- PROVIDER REQUESTS (one row per provider call attempt; raw evidence)
-- =============================================================================

CREATE TABLE provider_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              uuid NOT NULL REFERENCES video_jobs(id) ON DELETE CASCADE,
  provider_label      text NOT NULL,
  provider_model_id   text NOT NULL,
  provider_job_id     text,
  request_kind        text NOT NULL CHECK (
                        request_kind IN ('submit','status','fetch','cancel','webhook')
                      ),
  request_body        jsonb,
  response_status     int,
  response_body       jsonb,
  raw_response        jsonb,
  provider_status     text,
  provider_url        text,
  retrieved_at        timestamptz,
  error_code          text,
  error_message       text,
  latency_ms          int,
  idempotency_key     text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX provider_requests_job_id_idx ON provider_requests (job_id);
CREATE INDEX provider_requests_provider_job_id_idx ON provider_requests (provider_label, provider_job_id);
CREATE UNIQUE INDEX provider_requests_idempotency_key_idx
  ON provider_requests (provider_label, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- =============================================================================
-- ARTIFACTS (the only source of truth for "this video is real")
-- =============================================================================

CREATE TABLE artifacts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id               uuid NOT NULL REFERENCES video_jobs(id) ON DELETE RESTRICT,
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider_label       text NOT NULL,
  provider_model_id    text NOT NULL,
  provider_job_id      text NOT NULL,
  provider_status      text NOT NULL,
  provider_url         text,
  storage_provider     text NOT NULL,
  storage_bucket       text NOT NULL,
  storage_key          text NOT NULL,
  stored_artifact_url  text NOT NULL,
  sha256_hash          text NOT NULL CHECK (char_length(sha256_hash) = 64),
  mime_type            text NOT NULL,
  file_size_bytes      bigint NOT NULL CHECK (file_size_bytes > 0),
  duration_seconds     numeric(10,3),
  width                int,
  height               int,
  verification_status  text NOT NULL DEFAULT 'pending' CHECK (
                         verification_status IN ('pending','verified','failed','quarantined')
                       ),
  verified_at          timestamptz,
  audit_event_id       uuid,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (storage_provider, storage_bucket, storage_key)
);

CREATE INDEX artifacts_job_id_idx ON artifacts (job_id);
CREATE INDEX artifacts_user_id_idx ON artifacts (user_id);
CREATE INDEX artifacts_sha256_idx ON artifacts (sha256_hash);
CREATE INDEX artifacts_verified_idx ON artifacts (verification_status, verified_at DESC);

-- A verified artifact MUST have an audit_event_id and a verified_at.
ALTER TABLE artifacts
  ADD CONSTRAINT artifacts_verified_requires_audit
  CHECK (
    verification_status <> 'verified'
    OR (audit_event_id IS NOT NULL AND verified_at IS NOT NULL)
  );

-- =============================================================================
-- AUDIT EVENTS (append-only, hash-chained)
-- =============================================================================

CREATE TABLE audit_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         uuid REFERENCES video_jobs(id) ON DELETE SET NULL,
  artifact_id    uuid REFERENCES artifacts(id) ON DELETE SET NULL,
  user_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type     text NOT NULL,
  event_data     jsonb NOT NULL DEFAULT '{}'::jsonb,
  prev_event_id  uuid REFERENCES audit_events(id) ON DELETE RESTRICT,
  hash_chain     text,
  occurred_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_job_id_idx     ON audit_events (job_id);
CREATE INDEX audit_events_artifact_id_idx ON audit_events (artifact_id);
CREATE INDEX audit_events_occurred_at_idx ON audit_events (occurred_at DESC);

CREATE OR REPLACE FUNCTION audit_events_block_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only (op=%, id=%)',
    TG_OP, COALESCE(OLD.id::text, 'unknown');
END;
$$;

CREATE TRIGGER audit_events_no_update
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_block_modification();

-- Now wire the artifacts.audit_event_id FK (forward reference resolved).
ALTER TABLE artifacts
  ADD CONSTRAINT artifacts_audit_event_fk
  FOREIGN KEY (audit_event_id) REFERENCES audit_events(id) ON DELETE RESTRICT;

-- =============================================================================
-- CREDITS (idempotent ledger)
-- =============================================================================

CREATE TABLE credits (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  delta_micro_usd  bigint NOT NULL,
  reason           text NOT NULL,
  job_id           uuid REFERENCES video_jobs(id) ON DELETE SET NULL,
  idempotency_key  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX credits_user_id_idx ON credits (user_id, created_at DESC);
CREATE UNIQUE INDEX credits_idempotency_key_idx
  ON credits (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- =============================================================================
-- SAFETY REVIEWS
-- =============================================================================

CREATE TABLE safety_reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid NOT NULL REFERENCES video_jobs(id) ON DELETE CASCADE,
  reviewer      text NOT NULL,
  decision      text NOT NULL CHECK (
                  decision IN ('allow','block','escalate','review_required')
                ),
  categories    jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_response  jsonb,
  reason        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX safety_reviews_job_id_idx ON safety_reviews (job_id, created_at DESC);

-- =============================================================================
-- WEBHOOK EVENTS
-- =============================================================================

CREATE TABLE webhook_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_label       text NOT NULL,
  provider_event_id    text,
  signature_header     text,
  signature_verified   boolean NOT NULL,
  raw_payload          jsonb NOT NULL,
  request_headers      jsonb,
  job_id               uuid REFERENCES video_jobs(id) ON DELETE SET NULL,
  processed_at         timestamptz,
  process_status       text NOT NULL DEFAULT 'received' CHECK (
                         process_status IN ('received','verified','rejected','processed','duplicate','error')
                       ),
  error_message        text,
  received_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX webhook_events_provider_event_unique
  ON webhook_events (provider_label, provider_event_id)
  WHERE provider_event_id IS NOT NULL;
CREATE INDEX webhook_events_received_at_idx ON webhook_events (received_at DESC);

-- =============================================================================
-- updated_at triggers (mutable tables only; audit_events stays append-only)
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER video_jobs_set_updated_at
  BEFORE UPDATE ON video_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER artifacts_set_updated_at
  BEFORE UPDATE ON artifacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
