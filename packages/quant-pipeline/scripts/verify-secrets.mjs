#!/usr/bin/env node
/**
 * verify-secrets.mjs — scan the source tree for hardcoded credentials.
 *
 * Patterns detected: OpenAI / Anthropic / AWS / GitLab keys, private-key
 * PEM blocks, and generic quoted secret assignments. Findings are redacted.
 *
 * SCAN_ROOT env var overrides the default scan root (repo root, 3 levels
 * above this script). Set SCAN_ROOT to a temp directory in tests.
 *
 * Exit 0 — no hardcoded credentials found.
 * Exit 1 — one or more findings (fail-closed).
 *
 * Zero runtime dependencies — Node stdlib only.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Default scan root: repo root (scripts/ → quant-pipeline/ → packages/ → repo root)
const SCAN_ROOT = process.env.SCAN_ROOT ?? join(__dirname, '../../..');

// ── Secret patterns ───────────────────────────────────────────────────────────
// Each pattern is tested against individual lines.
const SECRET_PATTERNS = [
  { name: 'OpenAI key',         re: /sk-[a-zA-Z0-9_-]{20,}/ },
  { name: 'Anthropic key',      re: /sk-ant-[a-zA-Z0-9_-]{20,}/ },
  { name: 'AWS access key',     re: /AKIA[A-Z2-7]{16}/ },
  { name: 'GitLab PAT',         re: /glpat-[a-zA-Z0-9_-]{20,}/ },
  { name: 'Private key block',  re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  {
    name: 'Generic secret assignment',
    // Matches: api_key = "hardcoded", secret_key = 'value16chars+', etc.
    // Excludes values containing ${, } (template literals) or whitespace.
    re: /(?:api_key|secret_key|private_key|access_token|auth_token|api_token|api_secret)\s*[=:]\s*["']([^"'${\s\n]{16,})["']/i,
  },
];

// ── Allow-list ────────────────────────────────────────────────────────────────
// A match is suppressed only when the SECRET match position is immediately
// preceded by a process.env dereference — not merely when process.env appears
// anywhere on the same line (which is the bypass vector we must resist).
function isMatchAllowlisted(line, matchIndex) {
  // Look at the ~20 chars before the match start for a process.env reference.
  const lookBehind = line.slice(Math.max(0, matchIndex - 20), matchIndex);
  return /process\.env\.\w*$/.test(lookBehind);
}

// ── File-system helpers ───────────────────────────────────────────────────────

const SCAN_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs',
  '.ts', '.tsx', '.jsx',
  '.py', '.rb', '.go', '.java', '.rs',
  '.yaml', '.yml', '.json', '.toml', '.ini',
  '.sh', '.bash', '.zsh',
  '.md', '.txt',
]);

const SKIP_DIRS = new Set([
  '.git', 'node_modules', '.pnpm', '__pycache__',
  '.next', 'dist', 'build', '.turbo', 'coverage',
  '.nyc_output', 'vendor', '.venv', 'venv',
]);

function shouldScanFile(name) {
  // Scan .env* files explicitly (extname('.env') === '' in Node)
  if (name.startsWith('.env')) return true;
  return SCAN_EXTENSIONS.has(extname(name).toLowerCase());
}

function redact(str) {
  return str.slice(0, 4) + '*'.repeat(Math.max(0, str.length - 4));
}

function scanFile(filePath) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const findings = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { name, re } of SECRET_PATTERNS) {
      const match = re.exec(line);
      if (!match) continue;
      if (isMatchAllowlisted(line, match.index)) continue;
      findings.push({ file: filePath, line: i + 1, type: name, redacted: redact(match[0]) });
      break; // one finding per line
    }
  }

  return findings;
}

function walkDir(dir) {
  const findings = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return findings;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let stat;
    try { stat = statSync(full); } catch { continue; }
    if (stat.isDirectory()) {
      findings.push(...walkDir(full));
    } else if (stat.isFile() && shouldScanFile(entry)) {
      findings.push(...scanFile(full));
    }
  }
  return findings;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const findings = walkDir(SCAN_ROOT);

if (findings.length === 0) {
  console.log('[verify:secrets] No hardcoded credentials found. ✓');
  process.exit(0);
}

console.error(`[verify:secrets] FAIL: ${findings.length} potential secret(s) found:`);
for (const f of findings) {
  const rel = relative(SCAN_ROOT, f.file);
  console.error(`  ${rel}:${f.line}  [${f.type}]  ${f.redacted}`);
}
process.exit(1);
