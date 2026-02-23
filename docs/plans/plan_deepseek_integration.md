# Plan: DeepSeek Model Integration

**Status:** Planned

## Summary

Add DeepSeek as another LLM option alongside Claude, GPT, Gemini, and Grok for guide generation, vanity URL, and AI audit.

## Privacy & Security

**Requirement: DeepSeek model must run on US-hosted infrastructure only.**

DeepSeek is a Chinese company (Hangzhou). Guide generation sends sensitive political preference data (ranked issues, political spectrum, address, freeform text). To ensure no user data reaches Chinese-controlled infrastructure:

- **Use Together AI or Fireworks AI** to host the DeepSeek model (open-source weights running on US servers)
- **Do NOT use DeepSeek's own API endpoints** — even their US endpoint is owned by a Chinese company subject to Chinese data laws
- The model weights are open-source and do not phone home — only the API endpoint matters
- With US-hosted providers, DeepSeek the company never sees any user data

This allows the warning banner to honestly state "No personal information is shared with China."

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
- Add Together AI or Fireworks AI endpoint with DeepSeek model name (e.g., `deepseek-ai/DeepSeek-V3` on Together)
- **Must use US-hosted provider** — Together AI (`api.together.xyz`) or Fireworks AI (`api.fireworks.ai`)
- API key: provider's key (Together/Fireworks), NOT DeepSeek's own key

### 2. PWA (pwa.js)
- Add `deepseek` to query param detection
- Add branded loading screen and ballot header badge
- Add persistent warning banner (sticky, red/orange, cannot be dismissed)

### 3. Landing Page (index.js)
- Add `/deepseek` vanity URL route
- Add branded link preview (OG tags)

### 4. Audit Runner (audit-runner.js)
- Add DeepSeek as 5th audit provider
- Route through same US-hosted provider

### 5. Warning Banner Design
- Sticky banner at top of viewport
- Red/orange background, white text
- Cannot be dismissed while DeepSeek is active
- Text: "This is a Chinese open-source model, available for research/comparison purposes only. No personal information is shared with China — all processing runs through US-hosted API infrastructure."

## Files to Modify

- `worker/src/pwa-guide.js` — LLM router, API call via Together/Fireworks
- `worker/src/pwa.js` — query param, badges, warning banner
- `worker/src/index.js` — vanity URL, OG tags
- `worker/src/audit-runner.js` — audit provider
- `worker/wrangler.txvotes.toml` — API key secret for US provider

## API Key

```bash
# Together AI or Fireworks AI key (NOT DeepSeek's own key)
cd worker && npx wrangler secret put TOGETHER_API_KEY -c wrangler.txvotes.toml
```
