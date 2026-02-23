# Texas Votes Data Audit Report

**Date:** 2026-02-23
**Election:** March 3, 2026 Texas Primary
**Days until election:** 8

---

## 1. Executive Summary

The Texas Votes app has **717 total KV keys** across 6 data categories. Overall data readiness is estimated at **~75%** for the core voting experience, with significant gaps in candidate detail fields and geographic coverage.

**What is working well:**
- All 65 statewide candidates have summaries, pros, and cons (100%)
- All 65 statewide candidates have headshots (100%)
- 231 of 254 counties (91%) have both Republican and Democrat ballot keys
- 230 of 254 counties (91%) have county_info entries with voting logistics
- AI bias audit scores average 7.7/10 across four independent AI auditors
- Statewide propositions are loaded (10 Republican, 13 Democrat)

**What is missing or incomplete:**
- 0/65 candidates have education, experience, sources, or age fields (these fields do not exist in the data schema at all)
- 26/65 candidates (40%) are missing endorsement data
- 16/65 candidates (25%) are missing polling data
- 8/65 candidates (12%) are missing fundraising data
- 0 tone variant keys exist in KV (tone variants appear to be inline in summary objects instead)
- Only 10/254 counties (4%) have precinct maps -- 20 of the top 30 counties lack them
- 23-24 counties are completely missing all data (ballots + county_info)

---

## 2. Statewide Candidate Completeness Matrix

### 2.1 Total Counts

| Metric | Count |
|--------|-------|
| Total statewide races | 19 (10 R, 9 D) |
| Total candidates | 65 (33 R, 32 D) |
| Contested races | 15 |
| Uncontested races | 4 (Abbott, Patrick, Gupta, D. Howard) |

### 2.2 Field Coverage Summary (All 65 Candidates)

| Field | Present | Missing | Coverage |
|-------|---------|---------|----------|
| Summary (tone variants) | 65 | 0 | **100%** |
| Background | 64 | 1 | **98%** |
| Key Positions | 64 | 1 | **98%** |
| Pros (2+ items) | 65 | 0 | **100%** |
| Cons (2+ items) | 65 | 0 | **100%** |
| Fundraising | 57 | 8 | **88%** |
| Polling | 49 | 16 | **75%** |
| Endorsements | 39 | 26 | **60%** |
| Education | 0 | 65 | **0%** |
| Experience | 0 | 65 | **0%** |
| Sources | 0 | 65 | **0%** |
| Age | 0 | 65 | **0%** |
| Headshot | 65 | 0 | **100%** |

**Note:** Education, experience, sources, and age are not part of the current data schema. These fields simply do not exist on any candidate objects. The schema includes: name, party, isIncumbent, isRecommended, summary, background, keyPositions, endorsements, pros, cons, polling, fundraising.

### 2.3 Republican Candidate Detail

