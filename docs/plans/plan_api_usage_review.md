# Claude API Usage Review - Implementation Plan

**Date:** 2026-02-22
**Status:** Research complete, ready for implementation

---

## 1. Guide Generation (`worker/src/pwa-guide.js`)

### Model & Configuration

| Setting | Value |
|---------|-------|
| **Model** | `claude-sonnet-4-6` (primary), `claude-sonnet-4-20250514` (fallback) |
| **max_tokens** | 4,096 (English), 8,192 (Spanish) |
| **Retry logic** | 2 attempts per model, 2 models = up to 4 total attempts |
| **Web search** | No |

### Two API Endpoints

1. **`/api/pwa/guide`** — Full ballot recommendation (the main call)
2. **`/api/pwa/summary`** — Profile summary regeneration (smaller, separate call)

### Token Estimates: Guide Generation

| Component | Estimated Tokens | Notes |
|-----------|-----------------|-------|
| **System prompt** | ~200 tokens | Non-partisan rules, voice instructions, JSON-only constraint |
| **User prompt (instructions)** | ~400 tokens | Voter profile, tone instruction, JSON schema, nonpartisan rules |
| **Ballot description** | ~2,000-4,000 tokens | Varies by party/districts. Includes all races, candidate names, positions, endorsements, pros, cons. A full statewide ballot with ~15 races and ~40 candidates could hit 3,000-4,000 tokens. A filtered ballot (3-5 relevant races) might be ~1,000-1,500 tokens |
| **Total input** | ~2,600-4,600 tokens | Depends on district filtering |
| **Output** | ~1,500-3,000 tokens | JSON with profileSummary + per-race recommendations. ~100-150 tokens per race recommendation. 15 races = ~1,500-2,200 tokens |
| **Spanish output** | ~2,500-5,000 tokens | Includes candidateTranslations array (summary + positions + pros + cons for every candidate) |

### Cost Per Guide Generation (Claude Sonnet: $3/M input, $15/M output)

| Scenario | Input Cost | Output Cost | **Total** |
|----------|-----------|-------------|-----------|
| **English, filtered ballot (~5 races)** | $0.006 | $0.011 | **$0.017** |
| **English, full ballot (~15 races)** | $0.012 | $0.030 | **$0.042** |
| **Spanish, full ballot** | $0.014 | $0.060 | **$0.074** |

### Token Estimates: Summary Regeneration

| Component | Estimated Tokens |
|-----------|-----------------|
| **System prompt** | ~60 tokens |
| **User prompt** | ~200-300 tokens |
| **Output** | ~60-100 tokens |
| **Cost per call** | ~**$0.002** |

### Alternative LLMs (when user selects different provider)

| Provider | Model | Input $/M | Output $/M | Est. Cost/Guide |
|----------|-------|-----------|------------|-----------------|
| **Claude** | claude-sonnet-4-6 | $3.00 | $15.00 | $0.017-$0.074 |
| **ChatGPT** | gpt-4o | $2.50 | $10.00 | $0.013-$0.055 |
| **Gemini** | gemini-2.5-flash | $0.30 | $2.50 | $0.002-$0.015 |
| **Grok** | grok-3 | $3.00 | $15.00 | $0.017-$0.074 |

### Optimization Opportunities

1. **Prompt caching** — The system prompt is identical across all requests. Anthropic's prompt caching (cache read = 0.1x input price) would save ~$0.0005/request on system prompt. Small savings per-request but adds up.
2. **Ballot compression** — The condensed ballot description repeats a lot of structural text ("RACE:", "Positions:", "Endorsements:", etc.). Could be further compressed into a more token-efficient format.
3. **Spanish translation separation** — The `candidateTranslations` block in Spanish responses can use ~2,000+ output tokens. Since candidate data rarely changes, these translations could be cached in KV (similar to tone variants) and only regenerated when candidate data is updated. This alone could cut Spanish guide cost from ~$0.074 to ~$0.042.
4. **Switch default LLM to Gemini 2.5 Flash** — At ~5-7x cheaper than Claude Sonnet, this could dramatically cut per-guide costs. Needs quality comparison testing first.

