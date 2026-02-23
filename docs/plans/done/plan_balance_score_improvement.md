# Balance Score Improvement Plan: 63 -> 85+

## Current State

**Combined Score: 63/100** (Republican 62, Democrat 64)

The balance checker in `worker/src/balance-check.js` scores symmetry of pros/cons data across all candidates and races. It applies per-candidate checks (missing pros/cons, count ratios, text length ratios) and cross-candidate checks within each race (detail disparity, coverage gaps, count spread).

### Scoring Formula

Deductions from a perfect 100:
- Critical flag: -10 points each
- Warning flag: -5 points each
- Info flag: -2 points each

### Current Flag Inventory

**Republican ballot (62/100) -- 9 flags:**

| # | Race | Flag Type | Severity | Detail |
|---|------|-----------|----------|--------|
| 1 | Comptroller | `missing_pros` | CRITICAL | Michael Berlanga: Has 2 cons but no pros |
| 2 | Comptroller | `cross_candidate_detail` | WARNING | Don Huffines has 915 chars vs Michael Berlanga with 51 chars (17.9x difference) |
| 3 | U.S. Rep Dist 10 | `cross_candidate_detail` | WARNING | Chris Gober has 360 chars vs Brandon Hawbaker with 108 chars (3.3x difference) |
| 4 | U.S. Rep Dist 10 | `count_imbalance` | WARNING | Jenny Garcia Sharon: 1 pros vs 3 cons (3.0:1 ratio) |
| 5 | U.S. Rep Dist 10 | `count_imbalance` | WARNING | Robert Brown: 1 pros vs 3 cons (3.0:1 ratio) |
| 6 | U.S. Rep Dist 10 | `cross_candidate_pros_count` | INFO | Pros count ranges from 1 to 4 across candidates |
| 7 | U.S. Rep Dist 37 | `length_imbalance` | INFO | Janet Malzahn: Total pros text is 2.1x longer (293 vs 137 chars) |
| 8 | U.S. Rep Dist 10 | `length_imbalance` | INFO | Jeremy Story: Total pros text is 2.1x longer (130 vs 62 chars) |
| 9 | U.S. Rep Dist 10 | `length_imbalance` | INFO | Robert Brown: Total cons text is 2.7x longer (30 vs 81 chars) |

Republican deduction: 1 critical (10) + 4 warning (20) + 4 info (8) = 38 points

**Democrat ballot (64/100) -- 7 flags:**

| # | Race | Flag Type | Severity | Detail |
|---|------|-----------|----------|--------|
| 1 | State Rep Dist 49 | `missing_cons` | CRITICAL | Montserrat Garibay: Has 5 pros but no cons |
| 2 | State Rep Dist 48 | `missing_cons` | CRITICAL | Donna Howard: Has 3 pros but no cons |
| 3 | Comptroller | `cross_candidate_detail` | WARNING | Savant Moore has 465 chars vs Sarah Eckhardt with 121 chars (3.8x difference) |
| 4 | Comptroller | `count_imbalance` | WARNING | Sarah Eckhardt: 4 pros vs 1 cons (4.0:1 ratio) |
| 5 | U.S. Senator | `length_imbalance` | INFO | Ahmad R. Hassan: Total cons text is 3.6x longer (54 vs 194 chars) |
| 6 | Comptroller | `length_imbalance` | INFO | Sarah Eckhardt: Total pros text is 4.8x longer (100 vs 21 chars) |
| 7 | Comptroller | `cross_candidate_cons_count` | INFO | Cons count ranges from 1 to 4 across candidates |

Democrat deduction: 2 critical (20) + 2 warning (10) + 3 info (6) = 36 points

---

## Root Cause Analysis

### 1. Missing pros/cons (3 critical flags, -30 points)

Three candidates have completely missing pros or cons:

- **Michael Berlanga (R-Comptroller)**: Has 2 cons but 0 pros. This is a lesser-known candidate with minimal campaign presence. The AI seeder/updater found criticisms but no strengths, likely because there is very little positive information available online.
- **Montserrat Garibay (D-State Rep 49)**: Has 5 pros but 0 cons. The opposite problem -- the AI found plenty of strengths (school board experience, union backing, endorsements, fundraising) but generated no concerns. The data was likely seeded without cons and the updater has not corrected it.
- **Donna Howard (D-State Rep 48)**: Has 3 pros but 0 cons. She is a longtime incumbent running in what appears to be an uncontested Democratic primary for this seat, so the AI may have treated her as "safe" and skipped cons.