| Candidate | Race | BG | KP | End | Pros | Cons | Poll | Fund | Score |
|-----------|------|:--:|:--:|:---:|:----:|:----:|:----:|:----:|:-----:|
| John Cornyn | U.S. Senator | Y | Y | 15 | 5 | 4 | Y | Y | Full |
| Ken Paxton | U.S. Senator | Y | Y | 4 | 4 | 4 | Y | Y | Full |
| Wesley Hunt | U.S. Senator | Y | Y | 2 | 5 | 4 | Y | Y | Full |
| Chip Roy | Attorney General | Y | Y | 5 | 5 | 4 | Y | Y | Full |
| Mayes Middleton | Attorney General | Y | Y | 6 | 4 | 4 | Y | Y | Full |
| Joan Huffman | Attorney General | Y | Y | 9 | 5 | 4 | Y | Y | Full |
| Aaron Reitz | Attorney General | Y | Y | 4 | 4 | 5 | Y | Y | Full |
| Kelly Hancock | Comptroller | Y | Y | 19 | 5 | 4 | Y | Y | Full |
| Don Huffines | Comptroller | Y | Y | 19 | 5 | 4 | Y | Y | Full |
| Christi Craddick | Comptroller | Y | Y | 7 | 4 | 4 | Y | Y | Full |
| **Michael Berlanga** | **Comptroller** | **N** | **N** | **0** | 3 | 2 | **N** | **N** | **Sparse** |
| Nate Sheets | Ag Commissioner | Y | Y | 20 | 5 | 4 | Y | Y | Full |
| Sid Miller | Ag Commissioner | Y | Y | 4 | 4 | 4 | Y | Y | Full |
| Greg Abbott | Governor | Y | Y | Y | Y | Y | Y | Y | Full |
| Dan Patrick | Lt. Governor | Y | Y | Y | Y | Y | Y | Y | Full |
| Jim Wright | Railroad Comm. | Y | Y | 9 | 5 | 4 | Y | Y | Full |
| Katherine Culbert | Railroad Comm. | Y | Y | **0** | 4 | 4 | Y | Y | -End |
| James "Jim" Matlock | Railroad Comm. | Y | Y | **0** | 4 | 4 | Y | Y | -End |
| Bo French | Railroad Comm. | Y | Y | 5 | 3 | 4 | Y | Y | Full |
| Hawk Dunlap | Railroad Comm. | Y | Y | **0** | 4 | 4 | Y | Y | -End |
| Ge'Nell Gary | US Rep CD-37 | Y | Y | **0** | 3 | 3 | Y | Y | -End |
| Lauren B. Pena | US Rep CD-37 | Y | Y | **0** | 3 | 4 | Y | Y | -End |
| Janet Malzahn | US Rep CD-37 | Y | Y | **0** | 4 | 3 | Y | Y | -End |
| Chris Gober | US Rep CD-10 | Y | Y | 7 | 4 | 4 | Y | Y | Full |
| Jessica Karlsruher | US Rep CD-10 | Y | Y | 6 | 4 | 3 | Y | Y | Full |
| Rob Altman | US Rep CD-10 | Y | Y | **0** | 3 | 3 | Y | Y | -End |
| Scott MacLeod | US Rep CD-10 | Y | Y | 3 | 3 | 3 | Y | Y | Full |
| Ben Bius | US Rep CD-10 | Y | Y | **0** | 3 | 3 | Y | Y | -End |
| Jenny Garcia Sharon | US Rep CD-10 | Y | Y | **0** | 3 | 3 | Y | Y | -End |
| Brandon Hawbaker | US Rep CD-10 | Y | Y | **0** | 3 | 3 | Y | Y | -End |
| Jeremy Story | US Rep CD-10 | Y | Y | **0** | 3 | 3 | Y | Y | -End |
| Robert Brown | US Rep CD-10 | Y | Y | **0** | 3 | 3 | Y | Y | -End |
| Anthony Gupta | State Rep HD-48 | Y | Y | **0** | Y | Y | Y | Y | -End |

### 2.4 Democrat Candidate Detail

