#!/usr/bin/env node
/**
 * compute-budget.mjs — budget calculation utilities for the quant_pipeline.
 *
 * Imported by verify-budget.mjs; also usable standalone as an estimator.
 * Zero runtime dependencies — Node stdlib only.
 *
 * Prices are approximate (as of 2026-06) and used only for pre-flight budget
 * checks, not for billing. A live API call is required to verify actual costs.
 */

/** @type {Record<string, { input: number; output: number }>} Cost in USD per 1 M tokens. */
export const MODEL_COSTS_PER_M_TOKENS = {
  'gpt-4o':             { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':        { input: 0.15,  output: 0.60  },
  'gpt-4-turbo':        { input: 10.00, output: 30.00 },
  'claude-3-5-sonnet':  { input: 3.00,  output: 15.00 },
  'claude-3-haiku':     { input: 0.25,  output: 1.25  },
  'claude-3-opus':      { input: 15.00, output: 75.00 },
  'claude-opus-4':      { input: 15.00, output: 75.00 },
  'claude-sonnet-4':    { input: 3.00,  output: 15.00 },
};

/**
 * Estimate monthly cost for a single task (50/50 input/output split assumed).
 *
 * @param {{ model: string; max_tokens: number; estimated_calls_per_day: number }} task
 * @param {number} [daysPerMonth=30]
 * @returns {{ known: boolean; usd: number }}
 */
export function estimateTaskMonthlyCost(task, daysPerMonth = 30) {
  const costs = MODEL_COSTS_PER_M_TOKENS[task.model];
  if (!costs) return { known: false, usd: 0 };
  const tokensPerMonth = task.max_tokens * task.estimated_calls_per_day * daysPerMonth;
  const blendedPer1M = (costs.input + costs.output) / 2;
  return { known: true, usd: (tokensPerMonth / 1_000_000) * blendedPer1M };
}

/**
 * Total daily token usage across all tasks.
 *
 * @param {Array<{ max_tokens: number; estimated_calls_per_day: number }>} tasks
 * @returns {number}
 */
export function totalDailyTokens(tasks) {
  return tasks.reduce((sum, t) => sum + (t.max_tokens ?? 0) * (t.estimated_calls_per_day ?? 0), 0);
}

/**
 * Estimated total monthly cost across all tasks.
 *
 * @param {Array<{ model: string; max_tokens: number; estimated_calls_per_day: number }>} tasks
 * @param {number} [daysPerMonth=30]
 * @returns {number}
 */
export function totalMonthlyCost(tasks, daysPerMonth = 30) {
  return tasks.reduce((sum, t) => sum + estimateTaskMonthlyCost(t, daysPerMonth).usd, 0);
}
