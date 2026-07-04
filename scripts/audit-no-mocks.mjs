#!/usr/bin/env node
/**
 * audit-no-mocks.mjs
 *
 * Scans the repository for forbidden mock/demo/bypass patterns.
 * Exits 0 if the codebase is clean; exits 1 if any violation is found.
 *
 * Run via:  node scripts/audit-no-mocks.mjs
 *       or: pnpm audit:no-mocks
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

// ---------------------------------------------------------------------------
// Directory / file exclusions
// ---------------------------------------------------------------------------

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

/** Files excluded from all scans (this file and the proof runner contain the
 *  forbidden strings as pattern literals — they must not self-report). */
const SKIP_FILES = new Set([
  'scripts/audit-no-mocks.mjs',
  'scripts/proof-runner.sh',
  'scripts/proof/run.mjs',
  'pnpm-lock.yaml',
]);

/** Documentation files are excluded from code-level identifier checks. */
const isDoc = (p) => /\.(md|txt)$/i.test(p);

/** Test/spec files: mock test doubles are allowed here per CLAUDE.md rule 5. */
const isTestFile = (p) => /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(p);

/** Production TypeScript/JavaScript source (not tests, not scripts). */
const isProdCode = (p) => /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(p) && !isTestFile(p);

/** Any code or data file (including SQL, JSON, YAML). */
const isCode = (p) =>
  /\.(ts|tsx|js|jsx|mjs|cjs|sql|json|yml|yaml|css)$/i.test(p) &&
  !p.endsWith('.lock');

// ---------------------------------------------------------------------------
// File walker
// ---------------------------------------------------------------------------

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
      const rel = relative(REPO_ROOT, p);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        stack.push(p);
      } else if (e.isFile() && !SKIP_FILES.has(rel) && predicate(p)) {
        out.push(p);
      }
    }
  }
  return out;
};

const readLines = (f) => {
  try {
    return readFileSync(f, 'utf8').split('\n');
  } catch {
    return [];
  }
};

// ---------------------------------------------------------------------------
// Scan helpers
// ---------------------------------------------------------------------------

const scanFiles = (files, patterns) => {
  const findings = [];
  for (const f of files) {
    const rel = relative(REPO_ROOT, f);
    const lines = readLines(f);
    for (let i = 0; i < lines.length; i++) {
      for (const { name, re } of patterns) {
        if (re.test(lines[i])) {
          findings.push({
            file: rel,
            line: i + 1,
            pattern: name,
            text: lines[i].trim().slice(0, 200),
          });
        }
      }
    }
  }
  return findings;
};

// ---------------------------------------------------------------------------
// Pattern groups
// ---------------------------------------------------------------------------

/**
 * Development bypass / override flags.
 * These must NEVER appear anywhere in production or test code.
 * Their presence means a gate can be silently skipped.
 */
const BYPASS_FLAGS = [
  { name: 'MOCK_MODE', re: /\bMOCK_MODE\b/ },
  { name: 'SKIP_AUTH', re: /\bSKIP_AUTH\b/ },
  { name: 'SKIP_PROVIDER', re: /\bSKIP_PROVIDER\b/ },
  { name: 'SKIP_VERIFICATION', re: /\bSKIP_VERIFICATION\b/ },
  { name: 'BYPASS_EXPORT_GATE', re: /\bBYPASS_EXPORT_GATE\b/ },
  { name: 'FORCE_COMPLETED', re: /\bFORCE_COMPLETED\b/ },
  { name: 'DEMO_MODE', re: /\bDEMO_MODE\b/ },
];

/**
 * Named mock / fake data identifiers that must not appear in production code.
 * Test doubles are allowed in *.test.ts / *.spec.ts (CLAUDE.md rule 5).
 */
