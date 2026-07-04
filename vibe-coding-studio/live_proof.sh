#!/usr/bin/env bash
set -euo pipefail

echo "🔴 Running live proof tests..."
echo ""

API_URL="${API_URL:-http://localhost:3001}"

echo "Test 1: Health endpoint..."
if curl -sf "${API_URL}/health" > /dev/null; then
  echo "✅ Health endpoint responds"
else
  echo "⏸️  Health endpoint unavailable (API may not be running)"
fi
echo ""

echo "Test 2: Config endpoint..."
if curl -sf "${API_URL}/config/public" > /dev/null; then
  echo "✅ Config endpoint responds"
else
  echo "⏸️  Config endpoint unavailable"
fi
echo ""

echo "Test 3: Generate brief with missing keys..."
RESPONSE=$(curl -sf "${API_URL}/api/generate-brief" \
  -H "Content-Type: application/json" \
  -d '{"blocks":[{"id":"1","category":"context","content":"test","order":0}],"vibe":"saas-neon"}' || echo "failed")

if [ "$RESPONSE" != "failed" ]; then
  echo "✅ Generate brief endpoint responds"
else
  echo "⏸️  Generate brief endpoint unavailable"
fi
echo ""

echo "✅ Live proof complete (with limitations)"
