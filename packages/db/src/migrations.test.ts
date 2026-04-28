import { describe, expect, it } from 'vitest';
import { listMigrations } from './migrations.js';

const REQUIRED_TABLES = [
  'users',
  'video_jobs',
  'video_job_state_history',
  'provider_requests',
  'artifacts',
  'audit_events',
  'credits',
  'safety_reviews',
  'webhook_events',
];

const REQUIRED_STATES = [
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
];

describe('database migrations', () => {
  const migrations = listMigrations();
  const allSql = migrations.map((m) => m.sql).join('\n');

  it('has at least one migration', () => {
    expect(migrations.length).toBeGreaterThan(0);
  });

  it.each(REQUIRED_TABLES)('creates the %s table', (table) => {
    expect(allSql).toMatch(new RegExp(`CREATE TABLE\\s+${table}\\b`, 'i'));
  });

  it.each(REQUIRED_STATES)('declares the %s state', (state) => {
    expect(allSql).toContain(`'${state}'`);
  });

  it('marks audit_events as append-only via a trigger', () => {
    expect(allSql.toLowerCase()).toContain('audit_events_no_update');
  });

  it('enforces SHA-256 length on artifacts.sha256_hash', () => {
    expect(allSql).toMatch(/sha256_hash\s+text\s+NOT NULL\s+CHECK\s*\(\s*char_length\s*\(\s*sha256_hash\s*\)\s*=\s*64\s*\)/i);
  });

  it('enforces verification_status enum on artifacts', () => {
    expect(allSql).toMatch(/verification_status[\s\S]*?CHECK[\s\S]*?'verified'/i);
  });

  it('blocks unverified artifacts via artifacts_verified_requires_audit', () => {
    expect(allSql).toContain('artifacts_verified_requires_audit');
  });
});
