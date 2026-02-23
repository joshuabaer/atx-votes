# Texas Votes Data Gaps Report

**Generated:** 2026-02-22
**Data source:** Production KV namespace `1b02b19492f243c8b503d99d0ff11761`

---

## Executive Summary

The statewide ballot data is in strong shape for core fields (summary, background, key positions, pros, cons) but has significant gaps in **endorsements** (60%), **polling** (75%), and **fundraising** (88%). Two fields are completely missing across the board: **headshots** (0%) and **sources** (0%). County-level ballots are in substantially worse shape, with most enrichment fields absent.

---

## 1. Candidate Counts

| Ballot | Races | Candidates | Propositions |
|--------|-------|------------|--------------|
| **Statewide Republican** | 10 | 33 | 10 |
| **Statewide Democrat** | 9 | 32 | 13 |
| **Statewide Total** | 19 | **65** | 23 |
| Harris County Republican | 7 | 15 | 3 |
| Harris County Democrat | 7 | 17 | 0 |
| Dallas County Republican | 5 | 6 | 0 |
| Dallas County Democrat | 12 | 20 | 0 |
| Travis County Republican | 0 | 0 | 3 |
| Travis County Democrat | 12 | 21 | 0 |
| **County Total (3 counties)** | 43 | **79** | 6 |
| **Grand Total** | 62 | **144** | 29 |

---

## 2. Per-Field Coverage: Statewide Ballot

| Field | Republican (33) | Democrat (32) | Combined (65) |
|-------|----------------|---------------|----------------|
| `summary` | 33 (100%) | 32 (100%) | **65 (100%)** |
| `background` | 32 (97%) | 32 (100%) | **64 (98%)** |
| `keyPositions` | 32 (97%) | 32 (100%) | **64 (98%)** |
| `pros` | 32 (97%) | 32 (100%) | **64 (98%)** |
| `cons` | 33 (100%) | 30 (94%) | **63 (97%)** |
| `fundraising` | 32 (97%) | 25 (78%) | **57 (88%)** |
| `polling` | 32 (97%) | 17 (53%) | **49 (75%)** |
| `endorsements` | 19 (58%) | 20 (63%) | **39 (60%)** |
| `headshot` | 0 (0%) | 0 (0%) | **0 (0%)** |
| `sources` | 0 (0%) | 0 (0%) | **0 (0%)** |

### Tone Level Coverage (Summary)

Statewide summaries are stored as tone-level objects (`{1: "...", 3: "...", 4: "...", 6: "...", 7: "..."}`).

| Tone Level | Republican | Democrat | Notes |
|------------|-----------|----------|-------|
| 1 (Simple) | 33/33 | 32/32 | Complete |
| 2 | 0/33 | 0/32 | Not generated (unused level) |
| 3 (Default) | 33/33 | 32/32 | Complete |
| 4 (Detailed) | 33/33 | 32/32 | Complete |
| 5 | 0/33 | 0/32 | Not generated (unused level) |
| 6 (Swedish Chef) | 33/33 | 32/32 | Complete |
| 7 (Fun) | 32/33 | 32/32 | Missing: Lauren B. Pena (Rep, TX-37) |

---

## 3. Per-Field Coverage: County Ballots (Harris, Dallas, Travis)

| Field | Harris Rep (15) | Harris Dem (17) | Dallas Rep (6) | Dallas Dem (20) | Travis Dem (21) | County Total (79) |
|-------|----------------|----------------|----------------|-----------------|-----------------|-------------------|
| `summary` | 15 (100%) | 17 (100%) | 6 (100%) | 20 (100%) | 21 (100%) | **79 (100%)** |
| `background` | 10 (67%) | 17 (100%) | 6 (100%) | 9 (45%) | 21 (100%) | **63 (80%)** |
| `keyPositions` | 3 (20%) | 17 (100%) | 2 (33%) | 1 (5%) | 20 (95%) | **43 (54%)** |
| `pros` | 10 (67%) | 17 (100%) | 6 (100%) | 9 (45%) | 20 (95%) | **62 (78%)** |
| `cons` | 11 (73%) | 17 (100%) | 6 (100%) | 0 (0%) | 14 (67%) | **48 (61%)** |
| `endorsements` | 2 (13%) | 3 (18%) | 0 (0%) | 1 (5%) | 4 (19%) | **10 (13%)** |
| `fundraising` | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | **0 (0%)** |
| `polling` | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | **0 (0%)** |
| `headshot` | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | **0 (0%)** |
| `sources` | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) | **0 (0%)** |

**Note:** Travis County Republican has no candidate races (only 3 propositions).

**Note:** All 79 county candidates have plain-string summaries (no tone levels). Statewide candidates have 5-level tone objects.

---

## 4. Fields With Worst Coverage (Grand Total, 144 candidates)

