# Cross-LLM Audit Design for Texas Votes

## Overview

This document describes a methodology for having GPT-4 (ChatGPT), Google Gemini, and Grok independently audit the Texas Votes app for factual accuracy, partisan bias, methodology soundness, completeness, and tone appropriateness.

The audit targets four layers of the system:

1. **Static ballot data** — candidate descriptions, endorsements, positions, pros/cons stored in Cloudflare KV
2. **AI prompts** — the system and user prompts sent to Claude to generate personalized recommendations
3. **Interview flow** — the issue categories, political spectrum labels, deep-dive questions, and candidate qualities presented to users
4. **Recommendation logic** — how user inputs are translated into prompts, and how Claude's response is merged back into the ballot

---

## 1. What Data to Export

### 1a. Audit Export Endpoint: `/admin/audit-export`

A new admin GET endpoint (protected by ADMIN_SECRET) that returns a single JSON document containing everything an auditor needs. The response structure:

```json
{
  "exportedAt": "2026-02-22T12:00:00Z",
  "systemPrompts": {
    "guideGeneration": "<full SYSTEM_PROMPT from pwa-guide.js>",
    "summaryGeneration": "<full SUMMARY_SYSTEM from pwa-guide.js>",
    "dataUpdater": "<system prompt from updater.js>",
    "countySeeder": "<system prompt from county-seeder.js>"
  },
  "userPromptTemplate": {
    "template": "<the full buildUserPrompt output with placeholders>",
    "readingLevelInstructions": {
      "1": "TONE: Write at a high school reading level...",
      "2": "TONE: Write casually...",
      "...": "..."
    },
    "nonpartisanBlock": "<the NONPARTISAN instruction block>",
    "outputSchema": "<the JSON schema requested from Claude>"
  },
  "interviewFlow": {
    "phases": [
      "1: Tone/Reading Level Selection",
      "2: Top Issues (pick 3 of 17)",
      "3: Political Spectrum (pick 1 of 6)",
      "4: Deep Dive Policy Questions (2-3 questions based on selected issues)",
      "5: Candidate Qualities (pick up to 3 of 10)",
      "6: Freeform (optional open text)",
      "7: Address Lookup (for district filtering)",
      "8: Guide Generation (loading/results)"
    ],
    "issueCategories": [
      { "value": "Economy & Cost of Living", "icon": "money" },
      "..."
    ],
    "politicalSpectrum": [
      { "value": "Progressive", "description": "Bold systemic change, social justice focused" },
      { "value": "Liberal", "description": "Expand rights and services, government as a force for good" },
      { "value": "Moderate", "description": "Pragmatic center, best ideas from both sides" },
      { "value": "Conservative", "description": "Limited government, traditional values, fiscal discipline" },
      { "value": "Libertarian", "description": "Maximum freedom, minimal government" },
      { "value": "Independent / Issue-by-Issue", "description": "I decide issue by issue, not by party" }
    ],
    "deepDiveQuestions": {
      "Housing": {
        "question": "On housing, where do you land?",
        "options": [
          { "label": "Build, build, build", "description": "Ease zoning, encourage density, let the market work" },
          { "label": "Smart growth", "description": "More housing with affordability guardrails" },
          { "label": "Protect property rights", "description": "Keep property taxes low, limit government land-use rules" },
          { "label": "It's complicated", "description": "Case by case - depends on the community" }
        ]
      },
      "...all 14 issue deep-dive question blocks..."
    },
    "candidateQualities": [
      "Competence & Track Record",
      "Integrity & Honesty",
      "Independence",
      "Experience",
      "Fresh Perspective",
      "Bipartisan / Works Across Aisle",
      "Strong Leadership",
      "Community Ties",
      "Faith & Values",
      "Business Experience"
    ]
  },
  "ballots": {
    "republican": { "...full statewide ballot JSON..." },
    "democrat": { "...full statewide ballot JSON..." }
  },
  "countyBallots": {
    "48453": {
      "republican": { "...county ballot JSON..." },
      "democrat": { "...county ballot JSON..." }
    }
  },
  "partyInferenceLogic": {
    "description": "How the app decides which party ballot to show first",
    "rules": [
      "Progressive or Liberal spectrum -> Democrat first",
      "Conservative or Libertarian spectrum -> Republican first (no automatic assignment, but shown first)",
      "Moderate or Independent -> random 50/50 order"
    ]
  },
  "nonpartisanClaims": {
    "url": "https://txvotes.app/nonpartisan",
    "claims": [
      "Randomized candidate order",
      "Both ballots generated with identical prompts",
      "No party labels on candidates",
      "Values-based matching",
      "Neutral interview questions (shuffled answer options)",
      "Six-point political spectrum",
      "Balanced proposition coverage",
      "AI transparency with NONPARTISAN instruction block",
      "Verified candidate data (SOS, Ballotpedia)",
      "Encouraging independent research"
    ]
  }
}
```

