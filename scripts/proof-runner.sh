#!/usr/bin/env bash
# Proof runner — runs every gate independently. Never stops early.
# Saves stdout/stderr/exit code per gate to ./proof-output and prints a
# normalized gate table at the end.
#
# Grep-style scans use grep's native exit codes (per task spec):
#   exit 1 => PASS  (no match found)
#   exit 0 => FAIL  (match found)
#   exit 2+ => ERROR
#
# Shell-style gates use the conventional convention:
#   exit 0 => PASS, anything else => FAIL.
#
# Overall exit code: 0 only if every gate passed; otherwise 1.

set -uo pipefail
shopt -s nullglob

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT="$ROOT/proof-output"
rm -rf "$OUT"
mkdir -p "$OUT"

# ----------------------------------------------------------------------------
# state
# ----------------------------------------------------------------------------

GATE_NAMES=()
declare -A GATE_KIND
declare -A GATE_STATUS
declare -A GATE_EXIT
declare -A GATE_DURATION
declare -A GATE_CMD

now_ms() { date +%s%3N; }

# ----------------------------------------------------------------------------
# runners
# ----------------------------------------------------------------------------

# run_shell_gate <id> <cmd...>
run_shell_gate() {
  local id="$1"; shift
  local cmd_str
  cmd_str="$(printf '%q ' "$@")"
  GATE_NAMES+=("$id")
  GATE_KIND[$id]=shell
  GATE_CMD[$id]="$cmd_str"
  printf '▶ gate %s : %s\n' "$id" "$cmd_str"
  local start; start=$(now_ms)
  ( "$@" ) >"$OUT/$id.stdout.log" 2>"$OUT/$id.stderr.log"
  local rc=$?
  local end; end=$(now_ms)
  GATE_EXIT[$id]=$rc
  GATE_DURATION[$id]=$((end-start))
  if [ "$rc" -eq 0 ]; then
    GATE_STATUS[$id]=PASS
  else
    GATE_STATUS[$id]=FAIL
  fi
  printf '  %s : %s (exit=%d, %dms)\n' "$id" "${GATE_STATUS[$id]}" "$rc" "${GATE_DURATION[$id]}"
}

# run_grep_gate <id> <grep-cmd...>
# grep-style exit code mapping: 1 PASS, 0 FAIL, 2+ ERROR.
run_grep_gate() {
  local id="$1"; shift
  local cmd_str
  cmd_str="$(printf '%q ' "$@")"
  GATE_NAMES+=("$id")
  GATE_KIND[$id]=grep
  GATE_CMD[$id]="$cmd_str"
  printf '▶ gate %s : %s\n' "$id" "$cmd_str"
  local start; start=$(now_ms)
  ( "$@" ) >"$OUT/$id.stdout.log" 2>"$OUT/$id.stderr.log"
  local rc=$?
  local end; end=$(now_ms)
  GATE_EXIT[$id]=$rc
  GATE_DURATION[$id]=$((end-start))
  case "$rc" in
    0) GATE_STATUS[$id]=FAIL ;;   # match found
    1) GATE_STATUS[$id]=PASS ;;   # no match found
    *) GATE_STATUS[$id]=ERROR ;;
  esac
  printf '  %s : %s (exit=%d, %dms)\n' "$id" "${GATE_STATUS[$id]}" "$rc" "${GATE_DURATION[$id]}"
}

# ----------------------------------------------------------------------------
# composite scans (return 0 PASS, non-zero FAIL)
# ----------------------------------------------------------------------------

artifact_proof_contract_scan() {
  local f="packages/core/src/proof/types.ts"
  local m="packages/db/migrations/0001_init.sql"
  local missing=()
  local field
  for field in \
    job_id user_id provider_label provider_model_id provider_job_id \
    provider_status provider_url stored_artifact_url storage_key \
    sha256_hash mime_type file_size_bytes created_at \
    verification_status audit_event_id
  do
    grep -q "\\b${field}\\b" "$f" || missing+=("proof-types-missing:${field}")
  done
  grep -q 'artifacts_verified_requires_audit' "$m" \
    || missing+=("schema-missing:artifacts_verified_requires_audit")
  grep -q 'audit_events_no_update' "$m" \
    || missing+=("schema-missing:audit_events_no_update")
  grep -q 'char_length(sha256_hash) = 64' "$m" \
    || missing+=("schema-missing:sha256_length_check")
  if [ "${#missing[@]}" -eq 0 ]; then
    echo "OK"
    return 0
  fi
  printf 'missing:\n'
  printf '  - %s\n' "${missing[@]}"
  return 2
}