---

## 2. Daily Updater (`worker/src/updater.js`)

### Model & Configuration

| Setting | Value |
|---------|-------|
| **Model** | `claude-sonnet-4-20250514` |
| **max_tokens** | 4,096 |
| **Web search** | Yes — `web_search_20250305`, max 5 searches per race |
| **Retry logic** | Up to 3 attempts with exponential backoff (10s, 20s, 30s) |
| **Rate limiting** | 5-second delay between race API calls |

### API Calls Per Daily Update

The updater iterates over **both party ballots** (Republican + Democrat) and calls the API once per **contested** race. Uncontested races (where `isContested === false`) are skipped.

| Component | Estimate |
|-----------|----------|
| **Statewide races (per party)** | ~15-20 races total, ~10-15 contested |
| **Total API calls per day** | ~20-30 calls (10-15 contested races x 2 parties) |
| **Duration** | ~2.5-5 minutes (5-second delays between calls) |

### Token Estimates Per Race Update

| Component | Estimated Tokens | Notes |
|-----------|-----------------|-------|
| **System prompt** | ~150 tokens | Source priority hierarchy, conflict resolution |
| **User prompt** | ~300-600 tokens | Current candidate data (names, polling, fundraising, endorsements, positions) + JSON schema |
| **Web search results** | ~2,000-5,000 tokens | Returned as input tokens from up to 5 searches. Each search result snippet is ~300-800 tokens |
| **Total input (incl. search)** | ~2,500-5,800 tokens | Search results dominate the input |
| **Output** | ~500-1,500 tokens | JSON with per-candidate updates (many fields null) |

### Cost Per Daily Update Cycle

| Component | Calculation | Cost |
|-----------|-------------|------|
| **Per contested race** | ~4,000 input tokens x $3/M + ~1,000 output x $15/M | ~$0.027/race |
| **25 contested races/day** | 25 x $0.027 | **~$0.68/day** |
| **Monthly (30 days)** | 30 x $0.68 | **~$20/month** |

**Note:** Web search results count as input tokens (no separate per-search fee), but they significantly inflate the input token count. Each search returning 5 results at ~500 tokens each adds ~2,500 tokens.

### Optimization Opportunities

1. **Skip races with no recent changes** — Track a `lastMeaningfulUpdate` timestamp per race. If a race hasn't had any non-null updates in the last 3 cycles, reduce frequency to every 3 days.
2. **Reduce max_uses on web_search** — Currently set to 5 searches per race. Many races (especially lower-ballot) may not have recent news. Reducing to 3 searches would cut input tokens by ~1,000-2,000 per call. Estimated savings: ~$0.008/race = ~$6/month.
3. **Batch small races** — For races with only 2 candidates, multiple races could be researched in a single API call with a combined prompt, reducing per-call overhead.
4. **Stop after election day** — Already implemented: `if (new Date() > new Date("2026-03-04T00:00:00Z"))` returns early. Good.

---

## 3. County Seeder (`worker/src/county-seeder.js`)

### Model & Configuration

| Setting | Value |
|---------|-------|
| **Model** | `claude-sonnet-4-20250514` |
| **max_tokens** | 8,192 |
| **Web search** | Yes — `web_search_20250305`, max **10** searches per call |
| **Retry logic** | Up to 3 attempts with exponential backoff |

### API Calls Per County Seed

The `seedFullCounty()` function makes **4 API calls** per county:

| Step | Function | API Call |
|------|----------|----------|
| 1 | `seedCountyInfo()` | County voting logistics (hours, locations, phone) |
| 2 | `seedCountyBallot()` | Republican local races |
| 3 | `seedCountyBallot()` | Democrat local races |
| 4 | `seedPrecinctMap()` | ZIP-to-precinct mapping |