### 1b. What gets exported for each candidate

Every field in the ballot data structure:

- `name`, `isIncumbent`, `summary`, `background`
- `keyPositions[]` — stated policy positions
- `endorsements[]` — organizations and individuals
- `pros[]` — strengths/advantages
- `cons[]` — concerns/weaknesses
- `fundraising` — campaign finance summary string
- `polling` — polling data summary string
- `headshot` — URL (for completeness check only)

### 1c. What gets exported for each proposition

- `number`, `title`, `description`
- `background`, `fiscalImpact`
- `ifPasses`, `ifFails`
- `supporters[]`, `opponents[]`

---

## 2. Audit Prompts

Five prompts, one per concern area. Each is designed to be self-contained: paste the audit export JSON first, then the prompt. Each prompt explicitly asks for structured output to enable comparison across LLMs.

### Prompt 1: Factual Accuracy

```
You are auditing a nonpartisan voter guide app for the March 3, 2026 Texas Primary Election. The attached JSON contains all candidate data, proposition data, and AI prompts used by the app.

TASK: Audit every factual claim in the ballot data for accuracy.

For EACH candidate, verify:
1. Are they actually running in this race? (Check TX Secretary of State filings)
2. Is their incumbent status correct?
3. Are the stated key positions accurate and sourced?
4. Are the listed endorsements real and current?
5. Are the fundraising figures accurate (or at least in the right ballpark)?
6. Are the polling numbers real and from credible sources?
7. Is the background/summary factually correct?

For EACH proposition, verify:
1. Is the proposition number, title, and description accurate?
2. Is the fiscal impact assessment reasonable?
3. Are the listed supporters and opponents correct?
4. Are the "if passes" and "if fails" descriptions accurate?

OUTPUT FORMAT:
Return a JSON array of findings:
[
  {
    "party": "republican|democrat",
    "race": "office name",
    "candidate": "name or null for propositions",
    "field": "which field has the issue",
    "severity": "critical|major|minor|note",
    "currentValue": "what the app says",
    "correctValue": "what it should say (or 'unverifiable')",
    "source": "URL or reference for your correction",
    "explanation": "brief explanation"
  }
]

Use severity levels:
- critical: wrong candidate, wrong race, fabricated endorsement
- major: significantly inaccurate position, wrong fundraising order of magnitude
- minor: slightly outdated info, imprecise wording
- note: suggestion for improvement, not an error

Be thorough. Check every candidate, every race, every proposition. If something is correct, you do not need to list it. Only list issues.
```

### Prompt 2: Partisan Bias

