#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# smoke-test.sh — Post-deployment smoke test for Texas Votes
#
# Usage:
#   bash docs/scripts/smoke-test.sh https://txvotes.app
#   bash docs/scripts/smoke-test.sh https://atxvotes.app
#   bash docs/scripts/smoke-test.sh http://localhost:8787
#
# Checks every public GET route for:
#   - HTTP 200 status
#   - Absence of common error strings (Error 1101, Error 1015, etc.)
#
# Exit code: 0 if all pass, 1 if any fail
# ---------------------------------------------------------------------------

set -euo pipefail

BASE_URL="${1:-https://txvotes.app}"
# Strip trailing slash
BASE_URL="${BASE_URL%/}"

PASS=0
FAIL=0
TOTAL=0
FAILURES=""

# Colors (disable if not a terminal)
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  GREEN=''
  RED=''
  YELLOW=''
  BOLD=''
  NC=''
fi

# ---------------------------------------------------------------------------
# check_page <path> <description> [expected_content_type]
# ---------------------------------------------------------------------------
check_page() {
  local path="$1"
  local desc="$2"
  local expected_ct="${3:-text/html}"
  local url="${BASE_URL}${path}"
  TOTAL=$((TOTAL + 1))

  # Fetch with curl: capture HTTP status, headers, and body
  local tmpfile
  tmpfile=$(mktemp)
  local http_code
  http_code=$(curl -s -o "$tmpfile" -w "%{http_code}" \
    -H "User-Agent: TXVotes-SmokeTest/1.0" \
    --max-time 15 \
    "$url" 2>/dev/null) || http_code="000"

  local body
  body=$(cat "$tmpfile" 2>/dev/null || true)
  rm -f "$tmpfile"

  # Check HTTP status
  if [ "$http_code" != "200" ]; then
    FAIL=$((FAIL + 1))
    FAILURES="${FAILURES}\n  ${RED}FAIL${NC} ${path} — HTTP ${http_code} (expected 200) [${desc}]"
    printf "  ${RED}FAIL${NC} %-35s HTTP %s  %s\n" "$path" "$http_code" "$desc"
    return
  fi

  # Check for common Cloudflare/Worker error strings
  local error_found=""
  for pattern in "Error 1101" "Error 1015" "Error 1016" "Error 1020" \
                 "Internal Server Error" "Error 500" "Worker threw exception" \
                 "could not be found" "Error 404"; do
    if echo "$body" | grep -qi "$pattern" 2>/dev/null; then
      error_found="$pattern"
      break
    fi
  done

  if [ -n "$error_found" ]; then
    FAIL=$((FAIL + 1))
    FAILURES="${FAILURES}\n  ${RED}FAIL${NC} ${path} — Contains '${error_found}' [${desc}]"
    printf "  ${RED}FAIL${NC} %-35s Error: '%s'  %s\n" "$path" "$error_found" "$desc"
    return
  fi

  # Check body is not empty
  if [ ${#body} -lt 10 ]; then
    FAIL=$((FAIL + 1))
    FAILURES="${FAILURES}\n  ${RED}FAIL${NC} ${path} — Response body too small (${#body} bytes) [${desc}]"
    printf "  ${RED}FAIL${NC} %-35s Empty response (%d bytes)  %s\n" "$path" "${#body}" "$desc"
    return
  fi

  PASS=$((PASS + 1))
  printf "  ${GREEN}OK${NC}   %-35s HTTP %s  %s\n" "$path" "$http_code" "$desc"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}Texas Votes Smoke Test${NC}"
echo -e "Target: ${YELLOW}${BASE_URL}${NC}"
echo -e "Time:   $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""
echo -e "${BOLD}HTML Pages${NC}"

check_page "/"              "Landing page"
check_page "/app"           "PWA app shell"
check_page "/privacy"       "Privacy policy"
check_page "/nonpartisan"   "Nonpartisan pledge"
check_page "/how-it-works"  "How It Works"
check_page "/data-quality"  "Data Quality"
check_page "/audit"         "Audit page"
check_page "/candidates"    "Candidates index"
check_page "/open-source"   "Open Source"
check_page "/sample"        "Sample ballot"
check_page "/support"       "Support page"

echo ""
echo -e "${BOLD}PWA Assets${NC}"

check_page "/app/clear"         "Clear cache page"
check_page "/app/sw.js"         "Service worker JS"      "javascript"
check_page "/app/manifest.json" "PWA manifest"           "application/json"

echo ""
echo -e "${BOLD}Vanity Entry Points${NC}"

check_page "/cowboy"   "Cowboy tone entry"
check_page "/chef"     "Swedish Chef tone entry"
check_page "/gemini"   "Gemini LLM entry"
check_page "/grok"     "Grok LLM entry"
check_page "/chatgpt"  "ChatGPT LLM entry"

echo ""
echo -e "${BOLD}API Endpoints${NC}"

check_page "/health"                  "Health check JSON"       "application/json"

check_page "/api/audit/export"        "Audit export JSON"       "application/json"
check_page "/api/audit/results"       "Audit results JSON"      "application/json"
check_page "/api/balance-check"       "Balance check JSON"      "application/json"
check_page "/api/election/manifest"   "Election manifest JSON"  "application/json"
check_page "/app/api/ballot?party=democrat"    "Democrat ballot API"     "application/json"
check_page "/app/api/ballot?party=republican"  "Republican ballot API"   "application/json"
check_page "/app/api/manifest"        "App manifest API"        "application/json"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "─────────────────────────────────────────────────"

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}ALL PASS${NC}: ${PASS}/${TOTAL} pages OK"
else
  echo -e "${RED}${BOLD}FAILURES${NC}: ${FAIL}/${TOTAL} pages failed"
  echo -e "\nFailed routes:${FAILURES}"
fi

echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