### Token Estimates Per County

| Call Type | Input Tokens | Search Tokens | Output Tokens | Cost |
|-----------|-------------|---------------|---------------|------|
| **County info** | ~300 + ~3,000 search | ~3,300 | ~400 | ~$0.016 |
| **County ballot (per party)** | ~500 + ~5,000 search | ~5,500 | ~2,000-4,000 | ~$0.047-$0.077 |
| **Precinct map** | ~200 + ~3,000 search | ~3,200 | ~200-500 | ~$0.013 |
| **Full county total** | | | | **~$0.12-$0.18** |

### Total Cost to Seed All 254 Counties

| Scope | Counties | Cost/County | Total |
|-------|----------|-------------|-------|
| **Top 30 counties** (currently implemented) | 30 | ~$0.15 | **~$4.50** |
| **All 254 counties** | 254 | ~$0.15 | **~$38** |
| **API calls for all 254** | 254 x 4 | = 1,016 calls | |

**Note:** Seeding is a one-time operation per election cycle, not a recurring cost. The $38 estimate for all 254 counties is extremely reasonable.

### Optimization Opportunities

1. **County info is nearly identical** — Many rural counties share the same election day hours (7 AM - 7 PM), the same early voting schedule, and similar resources. A template-based approach for small counties would eliminate ~224 API calls.
2. **Precinct map accuracy is questionable** — Asking Claude to research ZIP-to-precinct mappings via web search is unreliable. Many counties don't publish this data in a format Claude can find. Consider using census/GIS data directly instead of AI.
3. **Reduce max_uses from 10 to 5** — The county seeder allows 10 web searches per call (vs 5 in the updater). For smaller counties with fewer races, 5 searches would suffice and save ~2,500 input tokens per call.

---

## 4. Tone Variant Generation (`worker/src/index.js`, lines 2400-2650)

### Model & Configuration

| Setting | Value |
|---------|-------|
| **Model** | `claude-sonnet-4-20250514` |
| **max_tokens** | 2,048 |
| **Web search** | No |
| **Valid tones** | 1 (simple), 3 (standard/no-op), 4 (detailed), 6 (Swedish Chef), 7 (Texas Cowboy) |

### Two Tone Endpoints

1. **`/api/election/generate-tones`** — Rewrites proposition text (description, ifPasses, ifFails, background, fiscalImpact)
2. **`/api/election/generate-candidate-tones`** — Rewrites candidate text (summary, pros, cons)

### Tone 3 is Free (No API Call)

Tone 3 is the default "standard" tone. When tone=3 is requested, the original text is simply stored in the tone-keyed object format with no API call. Only tones 1, 4, 6, 7 require API calls (4 tones that cost money).

### Token Estimates Per Tone Call

| Call Type | Input Tokens | Output Tokens | Cost |
|-----------|-------------|---------------|------|
| **Proposition tone** | ~200-400 (prompt + 5 fields of text) | ~200-400 | ~$0.005 |
| **Candidate tone** | ~200-500 (prompt + summary + pros + cons) | ~200-500 | ~$0.009 |

### Total Cost for Pre-generation

From the seeding instructions (`docs/scripts/seeding_instructions.md`):

| Scope | Scale | Cost |
|-------|-------|------|
| **Per candidate per tone** | ~$0.02-$0.05 | (as documented) |
| **Statewide ballots** | ~80-120 candidates x 4 tones = 320-480 calls | **~$10-$25** |
| **All 30 counties** | Highly variable (depends on local race count) | **~$5-$15** (estimated) |
| **Total one-time cost** | | **~$15-$40** |

### Pre-generation vs On-demand

The current approach (pre-generation) is **correct** for this use case:

**Pros of pre-generation:**
- Zero latency when user switches reading levels (instant UI)
- Predictable, one-time cost per election cycle
- No API call on every tone switch (which would be per-user)

**Cons of pre-generation:**
- One-time upfront cost of ~$15-$40
- Must re-run after daily updater changes candidate data