```
You are auditing a nonpartisan voter guide app for partisan bias. The attached JSON contains all candidate data, AI prompts, interview questions, and the app's nonpartisan design claims.

TASK: Audit the entire system for partisan bias — both overt and subtle.

Check these specific areas:

A. CANDIDATE DATA SYMMETRY
For each contested race, compare how candidates are described:
- Do all candidates get similar depth of coverage (summary length, number of pros/cons, number of endorsements)?
- Are "pros" and "cons" balanced in tone and substance across candidates?
- Do descriptions of more progressive candidates use different (more/less favorable) language than conservative candidates, or vice versa?
- Are endorsements listed with similar specificity for all candidates?

B. INTERVIEW DESIGN
- Are the 17 issue categories balanced across the political spectrum, or do they skew toward one side's priorities?
- Are the 6 political spectrum labels and descriptions equally respectful and accurate?
- For each deep-dive question, are the 4 answer options balanced? Do they give equal weight to progressive, moderate, conservative, and other viewpoints?
- Are the 10 candidate qualities neutral, or do some skew toward one ideology?
- Does the freeform prompt introduce any bias?

C. AI PROMPTS
- Does the system prompt's "NONPARTISAN RULES" section effectively prevent bias?
- Does the user prompt template introduce any framing that might influence recommendations?
- Are the confidence levels (Strong Match, Good Match, Best Available, Symbolic Race) applied neutrally?
- Does the profile summary prompt avoid partisan labeling?

D. PARTY INFERENCE LOGIC
- Is the spectrum-to-party-order mapping fair? (Progressive/Liberal -> Dem first, Conservative/Libertarian -> Rep first, Moderate/Independent -> random)
- Could this create a subtle advantage for either party?

E. STRUCTURAL BIAS
- Are there more Republican or Democratic candidates missing data?
- Are propositions framed in a way that favors one side?

OUTPUT FORMAT:
Return a JSON object:
{
  "overallAssessment": "1-3 sentences on whether the system is reasonably nonpartisan",
  "biasScore": 1-10 (1=strongly biased left, 5=neutral, 10=strongly biased right),
  "findings": [
    {
      "area": "A|B|C|D|E",
      "severity": "critical|major|minor|note",
      "description": "what the bias is",
      "evidence": "specific examples",
      "suggestion": "how to fix it"
    }
  ]
}

Be rigorous. A truly nonpartisan app should score 4.5-5.5 on the bias scale. Flag even subtle asymmetries.
```

### Prompt 3: Methodology Soundness

```
You are auditing a nonpartisan voter guide app's recommendation methodology. The attached JSON contains the full interview flow, AI prompts, matching logic, and output schema.

TASK: Evaluate whether the matching methodology is fair, sound, and produces good recommendations.

Evaluate these specific areas:

A. INTERVIEW DESIGN
- Are 3 top issues out of 17 sufficient to capture voter preferences?
- Is a single political spectrum choice (6 options) a good proxy for political identity?
- Are the deep-dive questions (4 options each) well-designed? Do they capture meaningful policy distinctions?
- Is the option to pick 3 candidate qualities (out of 10) useful for matching?
- Is the freeform field helpful or a potential source of noise/manipulation?
- What important voter preference dimensions are missing?

B. PROMPT ENGINEERING
- Is the system prompt effective at producing nonpartisan, value-aligned recommendations?
- Does the user prompt give Claude enough information to make good matches?
- Is the JSON output schema well-designed? Does it capture the right information?
- Are the confidence levels (Strong Match, Good Match, Best Available, Symbolic Race) well-defined?
- Are the proposition recommendation levels (Lean Yes, Lean No, Your Call) appropriate?

C. MATCHING QUALITY
- Given the candidate data structure (positions, endorsements, pros, cons), can Claude reasonably match a voter's stated values to candidates?
- Are there races where the data is too thin for meaningful matching?
- Could the system produce systematically different quality recommendations for different voter profiles?

D. DATA PIPELINE INTEGRITY
- The updater uses Claude + web_search to refresh data. What are the risks?
- The county seeder uses Claude + web_search to populate county races. What are the risks?
- Validation checks exist (candidate count, name matching, endorsement shrinkage limit). Are they sufficient?

E. EDGE CASES
- What happens for voters with unusual combinations (e.g., pro-choice conservative, pro-gun liberal)?
- How well does the system handle voters who select "Independent / Issue-by-Issue"?
- Are uncontested races handled appropriately?

OUTPUT FORMAT:
Return a JSON object:
{
  "overallMethodologyScore": 1-10 (10=excellent),
  "findings": [
    {
      "area": "A|B|C|D|E",
      "severity": "critical|major|minor|note",
      "description": "the issue",
      "impact": "how this affects recommendation quality",
      "suggestion": "how to improve"
    }
  ],
  "strengths": ["list of things done well"],
  "missingDimensions": ["preference dimensions that should be added"]
}
```

