#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Running production gates..."
echo ""

FAILED=0

echo "📋 Gate 1: Checking for placeholders in src/..."
if bash scripts/verify-no-placeholders.sh; then
  echo "✅ No placeholders found"
else
  echo "❌ Placeholders found"
  FAILED=1
fi
echo ""

echo "📋 Gate 2: Checking for secrets..."
if bash scripts/verify-no-secrets.sh; then
  echo "✅ No secrets found"
else
  echo "❌ Secrets found"
  FAILED=1
fi
echo ""

echo "📋 Gate 3: Verifying .env is gitignored..."
if grep -q "^\.env$" .gitignore && [ -f .env.example ]; then
  echo "✅ .env configuration correct"
else
  echo "❌ .env not properly configured"
  FAILED=1
fi
echo ""

echo "📋 Gate 4: TypeScript typecheck..."
if pnpm typecheck; then
  echo "✅ Typecheck passed"
else
  echo "❌ Typecheck failed"
  FAILED=1
fi
echo ""

echo "📋 Gate 5: Linting..."
if pnpm lint 2>&1 | head -20; then
  echo "✅ Lint passed"
else
  echo "❌ Lint failed"
  FAILED=1
fi
echo ""

echo "📋 Gate 6: Tests..."
if pnpm test; then
  echo "✅ Tests passed"
else
  echo "❌ Tests failed"
  FAILED=1
fi
echo ""

echo "📋 Gate 7: Production build..."
if pnpm build 2>&1 | tail -20; then
  echo "✅ Build passed"
else
  echo "❌ Build failed"
  FAILED=1
fi
echo ""

if [ $FAILED -eq 0 ]; then
  echo "✅ All gates passed!"
  exit 0
else
  echo "❌ Some gates failed"
  exit 1
fi