| Candidate | Race | BG | KP | End | Pros | Cons | Poll | Fund | Score |
|-----------|------|:--:|:--:|:---:|:----:|:----:|:----:|:----:|:-----:|
| Jasmine Crockett | U.S. Senator | Y | Y | 7 | 4 | 2 | Y | Y | Full |
| James Talarico | U.S. Senator | Y | Y | 9 | 4 | 3 | Y | Y | Full |
| Ahmad R. Hassan | U.S. Senator | Y | Y | **0** | 3 | 3 | Y | Y | -End |
| Gina Hinojosa | Governor | Y | Y | 8 | 4 | 3 | Y | Y | Full |
| Chris Bell | Governor | Y | Y | **0** | 3 | 3 | Y | **N** | -End-Fund |
| **Andrew White** | **Governor** | Y | Y | **0** | 3 | 2 | **N** | **N** | **-End-Poll-Fund** |
| Vikki Goodwin | Lt. Governor | Y | Y | 2 | 3 | 2 | **N** | Y | -Poll |
| Courtney Head | Lt. Governor | Y | Y | **0** | 3 | 4 | **N** | Y | -End-Poll |
| Marcos Isaias Velez | Lt. Governor | Y | Y | 7 | 4 | 3 | **N** | Y | -Poll |
| Joe Jaworski | Attorney General | Y | Y | 3 | 3 | 3 | Y | Y | Full |
| Nathan Johnson | Attorney General | Y | Y | 11 | 5 | 3 | Y | Y | Full |
| Anthony "Tony" Box | Attorney General | Y | Y | 7 | 5 | 4 | Y | Y | Full |
| Sarah Eckhardt | Comptroller | Y | Y | 5 | 4 | 3 | Y | Y | Full |
| Savant Moore | Comptroller | Y | Y | 1 | 4 | 4 | **N** | Y | -Poll |
| Michael Lange | Comptroller | Y | Y | **0** | 4 | 4 | **N** | Y | -End-Poll |
| Greg Casar | US Rep CD-37 | Y | Y | 3 | 4 | 2 | Y | Y | Full |
| Esther Amalia De Jesus Fleharty | US Rep CD-37 | Y | Y | **0** | 4 | 4 | **N** | Y | -End-Poll |
| Kathie Tovo | State Rep HD-49 | Y | Y | 1 | 4 | 2 | **N** | Y | -Poll |
| Sam Slade | State Rep HD-49 | Y | Y | 1 | 4 | 4 | **N** | Y | -Poll |
| Montserrat Garibay | State Rep HD-49 | Y | Y | 2 | 5 | 4 | **N** | Y | -Poll |
| Kimmie Ellison | State Rep HD-49 | Y | Y | **0** | 4 | 4 | **N** | Y | -End-Poll |
| Robin Jennifer Lerner | State Rep HD-49 | Y | Y | **0** | 3 | 3 | Y | Y | -End |
| Gigs Hodges | State Rep HD-49 | Y | Y | 2 | 3 | 3 | Y | Y | Full |
| Josh Reyna | State Rep HD-49 | Y | Y | 5 | 3 | 3 | Y | Y | Full |
| Shenghao "Daniel" Wang | State Rep HD-49 | Y | Y | 1 | 3 | 3 | Y | Y | Full |
| Donna Howard | State Rep HD-48 | Y | Y | Y | Y | Y | Y | **N** | -Fund |
| Allison Bush | SBOE Dist 5 | Y | Y | 1 | 4 | 2 | **N** | **N** | -Poll-Fund |
| Victor Sampson | SBOE Dist 5 | Y | Y | **0** | 4 | 3 | **N** | **N** | -End-Poll-Fund |
| Neto Longoria | SBOE Dist 5 | Y | Y | **0** | 4 | 4 | **N** | **N** | -End-Poll-Fund |
| Stephanie Limon Bazan | SBOE Dist 5 | Y | Y | 7 | 4 | 4 | **N** | **N** | -Poll-Fund |
| Abigail Gray | SBOE Dist 5 | Y | Y | **0** | 3 | 3 | Y | Y | -End |
| Kevin Jackson | SBOE Dist 5 | Y | Y | **0** | 3 | 3 | Y | Y | -End |

### 2.5 Candidates Missing Endorsement Data (26 total)

**Republican (16):**
- Katherine Culbert (Railroad Commissioner)
- James "Jim" Matlock (Railroad Commissioner)
- Hawk Dunlap (Railroad Commissioner)
- Ge'Nell Gary (US Rep CD-37)
- Lauren B. Pena (US Rep CD-37)
- Janet Malzahn (US Rep CD-37)
- Rob Altman (US Rep CD-10)
- Ben Bius (US Rep CD-10)
- Jenny Garcia Sharon (US Rep CD-10)
- Brandon Hawbaker (US Rep CD-10)
- Jeremy Story (US Rep CD-10)
- Robert Brown (US Rep CD-10)
- Anthony Gupta (State Rep HD-48)
- Michael Berlanga (Comptroller) -- also missing background, keyPositions, polling, fundraising