### Prompt 4: Completeness

```
You are auditing a voter guide app for the March 3, 2026 Texas Primary Election for completeness.

The attached JSON contains all ballot data for both the Republican and Democratic primaries. Your job is to verify that every race and every candidate is accounted for.

TASK: Identify missing candidates, missing races, and missing context.

A. MISSING CANDIDATES
Cross-reference the candidate lists against:
- Texas Secretary of State official filing list for March 3, 2026 primaries
- Ballotpedia's Texas 2026 election coverage
- Local news coverage of the races

For each race, verify the candidate count matches official filings.

B. MISSING RACES
Verify that all statewide races are included:
- U.S. Senate
- Governor, Lt. Governor, Attorney General, Comptroller, Agriculture Commissioner, Land Commissioner, Railroad Commissioner
- All contested State Senate and State House races
- All contested State Board of Education races
- All contested judicial races (Supreme Court, Court of Criminal Appeals, Courts of Appeals)

C. MISSING DATA FIELDS
For each candidate, flag if critical fields are empty or null:
- summary (every candidate should have one)
- keyPositions (every candidate should have at least 2)
- pros (every candidate should have at least 1)
- cons (every candidate should have at least 1)
- endorsements (major candidates should have some)

D. MISSING CONTEXT
- Are there important ballot propositions missing?
- Are there significant endorsements missing for major candidates?
- Is the polling data current (within 30 days)?
- Is fundraising data reasonably current?

OUTPUT FORMAT:
Return a JSON object:
{
  "completenessScore": 1-10 (10=nothing missing),
  "missingCandidates": [
    {
      "party": "republican|democrat",
      "race": "office name",
      "candidateName": "who is missing",
      "source": "where you found them"
    }
  ],
  "missingRaces": [
    {
      "party": "republican|democrat",
      "office": "what race is missing",
      "source": "where you verified this"
    }
  ],
  "incompleteData": [
    {
      "party": "republican|democrat",
      "candidate": "name",
      "missingFields": ["list of empty/missing fields"],
      "severity": "critical|major|minor"
    }
  ],
  "missingContext": [
    {
      "description": "what context is missing",
      "severity": "critical|major|minor"
    }
  ]
}
```

### Prompt 5: Tone Appropriateness

```
You are a linguistics expert auditing a voter guide app for tone neutrality and fairness. The attached JSON contains all candidate descriptions, pros, cons, summaries, and proposition descriptions.

TASK: Evaluate whether the language used to describe candidates and propositions is neutral, fair, and consistent.

A. CANDIDATE DESCRIPTION TONE
For each candidate, evaluate:
- Is the summary neutral in tone, or does it subtly favor/disfavor the candidate?
- Are "pros" written with similar enthusiasm across all candidates in a race?
- Are "cons" written with similar severity across all candidates in a race?
- Are there loaded words, dog whistles, or subtle editorial commentary?
- Is the same candidate behavior described differently depending on their ideology? (e.g., "principled" vs. "extreme" for the same type of position)

B. COMPARATIVE FAIRNESS
For each contested race:
- Are all candidates described with similar depth and care?
- Do word counts for pros and cons vary significantly between candidates?
- Are incumbent advantages/disadvantages described fairly?
- Are outsider/newcomer candidates described with the same seriousness as established ones?

C. PROPOSITION LANGUAGE
- Are proposition descriptions neutral, or do they frame the issue to favor one outcome?
- Are "if passes" and "if fails" descriptions equally detailed?
- Are supporter and opponent lists balanced in presentation?

D. INTERVIEW QUESTION TONE
- Are the deep-dive question options written with equal respect?
- Do any answer options use loaded language that might guide the voter?
- Are the political spectrum descriptions equally respectful?

E. SPECIFIC LANGUAGE PATTERNS
Flag any instances of:
- Praising language for one ideology's candidates ("bold leader", "visionary") not used for the other side
- Diminishing language ("controversial", "extreme", "fringe") applied asymmetrically
- Passive vs. active voice used differently for different candidates
- Different levels of specificity (one candidate gets precise policy details, another gets vague generalities)

OUTPUT FORMAT:
Return a JSON object:
{
  "overallToneScore": 1-10 (10=perfectly neutral),
  "findings": [
    {
      "party": "republican|democrat|both",
      "race": "office or 'interview' or 'propositions'",
      "candidate": "name or null",
      "issue": "description of the tone problem",
      "example": "the specific text that is problematic",
      "suggestion": "how to rewrite it",
      "severity": "critical|major|minor|note"
    }
  ],
  "positivePatterns": ["things the app does well for tone"],
  "systematicIssues": ["patterns that affect multiple candidates/races"]
}
```

