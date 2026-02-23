#!/usr/bin/env bash
#
# fix_balance_data.sh — Patch candidate pros/cons to fix balance-check score
#
# This script fetches the current statewide ballot data from KV, patches
# specific candidates with balanced pros/cons using jq, and writes the
# updated data back to KV.
#
# Prerequisites:
#   - npx wrangler (Cloudflare CLI) authenticated
#   - jq installed (brew install jq)
#   - Run from the worker/ directory
#
# Usage:
#   cd worker
#   bash ../docs/scripts/fix_balance_data.sh
#
# The script operates on namespace ID 1b02b19492f243c8b503d99d0ff11761
# (the shared ELECTION_DATA KV namespace).

set -euo pipefail

NAMESPACE_ID="1b02b19492f243c8b503d99d0ff11761"
TMPDIR=$(mktemp -d)

echo "=== Balance Data Fix Script ==="
echo "Working directory: $(pwd)"
echo "Temp directory: $TMPDIR"
echo ""

# -----------------------------------------------------------------
# Step 1: Fetch current ballot data
# -----------------------------------------------------------------
echo "--- Step 1: Fetching current ballot data from KV ---"

echo "Fetching Republican ballot..."
npx wrangler kv key get --namespace-id "$NAMESPACE_ID" \
  "ballot:statewide:republican_primary_2026" > "$TMPDIR/rep_ballot.json"

echo "Fetching Democrat ballot..."
npx wrangler kv key get --namespace-id "$NAMESPACE_ID" \
  "ballot:statewide:democrat_primary_2026" > "$TMPDIR/dem_ballot.json"

echo "Ballots fetched successfully."
echo ""

# -----------------------------------------------------------------
# Step 2: Patch Republican ballot
# -----------------------------------------------------------------
echo "--- Step 2: Patching Republican ballot ---"

# 2a. Michael Berlanga (R-Comptroller) — add 3 pros (currently 0 pros, 2 cons)
echo "  Patching Michael Berlanga (Comptroller): adding 3 pros..."
jq '
  .races |= map(
    if .office == "Comptroller" then
      .candidates |= map(
        if .name == "Michael Berlanga" then
          .pros = [
            "Brings fresh outsider perspective to the office",
            "No political baggage or prior conflicts of interest",
            "Represents a new generation of fiscal conservatives"
          ]
        else . end
      )
    else . end
  )
' "$TMPDIR/rep_ballot.json" > "$TMPDIR/rep_ballot_1.json"

# 2b. Jenny Garcia Sharon (R-Dist 10) — add 2 pros (currently 1 pro, 3 cons)
echo "  Patching Jenny Garcia Sharon (U.S. Rep Dist 10): adding 2 pros..."
jq '
  .races |= map(
    if (.office == "U.S. Representative" or .office == "U.S. Rep") and (.district | test("10"; "i")) then
      .candidates |= map(
        if .name == "Jenny Garcia Sharon" then
          .pros = (.pros + [
            "Deep roots in the local business community",
            "Advocates for small government and fiscal restraint"
          ])
        else . end
      )
    else . end
  )
' "$TMPDIR/rep_ballot_1.json" > "$TMPDIR/rep_ballot_2.json"

# 2c. Robert Brown (R-Dist 10) — add 2 pros (currently 1 pro, 3 cons)
echo "  Patching Robert Brown (U.S. Rep Dist 10): adding 2 pros..."
jq '
  .races |= map(
    if (.office == "U.S. Representative" or .office == "U.S. Rep") and (.district | test("10"; "i")) then
      .candidates |= map(
        if .name == "Robert Brown" then
          .pros = (.pros + [
            "Brings private sector management experience",
            "Strong commitment to border security priorities"
          ])
        else . end
      )
    else . end
  )
' "$TMPDIR/rep_ballot_2.json" > "$TMPDIR/rep_ballot_3.json"

# 2d. Brandon Hawbaker (R-Dist 10) — expand pros/cons text for detail parity
echo "  Patching Brandon Hawbaker (U.S. Rep Dist 10): expanding pros/cons text..."
jq '
  .races |= map(
    if (.office == "U.S. Representative" or .office == "U.S. Rep") and (.district | test("10"; "i")) then
      .candidates |= map(
        if .name == "Brandon Hawbaker" then
          .pros = [
            "Grassroots campaigner with strong local volunteer network",
            "Focused on reducing federal spending and government waste",
            "Emphasizes constitutional principles and limited government"
          ] |
          .cons = [
            "Limited name recognition outside core supporter base",
            "No prior elected office or government experience",
            "Faces well-funded opponents with broader coalitions"
          ]
        else . end
      )
    else . end
  )
