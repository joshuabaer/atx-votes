# Plan: Source Citations Per Candidate

**Status:** Planned (Tier 2 audit improvement)
**Flagged by:** ChatGPT + Gemini AI audits — the #1 trust improvement identified

## Summary

Add a per-candidate `sources` array with URL + title + accessDate for key claims. Currently, candidate data (endorsements, positions, polling) is stored as plain text with no provenance. Users and auditors can't verify where information came from.

## Schema

```json
{
  "name": "Alice Johnson",
  "sources": [
    {
      "url": "https://www.texastribune.org/2026/01/15/alice-johnson-senate/",
      "title": "Alice Johnson announces Senate bid",
      "accessDate": "2026-02-22"
    }
  ],
  "sourcesUpdatedAt": "2026-02-22T14:30:00Z"
}
```

Per-candidate (not per-field) — keeps schema flat, compatible with existing merge/validation logic.

## Key Insight

Both `updater.js` and `county-seeder.js` call Claude with `web_search` tool. The API response contains `web_search_result` blocks with `url`, `title`, `page_age` and `citations` on text blocks. **These are currently discarded** — the code filters for `b.type === "text"` only. Capturing these is the main technical change.

## Implementation Phases

### Phase 1: Capture Sources from Claude API Responses
- **updater.js**: Extract `web_search_result` blocks and `citations` from response. Modify prompt to ask Claude to return `sources` per candidate. Combine prompt-returned sources with raw API search result URLs as fallback.
- **county-seeder.js**: Same pattern in `callClaudeWithSearch`.
- Add `"sources"` to whitelisted merge fields.

### Phase 2: Display on Candidate Profile Page (index.js)
- Add "Sources" section after existing sections with linked URLs and access dates.

### Phase 3: Display in PWA Ballot View (pwa.js)
- Collapsible "Sources" section inside candidate card details.

### Phase 4: Migration
- Graceful degradation: `if(c.sources && c.sources.length)` guards everywhere.
- Daily updater auto-fills on next run. No manual migration needed.

### Phase 5: Documentation
- Add `sources` to audit export schema, nonpartisan page, open-source page.

### Phase 6: Validation
- No duplicate URLs, valid URL format, max 20 per candidate.

### Phase 7: Tests
- Test source merging, deduplication, null handling.

## Storage Impact

~300-1200 bytes per candidate. Well within KV 25MB value limits. No additional KV writes — sources stored within existing ballot keys.

## Files to Modify

- `worker/src/updater.js` — capture web_search results, modify prompt, merge sources
- `worker/src/county-seeder.js` — same pattern
- `worker/src/index.js` — display on candidate profiles, update audit export
- `worker/src/pwa.js` — display in ballot view, add translations
- `worker/tests/pwa-guide.test.js` — test source handling
