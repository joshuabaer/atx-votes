# ATX Votes

## Deployment

After every `git push`, deploy the Cloudflare Worker to production:

```bash
cd worker && npx wrangler deploy
```

This is required because git push does NOT auto-deploy. The live site (atxvotes.app) serves from the Cloudflare Worker, not from git.

After deploying, users may need to visit `https://atxvotes.app/app/clear` to flush the service worker cache.

## Architecture

- **worker/src/index.js** — Cloudflare Worker entry point, routing, static pages
- **worker/src/pwa.js** — Single-file PWA: HTML, CSS, and JS served inline from the worker
- **worker/src/pwa-guide.js** — Claude API integration for personalized voting guide generation
- **worker/wrangler.toml** — Cloudflare Worker configuration

## Key Patterns

- The PWA is a single inline `<script>` built from a JS array joined with `\n` (`APP_JS`)
- Translations use a `TR` dictionary with `t(key)` function; `lang=es` for Spanish
- Guide generation piggybacks candidate translations onto the same Claude API call when `lang=es`
