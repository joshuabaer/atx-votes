# Plan: Source Ranking Policy

**Status:** Planned (Tier 2 audit improvement)
**Flagged by:** ChatGPT AI audit

## Summary

Document and enforce an explicit source priority hierarchy for web_search results in all AI research prompts. Currently the prompts say "find verified, factual information" but give no guidance about which sources to prefer.

## Source Priority Hierarchy

| Tier | Source Type | Examples |
|------|------------|---------|
| 1 (Highest) | Texas SOS filings | sos.state.tx.us |
| 2 | County election offices | {county}.tx.us |
| 3 | Official campaign sites | candidate websites |
| 4 | Nonpartisan references | ballotpedia.org, votesmart.org |
| 5 | Established news outlets | texastribune.org, dallasnews.com |
| 6 | National wire services | apnews.com, reuters.com |
| 7 (Lowest/Avoid) | Other | blogs, social media, opinion sites |

## Implementation

### A. Prompt-Level Enforcement
- Add `SOURCE PRIORITY` block to system prompts in `updater.js` and `county-seeder.js`
- Add conflict resolution rule: official filings > campaign claims > news reporting

### B. Source Capture and Storage
- Extract `web_search_result` content blocks from Claude API responses (currently discarded)
- Store source URLs in daily update logs for auditability
- Optional: companion KV keys like `sources:ballot:county:{fips}:{party}`

### C. Documentation
- Add `sourceRankingPolicy` section to audit export (`buildAuditExportData`)
- Update nonpartisan page and audit page with source hierarchy description
- Add "Changes from Audit" bullet about source ranking

### D. Testing
- Test audit export includes source ranking policy
- Test prompts contain `SOURCE PRIORITY` text

## Design Decision: No Hard Domain Allowlist

The `web_search` tool is Claude's built-in tool — we can't filter its results at the API level. Prompt-level preferences are the pragmatic approach.

## Files to Modify

- `worker/src/updater.js` — system prompt, user prompt, source extraction
- `worker/src/county-seeder.js` — system prompt, source extraction
- `worker/src/index.js` — audit export, nonpartisan page, audit page
- `worker/tests/audit-export.test.js` — new test group
