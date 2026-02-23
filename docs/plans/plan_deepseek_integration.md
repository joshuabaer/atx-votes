# Plan: DeepSeek Model Integration

**Status:** Planned

## Summary

Add DeepSeek as another LLM option alongside Claude, GPT, Gemini, and Grok for guide generation, vanity URL, and AI audit.

## Requirements

- Vanity URL: `/deepseek` entry point
- Query param: `?deepseek` flag on `/app`
- "Powered by DeepSeek" badge on loading screen and ballot header
- AI audit provider: submit methodology export for bias scoring
- **Prominent persistent warning banner** on all DeepSeek-generated pages:
  > "This is a Chinese open-source model, available for research/comparison purposes only. No personal information is shared with China — all processing runs through US-hosted API infrastructure."

## Implementation

### 1. LLM Router (pwa-guide.js)
- Add `deepseek` to `VALID_LLMS`
- Add DeepSeek API endpoint and model name
- Route through US-hosted API (e.g., Together AI, Fireworks, or DeepSeek's US endpoint)

### 2. PWA (pwa.js)
- Add `deepseek` to query param detection
- Add branded loading screen and ballot header badge
- Add persistent warning banner (sticky, red/orange, cannot be dismissed)

### 3. Landing Page (index.js)
- Add `/deepseek` vanity URL route
- Add branded link preview (OG tags)

### 4. Audit Runner (audit-runner.js)
- Add DeepSeek as 5th audit provider
- Configure API key via `DEEPSEEK_API_KEY` secret

### 5. Warning Banner Design
- Sticky banner at top of viewport
- Red/orange background, white text
- Cannot be dismissed while DeepSeek is active
- Text: "This is a Chinese open-source model, available for research/comparison purposes only. No personal information is shared with China — all processing runs through US-hosted API infrastructure."

## Files to Modify

- `worker/src/pwa-guide.js` — LLM router, API call
- `worker/src/pwa.js` — query param, badges, warning banner
- `worker/src/index.js` — vanity URL, OG tags
- `worker/src/audit-runner.js` — audit provider
- `worker/wrangler.txvotes.toml` — DEEPSEEK_API_KEY secret

## API Key

```bash
cd worker && npx wrangler secret put DEEPSEEK_API_KEY -c wrangler.txvotes.toml
```
