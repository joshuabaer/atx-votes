# Empty County Ballot Investigation

**Date:** 2026-02-23
**Issue:** Several counties show 0 races for both parties in KV data
**Counties investigated:** Randall (48381), Smith (48423), Archer (48009), Austin (48015)

## Summary

**All four counties have contested county-level primary races and should NOT have 0 races.** The seeder appears to have failed silently for these counties -- Claude's web_search likely returned empty results or the prompt returned `{"races": [], "propositions": []}` per the fallback instruction in the seeder prompt. All four counties need re-seeding.

---

## County-by-County Findings

### Randall County (48381) -- NEEDS RE-SEED

**Contested Republican Primary Races (per Ballotpedia):**
- **County Clerk** -- Marie McNutt vs. Gigi Yeats (2 candidates)

**Uncontested races also on the Republican ballot:**
- County Commissioner Pct 2, County Commissioner Pct 4
- Criminal District Attorney, District Clerk
- County Judge, County Treasurer
- Justice of the Peace Pcts 1, 2, 3, 4

**Democratic Primary:** No Democratic candidates filed for county-level offices (legitimately empty).

**Verdict:** Republican ballot should have at least 1 contested race (County Clerk) plus multiple uncontested races. Democratic ballot is legitimately empty. **Re-seed Republican.**

**Sources:**
- https://ballotpedia.org/Randall_County,_Texas,_elections,_2026
- https://www.randallcounty.gov/170/Sample-Ballot

---

### Smith County (48423) -- NEEDS RE-SEED

**Contested Republican Primary Races (per Ballotpedia + Tyler Morning Telegraph):**
- **District Clerk** -- Gaye Boynton vs. Penny Clarkston (2 candidates)
- **Commissioner Precinct 2** -- Austin Luce vs. Catherine Roots (2 candidates)
- **Justice of the Peace Pct 2** -- Andy Dunklin vs. Shawn Scott (2 candidates)
- **Justice of the Peace Pct 3** -- Rod Langlinais vs. Tim McDonald vs. Kyle S. Stowers (3 candidates)
- **Justice of the Peace Pct 4** -- Sam Griffith vs. Curtis Wulf (2 candidates)

**Contested Democratic Primary Races:**
- **Commissioner Precinct 1** -- Derrick Choice vs. Dalila Reynoso (2 candidates)
- Possibly 2 additional contested Democratic races (per CBS19 reporting)

**Verdict:** Both parties have contested races. This is the most data-rich of the four counties. **Re-seed both Republican and Democrat.**

**Sources:**
- https://ballotpedia.org/Smith_County,_Texas,_elections,_2026
- https://tylerpaper.com/2026/02/17/early-voting-begins-tuesday-heres-what-is-on-the-smith-county-ballot-for-republican-democratic-primaries/
- https://www.cbs19.tv/article/news/local/list-whos-running-republican-democrat-primaries-in-east-texas/501-39210d78-c196-40ea-8e88-bf4ae6e727bf

---

### Archer County (48009) -- NEEDS RE-SEED

**Contested Republican Primary Races (per Ballotpedia):**
- **County Judge** -- Levi Buerger vs. Cory Glassburn vs. Randy Jackson (3 candidates)
- **Commissioner Precinct 2** -- Justin Coleman vs. Kurt James Wolf (2 candidates)
- **Justice of the Peace Pct 2** -- Tony McDonald vs. Kyle Morris (2 candidates)

**Uncontested races also on the Republican ballot:**
- County Clerk (Kristi Malone)
- Commissioner Precinct 4 (Todd Herring)
- Constable Pct 1 Special (Greg Anderson)
- Constable Pct 3 Special (Dennis Hahn)
- District Clerk (Lori Rutledge)
- JP Pct 1 (R. Joe Aulds), JP Pct 3 (Robert Shawver), JP Pct 4 (Missy Hoegger)
- County Treasurer (Patricia Vieth)

**Democratic Primary:** No Democratic candidates appear to have filed (legitimately empty).

**Verdict:** Republican ballot should have 3 contested races plus numerous uncontested. Very small, rural county (pop ~8,500) so no Democratic primary is expected. **Re-seed Republican.**

**Sources:**
- https://ballotpedia.org/Archer_County,_Texas,_elections,_2026
- https://www.co.archer.tx.us/page/archer.elections

---

### Austin County (48015) -- NEEDS RE-SEED

**Contested Republican Primary Races (per Ballotpedia):**
- **Justice of the Peace Pct 3** -- Connie Drake vs. Jeffrey Grobe (2 candidates)
- **Justice of the Peace Pct 4** -- Bernice Burger vs. Joseph Smith (2 candidates)

**Uncontested races also on the Republican ballot:**
- County Clerk, County Commissioner Pcts 2 and 4
- Criminal District Attorney, District Clerk
- County Judge, County Treasurer
- JP Pcts 1 and 2

**Democratic Primary:** No Democratic candidates appear to have filed (legitimately empty).

**Verdict:** Republican ballot should have 2 contested races plus multiple uncontested. **Re-seed Republican.**

**Sources:**
- https://ballotpedia.org/Austin_County,_Texas,_elections,_2026
- https://www.austincounty.com/page/austin.elections

---

## Root Cause Analysis

Looking at the county seeder code (`worker/src/county-seeder.js`), the seeder prompt explicitly includes this fallback:

```
If you cannot find any local races for this county/party, return {"races": [], "propositions": []}
```

This means if Claude's `web_search` tool (limited to 10 searches) fails to find county-level race data -- perhaps due to rate limits, poor search results for smaller counties, or the 10-search cap being exhausted on broader queries -- it will return an empty ballot that gets written to KV as valid data. There is no distinction between "legitimately no races" and "search failed to find races."

**Potential contributing factors:**
1. **Search cap exhaustion** -- The 10-search limit may not be enough for smaller counties where data is harder to find.
2. **Search quality** -- Smaller/rural counties (Archer, Austin County) have less online presence, so web_search may return irrelevant results.
3. **No validation** -- The seeder accepts `{"races": []}` without flagging it as suspicious. For counties in the top-30 list, an empty Republican ballot should be treated as a warning.
4. **Silent write** -- Empty results are written to KV without any logging or alert that distinguishes them from counties with actual data.

## Recommendations

### Immediate: Re-seed these counties

```bash
# Re-seed all four counties (Republican ballots)
# Archer County
curl -X POST https://txvotes.app/api/election/seed-county \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"countyFips":"48009","countyName":"Archer","party":"republican"}'

# Austin County
curl -X POST https://txvotes.app/api/election/seed-county \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"countyFips":"48015","countyName":"Austin","party":"republican"}'

# Randall County
curl -X POST https://txvotes.app/api/election/seed-county \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"countyFips":"48381","countyName":"Randall","party":"republican"}'

# Smith County (both parties)
curl -X POST https://txvotes.app/api/election/seed-county \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"countyFips":"48423","countyName":"Smith","party":"republican"}'

curl -X POST https://txvotes.app/api/election/seed-county \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"countyFips":"48423","countyName":"Smith","party":"democrat"}'
```

### Future: Add empty-ballot validation

Consider adding a warning/retry mechanism in `seedCountyBallot()` when `result.races.length === 0` for Republican ballots in the top-30 counties. Most Texas counties have at least a few Republican primary races since 2+ offices are up every cycle (commissioners, JPs, etc.). An empty Republican ballot in a top-30 county is almost certainly a search failure.