**Root cause**: The AI prompts in both `county-seeder.js` and `updater.js` do not enforce a minimum count for both pros AND cons. The seeder example shows `"pros": ["Strength 1"], "cons": ["Concern 1"]` but does not instruct the AI that both are mandatory. The `validateRaceUpdate()` function in `updater.js` does not check for empty pros or cons arrays.

### 2. Count imbalance within candidates (3 warning flags, -15 points)

Three candidates have pros:cons ratios exceeding 2:1:

- **Jenny Garcia Sharon (R-Dist 10)**: 1 pro vs 3 cons
- **Robert Brown (R-Dist 10)**: 1 pro vs 3 cons
- **Sarah Eckhardt (D-Comptroller)**: 4 pros vs 1 con

**Root cause**: These are candidates where the AI found significantly more information on one side. For lesser-known candidates (Sharon, Brown), the AI found more criticisms than strengths. For Eckhardt, the opposite -- a well-known Austin politician with plenty of positive coverage but only a brief con ("Would have to give up her Senate job"). The AI prompts do not instruct equal count treatment.

### 3. Cross-candidate detail disparity (3 warning flags, -15 points)

Three races have extreme text length differences between candidates:

- **R-Comptroller**: Don Huffines (915 chars) vs Michael Berlanga (51 chars) -- 17.9x. Huffines is a well-known figure with extensive coverage; Berlanga is virtually unknown.
- **R-Dist 10**: Chris Gober (360 chars) vs Brandon Hawbaker (108 chars) -- 3.3x. Similar pattern of well-covered vs obscure candidates.
- **D-Comptroller**: Savant Moore (465 chars) vs Sarah Eckhardt (121 chars) -- 3.8x. Ironically, Eckhardt is the better-known candidate but has much shorter pros/cons text because her cons are sparse.

**Root cause**: The AI naturally generates more detailed analysis for candidates with more available information online. There is no post-processing step that normalizes text length across candidates within a race. Also, when a candidate like Eckhardt has a count imbalance (4 pros, 1 con), this compounds into a detail disparity flag for the whole race.

### 4. Length imbalance within candidates (4 info flags, -8 points)

Four candidates have total pros text that differs from total cons text by more than 2x:

- **Janet Malzahn**: pros 2.1x longer than cons
- **Jeremy Story**: pros 2.1x longer than cons
- **Robert Brown**: cons 2.7x longer than pros
- **Ahmad R. Hassan**: cons 3.6x longer than pros
- **Sarah Eckhardt**: pros 4.8x longer than cons

**Root cause**: When one side has fewer items, each item tends to be brief, creating both a count and length imbalance. The AI does not aim for similar total character counts on each side.

### 5. Cross-candidate count spread (2 info flags, -4 points)

- **R-Dist 10**: Pros count ranges from 1 to 4 across candidates
- **D-Comptroller**: Cons count ranges from 1 to 4 across candidates

**Root cause**: The AI generates varying numbers of pros/cons per candidate without a target count. Some candidates get 4-5 items while others in the same race get 1.

---

## Improvement Plan

### Priority 1: Fix 3 Critical Flags (-30 -> 0 points, saves 30 points)

**Type: DATA CHANGES (KV ballot edits)**

These require manually adding the missing pros or cons to three candidates. Use the admin API or a one-off script to update the KV data.

#### 1a. Michael Berlanga (R-Comptroller) -- add 2-3 pros

Currently has 0 pros, 2 cons. Research and add balanced strengths such as:
- Running as an outsider/political newcomer
- Any professional background or qualifications
- Desire to bring fresh perspective to the office

Even for obscure candidates, at least 2 factual pros should be findable (e.g., "brings outsider perspective," "no political baggage"). Target: 2-3 pros, each ~25-50 chars.

**Expected impact**: Eliminates 1 critical flag (-10) and likely eliminates the cross_candidate_detail warning too since Berlanga's total chars will go from 51 to ~150+ (reducing the 17.9x ratio). Net savings: ~15 points on Republican score.

#### 1b. Montserrat Garibay (D-State Rep 49) -- add 3-4 cons

Currently has 5 pros, 0 cons. Research and add balanced concerns such as:
- First-time state candidate / no legislative experience
- Any policy positions that drew criticism
- Competitive crowded field challenges

Target: 3-4 cons to bring closer to her 5 pros. Each ~30-50 chars.

**Expected impact**: Eliminates 1 critical flag. Net savings: 10 points on Democrat score.

#### 1c. Donna Howard (D-State Rep 48) -- add 2-3 cons

Currently has 3 pros, 0 cons. Even for popular incumbents, there are always fair concerns:
- Length of time in office / establishment ties
- Any legislative votes that drew opposition
- Running effectively unopposed

