# Plan: Endorsement Context Labels

**Status:** Planned (Tier 2 audit improvement)
**Flagged by:** ChatGPT AI audit

## Summary

Change endorsements from flat strings to structured objects with a `type` descriptor so users understand what each endorsing organization is.

## Schema Change

Before:
```json
"endorsements": ["Texas AFL-CIO", "NRA", "Houston Chronicle Editorial Board"]
```

After:
```json
"endorsements": [
  { "name": "Texas AFL-CIO", "type": "labor union" },
  { "name": "NRA", "type": "advocacy group" },
  { "name": "Houston Chronicle Editorial Board", "type": "editorial board" }
]
```

## Type Taxonomy (9 categories)

| Type | Examples |
|------|----------|
| labor union | Texas AFL-CIO, SEIU |
| editorial board | Houston Chronicle, Dallas Morning News |
| advocacy group | NRA, Sierra Club, ACLU |
| business group | Texas Association of Realtors, Chamber of Commerce |
| elected official | Former Governor Smith |
| political organization | Stonewall Democrats |
| professional association | Texas Medical Association |
| community organization | AURA, neighborhood associations |
| public figure | Celebrities, academics |

## Implementation

1. **All display code**: Add `normalizeEndorsement(e)` helper that handles both `string` and `{name, type}` formats. Show type as small gray text after name.
2. **updater.js**: Update prompt to return structured endorsements with type enum.
3. **county-seeder.js**: Same prompt change.
4. **Validation**: Normalize mixed-format responses in merge step.
5. **Migration**: Lazy — all display handles both formats. Daily updater naturally produces structured data on next run.

## Files to Modify

- `worker/src/index.js` — normalizeEndorsement helper, candidate profile display
- `worker/src/pwa.js` — PWA endorsement rendering
- `worker/src/pwa-guide.js` — guide ballot description building
- `worker/src/updater.js` — prompt and merge logic
- `worker/src/county-seeder.js` — prompt schema
- `worker/tests/` — update fixtures and assertions