| Rank | Field | Coverage | Gap |
|------|-------|----------|-----|
| 1 | `headshot` | 0/144 (0%) | 144 candidates missing |
| 2 | `sources` | 0/144 (0%) | 144 candidates missing |
| 3 | `endorsements` | 49/144 (34%) | 95 candidates missing |
| 4 | `polling` | 49/144 (34%) | 95 candidates missing |
| 5 | `fundraising` | 57/144 (40%) | 87 candidates missing |
| 6 | `keyPositions` | 107/144 (74%) | 37 candidates missing |
| 7 | `cons` | 111/144 (77%) | 33 candidates missing |
| 8 | `pros` | 126/144 (88%) | 18 candidates missing |
| 9 | `background` | 127/144 (88%) | 17 candidates missing |
| 10 | `summary` | 144/144 (100%) | 0 candidates missing |

---

## 5. Statewide Candidates With Most Missing Fields

These are the statewide candidates with the biggest data gaps (excluding `headshot` and `sources` which are universally missing):

| Candidate | Race | Party | Missing Fields | Count |
|-----------|------|-------|---------------|-------|
| Michael Berlanga | Comptroller | Rep | background, keyPositions, endorsements, pros, fundraising, polling, headshot, sources | **8** |
| Andrew White | Governor | Dem | endorsements, fundraising, polling, headshot, sources | **5** |
| Victor Sampson | SBOE Dist 5 | Dem | endorsements, fundraising, polling, headshot, sources | **5** |
| Neto Longoria | SBOE Dist 5 | Dem | endorsements, fundraising, polling, headshot, sources | **5** |
| Chris Bell | Governor | Dem | endorsements, fundraising, headshot, sources | **4** |
| Courtney Head | Lt. Governor | Dem | endorsements, polling, headshot, sources | **4** |
| Michael Lange | Comptroller | Dem | endorsements, polling, headshot, sources | **4** |
| Esther Fleharty | US Rep TX-37 | Dem | endorsements, polling, headshot, sources | **4** |
| Montserrat Garibay | State Rep 49 | Dem | cons, polling, headshot, sources | **4** |
| Kimmie Ellison | State Rep 49 | Dem | endorsements, polling, headshot, sources | **4** |
| Donna Howard (I) | State Rep 48 | Dem | cons, fundraising, headshot, sources | **4** |
| Allison Bush | SBOE Dist 5 | Dem | fundraising, polling, headshot, sources | **4** |
| Stephanie Limon Bazan | SBOE Dist 5 | Dem | fundraising, polling, headshot, sources | **4** |

**Note:** Andrew White (Dem Governor) is marked as `withdrawn: true`, so his gaps are low priority.

---

## 6. County Candidates With Most Missing Fields

The worst county gaps are in Dallas County Democrat (constable races) with 9/10 fields missing:

| Candidate | Race | County/Party | Missing Count |
|-----------|------|-------------|---------------|
| 10 Dallas Dem constables | Constable Pct 1-5 | Dallas/Dem | **9 each** |
| Tony Grimes | County Clerk | Dallas/Dem | **9** |
| Lynda Sanchez, Mike Wolfe | County Clerk | Harris/Rep | **9 each** |
| Marc Cowart, Hayley Hagan | County Treasurer | Harris/Rep | **9 each** |
| Jacqueline Lucci Smith | County Attorney | Harris/Rep | **8** |
| Al Saenz | Constable Pct 4 | Travis/Dem | **7** |

---

## 7. Key Structural Differences: Statewide vs. County Data

| Feature | Statewide | County |
|---------|-----------|--------|
| Summary format | Tone-level object `{1,3,4,6,7}` | Plain string |
| Pros/cons format | Tone-level objects per item | Plain strings (when present) |
| Fundraising | String with dollar amounts | Not present |
| Polling | String with poll data | Not present |
| Candidate `id` field | Not present | Present (Harris Dem only) |
| `endorsedCandidate` field | Present (Dem only, race level) | Not present |
| `withdrawn`/`withdrawnDate` | Present (Dem only) | Not present |

---

## 8. Priority Recommendations

### Tier 1: High Impact, Feasible Now

1. **Sources (0% everywhere)** -- The PWA already has UI to display sources (`c.sources` with `{url, title, accessDate}` objects). The updater already merges sources. This is the biggest trust/credibility gap. Add source citations for all statewide candidates first (65 candidates).

2. **Endorsements (60% statewide, 13% county)** -- Endorsements are a top voter decision factor. Fill in the 26 missing statewide candidates first, especially:
   - All 5 Railroad Commissioner challengers (Culbert, Matlock, Dunlap)
   - TX-37 and TX-10 candidates (12 candidates total)
   - State Rep 49 candidates (Garibay, Ellison, Lerner, Hodges, Reyna, Wang)

3. **Michael Berlanga (Comptroller, Rep)** -- This candidate is missing 6 substantive fields (everything except name, party, summary, cons). He's the single worst-populated statewide candidate.

### Tier 2: Important for Completeness

4. **Polling data for Democrats (53%)** -- Republican polling is at 97% but Democrat polling is only 53%. Fill in the 15 missing Dem candidates, especially Governor (Chris Bell, Andrew White), Lt. Governor (Courtney Head), Comptroller (Michael Lange), and SBOE Dist 5 (4 candidates).

