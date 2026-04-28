#!/usr/bin/env node
// Proof runner. Runs every gate independently, never stops early, and writes
// stdout/stderr/exitCode for each gate to ./proof-output. The final gate table
// is printed to stdout AND saved as proof-output/summary.{json,md}.
//
// Exit code is 0 only if every gate passed. A single failure -> exit 1.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const OUT_DIR = join(REPO_ROOT, 'proof-output');

mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const runShell = (id, cmd, args, opts = {}) =>
  new Promise((resolveP) => {
    const start = Date.now();
    let stdout = '';
    let stderr = '';
    const child = spawn(cmd, args, {
      cwd: REPO_ROOT,
      env: process.env,
      shell: false,
      ...opts,
    });
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => {
      stderr += `\n[spawn-error] ${err.message}\n`;
    });
    child.on('close', (code, signal) => {
      const exitCode = code ?? (signal ? 130 : 1);
      writeFileSync(join(OUT_DIR, `${id}.stdout.log`), stdout);
      writeFileSync(join(OUT_DIR, `${id}.stderr.log`), stderr);
      resolveP({
        id,
        passed: exitCode === 0,
        exitCode,
        durationMs: Date.now() - start,
        stdoutPath: relative(REPO_ROOT, join(OUT_DIR, `${id}.stdout.log`)),
        stderrPath: relative(REPO_ROOT, join(OUT_DIR, `${id}.stderr.log`)),
        cmd: `${cmd} ${args.join(' ')}`.trim(),
      });
    });
  });

const runScan = (id, fn) => {
  const start = Date.now();
  let result;
  try {
    result = fn();
  } catch (e) {
    result = { passed: false, details: `scan-threw: ${e instanceof Error ? e.stack : String(e)}` };
  }
  const out = {
    id,
    passed: result.passed,
    exitCode: result.passed ? 0 : 2,
    durationMs: Date.now() - start,
    stdoutPath: relative(REPO_ROOT, join(OUT_DIR, `${id}.stdout.log`)),
    stderrPath: relative(REPO_ROOT, join(OUT_DIR, `${id}.stderr.log`)),
    cmd: `scan:${id}`,
    findings: result.findings ?? [],
    details: result.details ?? null,
  };
  writeFileSync(
    join(OUT_DIR, `${id}.stdout.log`),
    JSON.stringify({ findings: out.findings, details: out.details }, null, 2),
  );
  writeFileSync(join(OUT_DIR, `${id}.stderr.log`), '');
  return out;
};

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  'proof-output',
  '.pnpm-store',
]);

const walkFiles = (root, predicate) => {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        stack.push(p);
      } else if (e.isFile() && predicate(p)) {
        out.push(p);
      }
    }
  }
  return out;
};

const isCodeFile = (p) =>
  /\.(ts|tsx|js|jsx|mjs|cjs|sql|json|env|yaml|yml|md|css)$/i.test(p) &&
  !p.endsWith('.lock') &&
  !p.includes('pnpm-lock.yaml');

const isAppCode = (p) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(p);

// ---------------------------------------------------------------------------
// scans
// ---------------------------------------------------------------------------

const SECRET_PATTERNS = [
  { name: 'AWS_ACCESS_KEY_ID', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'AWS_SECRET_ACCESS_KEY', re: /aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{40}/i },
  { name: 'OPENAI_API_KEY', re: /sk-[A-Za-z0-9]{20,}/ },
  { name: 'GOOGLE_API_KEY', re: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: 'REPLICATE_API_TOKEN', re: /r8_[A-Za-z0-9]{30,}/ },
  { name: 'PRIVATE_KEY_PEM', re: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'GENERIC_BEARER', re: /bearer\s+[A-Za-z0-9._\-]{20,}/i },
];

