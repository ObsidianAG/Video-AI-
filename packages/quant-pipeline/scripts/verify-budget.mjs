#!/usr/bin/env node
/**
 * verify-budget.mjs — model right-sizing and HITL gating.
 *
 * Reads budget.spec.json (path overrideable via BUDGET_SPEC env var).
 * Spec missing / empty / invalid → FAIL closed.
 *
 * Rules enforced:
 *   1. Every task must declare: id, model, max_tokens,
 *      estimated_calls_per_day, risk_level.
 *   2. Tasks with risk_level "high" or "critical" must have hitl:true.
 *   3. Total daily tokens must not exceed budget.daily_token_limit.
 *   4. Estimated monthly cost must not exceed budget.monthly_cost_limit_usd
 *      (for models whose pricing is known).
 *
 * Exit 0 — all rules pass.
 * Exit 1 — any rule fails (fail-closed).
 *
 * Zero runtime dependencies — Node stdlib only.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { totalDailyTokens, totalMonthlyCost } from './compute-budget.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SPEC_PATH = process.env.BUDGET_SPEC ?? join(__dirname, '..', 'budget.spec.json');

const REQUIRED_TASK_FIELDS = [
  'id', 'model', 'max_tokens', 'estimated_calls_per_day', 'risk_level',
];
const HIGH_RISK_LEVELS = new Set(['high', 'critical']);

// ── Load & parse ──────────────────────────────────────────────────────────────

let spec;
try {
  spec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'));
} catch (err) {
  console.error(`[verify:budget] FAIL: Cannot read spec "${SPEC_PATH}": ${err.message}`);
  process.exit(1);
}

if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
  console.error('[verify:budget] FAIL: Spec must be a JSON object.');
  process.exit(1);
}

if (!Array.isArray(spec.tasks) || spec.tasks.length === 0) {
  console.error('[verify:budget] FAIL: Spec must have a non-empty "tasks" array.');
  process.exit(1);
}

const { tasks, budget } = spec;
const errors = [];

// ── Task validation ───────────────────────────────────────────────────────────

for (const task of tasks) {
  for (const field of REQUIRED_TASK_FIELDS) {
    if (task[field] === undefined || task[field] === null) {
      errors.push(`Task "${task.id ?? '<unknown>'}" is missing required field "${field}".`);
    }
  }

  if (HIGH_RISK_LEVELS.has(task.risk_level) && task.hitl !== true) {
    errors.push(
      `Task "${task.id}" has risk_level="${task.risk_level}" but lacks hitl:true.`
    );
  }
}

// ── Budget limit checks ───────────────────────────────────────────────────────

if (budget) {
  if (budget.daily_token_limit != null) {
    const daily = totalDailyTokens(tasks);
    if (daily > budget.daily_token_limit) {
      errors.push(
        `Daily token usage (${daily.toLocaleString()}) exceeds limit ` +
        `(${budget.daily_token_limit.toLocaleString()}).`
      );
    }
  }

  if (budget.monthly_cost_limit_usd != null) {
    const monthly = totalMonthlyCost(tasks);
    if (monthly > budget.monthly_cost_limit_usd) {
      errors.push(
        `Estimated monthly cost ($${monthly.toFixed(2)}) exceeds ` +
        `limit ($${budget.monthly_cost_limit_usd}).`
      );
    }
  }
}

// ── Result ────────────────────────────────────────────────────────────────────

if (errors.length > 0) {
  for (const e of errors) console.error(`[verify:budget] FAIL: ${e}`);
  process.exit(1);
}

const daily   = totalDailyTokens(tasks);
const monthly = totalMonthlyCost(tasks);
console.log(
  `[verify:budget] Budget spec OK: ${tasks.length} task(s), ` +
  `${daily.toLocaleString()} tokens/day, ` +
  `~$${monthly.toFixed(2)}/month. ✓`
);
process.exit(0);
