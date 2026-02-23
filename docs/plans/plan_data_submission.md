# Candidate/Community Data Submission System

## Current State

The system has two existing feedback mechanisms:
- **"Flag this info" button** (pwa.js): Opens `mailto:flagged@txvotes.app` — email only, no server-side processing
- **Sparse candidate banner** (index.js): Shows "Limited public information" with `mailto:howdy@txvotes.app`

No server-side submission endpoint exists for public data contributions.

## Architecture: Submission Queue in KV

Submissions stored as individual KV entries under `submission:{id}` prefix, with `submissions_index` listing pending items. Admin reviews and applies via authenticated endpoint. No database, no user accounts, no OAuth.

### KV Key Design

```
submission:{uuid}          -> { ...submission data }
submissions_index          -> ["submission:abc123", "submission:def456", ...]
submissions_log:{date}     -> [{ id, action, timestamp, candidateName }]
```

## Phase 1: Submission API Endpoint (MVP)

**Route**: `POST /api/submit-data` (public, rate-limited)

**Request body**:
```json
{
  "candidateName": "Alice Johnson",
  "race": "U.S. Senate",
  "party": "republican",
  "submitterType": "candidate",
  "submitterName": "Alice Johnson Campaign",
  "submitterEmail": "alice@alicejohnson.com",
  "fields": {
    "summary": "Updated biography text...",
    "education": "UT Austin, JD 2005",
    "experience": ["City Council 2018-2022", "State Rep 2022-present"],
    "keyPositions": ["Border security funding", "Property tax relief"],
    "endorsements": [{"name": "Texas Farm Bureau", "type": "advocacy group"}],
    "campaignUrl": "https://alicejohnson.com",
    "polling": "Leading in latest UT/TT poll at 34%",
    "fundraising": "$2.1M raised through Q4 2025"
  },
  "sourceUrls": ["https://alicejohnson.com/about", "https://texastribune.org/..."],
  "notes": "Updated bio and added recent endorsement"
}
```

**Server-side processing** (`handleSubmitData`):

1. **Rate limit**: Stricter limit — 10 submissions per IP per hour via separate `submissionRateLimitMap`
2. **Validate required fields**: `candidateName`, `submitterEmail`, at least one field in `fields`
3. **Validate candidate exists**: Look up against `loadAllCandidates()`. Reject if not found (prevents fabricated candidates)
4. **Validate field types**: Whitelist only: `summary`, `education`, `experience`, `keyPositions`, `endorsements`, `polling`, `fundraising`, `campaignUrl`, `background`, `age`
5. **Sanitize**: Strip HTML, enforce length limits (summary: 500 chars, array items: 200 chars, max 10 items, notes: 1000 chars, email: 254 chars). Validate email format, validate source URLs
6. **Store** to `submission:{uuid}` KV with metadata (status, IP, user agent, timestamps)
7. **Update index**: Read `submissions_index`, append, write back. Cap at 500 pending submissions
8. **Return**: `{ success: true, id: "uuid", message: "Submission received. It will be reviewed before publishing." }`

## Phase 2: Submission Form Page

**Route**: `GET /submit` — static HTML page following existing `PAGE_CSS` pattern.

**Form fields**:
- Candidate name (autocomplete from `/api/candidates-list`)
- Submitter type (radio: candidate, campaign staff, community, journalist, other)
- Submitter name and email (required)
- Optional data fields (summary/bio, education, experience, key positions, endorsements, campaign URL, polling, fundraising)
- Source URLs (multi-line, one per line)
- Notes to reviewer (textarea)
- Honeypot field (hidden `website` field — bots fill it, humans don't)

**Supporting route**: `GET /api/candidates-list` — JSON array of `{ name, race, party, slug }` for autocomplete, cached 1 hour.

## Phase 3: Admin Review Dashboard

**Route**: `GET /admin/submissions` (Bearer auth)

Dashboard showing pending submissions:
- Table sorted by date (newest first)
- Each row: candidate name, submitter type, email, date, field count
- Click to expand full details
- Three actions per submission:
  - **Apply**: Merges fields into ballot KV data via `validateRaceUpdate()`
  - **Reject**: Marks as rejected, removes from pending
  - **Flag Spam**: Marks as spam, adds IP to `spam_ips` KV set

**Route**: `POST /admin/submissions/{id}/action` (Bearer auth)

## Phase 4: Anti-Abuse Measures

- **IP rate limiting**: 10 submissions per IP per hour
- **Email rate limiting**: 5 per email per day (tracked in KV with 24h TTL)
- **Honeypot**: Hidden CSS field, if filled silently discard
- **Content validation**: Reject URLs in bio/summary, enforce all length limits
- **Candidate matching**: Must reference existing candidate via `nameToSlug()`
- **No auto-publish**: Every submission goes through admin review

## Phase 5: Candidate Outreach Integration

- "Claim your profile" banner on sparse candidate profiles linking to `/submit?candidate={slug}`
- Pre-fill candidate name from URL parameter
- Messaging: "Are you this candidate? Submit updated information and we'll review it within 24 hours."

## Phase 6: Analytics Integration

New events: `submit_form_view`, `submit_form_start`, `submit_form_complete`, `submit_form_abandon`

## Files to Modify

| File | Changes |
|------|---------|
| `worker/src/index.js` | Add 5 new routes, handler functions, submission rate limiter, spam IP checking |
| No wrangler changes | Uses existing `ELECTION_DATA` KV and `ANALYTICS` bindings |
| No updater changes | Admin applies directly to ballot KV, bypasses AI pipeline |

## KV Usage Estimate

- Each submission: ~1-2 KB (one write)
- Expected volume: 10-50 submissions total
- Well within Cloudflare paid plan limits

## MVP Scope

1. `POST /api/submit-data` endpoint with rate limiting and validation
2. `GET /submit` form page with honeypot
3. `GET /admin/submissions` review dashboard with apply/reject
4. "Claim your profile" link on sparse candidate pages

~200-300 lines total across all handlers.
