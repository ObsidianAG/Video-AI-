/**
 * POST /api/jobs  — create a video generation job
 * GET  /api/jobs  — list recent jobs
 *
 * Fails-closed if DATABASE_URL is not set or no providers are configured.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireDatabaseConfig, ConfigurationError } from '@/lib/config.server';
import { getDb } from '@/lib/db.server';
import { buildProviderRegistry } from '@/lib/providers/registry.server';
import { canTransition } from '@video-ai/core/states';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateJobSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(4000, 'Prompt must be <= 4000 characters'),
  provider: z.string().optional(),
  settings: z.record(z.unknown()).optional().default({}),
});

function errorResponse(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Check database
  try {
    requireDatabaseConfig();
  } catch (err) {
    if (err instanceof ConfigurationError) return errorResponse(503, 'DATABASE_NOT_CONFIGURED', err.message);
    throw err;
  }

  // 2. Parse + validate body
  let body: unknown;
  try { body = await req.json(); } catch { return errorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON.'); }

  const parsed = CreateJobSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, 'VALIDATION_ERROR', parsed.error.issues.map((i) => i.message).join('; '));
  }

  const { prompt, settings } = parsed.data;
  const requestedProvider = parsed.data.provider;

  // 3. Select provider
  const registry = buildProviderRegistry();
  if (registry.list().length === 0) {
    return errorResponse(503, 'NO_PROVIDERS_CONFIGURED', 'No video generation providers are configured. Set at least one provider API key (OPENAI_API_KEY, KLING_API_KEY, or Google Vertex credentials).');
  }

  let providerLabel: string;
  if (requestedProvider) {
    if (!registry.has(requestedProvider as Parameters<typeof registry.has>[0])) {
      return errorResponse(400, 'PROVIDER_NOT_AVAILABLE', 'Provider "' + requestedProvider + '" is not configured. Available: ' + registry.list().join(', '));
    }
    providerLabel = requestedProvider;
  } else {
    providerLabel = registry.list()[0]!;
  }

  // 4. Persist job
  const db = await getDb();
  const guestUserId = await resolveGuestUser(db);

  type JobRow = { id: string };
  let job: JobRow;
  try {
    const rows = await db`
      WITH ins_job AS (
        INSERT INTO video_jobs (user_id, prompt, settings, state, provider_label)
        VALUES (${guestUserId}, ${prompt}, ${JSON.stringify(settings ?? {})}::jsonb, 'PROMPT_RECEIVED', ${providerLabel})
        RETURNING id
      ),
      ins_history AS (
        INSERT INTO video_job_state_history (job_id, from_state, to_state, reason)
        SELECT id, NULL, 'PROMPT_RECEIVED', 'Job created via API' FROM ins_job
      )
      SELECT id FROM ins_job
    `;
    const row = rows[0] as JobRow | undefined;
    if (!row) return errorResponse(500, 'DB_ERROR', 'Failed to create job — no row returned.');
    job = row;
  } catch (err) {
    if (err instanceof ConfigurationError) return errorResponse(503, 'DATABASE_NOT_CONFIGURED', err.message);
    return errorResponse(500, 'DB_ERROR', 'Database error creating job: ' + (err instanceof Error ? err.message : String(err)));
  }

  // 5. Submit to provider
  const provider = registry.get(providerLabel as Parameters<typeof registry.get>[0]);
  const idempotencyKey = 'job-' + job.id + '-submit';

  const submitResult = await provider.submitJob({
    jobId: job.id,
    userId: guestUserId,
    prompt,
    modelId: (settings?.['model'] as string | undefined) ?? '',
    settings: settings ?? {},
    idempotencyKey,
  });

  if (!submitResult.ok) {
    await db`UPDATE video_jobs SET state = 'FAILED', failure_reason = ${submitResult.error.message}, state_updated_at = now() WHERE id = ${job.id}`.catch(() => undefined);
    await db`INSERT INTO video_job_state_history (job_id, from_state, to_state, reason) VALUES (${job.id}, 'PROMPT_RECEIVED', 'FAILED', ${submitResult.error.message})`.catch(() => undefined);
    return errorResponse(502, submitResult.error.code, 'Provider submission failed: ' + submitResult.error.message);
  }

  // 6. Advance state machine: PROMPT_RECEIVED -> ... -> PROVIDER_SUBMITTED
  const transitions: Array<[string, string, string]> = [
    ['PROMPT_RECEIVED', 'SAFETY_REVIEWED', 'Auto-approved (no safety reviewer wired)'],
    ['SAFETY_REVIEWED', 'JOB_CREATED', 'Job persisted'],
    ['JOB_CREATED', 'PROVIDER_SELECTED', 'Provider: ' + providerLabel],
    ['PROVIDER_SELECTED', 'PROVIDER_SUBMITTED', 'Provider job ID: ' + submitResult.value.provider_job_id],
  ];

  try {
    for (const [from, to, reason] of transitions) {
      if (!canTransition(from as Parameters<typeof canTransition>[0], to as Parameters<typeof canTransition>[1])) continue;
      await db`UPDATE video_jobs SET state = ${to}::video_job_state, provider_model_id = ${submitResult.value.provider_model_id}, state_updated_at = now() WHERE id = ${job.id}`;
      await db`INSERT INTO video_job_state_history (job_id, from_state, to_state, reason) VALUES (${job.id}, ${from}::video_job_state, ${to}::video_job_state, ${reason})`;
    }
    await db`INSERT INTO provider_requests (job_id, provider_label, provider_model_id, provider_job_id, request_kind, provider_status, provider_url, idempotency_key, retrieved_at) VALUES (${job.id}, ${submitResult.value.provider_label}, ${submitResult.value.provider_model_id}, ${submitResult.value.provider_job_id}, 'submit', ${submitResult.value.provider_status}, ${submitResult.value.provider_url}, ${idempotencyKey}, now())`;
  } catch (err) {
    console.error('[jobs] Failed to record state transitions:', err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({ ok: true, job: { id: job.id, state: 'PROVIDER_SUBMITTED', providerLabel, providerJobId: submitResult.value.provider_job_id, providerStatus: submitResult.value.provider_status } }, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    requireDatabaseConfig();
  } catch (err) {
    if (err instanceof ConfigurationError) return errorResponse(503, 'DATABASE_NOT_CONFIGURED', err.message);
    throw err;
  }

  const db = await getDb();
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10), 0);

  try {
    const rows = await db`
      SELECT vj.id, vj.prompt, vj.state, vj.provider_label, vj.provider_model_id, vj.failure_reason, vj.created_at, vj.state_updated_at,
             a.stored_artifact_url, a.verification_status, a.mime_type
      FROM video_jobs vj
      LEFT JOIN artifacts a ON a.job_id = vj.id AND a.verification_status = 'verified'
      ORDER BY vj.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return NextResponse.json({ ok: true, jobs: rows, limit, offset });
  } catch (err) {
    return errorResponse(500, 'DB_ERROR', 'Failed to list jobs: ' + (err instanceof Error ? err.message : String(err)));
  }
}

async function resolveGuestUser(db: Awaited<ReturnType<typeof getDb>>): Promise<string> {
  const GUEST_EMAIL = 'guest@video-ai.internal';
  const existing = await db`SELECT id FROM users WHERE email = ${GUEST_EMAIL} LIMIT 1`;
  if (existing.length > 0) return (existing[0] as { id: string }).id;
  const inserted = await db`INSERT INTO users (email, display_name) VALUES (${GUEST_EMAIL}, 'Guest') ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name RETURNING id`;
  return (inserted[0] as { id: string }).id;
}