schema_migration_check() {
  local dir="packages/db/migrations"
  local count=0 bad=0
  if [ ! -d "$dir" ]; then
    echo "missing migrations dir: $dir"
    return 2
  fi
  local f
  for f in "$dir"/*.sql; do
    count=$((count+1))
    if [ ! -s "$f" ]; then
      echo "empty: $f"; bad=$((bad+1))
    fi
    case "$(basename "$f")" in
      [0-9][0-9][0-9][0-9]_*.sql) : ;;
      *) echo "bad-name: $f"; bad=$((bad+1)) ;;
    esac
  done
  if [ "$count" -eq 0 ]; then
    echo "no migrations"
    return 2
  fi
  echo "$count migration(s) checked, $bad bad"
  [ "$bad" -eq 0 ]
}

# Wrapper so composite scans go through run_shell_gate.
run_fn_gate() {
  local id="$1" fn="$2"
  GATE_NAMES+=("$id")
  GATE_KIND[$id]=shell
  GATE_CMD[$id]="$fn"
  printf '▶ gate %s : %s\n' "$id" "$fn"
  local start; start=$(now_ms)
  ( "$fn" ) >"$OUT/$id.stdout.log" 2>"$OUT/$id.stderr.log"
  local rc=$?
  local end; end=$(now_ms)
  GATE_EXIT[$id]=$rc
  GATE_DURATION[$id]=$((end-start))
  if [ "$rc" -eq 0 ]; then GATE_STATUS[$id]=PASS; else GATE_STATUS[$id]=FAIL; fi
  printf '  %s : %s (exit=%d, %dms)\n' "$id" "${GATE_STATUS[$id]}" "$rc" "${GATE_DURATION[$id]}"
}

# ----------------------------------------------------------------------------
# common grep flags
# ----------------------------------------------------------------------------

GREP_BASE=(grep -RInE
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next
  --exclude-dir=dist --exclude-dir=build --exclude-dir=coverage
  --exclude-dir=proof-output --exclude-dir=.pnpm-store
  --exclude=pnpm-lock.yaml
  --exclude=proof-runner.sh
  --exclude=run.mjs
)
CODE_INCLUDES=(
  --include='*.ts' --include='*.tsx'
  --include='*.js' --include='*.jsx' --include='*.mjs' --include='*.cjs'
)
ALL_INCLUDES=(
  "${CODE_INCLUDES[@]}"
  --include='*.json' --include='*.md' --include='*.sql'
  --include='*.yml' --include='*.yaml' --include='*.css'
)

# ----------------------------------------------------------------------------
# gate execution
# ----------------------------------------------------------------------------

# 1) install (frozen)
run_shell_gate install pnpm install --frozen-lockfile

# 2) typecheck
run_shell_gate typecheck pnpm -r run typecheck

# 3) lint
run_shell_gate lint pnpm -r run lint

# 4) test
run_shell_gate test pnpm -r run test

# 5) build
run_shell_gate build pnpm -r run build

# 6) secret scan — high-confidence credential patterns; .env.example is
# explicitly excluded because it has empty placeholders.
run_grep_gate secret_scan \
  "${GREP_BASE[@]}" "${ALL_INCLUDES[@]}" \
  --exclude='*.env.example' \
  -e 'AKIA[0-9A-Z]{16}' \
  -e 'sk-[A-Za-z0-9]{20,}' \
  -e 'sk-ant-[A-Za-z0-9_-]{20,}' \
  -e 'AIza[0-9A-Za-z_-]{35}' \
  -e 'r8_[A-Za-z0-9]{30,}' \
  -e '-----BEGIN (RSA |EC )?PRIVATE KEY-----' \
  .

# 7) provider boundary scan — provider SDKs and provider env keys must NOT
# appear in the web app (apps/web). Server-only provider modules will live in
# packages/<provider> later; this scan stays scoped to apps/web on purpose.
run_grep_gate provider_boundary_scan \
  "${GREP_BASE[@]}" "${CODE_INCLUDES[@]}" \
  -e "from ['\"]openai['\"]" \
  -e "from ['\"]@google-cloud/aiplatform['\"]" \
  -e "from ['\"]replicate['\"]" \
  -e 'process\.env\.OPENAI_API_KEY' \
  -e 'process\.env\.REPLICATE_API_TOKEN' \
  -e 'process\.env\.GOOGLE_APPLICATION_CREDENTIALS' \
  -e 'process\.env\.RUNWAY_API_KEY' \
  -e 'process\.env\.KLING_API_KEY' \
  -e 'process\.env\.FAL_KEY' \
  -e 'NEXT_PUBLIC_[A-Z_]*(API_KEY|SECRET|TOKEN)' \
  apps/web

# 8) TODO scan — runtime code only (the proof-runner.sh and run.mjs files
# legitimately contain pattern strings and are excluded above).
run_grep_gate todo_scan \
  "${GREP_BASE[@]}" "${CODE_INCLUDES[@]}" \
  -e '\b(TODO|FIXME|XXX|HACK|STUB)\b' \
  apps packages

# 9) localStorage scan
run_grep_gate localStorage_scan \
  "${GREP_BASE[@]}" "${CODE_INCLUDES[@]}" \
  -e '\blocalStorage\b' \
  apps/web

# 10) sessionStorage scan
run_grep_gate sessionStorage_scan \
  "${GREP_BASE[@]}" "${CODE_INCLUDES[@]}" \
  -e '\bsessionStorage\b' \
  apps/web

# 11) artifact proof contract scan
run_fn_gate artifact_proof_contract_scan artifact_proof_contract_scan

# 12) schema migration check
run_fn_gate schema_migration_check schema_migration_check

# ----------------------------------------------------------------------------
# summary
# ----------------------------------------------------------------------------

print_table() {
  local id maxId=4
  for id in "${GATE_NAMES[@]}"; do
    [ "${#id}" -gt "$maxId" ] && maxId=${#id}
  done
  local sep_id; sep_id="$(printf -- '-%.0s' $(seq 1 "$maxId"))"
  printf '\n| %-*s | status | exit | duration_ms |\n' "$maxId" "gate"
  printf '| %s | ------ | ---- | ----------- |\n' "$sep_id"
  for id in "${GATE_NAMES[@]}"; do
    printf '| %-*s | %-6s | %-4s | %-11s |\n' \
      "$maxId" "$id" "${GATE_STATUS[$id]}" "${GATE_EXIT[$id]}" "${GATE_DURATION[$id]}"
  done
}

write_summary() {
  local id
  {
    printf '{\n  "generatedAt": "%s",\n' "$(date -u +%FT%TZ)"
    printf '  "results": [\n'
    local first=1
    for id in "${GATE_NAMES[@]}"; do
      [ "$first" -eq 1 ] && first=0 || printf ',\n'
      printf '    { "id": "%s", "kind": "%s", "status": "%s", "exit": %d, "duration_ms": %d, "stdout": "proof-output/%s.stdout.log", "stderr": "proof-output/%s.stderr.log" }' \
        "$id" "${GATE_KIND[$id]}" "${GATE_STATUS[$id]}" \
        "${GATE_EXIT[$id]}" "${GATE_DURATION[$id]}" "$id" "$id"
    done
    printf '\n  ]\n}\n'
  } > "$OUT/summary.json"

  {
    printf '# Proof Runner Summary\n\n'
    printf 'Generated: %s\n\n' "$(date -u +%FT%TZ)"
    print_table
    printf '\n'
  } > "$OUT/summary.md"
}

print_table
write_summary

fail=0
for id in "${GATE_NAMES[@]}"; do
  if [ "${GATE_STATUS[$id]}" != PASS ]; then fail=1; fi
done

if [ "$fail" -eq 0 ]; then
  printf '\noverall: PASS\n'
  exit 0
else
  printf '\noverall: FAIL\n'
  exit 1
fi
