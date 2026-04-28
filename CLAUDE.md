# CLAUDE.md

Operational rules for any agent working in this repo.

## Repo shape

pnpm monorepo. Workspaces: `apps/web`, `apps/worker`, `packages/core`,
`packages/db`.

## Hard rules

1. **Never** mark a video as ready unless all 7 proof gates from
   `packages/core/src/proof/types.ts` have passed and an `audit_event_id`
   exists on the artifact row.
2. **Never** wire a real provider, storage, auth, or queue runtime without
   first verifying the provider's current docs and account access. Update the
   "Status" table in `README.md` when something is wired.
3. **Never** put provider keys in any client component or any file that lacks
   a `'server-only'` import or a `runtime = 'nodejs'` route export.
4. **Never** use `localStorage` or `sessionStorage` for sensitive state. The
   proof runner enforces this with a scan.
5. **Never** add a mock provider, mock storage, or fake video data to runtime
   code. Test doubles live only in test files.
6. **Never** mark a `video_jobs.state = 'READY_FOR_USER'` without first
   passing through `ARTIFACT_VERIFIED` and `AUDIT_RECORDED`. The state machine
   in `packages/core/src/states.ts` enforces ordering at the type level; the
   migration enforces it at the DB level.
7. Run `pnpm proof` before opening a PR.

## Adding a new provider

1. Open the provider's official docs at the time of work; record the URL and
   the date in the PR description.
2. Verify endpoint paths, response schema, webhook signature header, model
   IDs, output formats, and rate limits with a live API call from a server.
3. Implement `VideoProvider` from `@video-ai/core/providers`.
4. Add provider-specific tests that exercise the live response shape using
   recorded fixtures, not hand-written ones.
5. Wire metrics from `@video-ai/core/metrics`.
6. Update README and CLAUDE.md "Status" tables.

## Adding storage

1. Pick the backend (`s3`, `r2`, `vercel_blob`, `gcs`, `azure_blob`).
2. Implement `StorageProvider` from `@video-ai/core/storage`.
3. Verify `putObject`, `headObject`, and `getSignedReadUrl` against the live
   service. `headObject` MUST be called after `putObject` as a re-existence
   check before audit + verification.

## State machine

The 16 states are defined in `packages/core/src/states.ts` and the Postgres
enum `video_job_state` in `packages/db/migrations/0001_init.sql`. They MUST
stay in sync. Any change requires a new migration and a code change.

## Stream model

Use Node runtime (`export const runtime = 'nodejs'`) for any route handler
that touches files, streams, crypto, or provider calls. Do not mix Node
streams with Web `ReadableStream` without an explicit adapter.
