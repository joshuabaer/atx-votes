# Texas Votes

## Deployment — Two Sites

There are two independent Cloudflare Workers sharing the same KV namespace:

| Site | Worker | Config | Branch |
|------|--------|--------|--------|
| **atxvotes.app** (legacy) | `atxvotes-api` | `wrangler.toml` | `main` |
| **txvotes.app** (new) | `txvotes-api` | `wrangler.txvotes.toml` | `interview-flow-tests` |

### Deploy to txvotes.app (Texas Votes)

```bash
cd worker && npx wrangler deploy -c wrangler.txvotes.toml
```

### Deploy to atxvotes.app (ATX Votes — legacy)

```bash
cd worker && npx wrangler deploy
```

**WARNING:** `npx wrangler deploy` (no `-c` flag) always deploys to atxvotes.app. Never run the default deploy from the rebranded branch.

After deploying, users may need to visit the `/app/clear` path to flush the service worker cache.

### Set secrets for txvotes.app

```bash
cd worker
npx wrangler secret put ANTHROPIC_API_KEY -c wrangler.txvotes.toml
npx wrangler secret put ADMIN_SECRET -c wrangler.txvotes.toml
```

## Architecture

- **worker/src/index.js** — Cloudflare Worker entry point, routing, static pages
- **worker/src/pwa.js** — Single-file PWA: HTML, CSS, and JS served inline from the worker
- **worker/src/pwa-guide.js** — Claude API integration for personalized voting guide generation
- **worker/src/county-seeder.js** — Data population pipeline for county races/info
- **worker/src/updater.js** — Daily updater cron (runs on atxvotes-api only)
- **worker/wrangler.toml** — Config for atxvotes.app worker
- **worker/wrangler.txvotes.toml** — Config for txvotes.app worker

## Key Patterns

- The PWA is a single inline `<script>` built from a JS array joined with `\n` (`APP_JS`)
- Translations use a `TR` dictionary with `t(key)` function; `lang=es` for Spanish
- Guide generation piggybacks candidate translations onto the same Claude API call when `lang=es`
- Both workers share the same `ELECTION_DATA` KV namespace — data is factual and site-agnostic
- Daily cron runs on `atxvotes-api` only; `txvotes-api` reads the same KV data