---

## 3. How to Run the Audit

### 3a. Manual Approach (Recommended for V1)

The manual approach is simpler, requires no additional API integrations, and lets us inspect intermediate results.

**Steps:**

1. **Deploy the `/admin/audit-export` endpoint** (see Section 5 for implementation).

2. **Export the data:**
   ```bash
   curl -H "Authorization: Bearer $ADMIN_SECRET" \
     https://txvotes.app/admin/audit-export > audit-data.json
   ```

3. **For each LLM, for each of the 5 prompts:**
   - Open the LLM's chat interface (ChatGPT, Gemini, Grok)
   - Paste or upload the audit-data.json file
   - Paste the audit prompt
   - Save the response as `{llm}-{audit-area}.json`

4. **File naming convention:**
   ```
   audits/2026-02-22/
     chatgpt-factual.json
     chatgpt-bias.json
     chatgpt-methodology.json
     chatgpt-completeness.json
     chatgpt-tone.json
     gemini-factual.json
     gemini-bias.json
     ...
     grok-tone.json
   ```

5. **Run comparison analysis** (see Section 4).

**Practical considerations:**
- The audit export JSON may be very large (ballot data for all candidates). If it exceeds an LLM's context window, split the data: send the prompts + interview flow data for methodology/bias/tone audits, and send the ballot data in race-by-race chunks for factual/completeness audits.
- ChatGPT and Gemini support file uploads; Grok may require pasting.
- For factual accuracy and completeness, LLMs with web search (ChatGPT with browsing, Gemini, Grok) will produce better results since they can verify against current sources.
- Run all 5 prompts on the same day to ensure consistency.

### 3b. Automated Approach (Future Enhancement)

Build a `/admin/audit-run` endpoint that programmatically calls each LLM's API.

**Advantages:** Reproducible, can be scheduled, produces structured output automatically.

**Disadvantages:** Requires API keys for OpenAI, Google, and xAI; more complex error handling; higher cost; harder to handle context window limits.

**Architecture if automated:**

```
POST /admin/audit-run
  -> Fetches audit-export data
  -> For each LLM (OpenAI, Gemini, Grok):
    -> For each of 5 audit prompts:
      -> Call LLM API with data + prompt
      -> Parse JSON response
      -> Store in KV: audit:{date}:{llm}:{area}
  -> Return summary of all 15 audit calls
```

**API details:**
- OpenAI: `POST https://api.openai.com/v1/chat/completions` (model: `gpt-4-turbo`)
- Google: Gemini API via `@google/generative-ai` SDK
- xAI: `POST https://api.x.ai/v1/chat/completions` (model: `grok-2`)

**Recommendation:** Start with the manual approach. Only automate if the audit becomes a regular (monthly/weekly) process.

---

## 4. How to Compare and Act on Results

### 4a. Comparison Framework

After collecting all 15 audit responses (5 prompts x 3 LLMs), compare them using this framework:

**Cross-LLM Agreement Matrix:**

For each finding, classify it by how many LLMs flagged it:
- **3/3 agree**: High-confidence finding. Act on it.
- **2/3 agree**: Likely valid. Investigate manually.
- **1/3 flagged**: Could be a false positive or a subtle issue only one LLM caught. Investigate if severity is major or critical.