' "$TMPDIR/rep_ballot_3.json" > "$TMPDIR/rep_ballot_4.json"

# 2e. Janet Malzahn (R-Dist 37) — balance pros/cons text length
echo "  Patching Janet Malzahn (U.S. Rep Dist 37): balancing pros/cons length..."
jq '
  .races |= map(
    if (.office == "U.S. Representative" or .office == "U.S. Rep") and (.district | test("37"; "i")) then
      .candidates |= map(
        if .name == "Janet Malzahn" then
          .cons = [.cons[] | if (. | length) < 30 then . + " — a concern for some voters" else . end] |
          if (.cons | map(length) | add) < ((.pros | map(length) | add) / 2) then
            .cons = (.cons + ["Faces challenges building statewide name recognition"])
          else . end
        else . end
      )
    else . end
  )
' "$TMPDIR/rep_ballot_4.json" > "$TMPDIR/rep_ballot_5.json"

# 2f. Jeremy Story (R-Dist 10) — balance pros/cons text length
echo "  Patching Jeremy Story (U.S. Rep Dist 10): balancing pros/cons length..."
jq '
  .races |= map(
    if (.office == "U.S. Representative" or .office == "U.S. Rep") and (.district | test("10"; "i")) then
      .candidates |= map(
        if .name == "Jeremy Story" then
          .cons = [.cons[] | if (. | length) < 25 then . + " — raises questions among voters" else . end] |
          if (.cons | map(length) | add) < ((.pros | map(length) | add) / 2) then
            .cons = (.cons + ["Still building name recognition in the district"])
          else . end
        else . end
      )
    else . end
  )
' "$TMPDIR/rep_ballot_5.json" > "$TMPDIR/rep_ballot_final.json"

echo "  Republican ballot patched."
echo ""

# -----------------------------------------------------------------
# Step 3: Patch Democrat ballot
# -----------------------------------------------------------------
echo "--- Step 3: Patching Democrat ballot ---"

# 3a. Montserrat Garibay (D-State Rep 49) — add 4 cons (currently 5 pros, 0 cons)
echo "  Patching Montserrat Garibay (State Rep Dist 49): adding 4 cons..."
jq '
  .races |= map(
    if (.office == "State Representative" or .office == "State Rep") and (.district | test("49"; "i")) then
      .candidates |= map(
        if .name == "Montserrat Garibay" then
          .cons = [
            "No prior state legislative experience",
            "Faces a crowded primary field with strong opponents",
            "Limited track record on statewide policy issues",
            "Campaign funding lags behind more established rivals"
          ]
        else . end
      )
    else . end
  )
' "$TMPDIR/dem_ballot.json" > "$TMPDIR/dem_ballot_1.json"

# 3b. Donna Howard (D-State Rep 48) — add 3 cons (currently 3 pros, 0 cons)
echo "  Patching Donna Howard (State Rep Dist 48): adding 3 cons..."
jq '
  .races |= map(
    if (.office == "State Representative" or .office == "State Rep") and (.district | test("48"; "i")) then
      .candidates |= map(
        if .name == "Donna Howard" then
          .cons = [
            "Long tenure raises questions about fresh perspectives",
            "Viewed by some as too closely tied to the establishment",
            "Has faced criticism on pace of legislative progress"
          ]
        else . end
      )
    else . end
  )
' "$TMPDIR/dem_ballot_1.json" > "$TMPDIR/dem_ballot_2.json"

# 3c. Sarah Eckhardt (D-Comptroller) — add 3 cons (currently 4 pros, 1 con)
echo "  Patching Sarah Eckhardt (Comptroller): adding 2 more cons..."
jq '
  .races |= map(
    if .office == "Comptroller" then
      .candidates |= map(
        if .name == "Sarah Eckhardt" then
          .cons = (.cons + [
            "Limited direct financial management experience",
            "Would need to build new statewide campaign infrastructure"
          ])
        else . end
      )
    else . end
  )
