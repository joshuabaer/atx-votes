# Analytics Event Tracking — Implementation Plan

## 1. Current State

The app already includes **Cloudflare Web Analytics** (the privacy-friendly beacon at
`static.cloudflareinsights.com/beacon.min.js`), configured via `CF_BEACON_TOKEN` in
`worker/wrangler.toml`. This provides anonymous page-view counts — no cookies, no
personal data. It is injected into every HTML response by the `injectBeacon()` function
in `worker/src/index.js` (line 1382).

Cloudflare Web Analytics tracks **page views only**. It does not support custom events,
funnels, or user-defined metrics. For the event tracking described in this plan, a
different mechanism is required.

---

## 2. Options Evaluated

### Option A: Cloudflare Workers Analytics Engine (Recommended)

Cloudflare's built-in analytics engine designed for Workers. Write data points directly
from the Worker runtime; query via SQL API.

| Aspect | Detail |
|---|---|
| **Binding** | `[[analytics_engine_datasets]]` in `wrangler.toml` |
| **Write API** | `env.ANALYTICS.writeDataPoint({ blobs, doubles, indexes })` |
| **Query API** | SQL over HTTP (`/client/v4/accounts/{id}/analytics_engine/sql`) |
| **Limits** | 20 blobs + 20 doubles per data point; 250 writes per invocation |
| **Retention** | 90 days |
| **Free tier** | 100K data points/day written; 10K queries/day |
| **Paid tier** | 10M points/month included; $0.25 per additional million |
| **Billing** | Currently not billed (free during beta/rollout) |
| **Privacy** | Data never leaves Cloudflare; no client-side state; no cookies |
| **Visualization** | SQL API + Grafana connector, or build a simple admin dashboard |

Pros:
- Zero additional infrastructure — runs inside the Worker we already have
- No third-party scripts loaded on the client
- No cookies, no localStorage, no fingerprinting
- Sub-millisecond write (fire-and-forget, non-blocking)
- SQL queries for ad-hoc analysis
- Free at current scale; generous paid tier

Cons:
- 90-day retention (sufficient for election cycles; export if archival needed)
- No built-in dashboard UI (must query via API or Grafana)
- Column names are positional (`blob1`, `blob2`, ...) not semantic

### Option B: Self-hosted (Plausible, Umami, Fathom)

These are excellent tools but require running a separate server/database. Plausible and
Umami support custom events. However:

- Adds infrastructure to maintain (Docker, Postgres, or hosted plan costs $9-19/mo)
- Requires loading a client-side script (~1-5KB), adding a DNS/CNAME
- Overkill for a single-purpose election app with a 3-month lifecycle

**Verdict:** Good tools, wrong fit for this project.

### Option C: Custom KV-based counters

Write increment counters directly to Cloudflare KV (already bound as `ELECTION_DATA`).

- Simple, but KV is not designed for high-write analytics (1 write/sec per key limit)
- No time-series, no breakdowns, no SQL queries
- Would require manual aggregation logic

**Verdict:** Too limited and fragile.

### Option D: Third-party SaaS (PostHog, Mixpanel, Amplitude)

Full-featured product analytics platforms.

- Requires client-side SDK (50-200KB), cookies, user identification
- Privacy concerns — data leaves your infrastructure
- Massive overkill for anonymous event counting

**Verdict:** Antithetical to the app's privacy posture.

---

## 3. Recommended Approach

**Cloudflare Workers Analytics Engine** (Option A), using a lightweight client-side
`navigator.sendBeacon()` call to a new Worker endpoint that writes data points
server-side.

### Architecture

```
[Browser]                        [Cloudflare Worker]              [Analytics Engine]
    |                                    |                                |
    |-- sendBeacon(/app/api/ev, JSON) -->|                                |
    |                                    |-- writeDataPoint({...}) ------>|
    |                                    |                                |
    |<-- 204 No Content ----------------|                                |
    |                                    |                                |
    |                            [SQL API query] <-----------------------|
    |                            (admin dashboard or curl)               |
```

Why `sendBeacon`:
- Non-blocking — does not delay user interaction
- Survives page unload (critical for "I Voted" and share actions)
- POST-only, fire-and-forget — perfect for analytics
- No response processing needed
- 64KB limit per payload is more than sufficient (our payloads are ~100 bytes)

---

## 4. Event Schema

### 4.1 Data Point Structure

Every event maps to a single `writeDataPoint()` call using a consistent schema:

| Column | Analytics Engine Field | Purpose | Example |
|---|---|---|---|
| `index` | `indexes[0]` | Daily partition key | `"2026-03-03"` |
| Event name | `blob1` | Event identifier | `"guide_complete"` |
| Language | `blob2` | Current language | `"en"` or `"es"` |
| Detail 1 | `blob3` | Event-specific | `"republican"` |
| Detail 2 | `blob4` | Event-specific | `"phase_3"` |
| Detail 3 | `blob5` | Event-specific | (varies) |
| Value | `double1` | Numeric value | `1` (count) |
| Duration | `double2` | Timing in ms | `45000` |

