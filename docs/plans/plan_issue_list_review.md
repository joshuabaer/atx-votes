# Plan: Issue List Completeness Review

**Status:** Planned (Tier 3 audit improvement)
**Flagged by:** ChatGPT + Gemini AI audits

## Summary

Evaluate the interview issue list against politically salient Texas issues not currently covered. Add 4 new issues with deep dives and Spanish translations.

## Current State

17 issues, 15 with deep dives. The list covers economy, housing, public safety, education, healthcare, environment, grid, tech, transportation, immigration, taxes, civil rights, guns, abortion, water/land, agriculture, faith.

## Gap Analysis

### Tier 1 — High Salience, Clearly Missing

| Issue | Why Missing Matters |
|-------|-------------------|
| **Criminal Justice** | TX has largest state prison system. "Public Safety" covers policing but not sentencing, incarceration, death penalty, re-entry. |
| **Energy & Oil/Gas** | TX is #1 producer. Current issues cover environment/grid but not the production economy itself. |
| **LGBTQ+ Rights** | Trans youth healthcare, bathroom bills, marriage protections — major TX legislative flashpoints. "Civil Rights" is too generic. |
| **Voting & Elections** | Voter ID, mail-in access, poll watcher rules, election integrity — highly polarized in TX. Not covered at all. |

### Tier 2 — Worth Considering Later
- Veterans & Military (TX has 2nd-largest veteran population)
- Drug Policy & Cannabis
- Border Communities (distinct from Immigration)

## Recommended Additions

Add 4 new issues → 21 total. Each with deep dive (4 options) and Spanish translations.

**UX note:** Issues phase is drag-to-rank. At 21 items, consider future UX improvement: first pick your top 7-10 from a grid, then rank only those. Not needed for initial additions since the divider/slot system already helps.

## Backward Compatibility

Existing user profiles automatically handle new issues:
```javascript
// Already in load() — appends new issues to end of existing rankings
if(S.issues.length < allIV.length) {
  S.issues = S.issues.concat(allIV.filter(v => S.issues.indexOf(v) === -1))
}
```

## Implementation

1. Add 4 entries to `ISSUES` array (pwa.js ~line 1138)
2. Add Spanish translations for issue names (TR dict)
3. Add 4 `DEEP_DIVES` entries (question + 4 options each)
4. Add ~40 Spanish translations for deep dive strings
5. Update test assertions (hard-coded `17` → `21` in ~5 places)
6. No changes to pwa-guide.js (accepts arbitrary issue names)

## Per-Issue Engineering Cost

- 1 ISSUES array entry
- 1 TR translation for issue name
- 1 DEEP_DIVES entry (4 options × label + description)
- ~10 TR translations for deep dive strings
- Test count updates

## Files to Modify

- `worker/src/pwa.js` — ISSUES, DEEP_DIVES, TR translations
- `worker/tests/interview-flow.test.js` — update hard-coded counts
