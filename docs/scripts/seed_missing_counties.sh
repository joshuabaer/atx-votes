#!/bin/bash
#
# seed_missing_counties.sh — Seed county ballots for FIPS 48445-48507
# (counties after Terrell County where the previous seeder stopped)
#
# Uses the deployed txvotes.app seed-county API endpoint.
# Each call seeds: county info + republican ballot + democrat ballot + precinct map
#
# Usage:
#   ./seed_missing_counties.sh
#
# To resume from a specific county, set START_FROM:
#   START_FROM=48467 ./seed_missing_counties.sh
#

ADMIN_SECRET="txvotes-admin-2026"
API_URL="https://txvotes.app/api/election/seed-county"
DELAY=10  # seconds between counties to avoid rate limiting
TIMEOUT=300  # 5 minute timeout per county (Claude needs time for web_search)
LOG_FILE="/tmp/seed_missing_counties.log"
START_FROM="${START_FROM:-0}"

# Counties in FIPS 48445-48507 range (Terrell County was 48443, the last one seeded)
declare -A COUNTIES
COUNTIES[48445]="Terry"
COUNTIES[48447]="Throckmorton"
COUNTIES[48449]="Titus"
COUNTIES[48451]="Tom Green"
COUNTIES[48453]="Travis"
COUNTIES[48455]="Trinity"
COUNTIES[48457]="Tyler"
COUNTIES[48459]="Upshur"
COUNTIES[48461]="Upton"
COUNTIES[48463]="Uvalde"
COUNTIES[48465]="Val Verde"
COUNTIES[48467]="Van Zandt"
COUNTIES[48469]="Victoria"
COUNTIES[48471]="Walker"
COUNTIES[48473]="Waller"
COUNTIES[48475]="Ward"
COUNTIES[48477]="Washington"
COUNTIES[48479]="Webb"
COUNTIES[48481]="Wharton"
COUNTIES[48483]="Wheeler"
COUNTIES[48485]="Wichita"
COUNTIES[48487]="Wilbarger"
COUNTIES[48489]="Willacy"
COUNTIES[48491]="Williamson"
COUNTIES[48493]="Wilson"
COUNTIES[48495]="Winkler"
COUNTIES[48497]="Wise"
COUNTIES[48499]="Wood"
COUNTIES[48501]="Yoakum"
COUNTIES[48503]="Young"
COUNTIES[48505]="Zapata"
COUNTIES[48507]="Zavala"

# Sorted FIPS list
FIPS_LIST=(48445 48447 48449 48451 48453 48455 48457 48459 48461 48463 48465 48467 48469 48471 48473 48475 48477 48479 48481 48483 48485 48487 48489 48491 48493 48495 48497 48499 48501 48503 48505 48507)

echo "=== Seeding Missing Counties (FIPS 48445-48507) ==="
echo "API: $API_URL"
echo "Log: $LOG_FILE"
echo "Start from: ${START_FROM:-beginning}"
echo "Total counties: ${#FIPS_LIST[@]}"
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

for FIPS in "${FIPS_LIST[@]}"; do
    NAME="${COUNTIES[$FIPS]}"

    # Skip if START_FROM is set and we haven't reached it yet
    if [ "$START_FROM" -gt 0 ] && [ "$FIPS" -lt "$START_FROM" ]; then
        echo "[SKIP] $NAME County ($FIPS) — before START_FROM=$START_FROM"
        SKIP_COUNT=$((SKIP_COUNT + 1))
        continue
    fi

    echo ""
    echo "--- $NAME County ($FIPS) ---"
    echo "[$(date '+%H:%M:%S')] Seeding..."

    RESPONSE=$(curl -s -X POST "$API_URL" \
        -H "Authorization: Bearer $ADMIN_SECRET" \
        -H "Content-Type: application/json" \
        -d "{\"countyFips\":\"$FIPS\",\"countyName\":\"$NAME\"}" \
        --max-time $TIMEOUT 2>&1)

    EXIT_CODE=$?

    if [ $EXIT_CODE -ne 0 ]; then
        echo "[FAIL] curl error (exit $EXIT_CODE) for $NAME County ($FIPS)"
        echo "$(date -Iseconds) FAIL $FIPS $NAME curl_error_$EXIT_CODE" >> "$LOG_FILE"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    elif echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); steps=d.get('steps',{}); errs=[k for k,v in steps.items() if isinstance(v,dict) and 'error' in v]; sys.exit(1 if len(errs) == len(steps) else 0)" 2>/dev/null; then
        # Extract race counts
        REP_RACES=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('steps',{}).get('republican',{}).get('raceCount','?'))" 2>/dev/null)
        DEM_RACES=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('steps',{}).get('democrat',{}).get('raceCount','?'))" 2>/dev/null)
        echo "[OK] $NAME County: R=$REP_RACES races, D=$DEM_RACES races"
        echo "$(date -Iseconds) OK $FIPS $NAME R=$REP_RACES D=$DEM_RACES" >> "$LOG_FILE"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "[PARTIAL] $NAME County ($FIPS) — some steps had errors"
        echo "Response: $RESPONSE"
        echo "$(date -Iseconds) PARTIAL $FIPS $NAME $RESPONSE" >> "$LOG_FILE"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))  # Count partial as success
    fi

    echo "[$(date '+%H:%M:%S')] Waiting ${DELAY}s before next county..."
    sleep $DELAY
done

echo ""
echo "=== COMPLETE ==="
echo "Success: $SUCCESS_COUNT"
echo "Failed: $FAIL_COUNT"
echo "Skipped: $SKIP_COUNT"
echo "Log: $LOG_FILE"