### 4.2 Event Catalog

| Event Name (`blob1`) | `blob3` | `blob4` | `blob5` | `double1` | `double2` | Trigger |
|---|---|---|---|---|---|---|
| `interview_start` | — | — | — | 1 | — | User clicks "Get Started" (`action==='start'`) |
| `interview_phase` | `"phase_{n}"` | — | — | 1 | — | Each phase transition (`S.phase++`) |
| `interview_complete` | tone value | spectrum | — | 1 | ms since start | `buildGuide()` called |
| `interview_abandon` | `"phase_{n}"` | — | — | 1 | ms since start | `visibilitychange` + `sendBeacon` if mid-interview |
| `tone_select` | tone label | — | — | tone value | — | `action==='select-tone'` |
| `guide_start` | — | — | — | 1 | — | `buildGuide()` entry |
| `guide_complete` | — | — | — | 1 | ms elapsed | `S.guideComplete=true` |
| `guide_error` | error msg (truncated) | — | — | 1 | — | `catch(err)` in `doGuide()` |
| `i_voted` | — | — | — | 1 | — | `action==='mark-voted'` |
| `share_app` | — | — | — | 1 | — | `action==='share-app'` |
| `share_race` | race office | — | — | 1 | — | `action==='share-race'` |
| `share_voted` | — | — | — | 1 | — | `action==='share-voted'` |
| `cheatsheet_print` | — | — | — | 1 | — | `action==='do-print'` |
| `party_switch` | `"republican"` or `"democrat"` | — | — | 1 | — | `action==='set-party'` |
| `lang_toggle` | `"en"` or `"es"` (new lang) | — | — | 1 | — | `action==='set-lang'` |
| `race_view` | race office | district | — | 1 | — | `#/race/{idx}` navigation |
| `cheatsheet_view` | — | — | — | 1 | — | `#/cheatsheet` navigation |

### 4.3 What We Do NOT Track

- No IP addresses stored in data points
- No user identifiers, session IDs, or fingerprints
- No address/ZIP/location data (even though the app collects it for districts)
- No free-form text from the interview
- No localStorage reads
- No cross-page or cross-session linking

---

## 5. Implementation Steps

### Step 1: Add Analytics Engine binding to wrangler.toml

```toml
# In worker/wrangler.toml — add after the KV namespace block:

[[analytics_engine_datasets]]
binding = "ANALYTICS"
dataset = "txvotes_events"
```

Also add to `wrangler.txvotes.toml` if maintaining a separate config.

**Effort: 2 minutes**

### Step 2: Add server-side event endpoint in index.js

Add a new POST route `/app/api/ev` that:
1. Parses a minimal JSON body `{ e: "event_name", p: { ... } }`
2. Validates the event name against an allowlist
3. Calls `env.ANALYTICS.writeDataPoint()`
4. Returns `204 No Content` immediately

```javascript
// In handleRequest(), after the existing POST routes and before the 404:

if (url.pathname === "/app/api/ev") {
  return handleEvent(request, env);
}

// New function:
async function handleEvent(request, env) {
  try {
    const body = await request.json();
    const evt = body.e;        // event name
    const p = body.p || {};    // properties

    // Allowlist validation
    const VALID = new Set([
      "interview_start", "interview_phase", "interview_complete",
      "interview_abandon", "tone_select",
      "guide_start", "guide_complete", "guide_error",
      "i_voted", "share_app", "share_race", "share_voted",
      "cheatsheet_print", "party_switch", "lang_toggle",
      "race_view", "cheatsheet_view"
    ]);
    if (!VALID.has(evt)) {
      return new Response(null, { status: 204 });  // silent drop
    }

    const today = new Date().toISOString().slice(0, 10);

    env.ANALYTICS.writeDataPoint({
      indexes: [today],
      blobs: [
        evt,                                    // blob1: event name
        String(p.lang || "en").slice(0, 2),     // blob2: language
        String(p.d1 || "").slice(0, 128),       // blob3: detail 1
        String(p.d2 || "").slice(0, 128),       // blob4: detail 2
        String(p.d3 || "").slice(0, 128),       // blob5: detail 3
      ],
      doubles: [
        Number(p.v) || 1,                       // double1: value/count
        Number(p.ms) || 0,                      // double2: duration ms
      ],
    });
  } catch (e) {
    // Never fail — analytics should not break the app
  }
  return new Response(null, { status: 204 });
}
```

**Effort: 30 minutes** (including tests)

