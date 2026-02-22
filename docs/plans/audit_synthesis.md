# AI Audit Synthesis Report

**Date:** February 22, 2026
**Reviewed by:** Claude (Anthropic) — synthesizing independent audits by ChatGPT (OpenAI) and Gemini (Google)
**Subject:** Texas Votes (txvotes.app) methodology for AI-generated nonpartisan voting recommendations

---

## Executive Summary

Two independent AI systems reviewed the Texas Votes methodology export and scored the system across five dimensions. ChatGPT gave an overall score of **6/10** while Gemini gave **8.6/10** — a 2.6-point gap that reflects fundamentally different evaluation philosophies rather than disagreement about what the system does.

**ChatGPT** evaluated against an ideal standard: what a production-ready, high-stakes civic tool *should* have (citations, bias testing, conflict resolution). By that bar, the gaps are real.

**Gemini** evaluated against the current landscape: what AI voting tools *actually* look like. By that bar, Texas Votes is notably ahead of peers.

Both are correct. The system has strong structural foundations (symmetric prompts, validation rules, shuffled UI, transparent export) but lacks the evidence layer (per-claim sources, bias test results, coverage metrics) needed to be fully auditable.

---

## Score Comparison

| Dimension | ChatGPT | Gemini | Gap | Assessment |
|-----------|---------|--------|-----|------------|
| Partisan Bias | 7 | 9 | -2 | Both agree on strong symmetry; ChatGPT flags spectrum labels and issue list as residual risks |
| Factual Accuracy | 6 | 8 | -2 | Core disagreement: ChatGPT demands per-claim citations; Gemini satisfied by structural safeguards |
| Fairness of Framing | 6 | 9 | -3 | ChatGPT flags specific loaded option labels; Gemini focuses on the value-matching architecture |
| Balance of Pros/Cons | 5 | 7 | -2 | Strongest agreement area — both flag digital footprint / incumbency bias |
| Transparency | 7 | 10 | -3 | Widest gap — see detailed analysis below |
| **Overall** | **6** | **8.6** | **-2.6** | |

---

## Areas of Agreement (High Confidence)

These findings were flagged independently by both systems. They represent the highest-confidence issues.

### 1. Digital Footprint Bias
**Both audits identify this as the most significant structural risk.** Incumbents and well-funded candidates have richer web presences, producing more detailed pros, more specific positions, and more endorsements via web_search. This creates information asymmetry that can look like favoritism even though the prompts are symmetric.

> ChatGPT: "web_search will yield more material for incumbents, well-funded candidates, or candidates with stronger online footprints"
> Gemini: "candidates with lower funding/web presence may receive poor data summaries or null fields, which the AI might interpret as a lack of qualification"

### 2. No Per-Claim Citations
Neither audit found field-level source provenance. The methodology export shows prompts and validation rules, but there is no mechanism to trace a specific claim about a candidate back to its source URL.

> ChatGPT: "No requirement to attach sources/citations per field... This is the single biggest accuracy + trust gap"
> Gemini: (implicitly agreed by scoring Factual Accuracy at 8 rather than 10, citing web search volatility)

### 3. Issue List as a Value Choice
Both acknowledge that the 17-issue interview list, while comprehensive in intent, inevitably omits some politically salient topics and represents an editorial choice.

> ChatGPT: "Some politically salient topics aren't explicit (e.g., election administration, energy/oil & gas, criminal justice beyond 'Public Safety')"
> Gemini: "If the list omits niche but vital Texas issues (e.g., water rights, local grid management), it limits the AI's ability to differentiate candidates"

### 4. Web Search Quality Risk
Both flag that web_search can surface low-quality, partisan, or misleading sources with no described ranking policy, conflict resolution, or "official-first" enforcement.

### 5. County Coverage Gaps
The top-30-county limitation (~75% of Texas voters) means users in smaller counties receive weaker or missing local race data, creating unequal service quality.

---

## Areas of Disagreement

### Transparency: 7/10 vs 10/10 (Gap: 3 points)

**Gemini's position:** Publishing exact system prompts and user prompt templates is "industry-leading" — most AI tools share nothing. Score: 10/10.

**ChatGPT's position:** Publishing prompts is necessary but not sufficient. The "most important transparency layer" — field-level provenance, a public changelog, and published accuracy metrics — is missing. Score: 7/10.