Target: 2-3 cons, ~25-40 chars each.

**Expected impact**: Eliminates 1 critical flag. Net savings: 10 points on Democrat score.

---

### Priority 2: Fix 3 Count Imbalance Warnings (-15 -> 0, saves 15 points)

**Type: DATA CHANGES (KV ballot edits)**

#### 2a. Jenny Garcia Sharon (R-Dist 10) -- add 2 pros

Currently 1 pro, 3 cons. Add 2 more pros to bring to 3:3. Research her background, community ties, or policy positions.

**Expected impact**: Eliminates 1 warning flag (-5). Also likely fixes the cross_candidate_pros_count info flag for the race.

#### 2b. Robert Brown (R-Dist 10) -- add 2 pros

Currently 1 pro, 3 cons. Same treatment as Sharon. Bring to 3:3.

**Expected impact**: Eliminates 1 warning flag (-5). Also eliminates 1 info flag (length_imbalance) since adding more pro text will narrow the ratio. Also contributes to fixing the cross_candidate_pros_count spread.

#### 2c. Sarah Eckhardt (D-Comptroller) -- add 2-3 cons

Currently 4 pros, 1 con ("Would have to give up her Senate job" at 21 chars). Add 2-3 more substantive cons, each ~40-60 chars. Possibilities:
- Limited financial management experience
- Political ambitions beyond comptroller role
- Any policy positions that drew criticism

**Expected impact**: Eliminates 1 warning flag (-5). Also eliminates 1 info flag (length_imbalance). Also reduces the cross_candidate_detail disparity since her total chars will increase from 121 closer to Moore's 465, narrowing the 3.8x ratio. Could eliminate that warning too. Net savings: up to 12 points on Democrat score.

---

### Priority 3: Fix 3 Cross-Candidate Detail Warnings (-15 -> 0, saves up to 15 points)

**Type: DATA CHANGES (KV ballot edits)**

Note: Some of these may already be resolved by Priority 1 and 2 fixes above.

#### 3a. R-Comptroller detail gap (if not already fixed by 1a)

After adding pros to Berlanga (Priority 1a), his total chars should go from 51 to ~150+. The ratio against Huffines (915 chars) would drop from 17.9x to ~6x -- still above the 3x threshold. Options:
- Add more detail to Berlanga's pros/cons (bring total to ~250+ chars)
- Slightly trim Huffines' verbosity (bring from 915 to ~750)
- Best: do both so the ratio drops below 3x

#### 3b. R-Dist 10 detail gap

Chris Gober (360 chars) vs Brandon Hawbaker (108 chars). Hawbaker needs more detailed pros/cons. His current items are extremely brief (pros avg 20 chars, cons avg 23 chars). Expand each to ~40-50 chars, and the total will rise to ~200+, bringing the ratio under 3x.

#### 3c. D-Comptroller detail gap (likely fixed by Priority 2c)

If Eckhardt's total goes from 121 to ~300+ after adding cons (Priority 2c), the ratio against Moore (465) drops from 3.8x to ~1.5x, eliminating this warning.

**Expected impact**: Up to 15 points saved across both ballots. But many of these are cascading fixes from Priorities 1-2.

---

### Priority 4: Reduce Info Flags (-8 -> 0, saves up to 14 points)

**Type: DATA CHANGES (KV ballot edits)**

These are lower priority since they only cost 2 points each, but fixing them is straightforward.

#### 4a. Length imbalances

For each candidate with >2x length ratio between pros and cons:
- **Janet Malzahn (R-Dist 37)**: pros 293 vs cons 137 chars. Either expand cons slightly or trim pros slightly.
- **Jeremy Story (R-Dist 10)**: pros 130 vs cons 62 chars. Expand cons from ~21 chars avg to ~35 chars avg.
- **Ahmad R. Hassan (D-Senator)**: cons 194 vs pros 54 chars. His 2 pros are very brief (avg 27 chars). Expand pros to ~50 chars each to bring total closer.

#### 4b. Cross-candidate count spread

- **R-Dist 10 pros count**: Ranges from 1 to 4. After fixing Sharon and Brown (Priority 2), the minimum rises to 3, bringing the spread to 3-4. Since 4/3 = 1.33 (well under 2x) and the difference is only 1 (under the threshold of 2), this flag will be eliminated.
- **D-Comptroller cons count**: Ranges from 1 to 4. After fixing Eckhardt (Priority 2c), her cons count rises from 1 to 3-4, eliminating this flag.

---

### Priority 5: Prevent Future Imbalances

**Type: CODE CHANGES**

These changes prevent regressions and ensure new data meets balance standards.