### Step 3: Add client-side tracking helper in pwa.js

Add a minimal `trk()` function near the top of the APP_JS array (after the i18n block):

```javascript
// Analytics — fire-and-forget, never throws
"function trk(e,p){" +
  "try{navigator.sendBeacon('/app/api/ev',JSON.stringify({e:e,p:Object.assign({lang:LANG},p||{})}))}catch(x){}" +
"}",
```

This is ~140 bytes minified. It:
- Uses `sendBeacon` (survives page unload, non-blocking)
- Always includes current language
- Wraps in try/catch so it never disrupts the app
- Sends JSON (sendBeacon supports Blob/string body)

**Effort: 5 minutes**

### Step 4: Instrument event call sites in pwa.js

Add `trk()` calls at each action handler. These are one-line additions at specific
points in the existing code.

**Interview flow** (in the action handler block, lines ~2094-2162):

```javascript
// action==='start'
"if(action==='start'){S.phase=1;trk('interview_start');S._iStart=Date.now();render()}"

// S.phase++ (the 'next' action)
// After S.phase++, add:
"trk('interview_phase',{d1:'phase_'+S.phase})"

// buildGuide() entry
"function buildGuide(){" +
  "trk('interview_complete',{d1:''+S.readingLevel,d2:S.spectrum,ms:Date.now()-(S._iStart||Date.now())});" +
  "trk('guide_start');" +
  ...
```

**Guide completion/error** (in `doGuide()`, lines ~2250-2308):

```javascript
// After S.guideComplete=true (line 2301):
"trk('guide_complete',{ms:Date.now()-(S._iStart||Date.now())})"

// In catch block (line 2306):
"trk('guide_error',{d1:(err.message||'unknown').slice(0,128)})"
```

**User actions** (in the click handler, lines ~2113-2162):

```javascript
// select-tone — after S.readingLevel assignment:
"trk('tone_select',{d1:TONE_OPTS.find(function(o){return o.v===S.readingLevel})?.l||''+S.readingLevel,v:S.readingLevel})"

// mark-voted:
"trk('i_voted')"

// share-app:
"trk('share_app')"

// share-race:
"trk('share_race',{d1:el.dataset.idx})"

// share-voted:
"trk('share_voted')"

// do-print:
"trk('cheatsheet_print')"

// set-party:
"trk('party_switch',{d1:el.dataset.value})"

// set-lang:
"trk('lang_toggle',{d1:el.dataset.value})"
```

**Navigation events** (in the `render()` hash router, lines ~1233-1236):

```javascript
// #/race/{idx} — after renderRaceDetail:
"trk('race_view',{d1:races[idx]?.office||'',d2:races[idx]?.district||''})"

// #/cheatsheet:
"trk('cheatsheet_view')"
```

**Interview abandonment** (add near the end of APP_JS):

```javascript
"document.addEventListener('visibilitychange',function(){" +
  "if(document.visibilityState==='hidden'&&S.phase>0&&S.phase<8&&!S.guideComplete){" +
    "navigator.sendBeacon('/app/api/ev',JSON.stringify({e:'interview_abandon',p:{lang:LANG,d1:'phase_'+S.phase,ms:Date.now()-(S._iStart||Date.now())}}))" +
  "}" +
"});"
```

**Effort: 1-2 hours** (careful string editing in the APP_JS array)

### Step 5: Update privacy policy text

The existing privacy policy at `/privacy` (line ~503 in index.js) mentions Cloudflare
Web Analytics. Add a sentence about event counting:

> We also count anonymous usage events (like "guide generated" or "cheat sheet printed")
> to improve the app. These counts contain no personal information, no IP addresses,
> and no way to identify individual users.

**Effort: 10 minutes**

### Step 6: Build an admin query endpoint (optional but recommended)

Add a simple `/admin/analytics` GET route behind `ADMIN_SECRET` that queries the
Analytics Engine SQL API and returns a JSON summary. This avoids needing to remember
curl commands.

```javascript
if (url.pathname === "/admin/analytics") {
  const auth = url.searchParams.get("key");
  if (auth !== env.ADMIN_SECRET) return new Response("Unauthorized", { status: 401 });

  const accountId = env.CF_ACCOUNT_ID;  // add as a var in wrangler.toml
  const apiToken = env.CF_ANALYTICS_TOKEN;  // set via wrangler secret put

  const query = url.searchParams.get("q") || `
    SELECT
      blob1 AS event,
      SUM(_sample_interval) AS count
    FROM txvotes_events
    WHERE timestamp > NOW() - INTERVAL '7' DAY
    GROUP BY event
    ORDER BY count DESC
  `;

  const resp = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
    {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiToken}` },
      body: query,
    }
  );
  const data = await resp.json();
  return jsonResponse(data);
}
```

**Effort: 30 minutes**

---

## 6. Example Queries

### Funnel: Interview completion rate

```sql
SELECT
  blob1 AS event,
  SUM(_sample_interval) AS count