**Assessment:** ChatGPT is right on substance. Publishing prompts *is* exceptional, but transparency of *process* (how we build the system) is different from transparency of *evidence* (how we arrived at specific claims about specific candidates). Texas Votes excels at the former and lacks the latter. A fair score is probably 8/10 — above average for disclosure, but with a clear gap on provenance.

### Fairness of Framing: 6/10 vs 9/10 (Gap: 3 points)

**Gemini's position:** The value-based matching architecture (linking recommendations to stated values rather than party platforms) is fundamentally fair. Score: 9/10.

**ChatGPT's position:** Several answer labels carry rhetorical heat ("Don't overreact," "Second Amendment is non-negotiable," "Tax the wealthy more"). Even with shuffled order, wording can prime affect. Score: 6/10.

**Assessment:** Both have valid points. The *architecture* is well-designed (Gemini is right), but some specific *labels* could be more neutrally worded (ChatGPT is right). The shuffled presentation and balanced option structure mitigate the risk significantly. A fair score is probably 7-8/10.

### Easter Egg Tones

**ChatGPT flagged** that novelty tones (Swedish Chef, Texas Cowboy) could undermine perceived seriousness or distort how pros/cons land emotionally.

**Gemini did not mention** these at all.

**Assessment:** This is a reasonable concern for the *recommendation* screen specifically. Users selecting these tones know what they're getting, but the tones should not appear by default in any context that could affect decision-making.

---

## Ranked Recommendations

Ordered by impact × feasibility. These represent the synthesis of both audits plus Claude's assessment.

### Tier 1: High Impact, Should Do

1. **Add "limited data" labels for low-information races**
   - *Effort:* Low — check field completeness at render time, display a badge
   - *Impact:* High — prevents information asymmetry from looking like favoritism
   - *Flagged by:* Both audits

2. **Review and normalize loaded option labels**
   - *Effort:* Low — editorial pass on interview option wording
   - *Impact:* Medium — reduces rhetorical heat while preserving meaning
   - *Flagged by:* ChatGPT

3. **Add a "Data Last Verified" timestamp per candidate**
   - *Effort:* Low — already tracked by the updater pipeline
   - *Impact:* Medium — informs voters of information freshness
   - *Flagged by:* Gemini

### Tier 2: High Impact, Significant Effort

4. **Add source citations per candidate field**
   - *Effort:* High — requires changes to research prompts, data schema, storage, and display
   - *Impact:* Very high — the single biggest trust improvement
   - *Flagged by:* Both audits

5. **Implement a bias test suite**
   - *Effort:* Medium — automated: same voter profile, swapped party ballots, measure recommendation shifts
   - *Impact:* High — publishable evidence of fairness
   - *Flagged by:* Both audits

6. **Expand county coverage labeling**
   - *Effort:* Low-Medium — in-product indicator when local race data is incomplete
   - *Impact:* Medium — sets honest expectations
   - *Flagged by:* Both audits

### Tier 3: Nice to Have

7. **Add endorsement context** — short neutral descriptor (industry group, labor org, editorial board) for each endorsement
8. **Publish a data quality dashboard** — last-updated per race, source counts, completeness indicators
9. **Document source ranking policy** — official source priority rules, allowlist/denylist for web_search

---

## Overall Assessment

Texas Votes has built a genuinely thoughtful nonpartisan voting guide with structural safeguards that exceed what most AI-powered civic tools attempt. The symmetric prompt architecture, validation pipeline, shuffled UI, and transparent methodology export form a strong foundation.

The gap between a good foundation and a fully auditable system comes down to **evidence**: per-claim sources, measurable bias test results, and coverage transparency. These are tractable engineering problems, not fundamental design flaws.

**Composite score (Claude's assessment): 7.5/10** — meaningfully above the median for AI civic tools, with a clear roadmap to 9+.

---

## Appendix: Audit Sources

- **ChatGPT audit:** `docs/plans/chatgpt_audit.md` — full structured evaluation across 5 dimensions
- **Gemini audit:** `docs/plans/gemini_audit.md` — full structured evaluation across 5 dimensions
- **Methodology export:** Available at [txvotes.app/api/audit/export](https://txvotes.app/api/audit/export)