#### 5a. Update AI prompts to enforce minimum counts

In both `worker/src/county-seeder.js` (line ~129) and `worker/src/updater.js` (line ~218), add explicit instructions to the AI:

```
BALANCE REQUIREMENTS:
- Every candidate MUST have at least 2 pros AND at least 2 cons
- Pros and cons counts should be within 1 of each other (e.g., 3 pros / 3 cons or 3 pros / 4 cons)
- Each pro and con should be 30-80 characters long
- Even lesser-known candidates deserve equal analytical treatment
```

#### 5b. Add balance validation to validateRaceUpdate()

In `worker/src/updater.js` `validateRaceUpdate()` (line 405), add checks:

```javascript
// Every active candidate must have at least 2 pros and 2 cons
for (const cand of updated.candidates) {
  if (cand.withdrawn) continue;
  if (!cand.pros || cand.pros.length < 2) {
    return `${cand.name} has fewer than 2 pros`;
  }
  if (!cand.cons || cand.cons.length < 2) {
    return `${cand.name} has fewer than 2 cons`;
  }
}
```

This would prevent the updater from ever writing data that creates critical flags.

#### 5c. Add balance check to the daily cron log

In `worker/src/updater.js`, after the daily update runs, call `checkBallotBalance()` and log any critical/warning flags to the update results. This creates visibility into regressions.

#### 5d. Add a balance score threshold to the data quality dashboard

Consider adding a visual warning on the `/data-quality` page when the score drops below 80.

---

## Expected Score After Fixes

### Republican ballot

| Fix | Flags eliminated | Points saved |
|-----|-----------------|--------------|
| 1a. Berlanga pros | 1 critical | 10 |
| 3a. Berlanga detail gap (cascade) | 1 warning | 5 |
| 2a. Sharon pros | 1 warning | 5 |
| 2b. Brown pros | 1 warning + 1 info | 7 |
| 3b. Hawbaker detail | 1 warning (if not already resolved) | 0-5 |
| 4a. Malzahn length | 1 info | 2 |
| 4a. Story length | 1 info | 2 |
| 4b. Dist 10 pros spread (cascade) | 1 info | 2 |

**Republican: 62 + 33 to 38 = 95 to 100**

### Democrat ballot

| Fix | Flags eliminated | Points saved |
|-----|-----------------|--------------|
| 1b. Garibay cons | 1 critical | 10 |
| 1c. Howard cons | 1 critical | 10 |
| 2c. Eckhardt cons | 1 warning + 1 info | 7 |
| 3c. Eckhardt detail gap (cascade) | 1 warning | 5 |
| 4a. Hassan length | 1 info | 2 |
| 4b. Comptroller cons spread (cascade) | 1 info | 2 |

**Democrat: 64 + 36 = 100**

### Combined projected score: ~97-100

Even fixing only Priorities 1-3 (the critical and warning flags) would yield:

- Republican: 62 + 30 = 92
- Democrat: 64 + 30 = 94
- **Combined: 93**

---

## Implementation Approach

### Phase 1: Data fixes (Priorities 1-3)

These are all KV data edits. The fastest approach:

1. Fetch the current statewide ballot for each party from KV
2. Edit the specific candidates' pros/cons arrays
3. Write the updated ballot back to KV
4. Verify by hitting `/api/balance-check` to confirm the score improvement

This could be done via an admin script or even manual KV edits through the Cloudflare dashboard. No code deploys needed.

**Estimated time**: 1-2 hours (research + data entry)

### Phase 2: Preventive code changes (Priority 5)

These require code changes to `updater.js` and `county-seeder.js`:

1. Update AI prompts with balance requirements
2. Add validation rules to `validateRaceUpdate()`
3. Deploy updated worker

**Estimated time**: 30-60 minutes (code changes + testing + deploy)

---

## Risks and Considerations

1. **Factual accuracy**: When adding pros/cons for obscure candidates, the content must be factual and verifiable. Do not fabricate strengths or weaknesses. Use the AI seeder with `web_search` to research each candidate.

2. **Tone consistency**: New pros/cons should match the reading-level style of existing ones (the tone-variant system). If the ballot uses tone-variant objects, new entries should too.

3. **Checking for tone-variant data**: The current flagged candidates (Berlanga, Garibay, Howard, etc.) appear to have plain strings rather than tone-variant objects. Confirm whether the statewide ballot uses plain strings or `{"1": "...", "3": "...", "5": "..."}` tone objects before writing data.

4. **Re-run the balance check after each fix**: After each batch of KV edits, re-run `/api/balance-check` to confirm the expected improvement and catch any cascading effects.