FROM txvotes_events
WHERE blob1 IN ('interview_start', 'interview_phase', 'interview_complete', 'interview_abandon')
  AND timestamp > NOW() - INTERVAL '7' DAY
GROUP BY event
ORDER BY count DESC
```

### Phase-by-phase dropoff

```sql
SELECT
  blob3 AS phase,
  SUM(_sample_interval) AS count
FROM txvotes_events
WHERE blob1 = 'interview_phase'
  AND timestamp > NOW() - INTERVAL '7' DAY
GROUP BY phase
ORDER BY phase ASC
```

### Tone selection distribution

```sql
SELECT
  blob3 AS tone,
  SUM(_sample_interval) AS count
FROM txvotes_events
WHERE blob1 = 'tone_select'
  AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY tone
ORDER BY count DESC
```

### Guide error rate

```sql
SELECT
  toStartOfHour(timestamp) AS hour,
  SUM(IF(blob1 = 'guide_complete', _sample_interval, 0)) AS completions,
  SUM(IF(blob1 = 'guide_error', _sample_interval, 0)) AS errors
FROM txvotes_events
WHERE blob1 IN ('guide_complete', 'guide_error')
  AND timestamp > NOW() - INTERVAL '24' HOUR
GROUP BY hour
ORDER BY hour
```

### Language usage

```sql
SELECT
  blob2 AS lang,
  blob1 AS event,
  SUM(_sample_interval) AS count
FROM txvotes_events
WHERE timestamp > NOW() - INTERVAL '7' DAY
GROUP BY lang, event
ORDER BY count DESC
```

### Daily active engagement (unique event types per day)

```sql
SELECT
  toDate(timestamp) AS day,
  COUNT(DISTINCT blob1) AS event_types,
  SUM(_sample_interval) AS total_events
FROM txvotes_events
WHERE timestamp > NOW() - INTERVAL '30' DAY
GROUP BY day
ORDER BY day
```

---

## 7. Privacy Considerations

| Concern | Mitigation |
|---|---|
| IP addresses | Not stored in data points. Cloudflare processes the request but the IP is not written to Analytics Engine. |
| User identification | No user ID, session ID, cookie, or fingerprint. Events are fully anonymous and unlinkable. |
| Location data | Not included in events. The app collects address for district lookup, but analytics never sees it. |
| Personal opinions | Interview answers (issues, spectrum, freeform text) are NOT sent to analytics. Only structural events (phase transitions, completion) are tracked. |
| Cross-session linking | Impossible — no client-side state is used for analytics. Each event is independent. |
| Third-party data sharing | Data stays within Cloudflare's infrastructure. No external analytics services. |
| Consent | No consent banner needed — the approach is GDPR/CCPA compliant as it collects no personal data. Update the privacy policy for transparency. |
| Data retention | 90 days automatic expiry. Perfect for election-cycle data. |

---

## 8. Estimated Effort

| Task | Time |
|---|---|
| Step 1: wrangler.toml binding | 2 min |
| Step 2: Server-side `/app/api/ev` endpoint | 30 min |
| Step 3: Client-side `trk()` helper | 5 min |
| Step 4: Instrument all event call sites | 1-2 hr |
| Step 5: Update privacy policy | 10 min |
| Step 6: Admin query endpoint (optional) | 30 min |
| Testing & validation | 30 min |
| **Total** | **~3-4 hours** |

---

## 9. Deployment Checklist

1. Add `[[analytics_engine_datasets]]` to `wrangler.toml`
2. Add `handleEvent()` function and route in `index.js`
3. Add `trk()` helper to `pwa.js` APP_JS array
4. Add `trk()` calls at each instrumentation point in `pwa.js`
5. Add `visibilitychange` listener for interview abandonment
6. Update privacy policy text in `index.js`
7. (Optional) Add admin analytics endpoint + `CF_ACCOUNT_ID` var + `CF_ANALYTICS_TOKEN` secret
8. `cd worker && npx wrangler deploy`
9. Verify events flow: open app, complete interview, check via SQL API
10. Remind users to visit `/app/clear` to flush service worker cache

---

## 10. Future Enhancements (Add to todolist)

- **Grafana dashboard**: Connect Analytics Engine to Grafana for live visualization
- **Funnel visualization**: Build a simple HTML page at `/admin/funnel` showing the interview completion funnel
- **Performance timing**: Track `guide_complete` duration to monitor Claude API latency trends
- **County-level breakdowns**: Add county FIPS as `blob4` on `guide_complete` to see geographic distribution (still anonymous — FIPS codes identify counties, not people)