const MOCK_IDENTIFIERS = [
  { name: 'mockData', re: /\bmockData\b/ },
  { name: 'fakeStatus', re: /\bfakeStatus\b/ },
  { name: 'fakeJob', re: /\bfakeJob\b/ },
  { name: 'fakeProgress', re: /\bfakeProgress\b/ },
  { name: 'localProgress', re: /\blocalProgress\b/ },
  { name: 'fakeGallery', re: /\bfakeGallery\b/ },
  { name: 'fakeProvider', re: /\bfakeProvider\b/ },
  { name: 'fakeDownload', re: /\bfakeDownload\b/ },
  { name: 'fakeCompleted', re: /\bfakeCompleted\b/ },
  { name: 'seedVideo', re: /\bseedVideo\b/ },
  { name: 'simulatedProgress', re: /\bsimulatedProgress\b/ },
  { name: 'staticGallery', re: /\bstaticGallery\b/ },
  { name: 'hardcodedUrl', re: /\bhardcodedUrl\b/ },
];

/**
 * Static demo asset references. Must not appear in code (any file type).
 */
const STATIC_DEMO_ASSETS = [
  { name: 'demo.mp4', re: /\bdemo\.mp4\b/ },
  { name: 'example.mp4', re: /\bexample\.mp4\b/ },
  { name: 'test-video.mp4', re: /\btest-video\.mp4\b/ },
  { name: 'sample.mp4', re: /\bsample\.mp4\b/ },
];

/**
 * Lorem ipsum — must not appear in any code or data file.
 */
const LOREM = [{ name: 'lorem ipsum', re: /lorem\s+ipsum/i }];

// ---------------------------------------------------------------------------
// Scans
// ---------------------------------------------------------------------------

const bypassFlagScan = () => {
  // Bypass flags must not appear anywhere in production or test source code.
  const files = walkFiles(REPO_ROOT, isProdCode).concat(
    walkFiles(REPO_ROOT, isTestFile),
  );
  return { name: 'bypass_flags', findings: scanFiles(files, BYPASS_FLAGS) };
};

const mockIdentifierScan = () => {
  // Mock identifiers must not appear in production source code.
  // Test doubles in *.test.ts are allowed (CLAUDE.md rule 5).
  const files = walkFiles(REPO_ROOT, isProdCode).filter((f) => !isDoc(f));
  return { name: 'mock_identifiers', findings: scanFiles(files, MOCK_IDENTIFIERS) };
};

const staticDemoAssetScan = () => {
  // Static demo asset references must not appear in any code or data file.
  const files = walkFiles(REPO_ROOT, (p) => isCode(p) && !isDoc(p));
  return { name: 'static_demo_assets', findings: scanFiles(files, STATIC_DEMO_ASSETS) };
};

const loremScan = () => {
  // Lorem ipsum must not appear in any code or data file.
  const files = walkFiles(REPO_ROOT, (p) => isCode(p) || isDoc(p));
  return { name: 'lorem_ipsum', findings: scanFiles(files, LOREM) };
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = () => {
  const scans = [bypassFlagScan(), mockIdentifierScan(), staticDemoAssetScan(), loremScan()];

  let totalViolations = 0;

  for (const { name, findings } of scans) {
    if (findings.length === 0) {
      process.stdout.write(`  PASS  ${name}\n`);
    } else {
      process.stdout.write(`  FAIL  ${name} — ${findings.length} violation(s)\n`);
      for (const f of findings) {
        process.stdout.write(`         ${f.file}:${f.line}  [${f.pattern}]  ${f.text}\n`);
      }
      totalViolations += findings.length;
    }
  }

  process.stdout.write('\n');
  if (totalViolations === 0) {
    process.stdout.write('audit:no-mocks PASS — no forbidden patterns found\n');
    process.exit(0);
  } else {
    process.stdout.write(
      `audit:no-mocks FAIL — ${totalViolations} violation(s) found; remove all mock/demo/bypass paths before merging\n`,
    );
    process.exit(1);
  }
};

main();
