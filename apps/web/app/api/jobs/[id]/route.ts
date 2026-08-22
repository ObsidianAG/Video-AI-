/**
 * GET /api/jobs/[id] — fetch a single job with its latest state and artifact.
 *
 * Fails-closed if DATABASE_URL is not set.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireDatabaseConfig, ConfigurationError } from '@/lib/config.server';
import { getDb } from '@/lib/db.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function errorResponse(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    requireDatabaseConfig();
  } catch (err) {
    if (err instanceof ConfigurationError) {
      return errorResponse(503, 'DATABASE_NOT_CONFIGURED', err.message);
    }
    throw err;
  }

  const { id } = await params;

  // UUID validation — prevents SQL injection even with parameterized queries
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return errorResponse(400, 'INVALID_ID', 'Job ID must be a valid UUID.');
  }

  const db = await getDb();

  try {
    const jobs = await db`
      SELECT
        vj.id,
        vj.prompt,
        vj.state,
        vj.state_reason,
        vj.provider_label,
        vj.provider_model_id,
        vj.failure_reason,
        vj.created_at,
        vj.state_updated_at
      FROM video_jobs vj
      WHERE vj.id = ${id}
      LIMIT 1
    `;

    if (jobs.length === 0) {
      return errorResponse(404, 'JOB_NOT_FOUND', `No job found with ID ${id}.`);
    }

    const job = jobs[0]!;

    // Fetch state history
    const history = await db`
      SELECT from_state, to_state, reason, occurred_at
      FROM video_job_state_history
      WHERE job_id = ${id}
      ORDER BY occurred_at ASC
    `;

    // Fetch artifact if exists
    const artifacts = await db`
      SELECT
        stored_artifact_url,
        verification_status,
        mime_type,
        file_size_bytes,
        sha256_hash,
        verified_at,
        audit_event_id,
        created_at
      FROM artifacts
      WHERE job_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const artifact = artifacts.length > 0 ? artifacts[0] : null;

    // A video is only ready for user when:
    //   1. state === 'READY_FOR_USER'
    //   2. artifact.verification_status === 'verified'
    //   3. artifact.audit_event_id IS NOT NULL
    const isReady =
      job['state'] === 'READY_FOR_USER' &&
      artifact?.['verification_status'] === 'verified' &&
      artifact?.['audit_event_id'] != null;

    return NextResponse.json({
      ok: true,
      job: {
        ...job,
        history,
        artifact,
        isReadyForUser: isReady,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(500, 'DB_ERROR', `Failed to fetch job: ${msg}`);
  }
}