const secretScan = () => {
  const findings = [];
  const files = walkFiles(REPO_ROOT, isCodeFile);
  for (const f of files) {
    if (f.endsWith('.env.example')) continue;
    if (f.includes('/scripts/proof/')) continue; // patterns themselves live here
    if (f.includes('/proof-output/')) continue;
    let content;
    try {
      content = readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    for (const { name, re } of SECRET_PATTERNS) {
      const m = content.match(re);
      if (m) findings.push({ file: relative(REPO_ROOT, f), pattern: name, sample: m[0].slice(0, 12) + '...' });
    }
  }
  return { passed: findings.length === 0, findings };
};

const providerBoundaryScan = () => {
  const findings = [];
  // Any file under apps/web/app or components that imports a provider SDK or
  // reads a provider key directly is a violation. Provider work belongs only
  // in route handlers explicitly marked as Node runtime, the worker, or
  // dedicated server-only modules.
  const files = walkFiles(join(REPO_ROOT, 'apps', 'web'), isAppCode);
  const FORBIDDEN_IMPORTS = [
    /from\s+['"]openai['"]/,
    /from\s+['"]@google-cloud\/aiplatform['"]/,
    /from\s+['"]replicate['"]/,
    /from\s+['"]@replicate\/sdk['"]/,
  ];
  const FORBIDDEN_KEYS = [
    /process\.env\.OPENAI_API_KEY/,
    /process\.env\.REPLICATE_API_TOKEN/,
    /process\.env\.GOOGLE_APPLICATION_CREDENTIALS/,
    /process\.env\.RUNWAY_API_KEY/,
    /process\.env\.KLING_API_KEY/,
    /process\.env\.FAL_KEY/,
  ];
  const NEXT_PUBLIC_KEY = /NEXT_PUBLIC_[A-Z_]*(API_KEY|SECRET|TOKEN)/;
  for (const f of files) {
    const rel = relative(REPO_ROOT, f);
    const content = readFileSync(f, 'utf8');
    const isClient = /^['"]use client['"];?/m.test(content);
    for (const re of FORBIDDEN_IMPORTS) {
      if (re.test(content)) {
        findings.push({ file: rel, kind: 'provider-sdk-import', match: re.source });
      }
    }
    if (isClient) {
      for (const re of FORBIDDEN_KEYS) {
        if (re.test(content)) {
          findings.push({ file: rel, kind: 'provider-key-in-client', match: re.source });
        }
      }
    }
    const pub = content.match(NEXT_PUBLIC_KEY);
    if (pub) findings.push({ file: rel, kind: 'next-public-secret', match: pub[0] });
  }
  return { passed: findings.length === 0, findings };
};

const todoScan = () => {
  const findings = [];
  const files = walkFiles(REPO_ROOT, isCodeFile);
  const re = /\b(TODO|FIXME|XXX|HACK|STUB)\b/;
  for (const f of files) {
    if (f.includes('/scripts/proof/')) continue;
    if (f.includes('/proof-output/')) continue;
    const rel = relative(REPO_ROOT, f);
    const content = readFileSync(f, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        findings.push({ file: rel, line: i + 1, text: lines[i].trim().slice(0, 200) });
      }
    }
  }
  return { passed: findings.length === 0, findings };
};

const browserStorageScan = () => {
  // Disallow localStorage/sessionStorage usage anywhere under apps/web. Use
  // server cookies + DB for sensitive state.
  const findings = [];
  const files = walkFiles(join(REPO_ROOT, 'apps', 'web'), isAppCode);
  const re = /\b(localStorage|sessionStorage)\b/;
  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        findings.push({ file: relative(REPO_ROOT, f), line: i + 1, text: lines[i].trim() });
      }
    }
  }
  return { passed: findings.length === 0, findings };
};

const artifactProofContractScan = () => {
  const findings = [];
  const required = [
    'job_id',
    'user_id',
    'provider_label',
    'provider_model_id',
    'provider_job_id',
    'provider_status',
    'provider_url',
    'stored_artifact_url',
    'storage_key',
    'sha256_hash',
    'mime_type',
    'file_size_bytes',
    'created_at',
    'verification_status',
    'audit_event_id',
  ];
  const proofTypes = join(REPO_ROOT, 'packages', 'core', 'src', 'proof', 'types.ts');
  let content;
  try {
    content = readFileSync(proofTypes, 'utf8');
  } catch {
    return { passed: false, findings: [{ file: 'packages/core/src/proof/types.ts', kind: 'missing' }] };
  }
  for (const field of required) {
    if (!content.includes(field)) {
      findings.push({ file: 'packages/core/src/proof/types.ts', missingField: field });
    }
  }

  // The artifacts table must enforce verification_status='verified' implies an
  // audit_event_id is present.
  const sql = readFileSync(join(REPO_ROOT, 'packages/db/migrations/0001_init.sql'), 'utf8');
  if (!/artifacts_verified_requires_audit/.test(sql)) {
    findings.push({ file: 'packages/db/migrations/0001_init.sql', missing: 'artifacts_verified_requires_audit constraint' });
  }
  if (!/audit_events_no_update/.test(sql)) {
    findings.push({ file: 'packages/db/migrations/0001_init.sql', missing: 'audit_events_no_update trigger' });
  }
  return { passed: findings.length === 0, findings };
};

const schemaMigrationCheck = () => {
  const findings = [];
  const dir = join(REPO_ROOT, 'packages', 'db', 'migrations');
  let entries;
  try {
    entries = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  } catch {
    return { passed: false, findings: [{ kind: 'missing-migrations-dir', path: dir }] };
  }
  if (entries.length === 0) {
    return { passed: false, findings: [{ kind: 'no-migrations' }] };
  }
  for (const f of entries) {
    if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(f)) {
      findings.push({ kind: 'bad-name', file: f });
    }
    const stat = statSync(join(dir, f));
    if (stat.size === 0) findings.push({ kind: 'empty', file: f });
  }
  return { passed: findings.length === 0, findings, details: { count: entries.length, files: entries } };
};

// ---------------------------------------------------------------------------
// gate definitions
// ---------------------------------------------------------------------------

const PNPM = process.env.PNPM_BIN ?? 'pnpm';

const gates = [
  { id: 'install', kind: 'shell', cmd: PNPM, args: ['install', '--frozen-lockfile'] },
  { id: 'typecheck', kind: 'shell', cmd: PNPM, args: ['-r', 'run', 'typecheck'] },
  { id: 'test', kind: 'shell', cmd: PNPM, args: ['-r', 'run', 'test'] },
  { id: 'build', kind: 'shell', cmd: PNPM, args: ['-r', 'run', 'build'] },
  { id: 'secret_scan', kind: 'scan', fn: secretScan },
  { id: 'provider_boundary_scan', kind: 'scan', fn: providerBoundaryScan },
  { id: 'todo_scan', kind: 'scan', fn: todoScan },
  { id: 'browser_storage_scan', kind: 'scan', fn: browserStorageScan },
  { id: 'artifact_proof_contract_scan', kind: 'scan', fn: artifactProofContractScan },
  { id: 'schema_migration_check', kind: 'scan', fn: schemaMigrationCheck },
];

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const main = async () => {
  const results = [];
  for (const g of gates) {
    process.stdout.write(`▶ running gate: ${g.id}\n`);
    let r;
    if (g.kind === 'shell') {
      r = await runShell(g.id, g.cmd, g.args);
    } else {
      r = runScan(g.id, g.fn);
    }
    process.stdout.write(`  ${r.passed ? 'PASS' : 'FAIL'} (exit=${r.exitCode}, ${r.durationMs}ms)\n`);
    results.push(r);
  }

  const allPassed = results.every((r) => r.passed);

  // Summary table
  const colWidth = (rows, key, min) =>
    Math.max(min, ...rows.map((r) => String(r[key] ?? '').length));
  const padRight = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));

  const c1 = colWidth(results, 'id', 'gate'.length);
  const c2 = 'status'.length;
  const c3 = colWidth(results, 'exitCode', 'exit'.length);
  const c4 = 'duration_ms'.length;

  const header = `| ${padRight('gate', c1)} | ${padRight('status', c2)} | ${padRight('exit', c3)} | ${padRight('duration_ms', c4)} |`;
  const sep = `| ${'-'.repeat(c1)} | ${'-'.repeat(c2)} | ${'-'.repeat(c3)} | ${'-'.repeat(c4)} |`;
  const rows = results.map(
    (r) =>
      `| ${padRight(r.id, c1)} | ${padRight(r.passed ? 'PASS' : 'FAIL', c2)} | ${padRight(String(r.exitCode), c3)} | ${padRight(String(r.durationMs), c4)} |`,
  );

  const table = [header, sep, ...rows].join('\n');
  process.stdout.write('\n' + table + '\n\n');
  process.stdout.write(`overall: ${allPassed ? 'PASS' : 'FAIL'}\n`);

  writeFileSync(
    join(OUT_DIR, 'summary.json'),
    JSON.stringify({ allPassed, results, generatedAt: new Date().toISOString() }, null, 2),
  );
  writeFileSync(
    join(OUT_DIR, 'summary.md'),
    `# Proof Runner Summary\n\nGenerated: ${new Date().toISOString()}\n\nOverall: **${allPassed ? 'PASS' : 'FAIL'}**\n\n${table}\n`,
  );

  process.exit(allPassed ? 0 : 1);
};

main().catch((e) => {
  process.stderr.write(`proof runner crashed: ${e instanceof Error ? e.stack : String(e)}\n`);
  process.exit(2);
});
