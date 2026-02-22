# Texas Votes — County Data Seeding Instructions

## Overview

Two scripts populate the Texas Votes app with county-level election data:

1. **seed_county_ballots.js** — Researches and writes county ballot data, voting info, and precinct maps
2. **seed_candidate_tones.js** — Generates tone variants (cowboy, chef, formal, casual) for candidate text

Both scripts:
- Use the Anthropic API with `web_search` tool
- Write to Cloudflare KV via `wrangler` CLI
- Track progress in JSON files so they can resume after interruption
- Have `--dry-run` mode for testing

## Prerequisites

1. **Node.js 18+** (needed for native `fetch`)
2. **Wrangler CLI** installed: `npm install -g wrangler`
3. **Wrangler authenticated**: `npx wrangler login`
4. **Anthropic API key** with web_search access
5. Verify wrangler can reach KV:
   ```bash
   cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Xcode/ATXVotes/worker
   npx wrangler kv:key list --binding=ELECTION_DATA --prefix=ballot:statewide: | head -5
   ```

## Script 1: seed_county_ballots.js

### What it does

For each of the top 30 Texas counties (by population), it:
1. Researches county voting info (hours, locations, phone, website) via Claude + web_search
2. Researches Republican primary local races (county judge, commissioners, sheriff, etc.)
3. Researches Democrat primary local races
4. Researches ZIP-to-commissioner-precinct mapping

Each step is an independent Claude API call with web_search enabled.

### KV keys written

| Key pattern | Description |
|---|---|
| `county_info:{fips}` | Voting logistics (hours, locations, contact) |
| `ballot:county:{fips}:republican_primary_2026` | Republican local races |
| `ballot:county:{fips}:democrat_primary_2026` | Democrat local races |
| `precinct_map:{fips}` | ZIP code to commissioner precinct mapping |

### Running it

**Full run (all 30 counties, all steps):**
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_county_ballots.js
```

**Dry run first (see what would happen):**
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_county_ballots.js --dry-run
```

**Single county test:**
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_county_ballots.js --county=48201
```

**Only one party:**
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_county_ballots.js --party=democrat
```

**Only ballots (skip county info and precinct maps):**
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_county_ballots.js --only-ballots
```

**Only county info:**
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_county_ballots.js --only-info
```

**Skip county info (do ballots + precinct maps):**
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_county_ballots.js --skip-info
```

### Time and cost estimates

- **Per API call**: ~15-30 seconds (web_search adds latency)
- **Per county**: 4 API calls (info + 2 ballots + precinct map) = ~1-2 minutes
- **All 30 counties**: ~120 API calls = ~45-60 minutes
- **API cost**: ~$0.10-0.20 per call with web_search = ~$12-24 total

### Resuming after interruption

Progress is saved to `/tmp/seed_county_progress.json` after every step. If the script is interrupted (Ctrl+C, rate limit, etc.), just re-run it and it will skip completed steps.

To start completely fresh:
```bash
rm /tmp/seed_county_progress.json
```

### Checking results

After seeding, verify data in KV:
```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Xcode/ATXVotes/worker

# List all county ballot keys
npx wrangler kv:key list --binding=ELECTION_DATA --prefix=ballot:county:

# Read a specific county ballot
npx wrangler kv:key get "ballot:county:48201:republican_primary_2026" --binding=ELECTION_DATA | python3 -m json.tool | head -30

# Check county info
npx wrangler kv:key get "county_info:48201" --binding=ELECTION_DATA | python3 -m json.tool

# Check precinct map
npx wrangler kv:key get "precinct_map:48201" --binding=ELECTION_DATA | python3 -m json.tool
```

Or visit the admin coverage dashboard (requires ADMIN_SECRET):
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" https://txvotes.app/admin/coverage
```

---

## Script 2: seed_candidate_tones.js

### What it does

For each candidate in the ballot data, generates tone variants of their `summary`, `pros`, and `cons` text fields. The app uses these variants based on the user's reading level / tone preference.

### Tone levels

| Tone | Label | Description |
|---|---|---|
| 1 | High School | Simple, everyday language |
| 3 | Standard | Default news-level (original text, stored as-is) |
| 4 | Detailed | Precise political terminology |
| 6 | Swedish Chef | Muppet-Swedish gibberish (bork bork bork!) |
| 7 | Texas Cowboy | Folksy ranch metaphors (y'all, reckon, fixin' to) |

### Data format

