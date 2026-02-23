# Plan: "Why This Confidence Level" Explanations

**Status:** Planned (Tier 2 audit improvement)
**Flagged by:** Gemini AI audit

## Summary

Add a `matchFactors` array (2-4 short phrases) to each recommendation, explaining which specific voter interview answers drove the confidence level. Displayed as chips/tags on the race detail page.

## Current State

Recommendations include `reasoning` (1 sentence narrative) and `confidence` (Strong Match, Good Match, etc.) but don't explicitly link back to specific interview inputs. A user who prioritized Education has no way to see that reflected.

## Design

New field per race recommendation:
```json
{
  "confidence": "Strong Match",
  "matchFactors": [
    "Your #1 issue: Healthcare",
    "Values: Competence & Track Record",
    "Stance: Expand targeted spending"
  ]
}
```

- Array of 2-4 short phrases, each referencing a specific voter input
- Rendered as small blue chips below the reasoning text
- Only on race detail page (not race cards or cheat sheet)
- Auto-generated in Spanish when `lang=es`

## Implementation

1. **pwa-guide.js**: Add `matchFactors` to prompt template and merge logic. Bump max_tokens slightly (4096→5120).
2. **pwa.js**: Add `.match-factor` CSS, render chips in `renderRaceDetail()` and `renderPropCard()`.
3. **Tests**: Add matchFactors to fixtures, test merge and default empty array.

## Token Budget

Adds ~300-500 tokens to response (~30% increase). Well within limits.

## Backward Compatible

- `rec.matchFactors || []` fallback
- Old cached guides show nothing new
- Non-Claude LLMs may not produce them — graceful degradation

## Files to Modify

- `worker/src/pwa-guide.js` — prompt, merge, max_tokens
- `worker/src/pwa.js` — CSS, rendering
- `worker/tests/pwa-guide.test.js` — test fixtures