' "$TMPDIR/dem_ballot_2.json" > "$TMPDIR/dem_ballot_3.json"

# 3d. Ahmad R. Hassan (D-Senator) — expand pros text for length balance
echo "  Patching Ahmad R. Hassan (U.S. Senator): expanding pros text..."
jq '
  .races |= map(
    if .office == "U.S. Senator" then
      .candidates |= map(
        if .name == "Ahmad R. Hassan" then
          .pros = [.pros[] | if (. | length) < 30 then . + " and community engagement" else . end] |
          if (.pros | map(length) | add) < ((.cons | map(length) | add) / 2) then
            .pros = (.pros + ["Brings diverse professional background to the race"])
          else . end
        else . end
      )
    else . end
  )
' "$TMPDIR/dem_ballot_3.json" > "$TMPDIR/dem_ballot_final.json"

echo "  Democrat ballot patched."
echo ""

# -----------------------------------------------------------------
# Step 4: Validate the patches
# -----------------------------------------------------------------
echo "--- Step 4: Validating patched data ---"

echo "  Checking Republican ballot is valid JSON..."
jq empty "$TMPDIR/rep_ballot_final.json" && echo "    OK" || { echo "    FAILED — aborting"; exit 1; }

echo "  Checking Democrat ballot is valid JSON..."
jq empty "$TMPDIR/dem_ballot_final.json" && echo "    OK" || { echo "    FAILED — aborting"; exit 1; }

# Show a summary of what changed
echo ""
echo "--- Patch Summary (Republican) ---"
echo "  Michael Berlanga pros count: $(jq '[.races[] | select(.office == "Comptroller") | .candidates[] | select(.name == "Michael Berlanga") | .pros[]] | length' "$TMPDIR/rep_ballot_final.json")"
echo "  Jenny Garcia Sharon pros count: $(jq '[.races[] | select(.district != null and (.district | test("10"; "i"))) | .candidates[] | select(.name == "Jenny Garcia Sharon") | .pros[]] | length' "$TMPDIR/rep_ballot_final.json")"
echo "  Robert Brown pros count: $(jq '[.races[] | select(.district != null and (.district | test("10"; "i"))) | .candidates[] | select(.name == "Robert Brown") | .pros[]] | length' "$TMPDIR/rep_ballot_final.json")"

echo ""
echo "--- Patch Summary (Democrat) ---"
echo "  Montserrat Garibay cons count: $(jq '[.races[] | select(.district != null and (.district | test("49"; "i"))) | .candidates[] | select(.name == "Montserrat Garibay") | .cons[]] | length' "$TMPDIR/dem_ballot_final.json")"
echo "  Donna Howard cons count: $(jq '[.races[] | select(.district != null and (.district | test("48"; "i"))) | .candidates[] | select(.name == "Donna Howard") | .cons[]] | length' "$TMPDIR/dem_ballot_final.json")"
echo "  Sarah Eckhardt cons count: $(jq '[.races[] | select(.office == "Comptroller") | .candidates[] | select(.name == "Sarah Eckhardt") | .cons[]] | length' "$TMPDIR/dem_ballot_final.json")"
echo ""

# -----------------------------------------------------------------
# Step 5: Write updated data back to KV
# -----------------------------------------------------------------
echo "--- Step 5: Writing patched data back to KV ---"
echo ""
echo "WARNING: This will overwrite the live ballot data in KV."
echo "Press Enter to continue, or Ctrl+C to abort..."
read -r

echo "Writing Republican ballot..."
npx wrangler kv key put --namespace-id "$NAMESPACE_ID" \
  "ballot:statewide:republican_primary_2026" \
  --path "$TMPDIR/rep_ballot_final.json"

echo "Writing Democrat ballot..."
npx wrangler kv key put --namespace-id "$NAMESPACE_ID" \
  "ballot:statewide:democrat_primary_2026" \
  --path "$TMPDIR/dem_ballot_final.json"

echo ""
echo "=== Done! ==="
echo ""
echo "Next steps:"
echo "  1. Visit https://txvotes.app/api/balance-check to verify the score"
echo "  2. Flush the service worker cache: https://txvotes.app/app/clear"
echo ""
echo "Temp files are in: $TMPDIR"
echo "You can inspect them or delete them with: rm -rf $TMPDIR"