**Democrat (10):**
- Ahmad R. Hassan (U.S. Senator)
- Chris Bell (Governor)
- Andrew White (Governor)
- Courtney Head (Lt. Governor)
- Michael Lange (Comptroller)
- Esther Amalia De Jesus Fleharty (US Rep CD-37)
- Kimmie Ellison (State Rep HD-49)
- Robin Jennifer Lerner (State Rep HD-49)
- Victor Sampson (SBOE Dist 5)
- Neto Longoria (SBOE Dist 5)
- Abigail Gray (SBOE Dist 5)
- Kevin Jackson (SBOE Dist 5)

### 2.6 Candidates Missing Polling Data (16 total)

All in the Democrat ballot:
- Andrew White (Governor)
- Vikki Goodwin (Lt. Governor)
- Courtney Head (Lt. Governor)
- Marcos Isaias Velez (Lt. Governor)
- Savant Moore (Comptroller)
- Michael Lange (Comptroller)
- Esther Amalia De Jesus Fleharty (US Rep CD-37)
- Kathie Tovo (State Rep HD-49)
- Sam Slade (State Rep HD-49)
- Montserrat Garibay (State Rep HD-49)
- Kimmie Ellison (State Rep HD-49)
- Allison Bush (SBOE Dist 5)
- Victor Sampson (SBOE Dist 5)
- Neto Longoria (SBOE Dist 5)
- Stephanie Limon Bazan (SBOE Dist 5)

Note: Missing polling for down-ballot races is expected, as polling data for state rep and SBOE races is rarely conducted.

### 2.7 Candidates Missing Fundraising Data (8 total)

- Michael Berlanga (R - Comptroller)
- Chris Bell (D - Governor)
- Andrew White (D - Governor)
- Donna Howard (D - State Rep HD-48)
- Allison Bush (D - SBOE Dist 5)
- Victor Sampson (D - SBOE Dist 5)
- Neto Longoria (D - SBOE Dist 5)
- Stephanie Limon Bazan (D - SBOE Dist 5)

---

## 3. County Ballot Coverage

### 3.1 Overview

| Metric | Count |
|--------|-------|
| Total county ballot keys | 462 |
| Unique counties with ballots | 231 / 254 (91%) |
| Counties with BOTH R + D ballots | 231 (100% of those present) |
| Counties missing ALL ballot data | 23 (9%) |

### 3.2 Top 30 Counties -- All Present

All 30 of the top 30 counties by population have BOTH Republican and Democrat ballot keys. This means the vast majority of Texas voters are covered.

| County | FIPS | R Races | D Races | Status |
|--------|------|:-------:|:-------:|--------|
| Harris | 48201 | 7 | 7 | Good |
| Dallas | 48113 | 5 | 12 | Good |
| Tarrant | 48439 | 7 | 8 | Good |
| Bexar | 48029 | 5 | 8 | Good |
| Travis | 48453 | 0 | 12 | OK (no R local races) |
| Collin | 48085 | 10 | 6 | Good |
| Denton | 48121 | 13 | 11 | Good |
| Hidalgo | 48215 | 4 | 9 | Good |
| Fort Bend | 48157 | 7 | 7 | Good |
| Williamson | 48491 | 9 | 6 | Good |
| Montgomery | 48339 | 11 | 2 | Good |
| El Paso | 48141 | (not sampled) | (not sampled) | Key exists |
| Bell | 48027 | 9 | 0 | OK (no D local races) |
| Cameron | 48061 | 9 | 3 | Good |
| Parker | 48367 | 11 | 2 | Good |
| Victoria | 48469 | 9 | 0 | OK (no D local races) |
| McLennan | 48309 | 16 | (parsed) | Good |

Note: Many smaller counties have 0 races for both parties, meaning no contested county-level primaries exist. This is normal and expected.

### 3.3 Missing Counties (23)

These 23 counties have NO ballot or county_info data at all:

| FIPS | County | Population Tier |
|------|--------|-----------------|
| 48445 | Terry | Small |
| 48447 | Throckmorton | Small |
| 48449 | Titus | Small |
| 48451 | Tom Green | **Medium** (pop ~120K, home of San Angelo) |
| 48455 | Trinity | Small |
| 48457 | Tyler | Small |
| 48459 | Upshur | Small |
| 48461 | Upton | Small |
| 48463 | Uvalde | Small |
| 48465 | Val Verde | Small-Medium |
| 48467 | Van Zandt | Small |
| 48475 | Ward | Small |
| 48477 | Washington | Small |
| 48481 | Wharton | Small |
| 48483 | Wheeler | Small |
| 48487 | Wilbarger | Small |
| 48489 | Willacy | Small |
| 48493 | Wilson | Small-Medium |
| 48495 | Winkler | Small |
| 48499 | Wood | Small |
| 48501 | Yoakum | Small |
| 48503 | Young | Small |
| 48505 | Zapata | Small |
| 48507 | Zavala | Small |

**Pattern:** All missing counties have FIPS codes >= 48445. This strongly suggests the county seeder process stopped or was interrupted partway through the alphabetical list (after Terrell County, FIPS 48443). Tom Green County (San Angelo, pop ~120K) is the most significant gap.

---

## 4. County Info Coverage

### 4.1 Overview

| Metric | Count |
|--------|-------|
| county_info keys present | 230 / 254 (91%) |
| Missing county_info entries | 24 (same counties as ballot gaps + Victoria) |

### 4.2 Data Quality (Spot-Check)

**Travis County (48453)** -- Excellent quality:
- Vote centers: Yes
- Elections website: https://votetravis.gov/
- Phone: (512) 854-4996
- Early voting periods: 4 date ranges with hours
- Election day hours: 7 AM - 7 PM
- Resources: 3 links (Elections, Registration, Voter Lookup)
- Note about extended hours on Feb 26-27

**Harris County (48201)** -- Excellent quality:
- Vote centers: Yes
- Elections website: https://www.harrisvotes.com/
- Phone: (713) 755-6965
- Early voting periods: 3 date ranges
- Election day hours: 7 AM - 7 PM
- Resources: 3 links including sample ballot lookup

Quality appears consistently good for the counties that have data.

---

## 5. Precinct Map Coverage

### 5.1 Overview

| Metric | Count |
|--------|-------|
| precinct_map keys | 10 / 254 (4%) |
| Top 30 counties with maps | 10 / 30 (33%) |

### 5.2 Counties WITH Precinct Maps

1. Bexar (48029)
2. Collin (48085)
3. Dallas (48113)
4. Denton (48121)
5. Fort Bend (48157)
6. Harris (48201)
7. Hidalgo (48215)
8. Tarrant (48439)
9. Travis (48453) -- 47 ZIP codes mapped
10. Williamson (48491)

### 5.3 Top 30 Counties MISSING Precinct Maps (20)

- Bell, Brazoria, Cameron, Ector, El Paso, Galveston
- Gregg, Jefferson, Johnson, Kaufman, Lubbock, McLennan
- Midland, Montgomery, Nueces, Parker, Potter, Randall
- Smith, Victoria

**Impact:** Precinct maps are used to determine commissioner precinct districts from ZIP codes. Without them, users in these 20 counties cannot see commissioner precinct-specific races on their ballot. However, most county races (county judge, clerk, etc.) are county-wide and still display correctly.

---

## 6. Headshot Coverage

### 6.1 Statewide Candidates

**65/65 statewide candidates have headshots (100%).** Every Republican and Democrat candidate in the statewide ballot data has a corresponding .jpg file in `worker/public/headshots/`.

### 6.2 Extra Headshots

There are 114 image files in the headshots directory (including some .png and .svg variants). Many of these correspond to county-level candidates not in the statewide ballot:

