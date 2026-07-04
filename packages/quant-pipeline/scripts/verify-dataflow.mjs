#!/usr/bin/env node
/**
 * verify-dataflow.mjs — Source→Transform→Sink taint-flow analysis.
 *
 * Reads dataflow.spec.json (path overrideable via DATAFLOW_SPEC env var).
 * Spec missing / invalid / empty → FAIL closed.
 *
 * Rules enforced:
 *   1. Every tainted source must pass through a guard (guard:true + clears_taint:true)
 *      before reaching any sensitive sink (shell/sql/llm/http_out/fs_write/webhook).
 *   2. Every LLM sink must carry hitl:true or draft-only:true.
 *   3. No cycles in the declared graph.
 *
 * Exit 0 — all rules pass.
 * Exit 1 — any rule fails (fail-closed).
 *
 * Zero runtime dependencies — Node stdlib only.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SPEC_PATH = process.env.DATAFLOW_SPEC ?? join(__dirname, '..', 'dataflow.spec.json');

const SENSITIVE_SINKS = new Set(['shell', 'sql', 'llm', 'http_out', 'fs_write', 'webhook']);
const VALID_NODE_TYPES = new Set(['source', 'transform', 'sink']);

// ── Load & parse ──────────────────────────────────────────────────────────────

let spec;
try {
  spec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'));
} catch (err) {
  console.error(`[verify:dataflow] FAIL: Cannot read spec "${SPEC_PATH}": ${err.message}`);
  process.exit(1);
}

if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
  console.error('[verify:dataflow] FAIL: Spec must be a JSON object.');
  process.exit(1);
}

// ── Structural validation ─────────────────────────────────────────────────────

const errors = [];

if (!Array.isArray(spec.nodes) || spec.nodes.length === 0) {
  console.error('[verify:dataflow] FAIL: Spec must have a non-empty "nodes" array.');
  process.exit(1);
}

if (!Array.isArray(spec.edges)) {
  console.error('[verify:dataflow] FAIL: Spec must have an "edges" array.');
  process.exit(1);
}

const { nodes, edges } = spec;
const nodeIds = new Set();

for (const node of nodes) {
  if (!node.id || typeof node.id !== 'string') {
    errors.push(`Node missing required string "id": ${JSON.stringify(node)}`);
    continue;
  }
  if (nodeIds.has(node.id)) {
    errors.push(`Duplicate node id: "${node.id}"`);
  }
  nodeIds.add(node.id);

  if (!VALID_NODE_TYPES.has(node.type)) {
    errors.push(
      `Node "${node.id}" has invalid type "${node.type}". Must be: ${[...VALID_NODE_TYPES].join(', ')}.`
    );
  }
  if (node.type === 'sink' && !node.sink_type) {
    errors.push(`Sink node "${node.id}" is missing "sink_type".`);
  }
}

for (const edge of edges) {
  if (!edge.from || !edge.to) {
    errors.push(`Edge missing "from" or "to": ${JSON.stringify(edge)}`);
    continue;
  }
  if (!nodeIds.has(edge.from)) errors.push(`Edge "from" references unknown node: "${edge.from}"`);
  if (!nodeIds.has(edge.to))   errors.push(`Edge "to" references unknown node: "${edge.to}"`);
}

if (errors.length > 0) {
  for (const e of errors) console.error(`[verify:dataflow] FAIL: ${e}`);
  process.exit(1);
}

// ── Build adjacency structures ────────────────────────────────────────────────

const successors   = new Map(nodes.map((n) => [n.id, []]));
const predecessors = new Map(nodes.map((n) => [n.id, []]));
const nodeMap      = new Map(nodes.map((n) => [n.id, n]));

for (const { from, to } of edges) {
  successors.get(from).push(to);
  predecessors.get(to).push(from);
}

// ── Cycle detection + topological sort (Kahn's algorithm) ────────────────────

const inDegree = new Map(nodes.map((n) => [n.id, predecessors.get(n.id).length]));
const queue    = nodes.filter((n) => inDegree.get(n.id) === 0).map((n) => n.id);
const topoOrder = [];

while (queue.length > 0) {
  const id = queue.shift();
  topoOrder.push(id);
  for (const succ of successors.get(id)) {
    const deg = inDegree.get(succ) - 1;
    inDegree.set(succ, deg);
    if (deg === 0) queue.push(succ);
  }
}

if (topoOrder.length !== nodes.length) {
  console.error('[verify:dataflow] FAIL: Cycle detected in dataflow graph.');
  process.exit(1);
}

// ── Taint propagation ─────────────────────────────────────────────────────────

// Pre-seed tainted set from sources marked tainted:true.
const tainted = new Set(
  nodes.filter((n) => n.type === 'source' && n.tainted === true).map((n) => n.id)
);

for (const id of topoOrder) {
  const node = nodeMap.get(id);
  if (node.type === 'source') continue; // already seeded

  const inputTainted = predecessors.get(id).some((pred) => tainted.has(pred));

  if (node.guard === true && node.clears_taint === true) {
    // Explicit sanitizing guard — output is clean regardless of input.
    tainted.delete(id);
  } else if (inputTainted) {
    tainted.add(id);
  }
}

// ── Sink rule enforcement ─────────────────────────────────────────────────────

for (const node of nodes) {
  if (node.type !== 'sink') continue;

  if (SENSITIVE_SINKS.has(node.sink_type) && tainted.has(node.id)) {
    errors.push(
      `Node "${node.id}" (sink_type=${node.sink_type}) receives tainted data ` +
      `without a sanitizing guard on every upstream path.`
    );
  }

  if (node.sink_type === 'llm') {
    const gated = node.hitl === true || node['draft-only'] === true || node.draft_only === true;
    if (!gated) {
      errors.push(
        `LLM sink "${node.id}" lacks hitl:true or draft-only:true (HITL gate required).`
      );
    }
  }
}

if (errors.length > 0) {
  for (const e of errors) console.error(`[verify:dataflow] FAIL: ${e}`);
  process.exit(1);
}

console.log(
  `[verify:dataflow] Dataflow spec OK: ${nodes.length} nodes, ` +
  `${edges.length} edges, all taint paths guarded. ✓`
);
process.exit(0);
