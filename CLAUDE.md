# Texas Votes

## Deployment

Primary deployment target is **txvotes.app**:

```bash
cd worker && npx wrangler deploy -c wrangler.txvotes.toml
```

After deploying, users may need to visit `https://txvotes.app/app/clear` to flush the service worker cache.

**WARNING:** `npx wrangler deploy` (no `-c` flag) deploys to the legacy atxvotes.app worker. Always use `-c wrangler.txvotes.toml` for txvotes.app.

### Two Workers, Shared KV

| Site | Worker | Config |
|------|--------|--------|
| **txvotes.app** (primary) | `txvotes-api` | `wrangler.txvotes.toml` |
| **atxvotes.app** (legacy) | `atxvotes-api` | `wrangler.toml` |

Both workers share the same `ELECTION_DATA` KV namespace. Daily cron runs on `atxvotes-api` only; `txvotes-api` reads the same data.

### Secrets (txvotes.app)

```bash
cd worker
npx wrangler secret put ANTHROPIC_API_KEY -c wrangler.txvotes.toml
npx wrangler secret put ADMIN_SECRET -c wrangler.txvotes.toml
```

## Architecture

- **worker/src/index.js** — Cloudflare Worker entry point, routing, static pages
- **worker/src/pwa.js** — Single-file PWA: HTML, CSS, and JS served inline from the worker
- **worker/src/pwa-guide.js** — Claude API integration for personalized voting guide generation
- **worker/src/county-seeder.js** — Data population pipeline for county races/info via Claude + web_search
- **worker/src/updater.js** — Daily updater cron (runs on atxvotes-api only)
- **worker/src/audit-runner.js** — Automated AI audit runner (submits methodology export to ChatGPT, Gemini, Grok, Claude APIs for bias scoring)
- **worker/src/balance-check.js** — API balance/quota checker (`/api/balance-check` endpoint)

## Testing

```bash
cd worker && npx vitest run
```

1075 tests across 13+ test files:

- **interview-flow.test.js** — Interview flow UI tests (happy-dom + vitest)
- **index-helpers.test.js** — Helper functions, route patterns, candidate profiles, data quality
- **pwa-guide.test.js** — Guide generation, prompt building, ballot filtering, merging
- **routes.test.js** — Slug generation, sparse candidates, escaping, routing
- **audit-runner.test.js** — AI audit score parsing, provider calls, validation
- **audit-export.test.js** — Audit export sources, completeness, nonpartisan safeguards
- **interview-edge-cases.test.js** — Edge cases for reading levels, state init, navigation
- **updater.test.js** — Daily update validation, election day cutoff, source extraction
- **bias-test.test.js** — Prompt symmetry, loaded language, cross-party treatment
- **county-seeder.test.js** — County info seeding, ballot seeding, precinct maps
- Plus additional test files for balance-check, caching, and easter egg features

## Key Patterns

- The PWA is a single inline `<script>` built from a JS array joined with `\n` (`APP_JS`)
- pwa.js is very large (~2300+ lines as string array) — use Grep to find references, read in chunks
- Translations use a `TR` dictionary with `t(key)` function; `lang=es` for Spanish
- Guide generation piggybacks candidate translations onto the same Claude API call when `lang=es`
- Interview flow: Phase 0=auto-advance, 1=Tone, 2=Issues, 3=Spectrum, 4=DeepDives, 5=Qualities, 6=Freeform, 7=Address, 8=Building
- Reading level 1-5 maps to tone instructions in pwa-guide.js; level 6 is the Swedish Chef easter egg; level 7 is the Texas Cowboy easter egg; level 8 is the President Trump easter egg
- Easter egg triggers: keyboard shortcuts ("bork" for Chef, "yeehaw"/"cowboy" for Cowboy, "trump"/"maga" for Trump), 7-tap secret menu on "Powered by Claude" text, vanity URLs (/cowboy, /chef, /trump)
- Novelty tones (6/7/8) show a warning banner on the ballot page reminding users it's a fun mode
- Guide response caching: SHA-256 hash of inputs, 1-hour TTL in KV, `?nocache=1` query param bypasses cache
- max_tokens for guide: 2048 English, 4096 Spanish cached, 8192 Spanish fresh
- KV reads in handlePWA_Guide are parallelized via `Promise.all()`
- Uncontested races are stripped of detailed descriptions in ballot data

## Footer Consistency

- There are two sets of footers: static pages (index.js) and PWA app (pwa.js)
- When changing footer styling (colors, links, layout), BOTH must be updated
- Static page footers are in `handleXxx()` functions in index.js
- PWA footer is in the APP_JS string array in pwa.js

## County Seeder

- Error classification system categorizes failures for retry logic
- KV-based progress tracking allows resuming interrupted batch seeds
- 150/254 Texas counties enriched; ~104 still on template data

## Audit System

- Audit runner supports 4 providers: ChatGPT, Gemini, Claude, Grok
- After deploying, always check `/data-quality` and `/audit` pages for regressions
- Cron automations stop after election day