**Scoring Comparison:**

| Metric | ChatGPT | Gemini | Grok | Average |
|--------|---------|--------|------|---------|
| Bias Score (1-10) | ? | ? | ? | ? |
| Methodology Score (1-10) | ? | ? | ? | ? |
| Completeness Score (1-10) | ? | ? | ? | ? |
| Tone Score (1-10) | ? | ? | ? | ? |

**Bias check on the auditors:** If one LLM consistently scores the app as more biased in a particular direction while others do not, that may indicate bias in the auditing LLM itself. Document this.

### 4b. Action Priority Matrix

| LLM Agreement | Severity | Action |
|---------------|----------|--------|
| 3/3 | Critical | Fix immediately |
| 3/3 | Major | Fix before next update cycle |
| 2/3 | Critical | Investigate same day, fix if confirmed |
| 2/3 | Major | Investigate within a week |
| 3/3 | Minor | Add to backlog |
| 1/3 | Critical | Manual review within 3 days |
| Any | Note | Document for future consideration |

### 4c. Tracking and Iteration

After making fixes based on audit results:

1. Re-run the audit on the changed data (same prompts, same LLMs)
2. Compare scores before and after
3. Document which findings were accepted, rejected (with reasoning), or deferred
4. Store audit results in a `audits/` directory in the repo for historical tracking

### 4d. Reporting

Produce a human-readable summary for each audit cycle:

```
# Audit Report: 2026-02-22

## Summary
- Factual issues found: X critical, Y major
- Bias score: 5.2 (average across 3 LLMs) — within acceptable range
- Methodology score: 7.8/10
- Completeness: 2 missing candidates identified (both minor races)
- Tone issues: 3 asymmetric descriptions flagged

## Actions Taken
- Fixed: [list]
- Deferred: [list with reasoning]
- Rejected: [list with reasoning]

## LLM Disagreements
- [Notable cases where LLMs disagreed and why]
```

---

## 5. Implementation Steps

### Step 1: Build the Audit Export Endpoint

Add a new handler `handleAuditExport(env)` in `worker/src/index.js` that:

1. Loads both statewide ballots from KV
2. Loads county ballots for the top 5 counties (Travis, Harris, Dallas, Bexar, Tarrant)
3. Extracts the system prompts, user prompt template, and reading level instructions from `pwa-guide.js` (export them as constants)
4. Extracts the interview flow data (ISSUES, SPECTRUM, DEEP_DIVES, QUALITIES) from `pwa.js` (or duplicates them as a separate exported constant)
5. Includes the party inference logic description
6. Includes the nonpartisan claims
7. Returns everything as a single JSON response

**Route:** `GET /admin/audit-export` (protected by ADMIN_SECRET Bearer auth)

**Estimated effort:** 2-3 hours. Most of the data is already in KV or hardcoded in source files; the work is assembling it into a clean export format.

### Step 2: Extract Interview Data as Exportable Constants

The interview flow data (ISSUES, SPECTRUM, DEEP_DIVES, QUALITIES) is currently embedded inside the APP_JS string array in `pwa.js`. To make it available for the audit export without duplicating it, create a shared data file:

- Create `worker/src/interview-data.js` that exports the raw data objects
- Import them into both `pwa.js` (for the APP_JS string) and `index.js` (for the audit export)

Alternatively, if maintaining the single-file PWA pattern is important, simply duplicate the data in the audit export handler with a comment noting it must stay in sync with `pwa.js`.

### Step 3: Export Prompt Constants from pwa-guide.js

The SYSTEM_PROMPT, SUMMARY_SYSTEM, READING_LEVEL_INSTRUCTIONS, and the buildUserPrompt template logic are already in `pwa-guide.js`. Add exports for the constants that the audit endpoint needs:

```javascript
// Already exported at bottom of file:
export { sortOrder, parseResponse, filterBallotToDistricts,
         buildUserPrompt, mergeRecommendations, buildCondensedBallotDescription };

// Add:
export { SYSTEM_PROMPT, SUMMARY_SYSTEM, READING_LEVEL_INSTRUCTIONS };
```