5. **Fundraising for Democrats (78%)** -- 7 Dem candidates lack fundraising data: Chris Bell, Andrew White (withdrawn), Donna Howard, Allison Bush, Stephanie Limon Bazan, Victor Sampson, Neto Longoria.

6. **Missing cons (3 candidates)** -- Montserrat Garibay (State Rep 49) and Donna Howard (State Rep 48) are missing cons. Having pros without cons creates a bias appearance.

### Tier 3: County Data Enrichment

7. **County tone levels** -- All 79 county candidates have plain-string summaries. If the PWA requests a tone level for a county candidate, it will fall back to the single string. Consider generating tone-leveled summaries for at least contested county races.

8. **County core fields** -- Dallas Dem is the weakest county ballot: 11 of 20 candidates have no background, keyPositions, pros, or cons. Run the county seeder with enrichment for Dallas Dem.

9. **County fundraising/polling** -- Zero county candidates have fundraising or polling data. This is expected for down-ballot races (constables, JPs, clerks) where such data often doesn't exist publicly. Consider marking these as "Not available" rather than leaving them blank.

### Tier 4: Nice to Have

10. **Headshots (0% everywhere)** -- The PWA already renders headshot images from `/headshots/{slug}.jpg` with graceful fallback (tries .png, then hides). The infrastructure is ready but no images have been uploaded to the worker. This requires sourcing official campaign photos or public domain images for 144 candidates.

11. **Lauren B. Pena missing tone 7** -- Single candidate missing the "fun" tone level for her summary. Minor gap.

---

## Appendix A: Statewide Race-by-Race Breakdown

### Republican Races

| Race | Candidates | Contested | Endorsement Gaps |
|------|-----------|-----------|-----------------|
| U.S. Senator | Cornyn (I), Paxton, Hunt | Yes | All have endorsements |
| Attorney General | Roy, Middleton, Huffman, Reitz | Yes | All have endorsements |
| Comptroller | Hancock (I), Huffines, Craddick, Berlanga | Yes | Berlanga missing ALL fields |
| Commissioner of Agriculture | Sheets, Miller (I) | Yes | All have endorsements |
| Governor | Abbott (I) | No | Has endorsements |
| Lt. Governor | Patrick (I) | No | Has endorsements |
| Railroad Commissioner | Wright (I) + 4 challengers | Yes | 3 of 4 challengers missing |
| US Rep TX-37 | Gary, Pena, Malzahn | Yes | All 3 missing |
| US Rep TX-10 | 9 candidates | Yes | 6 of 9 missing |
| State Rep 48 | Gupta | No | Has endorsements |

### Democrat Races

| Race | Candidates | Contested | Key Gaps |
|------|-----------|-----------|----------|
| U.S. Senator | Crockett, Talarico, Hassan | Yes | All have data |
| Governor | Hinojosa, Bell, White (W) | Yes | Bell: no fundraising; White: withdrawn, most data missing |
| Lt. Governor | Goodwin, Head, Velez | Yes | Head: no endorsements/polling |
| Attorney General | Jaworski, Johnson, Box | Yes | All have data |
| Comptroller | Eckhardt, Moore, Lange | Yes | Lange: no endorsements/polling |
| US Rep TX-37 | Casar (I), Fleharty | Yes | Fleharty: no endorsements/polling |
| State Rep 49 | 8 candidates | Yes | 4 missing endorsements, 5 missing polling |
| State Rep 48 | Howard (I) | No | Missing cons, fundraising |
| SBOE Dist 5 | 6 candidates | Yes | 4 missing fundraising/polling, 2 missing endorsements |

---

## Appendix B: County Data Quality by County

### Harris County (FIPS 48201)
- **Republican:** 15 candidates across 7 races + 3 propositions
  - Core fields (background/pros/cons): 67-73% coverage
  - Enrichment fields (endorsements/fundraising/polling): 0-13%
  - Weakest: County Clerk and County Treasurer races (minimal data)

- **Democrat:** 17 candidates across 7 races
  - Core fields: 100% coverage (well-seeded)
  - Enrichment fields: 0-18%
  - District Clerk race has 8 candidates, all missing endorsements/fundraising/polling

### Dallas County (FIPS 48113)
- **Republican:** 6 candidates across 5 races
  - Core fields: 100% (background/pros/cons)
  - keyPositions: only 2/6 (33%)
  - Enrichment fields: 0% across the board

- **Democrat:** 20 candidates across 12 races -- **worst county ballot**
  - 11 candidates (constables) have essentially only a summary string
  - Only 45% have background, only 5% have keyPositions
  - 0% cons coverage

### Travis County (FIPS 48453)
- **Republican:** No candidate races (3 propositions only)

- **Democrat:** 21 candidates across 12 races
  - Core fields: 67-100% coverage
  - Endorsements: 19% (4 of 21)
  - Fundraising/polling: 0%
