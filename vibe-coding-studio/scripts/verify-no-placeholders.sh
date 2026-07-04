#!/usr/bin/env bash
set -euo pipefail

PLACEHOLDER_PATTERNS=("TODO" "FIXME" "STUB" "XXX")

FOUND=0

for pattern in "${PLACEHOLDER_PATTERNS[@]}"; do
  if grep -r -E "^[^<>]*\b${pattern}\b" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" apps/*/src packages/*/src 2>/dev/null | grep -v "placeholder=" | head -1; then
    echo "❌ Placeholder found: $pattern"
    FOUND=1
  fi
done

if [ $FOUND -eq 1 ]; then
  echo "❌ Placeholder scan FAILED"
  exit 1
fi

echo "✅ No placeholders detected in src/"

