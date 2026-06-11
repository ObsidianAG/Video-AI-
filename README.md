# Video-AI

Production text-to-video platform. **Foundation slice only** — no provider,
storage, auth, queue runtime, or webhook integration is wired yet.

## Status

| layer            | state                                                    |
| ---------------- | -------------------------------------------------------- |
| Repo scaffold    | landed                                                   |
| TS / lint / fmt  | landed                                                   |
| Vitest           | landed                                                   |
| DB schema        | migration `0001_init.sql` (declarative, not yet applied) |
| Provider adapter | **interface only** — no implementations                  |
| Storage adapter  | **interface only** — no implementations                  |
| Auth adapter     | **interface only** — no implementations                  |
| Queue adapter    | **interface only** — no BullMQ wiring                    |
| Worker app       | placeholder; refuses to start                            |
| Web app          | renders "Not ready yet."                                 |
| Proof runner     | landed                                                   |
| quant-pipeline gates | landed — `packages/quant-pipeline` (`npm run verify:ci`) |

A video is real **only after all 7 proof gates pass**. See
`packages/core/src/proof/types.ts`.

## Layout

```
apps/
  web/         Next.js 15 App Router + Tailwind + shadcn path
  worker/      Worker entrypoint placeholder (no queue runtime wired)
packages/
  core/        Typed contracts: providers, storage, queue, auth, metrics, proof, states
  db/          Postgres migrations + a small loader; no ORM bound
  quant-pipeline/  Fail-closed npm verification harness (env, secrets, dataflow, budget)
scripts/
  proof/       Proof runner (`pnpm proof`)
```

## Local commands

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm proof   # runs every gate independently and writes proof-output/
```

## What is NOT built (intentional)

- No real provider adapter (`OpenAI`, `Vertex Veo`, `Replicate`, `Runway`,
  `Kling`, `fal.ai`, …). They are gated on live-doc verification per provider.
- No storage adapter (`S3` / `R2` / `Vercel Blob`).
- No auth adapter (`NextAuth` / `Clerk` / custom).
- No queue runtime (`BullMQ` / `Temporal`).
- No webhook receivers.
- No payment / credit accrual.
- No mock provider or mock storage in production code. Test doubles are only
  permitted inside test files and must never be imported from runtime code.

## Decision

`HOLD` — provider, storage, auth, queue runtime, and webhook integrations are
not verified. No video can be marked verified yet because no proof can be
produced.
