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
- **worker/tests/interview-flow.test.js** — 64 interview flow UI tests (happy-dom + vitest)

## Testing

```bash
cd worker && npx vitest run
```

101 tests total: 64 interview flow + 37 pwa-guide.

## Key Patterns

- The PWA is a single inline `<script>` built from a JS array joined with `\n` (`APP_JS`)
- pwa.js is very large (~2300+ lines as string array) — use Grep to find references, read in chunks
- Translations use a `TR` dictionary with `t(key)` function; `lang=es` for Spanish
- Guide generation piggybacks candidate translations onto the same Claude API call when `lang=es`
- Interview flow: Phase 0=auto-advance, 1=Tone, 2=Issues, 3=Spectrum, 4=DeepDives, 5=Qualities, 6=Freeform, 7=Address, 8=Building
- Reading level 1-5 maps to tone instructions in pwa-guide.js; level 6 is the Swedish Chef easter egg