**On-demand would be worse** because:
- Every user switching tones would trigger an API call (~$0.009 each)
- Even 100 users trying a different tone = $0.90, which approaches the one-time pre-gen cost
- Added latency to the user experience

**Verdict:** Pre-generation is the right approach. No change needed.

---

## 5. Audit Runner (`worker/src/audit-runner.js`)

### Model & Configuration

The audit runner calls **4 different AI providers** to independently evaluate the app's methodology.

| Provider | Model | max_tokens | Input $/M | Output $/M |
|----------|-------|-----------|-----------|------------|
| **ChatGPT** | gpt-4o | 8,192 | $2.50 | $10.00 |
| **Gemini** | gemini-2.5-flash | 8,192 | $0.30 | $2.50 |
| **Grok** | grok-3 | 8,192 | $3.00 | $15.00 |
| **Claude** | claude-sonnet-4-20250514 | 4,096 | $3.00 | $15.00 |

### Token Estimates Per Audit

The audit prompt consists of a fixed preamble (~500 tokens) + the full methodology export JSON. The methodology export is a large JSON object containing all prompts, data structures, interview questions, safeguards, etc.

| Component | Estimated Tokens | Notes |
|-----------|-----------------|-------|
| **Audit prompt preamble** | ~500 tokens | Dimension descriptions, output format instructions |
| **Methodology export JSON** | ~5,000-7,000 tokens | Large JSON with all prompts, interview questions, policy deep dives, safeguards |
| **Total input per provider** | ~5,500-7,500 tokens | |
| **Output per provider** | ~2,000-4,000 tokens | Detailed 5-dimension audit report + JSON scores block |

### Cost Per Audit Run (All 4 Providers)

| Provider | Input Cost | Output Cost | **Total** |
|----------|-----------|-------------|-----------|
| **ChatGPT** | $0.017 | $0.030 | **$0.047** |
| **Gemini** | $0.002 | $0.008 | **$0.010** |
| **Grok** | $0.020 | $0.045 | **$0.065** |
| **Claude** | $0.020 | $0.045 | **$0.065** |
| **Total per run** | | | **~$0.19** |

### Daily Cost

The audit runs daily via cron (`scheduled()` handler) and has a 1-hour cooldown per provider.

| Frequency | Cost |
|-----------|------|
| **Per run** | ~$0.19 |
| **Monthly (30 days)** | **~$5.70** |
| **Until election day (March 3)** | ~9 days x $0.19 = **~$1.71** |

### Optimization Opportunities

1. **Reduce frequency** — After initial audit stabilization, running daily adds little value. Weekly would save ~75% ($4.28/month).
2. **Drop Grok** — Grok-3 at $3/$15 per M tokens is expensive and provides similar analysis to Claude. Dropping it saves ~$0.065/run = ~$2/month.
3. **The audit stops after election day** — Already implemented. Good.

---

## Cost Summary

### Recurring Monthly Costs

| Component | Frequency | Monthly Cost | Notes |
|-----------|-----------|-------------|-------|
| **Daily updater** | Daily (auto) | **~$20/month** | Biggest recurring cost |
| **Audit runner** | Daily (auto) | **~$5.70/month** | Stops after election day |
| **Guide generation** | Per user | **Variable** | ~$0.02-$0.07 per guide |
| **Summary regeneration** | Per user | **Variable** | ~$0.002 per call |
| **Total fixed recurring** | | **~$26/month** | |

### One-Time Costs (Per Election Cycle)

| Component | Cost | Notes |
|-----------|------|-------|
| **County seeding (30 counties)** | ~$4.50 | Already complete |
| **County seeding (all 254)** | ~$38 | If expanded |
| **Tone pre-generation (statewide)** | ~$10-$25 | Already complete |
| **Tone pre-generation (counties)** | ~$5-$15 | Already complete |
| **Total one-time** | **~$20-$78** | |

### Variable Costs (User-Driven)

