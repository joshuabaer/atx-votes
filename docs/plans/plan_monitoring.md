# Monitoring & Alerting Plan

## Current State — What Exists

| What | Where | Limitation |
|------|-------|------------|
| Analytics Engine events | `/app/api/ev` | Passive — must query manually or visit `/admin/analytics` |
| Admin analytics dashboard | `/admin/analytics` | Shows 7-day guide_error counts, must visit page |
| Data quality dashboard | `/data-quality` | Shows today's update log errors, no push notifications |
| Audit results | `/audit` page, `audit:summary` in KV | Shows failures only if you visit |
| Update logs | `update_log:{YYYY-MM-DD}` in KV | Never checked automatically |
| Cloudflare Web Analytics | Beacon injection | Page views only, no alerts |

**Not monitored:** cron failures, API key expiration, KV read/write failures, guide generation error spikes, `scheduled()` handler exceptions.

## What Can Go Wrong

| Risk | Impact | Likelihood | Detection Today |
|------|--------|------------|-----------------|
| Anthropic API key expires | Guide gen breaks for all | Medium | None |
| Cron silently stops | Ballot data goes stale | Medium | None |
| Guide generation error spike | Users see errors | Medium | Only if you check `/admin/analytics` |
| Worker deployment breaks routing | 500/404 errors | Low | None unless users report |
| KV namespace issue | Data unavailable | Low | None |
| OpenAI/Gemini/Grok key expires | Audit/alt LLMs break | Low | No notification |

## Recommended Stack

### Layer 1: Cloudflare Built-in Alerts (Free, 5 min setup)

Go to **Cloudflare Dashboard > Notifications**:

1. **Workers Error Rate Alert** — triggers when >5% of requests return 5xx in 5 minutes
2. **Workers Usage Alert** — triggers at 80% of plan limits
3. **Workers Health Alert** — sustained elevated error counts

Zero code changes. Sends email to your Cloudflare account.

### Layer 2: /health Endpoint + UptimeRobot (Free, ~1 hour)

**Route**: `GET /health` (public, no auth, returns no secrets)

Returns 200 if healthy, 503 if degraded.

**Checks performed**:
1. KV readable — read `manifest` key
2. Ballot data exists — both statewide ballots present
3. Cron freshness — today's or yesterday's `cron_status:{date}` exists
4. Audit freshness — `audit:summary` lastRun within 48 hours
5. API key present — `env.ANTHROPIC_API_KEY` is truthy

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-22T18:00:00Z",
  "checks": {
    "kv": { "ok": true },
    "ballotData": { "ok": true, "republican": true, "democrat": true },
    "cronFreshness": { "ok": true, "lastRun": "2026-02-22" },
    "auditFreshness": { "ok": true, "lastRun": "2026-02-22T12:00:00Z" },
    "apiKey": { "ok": true }
  }
}
```

**External monitor**: UptimeRobot free tier (50 monitors, 5-min intervals, email + push + 1 SMS/month). URL: `https://txvotes.app/health`.

### Layer 3: Cron Success Tracking (Free, ~30 min)

Refactor `scheduled()` to wrap tasks in try/catch and write `cron_status:{date}` to KV:

```javascript
const cronLog = { timestamp: new Date().toISOString(), tasks: {} };

try {
  const result = await runDailyUpdate(env);
  cronLog.tasks.dailyUpdate = { status: "success", ...result };
} catch (err) {
  cronLog.tasks.dailyUpdate = { status: "error", error: err.message };
}

await env.ELECTION_DATA.put(`cron_status:${today}`, JSON.stringify(cronLog));
```

The `/health` endpoint reads this to verify cron ran successfully.

### Layer 4: Discord Webhook Alerts (Optional, ~30 min)

For immediate push notifications:

1. Create Discord server + webhook URL
2. Store as secret: `npx wrangler secret put DISCORD_WEBHOOK_URL`
3. Add `notifyDiscord(env, message)` helper
4. Call from `scheduled()` when errors occur

```javascript
async function notifyDiscord(env, message) {
  if (!env.DISCORD_WEBHOOK_URL) return;
  try {
    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  } catch { /* non-fatal */ }
}
```

## What NOT to Build

- No Grafana/Prometheus — overkill for solo developer
- No PagerDuty/OpsGenie — designed for teams
- No custom monitoring dashboard — existing pages cover visibility; need _alerting_ not _visibility_
- No Sentry — Analytics Engine captures errors already
- No SMS gateway — UptimeRobot + Discord cover it

## Implementation Plan

### Phase 1: Zero-Code Quick Wins (15 min)
1. Cloudflare Dashboard: Workers Error Rate notification
2. Cloudflare Dashboard: Workers Usage notification
3. UptimeRobot: Basic HTTP check on `https://txvotes.app/`

### Phase 2: /health Endpoint (1 hour)
- Add `handleHealthCheck(env)` to `worker/src/index.js`
- Add GET route before landing page fallback
- Deploy, update UptimeRobot to hit `/health`

### Phase 3: Cron Success Tracking (30 min)
- Refactor `scheduled()` with try/catch and `cron_status` KV writes
- Update `/health` to read cron status
- Deploy to both workers

### Phase 4: Discord Webhook (30 min, optional)
- Create Discord webhook
- Store as secret on both workers
- Add `notifyDiscord()` helper
- Call from error paths in `scheduled()`

## Cost

| Component | Cost |
|-----------|------|
| Cloudflare alerts | Free (included in $5/mo plan) |
| UptimeRobot free tier | Free |
| Discord webhook | Free |
| /health KV reads | ~35K/month (within 10M limit) |
| Cron status KV writes | ~30/month (negligible) |
| **Total** | **$0** |

## Files to Modify

| File | Changes |
|------|---------|
| `worker/src/index.js` | Add `/health` route, `handleHealthCheck()`, refactor `scheduled()` with try/catch and cron_status writes, add `notifyDiscord()` |
| `worker/wrangler.txvotes.toml` | Reference for DISCORD_WEBHOOK_URL secret |
| `worker/wrangler.toml` | Cron runs on atxvotes-api; needs same `scheduled()` refactor |
