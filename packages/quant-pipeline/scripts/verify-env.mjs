#!/usr/bin/env node
/**
 * verify-env.mjs — deny-by-default AI gating.
 *
 * The AI path is disabled unless AI_ENABLED=true.
 * When enabled: AI_PROVIDER must be a known value and its required
 * credentials must be present and non-placeholder. Values are never printed.
 *
 * Exit 0 — gate passed.
 * Exit 1 — gate failed (fail-closed).
 *
 * Zero runtime dependencies — Node stdlib only.
 */

const VALID_PROVIDERS = new Set(['openai', 'anthropic']);

/** Credentials required per provider. */
const PROVIDER_REQUIRED_VARS = {
  openai:    ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY'],
};

/** Patterns that indicate an unset / example / placeholder value. */
const PLACEHOLDER_RE = [
  /^your[-_]?api[-_]?key$/i,
  /^sk-xxx/i,
  /^sk-ant-xxx/i,
  /^changeme$/i,
  /^todo$/i,
  /^<[^>]+>$/,          // <placeholder>
  /^\$\{[^}]+\}$/,      // ${VAR}
  /^placeholder/i,
  /^replace[-_]?me/i,
  /^example/i,
  /^test[-_]?key/i,
  /^dummy/i,
  /^fake/i,
  /^xxx+$/i,
];

function isPlaceholder(value) {
  return PLACEHOLDER_RE.some((re) => re.test(value.trim()));
}

// ── Main ─────────────────────────────────────────────────────────────────────

const aiEnabled = process.env.AI_ENABLED;

if (aiEnabled !== 'true') {
  console.log('[verify:env] AI_ENABLED is not "true" — AI path disabled. ✓');
  process.exit(0);
}

// AI is enabled — enforce provider + credentials.

const provider = process.env.AI_PROVIDER;

if (!provider) {
  console.error('[verify:env] FAIL: AI_ENABLED=true but AI_PROVIDER is not set.');
  process.exit(1);
}

if (!VALID_PROVIDERS.has(provider)) {
  console.error(
    `[verify:env] FAIL: AI_PROVIDER="${provider}" is invalid. ` +
    `Valid providers: ${[...VALID_PROVIDERS].join(', ')}.`
  );
  process.exit(1);
}

const required = PROVIDER_REQUIRED_VARS[provider];
let failed = false;

for (const varName of required) {
  const value = process.env[varName];
  if (!value) {
    console.error(
      `[verify:env] FAIL: ${varName} is not set (required for AI_PROVIDER=${provider}).`
    );
    failed = true;
    continue;
  }
  if (isPlaceholder(value)) {
    console.error(
      `[verify:env] FAIL: ${varName} appears to be a placeholder value. ` +
      `Set a real credential. (Value redacted.)`
    );
    failed = true;
  }
}

if (failed) process.exit(1);

console.log(
  `[verify:env] AI_ENABLED=true provider=${provider} credentials present. ✓`
);
process.exit(0);