Notable county candidate headshots present: Adrian Garcia, Amanda Marzullo, Andrew Sommerman, Andy Brown, Andy Eads, Annise Parker, Brigid Shea, Chris Hill, Clay Jenkins, Dianne Edmondson, Elba Garcia, Felicia Pitre, Gavino Fernandez Jr., George Morales III, Justin Rodriguez, Kevin Falconer, Lesley Briones, Lina Hidalgo, Manny Ramirez, Neto Longoria, Ofelia Maldonado Zapata, Orlando Sanchez, Patrick Marty Lancton, Peter Sakai, Reese Ricci Armstrong, Rick Astray-Caneda III, Stephanie Limon Bazan, Susanna Ledesma-Woody, Teneshia Hudspeth, Tim O'Hare, Tommy Calvert, Victor Sampson.

### 6.3 County Candidate Headshot Gaps

County ballots contain hundreds of additional candidates (e.g., Harris County D ballot alone has 17 candidates across 7 races). A comprehensive audit of county candidate headshots was not performed for all 231 counties, but headshots for many Travis and Harris county candidates are present.

---

## 7. Tone Variant Coverage

### 7.1 KV Tone Keys

**0 standalone tone: keys exist in KV.**

However, tone variants ARE present -- they are embedded directly in each candidate's `summary` field as an object with keys "1", "3", "4", "6" representing different reading levels. This is the expected design based on the codebase architecture.

Example (John Cornyn):
- Level 1 (simple): Present
- Level 3 (standard): Present
- Level 4 (detailed): Present
- Level 6 (Swedish Chef): Present

All 65 statewide candidates have multi-tone summaries.

---

## 8. AI Bias Audit Status

### 8.1 Latest Audit Results (2026-02-23)

| Provider | Model | Overall Score |
|----------|-------|:------------:|
| ChatGPT (OpenAI) | gpt-4o | 7.5/10 |
| Gemini (Google) | gemini-2.5-flash | 7.5/10 |
| Claude (Anthropic) | claude-sonnet-4 | 7.8/10 |
| Grok (xAI) | grok-3 | 7.8/10 |
| **Average** | | **7.7/10** |

### 8.2 Dimension Scores (Consensus)

| Dimension | Score |
|-----------|:-----:|
| Transparency | 9.0/10 |
| Partisan Bias (low = good) | 8.0/10 |
| Fairness of Framing | 8.0/10 |
| Factual Accuracy | 7.0/10 |
| Balance of Pros/Cons | 7.0/10 |

### 8.3 Top Audit Concerns

1. **AI hallucination risk** -- Heavy reliance on Claude web search without human verification
2. **Balance enforcement gaps** -- Unclear intervention protocols when imbalance detected
3. **External source dependencies** -- Potentially outdated or biased third-party sources

---

## 9. Balance Check Analysis

### 9.1 Pros/Cons Distribution

Most candidates have 3-5 pros and 2-4 cons, which is reasonably balanced. No candidate has an extreme imbalance (e.g., 5+ pros and 0 cons).

### 9.2 Notable Imbalances

- **Michael Berlanga (R-Comptroller):** Missing background, keyPositions, endorsements, polling, fundraising. By far the sparsest candidate profile. This creates an implicit bias against him since voters see less information.
- **Andrew White (D-Governor):** Missing endorsements, polling, and fundraising. Third-place candidate with significantly less data than competitors.
- **SBOE District 5 candidates:** 4 of 6 candidates missing both polling and fundraising data, creating an uneven information landscape.

### 9.3 Recommendation Flags

Every contested race has exactly one `isRecommended: true` candidate. This is by design for the guide feature but could create perception issues. The recommended candidates generally (but not always) have richer data profiles.

---

## 10. Propositions

| Party | Propositions |
|-------|:-----------:|
| Republican | 10 |
| Democrat | 13 |

Both sets are present in the statewide ballot data. County-level propositions were checked and none were found (Travis County D ballot had 0 propositions), though this may be accurate if no county-level propositions exist for this election.

---

## 11. Prioritized Action Items

