# Plan: Public Data Quality Dashboard

**Status:** In progress (agent building it now)
**Flagged by:** ChatGPT AI audit

## Summary

Public `/data-quality` page showing live transparency metrics: data freshness, ballot coverage, candidate completeness, county coverage, and daily update activity. Public-facing version of the existing private `/admin/coverage` dashboard.

## Sections

1. **Data Freshness** — last-updated date per party from manifest KV, version numbers
2. **Ballot Coverage** — stat cards with race/candidate/proposition counts per party
3. **Candidate Data Completeness** — % with all key fields, count of sparse candidates
4. **County Coverage** — X/254 counties with info/ballots, interactive county name search
5. **Today's Update Activity** — races checked, updates applied, errors from update_log
6. **Related Links** — /audit, /api/audit/export, /open-source, /candidates

## Technical

- Live KV reads (same pattern as admin coverage)
- `Cache-Control: public, max-age=3600` (1-hour cache)
- County checker uses inline JS with embedded county→coverage mapping
- No admin secrets or internal details exposed

## Files to Modify

- `worker/src/index.js` — new `handleDataQuality(env)` function, route, footer links