Before tones, a candidate's summary is a plain string:
```json
"summary": "Former city council member focused on infrastructure."
```

After tones, it becomes a keyed object:
```json
"summary": {
  "1": "Used to be on city council. Wants to fix roads and bridges.",
  "3": "Former city council member focused on infrastructure.",
  "4": "Former municipal legislator with a policy emphasis on infrastructure modernization.",
  "6": "Zee former ceety cooncil member who loves zee roads und bridges, bork bork!",
  "7": "Well partner, this ol' city council hand knows a thing or two about keepin' the roads fit for a cattle drive."
}
```

The same pattern applies to `pros` and `cons` arrays, where each element becomes a tone-keyed object.

### Running it

**Statewide ballots only (recommended first):**
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_candidate_tones.js --statewide-only
```

**Dry run:**
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_candidate_tones.js --dry-run
```

**Single tone for testing:**
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_candidate_tones.js --tone=7 --statewide-only
```

**Single party:**
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_candidate_tones.js --party=republican --statewide-only
```

**Specific county:**
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_candidate_tones.js --county=48453
```

**All county ballots (run after seed_county_ballots.js):**
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_candidate_tones.js --all-counties
```

### Time and cost estimates

- **Per candidate per tone**: ~5-10 seconds, ~$0.02-0.05
- **Statewide ballots**: ~80-120 candidates x 4 tones = ~320-480 API calls = ~30-60 min, ~$10-25
- **All 30 counties**: highly variable (depends on how many local races exist)

### Resuming after interruption

Progress is saved to `/tmp/seed_tones_progress.json`. Re-run to continue.

To start fresh:
```bash
rm /tmp/seed_tones_progress.json
```

---

## Recommended Workflow

### Step 1: Seed one county as a test
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_county_ballots.js --county=48201 --dry-run
# If output looks right:
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_county_ballots.js --county=48201
```

### Step 2: Verify the test county
```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Xcode/ATXVotes/worker
npx wrangler kv:key get "ballot:county:48201:republican_primary_2026" --binding=ELECTION_DATA | python3 -m json.tool | head -50
npx wrangler kv:key get "ballot:county:48201:democrat_primary_2026" --binding=ELECTION_DATA | python3 -m json.tool | head -50
npx wrangler kv:key get "county_info:48201" --binding=ELECTION_DATA | python3 -m json.tool
```

### Step 3: Seed all 30 counties
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_county_ballots.js
```
This will take ~45-60 minutes. You can safely Ctrl+C and resume later.

### Step 4: Generate statewide tone variants
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_candidate_tones.js --statewide-only
```

### Step 5: Generate county tone variants
```bash
ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_candidate_tones.js --all-counties
```

### Step 6: Deploy and verify
```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Xcode/ATXVotes/worker
npx wrangler deploy
```

Then visit the admin coverage dashboard to verify everything is in place.

---

## Troubleshooting

### "Claude API returned 429"
Rate limiting. The scripts have built-in retry logic with exponential backoff. If you see persistent 429s, increase `RATE_LIMIT_DELAY_MS` in the script (default: 3000ms for ballots, 2000ms for tones).

### "Failed to parse response as JSON"
Occasionally Claude returns text that isn't valid JSON. The step will be recorded as an error and can be retried by re-running the script.

### "npx wrangler kv:key put" fails
Make sure you're authenticated with wrangler (`npx wrangler login`) and the KV namespace exists. Verify with:
```bash
npx wrangler kv:key list --binding=ELECTION_DATA --prefix=ballot: | head
```

### Stale progress file
If you want to re-seed a county that was already completed:
```bash
# Edit the progress file to remove specific entries
python3 -c "
import json
p = json.load(open('/tmp/seed_county_progress.json'))
# Remove all Harris County entries
p['completed'] = {k:v for k,v in p['completed'].items() if '48201' not in k}
json.dump(p, open('/tmp/seed_county_progress.json','w'), indent=2)
"
```

Or just delete the progress file to start fresh.

## Files Reference

| File | Purpose |
|---|---|
| `/tmp/seed_county_ballots.js` | County ballot seeder script |
| `/tmp/seed_candidate_tones.js` | Candidate tone generator script |
| `/tmp/seed_county_progress.json` | Ballot seeder progress (auto-created) |
| `/tmp/seed_tones_progress.json` | Tone generator progress (auto-created) |
| `/tmp/seed_county_log.json` | Ballot seeder completion log |
| `/tmp/seed_tones_log.json` | Tone generator completion log |
