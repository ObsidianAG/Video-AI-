#!/usr/bin/env bash
set -euo pipefail

SECRET_PATTERNS=(
  "AKIA[0-9A-Z]{16}"
  "sk-[a-zA-Z0-9]{32,}"
  "r8_[a-zA-Z0-9]{32,}"
  "ghp_[a-zA-Z0-9]{36}"
  "github_pat"
  "glpat-"
  "AIza[0-9A-Za-z\-_]{35}"
  "ya29\."
  "sk_live_"
)

FOUND=0

for pattern in "${SECRET_PATTERNS[@]}"; do
  if grep -r -E "$pattern" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --exclude-dir=node_modules --exclude-dir=dist . 2>/dev/null | grep -v "verify-no-secrets" | head -1; then
    echo "❌ Potential secret found matching pattern: $pattern"
    FOUND=1
  fi
done

if [ $FOUND -eq 1 ]; then
  echo "❌ Secret scan FAILED"
  exit 1
fi

echo "✅ No secrets detected"

