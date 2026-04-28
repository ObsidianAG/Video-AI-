#!/usr/bin/env node
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const dir = resolve(HERE, '..', 'migrations');

const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

if (files.length === 0) {
  console.error('FAIL: no migrations found in', dir);
  process.exit(2);
}

let bad = 0;
for (const f of files) {
  const stat = statSync(join(dir, f));
  if (stat.size === 0) {
    console.error('FAIL: empty migration', f);
    bad++;
  }
  if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(f)) {
    console.error('FAIL: bad migration filename format', f);
    bad++;
  }
}

if (bad > 0) process.exit(2);
console.log(`OK: ${files.length} migration(s) checked`);
