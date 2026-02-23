# Plan: Automated Bias Test Suite

**Status:** Implemented
**Flagged by:** ChatGPT + Gemini AI audits

## Summary

61 automated tests verifying the recommendation engine treats both parties symmetrically. Uses 5 voter profiles spanning the political spectrum, symmetric ballot fixtures, and reusable bias detection helpers.

## Test Categories

1. **Prompt Construction Symmetry** (30 tests) — identical voter data, correct party labels, no editorial framing, structural parity within 5%
2. **Ballot Description Symmetry** (2 tests) — same structure from `buildCondensedBallotDescription`
3. **Recommendation Merging Symmetry** (5 tests) — identical field structure, symmetric confidence distributions
4. **Loaded Language Detection** (3 tests) — scans for 23 partisan terms (radical, extreme, woke, MAGA, socialist, etc.)
5. **Reasoning References Voter Priorities** (6 tests) — verifies reasoning cites voter answers, not party assumptions
6. **Confidence Distribution Helpers** (3 tests) — symmetry scoring across parties
7. **Reasoning Length Comparison** (2 tests) — detects asymmetric detail levels
8. **System Prompt Analysis** (2 tests) — nonpartisan guardrails present
9. **Cross-Party Profile Treatment** (3 tests) — conservative on D ballot, progressive on R ballot
10. **Edge Cases** (5 tests) — empty responses, null fields, immutability

## Voter Profiles

| Profile | Focus Areas |
|---------|-------------|
| Progressive | Climate, healthcare, racial justice |
| Moderate | Economy, education, bipartisan |
| Conservative | Border security, tax cuts, 2A |
| Libertarian | Individual liberty, free markets |
| Single-Issue | Education only |

## Bias Detection Helpers (Reusable)

- `findLoadedLanguage(guideResponse)` — scans all text fields for partisan terms
- `compareConfidenceDistributions(ballotA, ballotB)` — symmetry score
- `analyzeReasoningReferences(guideResponse, voterProfile)` — priority citation rate
- `compareReasoningLength(guideA, guideB)` — length asymmetry ratio

## Live API Testing

```bash
LIVE_BIAS_TEST=1 ANTHROPIC_API_KEY=sk-... npx vitest run tests/bias-test.test.js
```

## File

- `worker/tests/bias-test.test.js` — 61 tests