### Priority 1: CRITICAL (Do before election day)

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 1 | **Seed remaining 23 counties** (Terry through Zavala) | ~9% of counties have zero data. Tom Green County (San Angelo, pop ~120K) is the biggest gap. Voters in these counties get no local information. | Low -- run county seeder for FIPS 48445-48507. ~23 counties x 4 KV writes = ~92 writes. |
| 2 | **Fill Michael Berlanga's profile** (R-Comptroller) | Only candidate missing background and key positions. Creates obvious information gap in a 4-way statewide race. | Low -- single candidate update via updater. |
| 3 | **Add missing fundraising data** for 8 candidates | SBOE and Governor candidates appear under-researched. Fundraising is available from TEC filings. | Medium -- requires research for 8 candidates. |

### Priority 2: HIGH (Significant user experience improvement)

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 4 | **Build precinct maps for top 20 missing counties** | Users in Montgomery, El Paso, Lubbock, etc. cannot see commissioner precinct races. Affects millions of voters. | High -- requires per-county ZIP-to-precinct research. 20 counties to map. |
| 5 | **Add endorsement data for 26 candidates** | 40% of candidates show no endorsements. Many lower-tier candidates likely do have endorsements that haven't been researched. | Medium -- requires research per candidate. Focus on statewide races first (Berlanga, Culbert, Matlock, Dunlap). |
| 6 | **Add polling data for Lt. Governor and Comptroller D races** | All 3 Lt. Governor D candidates and 2/3 Comptroller D candidates missing polling. These are statewide races where polling should exist. | Medium -- research required, data may not exist for all. |

### Priority 3: MEDIUM (Nice to have, post-election)

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 7 | **Add education/experience fields to schema** | 0/65 candidates have these. Would enrich profiles significantly. Requires schema change + data population. | High -- schema redesign + 65 candidate updates. |
| 8 | **Add age field to schema** | Voter-relevant information not currently tracked. | Medium -- requires research for 65 candidates. |
| 9 | **Add source citations to candidate profiles** | 0/65 candidates have sources. AI audit flagged this as a transparency gap. | High -- 65 candidates x multiple sources each. |
| 10 | **Audit county-level candidate headshots** | Unknown coverage for hundreds of county candidates. | High -- requires identifying all county candidates and sourcing photos. |
| 11 | **Implement balance enforcement automation** | AI audit scored this 7.0/10. Need clear protocols when imbalance detected. | Medium -- code changes to updater/balance check. |

### Priority 4: LOW (Maintenance/future)

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 12 | **Add county-level propositions** | May not exist for March 2026 primary. Verify with county election offices. | Low if none exist. |
| 13 | **Human fact-check pass on all AI-generated content** | Addresses #1 audit concern. Time-intensive but important for credibility. | Very High -- 65 statewide + hundreds of county candidates. |
| 14 | **Expand precinct maps to all 254 counties** | Completeness for rural counties. | Very High -- 244 remaining counties. |

---

## 12. KV Namespace Summary

| Prefix | Keys | Notes |
|--------|:----:|-------|
| ballot: | 466 | 2 statewide + 462 county (231 counties x 2 parties) |
| county_info: | 230 | 230/254 counties |
| precinct_map: | 10 | 10/254 counties |
| audit: | 8 | 4 provider results + summary + synthesis + 2 logs |
| manifest: | 1 | Version tracking (v4 for both parties, updated 2026-02-22) |
| update_log: | 2 | Daily updater logs |
| tone: | 0 | Tone variants embedded in candidate summary objects |
| **TOTAL** | **717** | |

---

## 13. Data Freshness

| Data | Last Updated |
|------|-------------|
| Republican statewide ballot | 2026-02-22 12:04 UTC (v4) |
| Democrat statewide ballot | 2026-02-22 12:10 UTC (v4) |
| AI audit | 2026-02-23 03:08 UTC |

The statewide ballots are 1 day old. With 8 days until the election, at least one more update pass is recommended to capture any last-minute polling, endorsements, or candidate changes.
