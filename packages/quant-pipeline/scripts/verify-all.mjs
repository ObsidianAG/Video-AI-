#!/usr/bin/env node
/**
 * verify-all.mjs — run every verification gate in sequence.
 *
 * Exit 0 — all gates passed.
 * Exit 1 — one or more gates failed.
 *
 * Zero runtime dependencies — Node stdlib only.
 */

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const GATES = [
  { name: 'verify:env',      script: 'verify-env.mjs' },
  { name: 'verify:secrets',  script: 'verify-secrets.mjs' },
  { name: 'verify:dataflow', script: 'verify-dataflow.mjs' },
  { name: 'verify:budget',   script: 'verify-budget.mjs' },
];

let anyFailed = false;

for (const gate of GATES) {
  const result = spawnSync(
    process.execPath,
    [join(__dirname, gate.script)],
    { env: process.env, stdio: 'inherit' }
  );

  if (result.status !== 0) {
    console.error(`[verify:all] ✗  "${gate.name}" FAILED.`);
    anyFailed = true;
  } else {
    console.log(`[verify:all] ✓  "${gate.name}" passed.`);
  }
}

if (anyFailed) {
  console.error('\n[verify:all] FAIL: One or more gates failed — pipeline blocked.');
  process.exit(1);
}

console.log('\n[verify:all] All gates passed. ✓');
process.exit(0);