| Users/Month | Guides (assuming 50% generate a guide) | Monthly Cost |
|-------------|---------------------------------------|-------------|
| 100 | 50 guides | ~$1-$4 |
| 1,000 | 500 guides | ~$10-$37 |
| 10,000 | 5,000 guides | ~$100-$370 |
| 100,000 | 50,000 guides | ~$1,000-$3,700 |

---

## Top 3 Optimization Opportunities (Ranked by Impact)

### 1. Cache Spanish Candidate Translations in KV (Save ~40% on Spanish guides)

**Current:** Every Spanish guide request sends the full ballot + asks Claude to generate both recommendations AND `candidateTranslations` for every candidate's summary, positions, pros, and cons. This adds ~2,000 output tokens ($0.030) per guide.

**Proposed:** Pre-generate Spanish translations of candidate data (similar to tone variants) and store in KV. The guide generation call would then only need to generate the recommendation JSON, not re-translate all candidate data every time.

**Estimated savings:** ~$0.030 per Spanish guide. If 20% of users choose Spanish, savings = 20% x guides x $0.030.

**Complexity:** Medium. Requires a new KV key structure and a translation seeding script.

### 2. Reduce Daily Updater Frequency for Stale Races (Save ~$8-12/month)

**Current:** Every contested race is re-researched daily, even races that have returned all-null updates for days. Each call with web search costs ~$0.027.

**Proposed:** Track `lastMeaningfulUpdate` per race. After 3 consecutive days with no updates, switch to every-3-days research. Reset to daily if an update is found. Also reduce `max_uses` for web search from 5 to 3 for lower-ballot races (Court of Appeals, Board of Education).

**Estimated savings:** If 60% of races go stale, saves ~15 calls/day x $0.027 = ~$0.40/day = **~$12/month**.

**Complexity:** Low. Add a counter to the update log and check before calling `researchRace()`.

### 3. Consider Gemini 2.5 Flash as Default Guide LLM (Save ~80% on guide generation)

**Current:** Claude Sonnet at $3/$15 per M tokens.

**Proposed:** Test Gemini 2.5 Flash ($0.30/$2.50 per M tokens) as the default for guide generation. It's 10x cheaper on input and 6x cheaper on output. The guide generation task (JSON recommendations from structured data) is well-suited for a fast model.

**Estimated savings:** Guide cost drops from ~$0.042 to ~$0.006 for a full English ballot. At 500 guides/month, saves ~$18/month.

**Risks:** Need to validate output quality, JSON parsing reliability, and recommendation quality. Should A/B test before switching. Users can already manually select Gemini, so some data may already exist.

**Complexity:** Low (already implemented as an option). Just need quality validation and a config change.

---

## Additional Recommendations

### Quick Wins (No Code Changes)

1. **Monitor actual usage** — Add logging to track input_tokens and output_tokens from API responses. The usage object is already returned by Claude (`data.usage.input_tokens`, `data.usage.output_tokens`) but is not currently logged or tracked.
2. **Set Anthropic API spend alerts** — Configure billing alerts at $25/month and $50/month thresholds.

### Medium-Term

3. **Prompt caching for guide generation** — Anthropic's prompt caching could reduce the system prompt cost by 90% on cache hits. The system prompt (~200 tokens) is identical across all requests. Small per-request savings but architecturally clean.
4. **Deprecate Grok from audit runner** — At $3/$15 per M tokens (same as Claude), Grok provides a redundant data point. Three auditors (ChatGPT, Gemini, Claude) provide sufficient independent review.
5. **Batch tone regeneration after daily updates** — When the daily updater changes a candidate's summary/pros/cons, automatically queue tone regeneration for that candidate's changed fields only, rather than re-running the full tone seeder.

### Post-Election

6. **Architecture review for general elections** — General elections will have more races, more candidates, and higher traffic. The current per-user guide generation model may need response caching (e.g., cache guide responses by profile hash for 1 hour).
