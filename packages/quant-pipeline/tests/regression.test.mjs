/**
 * regression.test.mjs — Node stdlib regression tests for the quant_pipeline
 * verification harness.  Uses node:test (Node ≥ 18; stable from Node ≥ 20).
 *
 * Run: node --test tests/regression.test.mjs
 *
 * NOTE: fake credential strings used in tests are built at runtime via
 * concatenation so that this source file itself does not trigger verify:secrets.
 */

import { test }      from 'node:test';
import assert        from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join }      from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir }    from 'node:os';

const __dirname    = fileURLToPath(new URL('.', import.meta.url));
const SCRIPTS      = join(__dirname, '..', 'scripts');
const PACKAGE_ROOT = join(__dirname, '..');
const FIXTURES     = join(__dirname, 'fixtures');

/** Spawn a verification script in a clean env, return spawnSync result. */
function run(script, env = {}) {
  return spawnSync(
    process.execPath,
    [join(SCRIPTS, script)],
    {
      // Provide only the vars we explicitly set (no inherited secrets).
      env: { PATH: process.env.PATH, ...env },
      stdio: 'pipe',
    }
  );
}

// ── verify:env ────────────────────────────────────────────────────────────────

test('verify:env — AI disabled (no AI_ENABLED) → exit 0', () => {
  const r = run('verify-env.mjs', {});
  assert.equal(r.status, 0, r.stderr.toString());
});

test('verify:env — AI_ENABLED=true, AI_PROVIDER not set → exit 1', () => {
  const r = run('verify-env.mjs', { AI_ENABLED: 'true' });
  assert.equal(r.status, 1);
});

test('verify:env — AI_ENABLED=true, unknown AI_PROVIDER → exit 1', () => {
  const r = run('verify-env.mjs', { AI_ENABLED: 'true', AI_PROVIDER: 'grok' });
  assert.equal(r.status, 1);
});

test('verify:env — AI_ENABLED=true, openai, OPENAI_API_KEY missing → exit 1', () => {
  const r = run('verify-env.mjs', { AI_ENABLED: 'true', AI_PROVIDER: 'openai' });
  assert.equal(r.status, 1);
});

test('verify:env — AI_ENABLED=true, openai, placeholder key → exit 1', () => {
  const r = run('verify-env.mjs', {
    AI_ENABLED:     'true',
    AI_PROVIDER:    'openai',
    OPENAI_API_KEY: 'your-api-key',   // explicit placeholder from the spec
  });
  assert.equal(r.status, 1);
});

// ── verify:secrets ────────────────────────────────────────────────────────────

test('verify:secrets — clean temp dir → exit 0', () => {
  const dir = join(tmpdir(), `qp-clean-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  // A file that only uses env-var references — should be allowlisted.
  writeFileSync(join(dir, 'clean.js'), 'const k = process.env.OPENAI_API_KEY;\n');
  try {
    const r = run('verify-secrets.mjs', { SCAN_ROOT: dir });
    assert.equal(r.status, 0, r.stderr.toString());
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('verify:secrets — hardcoded OpenAI key in .js → exit 1', () => {
  const dir = join(tmpdir(), `qp-secret-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  // Build the fake key at runtime; the source literal 'sk-' is too short to match.
  const fakeKey = 'sk-' + 'A'.repeat(48);
  writeFileSync(join(dir, 'bad.js'), `const key = "${fakeKey}";\n`);
  try {
    const r = run('verify-secrets.mjs', { SCAN_ROOT: dir });
    assert.equal(r.status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('verify:secrets — process.env on same line does NOT bypass hardcoded key → exit 1', () => {
  const dir = join(tmpdir(), `qp-bypass-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  // Bypass attempt: hardcoded key + process.env reference on the same line.
  // The gate must still catch the literal key.
  const fakeKey = 'sk-' + 'B'.repeat(48);
  writeFileSync(
    join(dir, 'bypass.tsx'),
    `const k = "${fakeKey}"; // process.env.OPENAI_API_KEY\n`
  );
  try {
    const r = run('verify-secrets.mjs', { SCAN_ROOT: dir });
    assert.equal(r.status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── verify:dataflow ───────────────────────────────────────────────────────────

test('verify:dataflow — valid 9-node spec → exit 0', () => {
  const r = run('verify-dataflow.mjs', {
    DATAFLOW_SPEC: join(PACKAGE_ROOT, 'dataflow.spec.json'),
  });
  assert.equal(r.status, 0, r.stderr.toString());
});

test('verify:dataflow — guard-bypass fixture (tainted path to LLM sink) → exit 1', () => {
  const r = run('verify-dataflow.mjs', {
    DATAFLOW_SPEC: join(FIXTURES, 'bad-dataflow.json'),
  });
  assert.equal(r.status, 1);
});

test('verify:dataflow — empty spec object {} → exit 1', () => {
  const specFile = join(tmpdir(), `qp-df-empty-${Date.now()}.json`);
  writeFileSync(specFile, '{}');
  try {
    const r = run('verify-dataflow.mjs', { DATAFLOW_SPEC: specFile });
    assert.equal(r.status, 1);
  } finally {
    rmSync(specFile, { force: true });
  }
});

// ── verify:budget ─────────────────────────────────────────────────────────────

test('verify:budget — valid 2-task spec → exit 0', () => {
  const r = run('verify-budget.mjs', {
    BUDGET_SPEC: join(PACKAGE_ROOT, 'budget.spec.json'),
  });
  assert.equal(r.status, 0, r.stderr.toString());
});

test('verify:budget — empty spec object {} → exit 1', () => {
  const specFile = join(tmpdir(), `qp-bgt-empty-${Date.now()}.json`);
  writeFileSync(specFile, '{}');
  try {
    const r = run('verify-budget.mjs', { BUDGET_SPEC: specFile });
    assert.equal(r.status, 1);
  } finally {
    rmSync(specFile, { force: true });
  }
});

test('verify:budget — high-risk task without hitl → exit 1', () => {
  const r = run('verify-budget.mjs', {
    BUDGET_SPEC: join(FIXTURES, 'bad-budget.json'),
  });
  assert.equal(r.status, 1);
});