### Step 4: Run First Manual Audit

1. Deploy the audit export endpoint
2. Export the data
3. Run all 5 prompts through ChatGPT, Gemini, and Grok
4. Compile results using the comparison framework
5. Create the first audit report
6. Fix any critical/major issues found

### Step 5: Establish Audit Cadence

- Run a full audit after every significant data update (updater run, new county seeding)
- Run a full audit after any changes to prompts, interview questions, or matching logic
- Run a full audit at least once per election cycle (before early voting opens)
- For the March 3, 2026 primary: run audit by February 20 at latest (before early voting begins Feb 17)

### Step 6 (Optional): Build Automated Audit Pipeline

If the manual process proves valuable and the app expands to cover more elections:

1. Add OpenAI, Google, and xAI API keys as Cloudflare Worker secrets
2. Build `handleAuditRun(env)` that calls all three APIs
3. Store results in KV with key `audit:{date}:{llm}:{area}`
4. Build an `/admin/audit-results` dashboard (similar to `/admin/coverage`)
5. Add a scheduled trigger to run monthly

---

## Appendix A: Context Window Considerations

Estimated token counts for the audit export:

| Component | Est. Tokens |
|-----------|-------------|
| System/user prompts | ~2,000 |
| Interview flow (all questions) | ~3,000 |
| Statewide Republican ballot (all candidates) | ~15,000-25,000 |
| Statewide Democrat ballot (all candidates) | ~15,000-25,000 |
| County ballots (5 counties, both parties) | ~10,000-20,000 |
| Audit prompt | ~500-800 |
| **Total** | **~45,000-75,000** |

Context window limits (as of early 2026):
- GPT-4 Turbo: 128K tokens (sufficient)
- Gemini 1.5 Pro: 1M tokens (sufficient)
- Grok 2: 128K tokens (sufficient)

All three LLMs should be able to handle the full audit export in a single context window. If not, split by party (run Republican and Democrat audits separately).

## Appendix B: Potential Blind Spots

Things this audit approach may NOT catch well:

1. **Runtime behavior differences** — The audit examines static data and prompts, but Claude may produce different quality recommendations depending on the specific combination of voter preferences. Consider supplementing with test-case audits (predefined voter profiles run through the system).

2. **Randomization effects** — The app shuffles candidate order and answer options. The audit data shows the canonical order, not what users see. This is actually a good thing (shuffling reduces bias) but auditors should be told about it.

3. **Temporal accuracy** — Candidate data changes over time. An audit is a snapshot. The audit should note the date of the data and the date of verification.

4. **County-level bias** — The audit primarily covers statewide races. County-level data (seeded by Claude + web_search) may have different quality levels across counties. Consider auditing the top 5 counties specifically.

5. **Spanish translation quality** — The audit prompts are in English. A separate audit (ideally by a bilingual human reviewer) should verify Spanish translations for accuracy and neutrality.

## Appendix C: Test Voter Profiles for Methodology Audit

To supplement the static audit, create 6 test voter profiles that represent diverse political viewpoints and run them through the actual guide generation:

| Profile | Spectrum | Top Issues | Key Quality |
|---------|----------|------------|-------------|
| Urban Progressive | Progressive | Healthcare, Civil Rights, Environment | Fresh Perspective |
| Suburban Moderate | Moderate | Economy, Education, Public Safety | Competence & Track Record |
| Rural Conservative | Conservative | Gun Policy, Immigration, Agriculture | Faith & Values |
| Libertarian Tech | Libertarian | Tech & Innovation, Taxes, Grid | Independence |
| Independent Parent | Independent | Education, Healthcare, Housing | Integrity & Honesty |
| Faith-Based Voter | Conservative | Faith & Religious Liberty, Abortion, Education | Faith & Values |

For each profile, send the same profile to all three auditing LLMs and ask: "Given this voter profile and the app's ballot data, what would be the ideal recommendation? Does it match what the app would produce?"

This tests whether the methodology produces reasonable results for diverse voter types, and whether any voter archetype is systematically underserved.
