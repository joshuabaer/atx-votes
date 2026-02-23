# Texas Votes TODO List

---

## Open

### Data & Content
- [ ] Enrich county_info for remaining ~120 counties — elections websites, phone numbers, vote center status for smallest/rural counties
- [ ] Seed county ballots for top 30 counties — local races for both parties via Claude + web_search (script at docs/scripts/seed_county_ballots.js)
- [ ] Fix seeding script error handling — script marks 401 auth errors as "completed" in progress tracker, so re-running skips those counties instead of retrying them. Also shows 77 errors from a previous run with an expired API key even though current run skips everything. Need to: (1) not mark failed steps as completed, (2) clear stale errors from progress file, (3) add a `--reset` flag to clear progress
- [ ] Fill sparse candidate data — endorsements (43% missing), Democrat polling (55% missing), Democrat fundraising (35% missing)
- [ ] Candidate contact outreach — for each candidate, identify the best contact name and email address for asking them to review their candidate info on our website (research done, see docs/plans/candidate_contacts.md)

### Features
- [ ] Make city/region support self-service — configuration-driven approach so any city/region can set up their own voting guide without code changes
- [ ] Create versions for runoffs and general election — support multiple election cycles beyond the primary (detailed plan at docs/plans/plan_runoff_general_election.md, 4-phase timeline March-October)
- [x] Add Related Links sections to transparency pages — add "Nonpartisan by Design" link to bottom of Data Quality page, and replicate the Data Quality page's Related Links section on AI Audit, Nonpartisan, and Open Source pages (cross-linking between all transparency pages)
- [ ] Integrate DeepSeek model — add as another LLM option like Claude/GPT/Gemini/Grok for guide generation, vanity URL, audit provider. Must include a prominent persistent warning banner: "This is a Chinese open-source model, available for research/comparison purposes only. No personal information is shared with China — all processing runs through US-hosted API infrastructure."
- [ ] Create new txvotes repo in GitHub — fresh copy of the code without all the dev history

### Audit Score Improvements
_Latest audit: ChatGPT 7.5, Gemini 8.0, Claude 7.6, Grok 7.5 (avg 7.7/10). Remaining:_

- [x] Implement automated bias test suite — same voter profile with swapped party ballots, measure recommendation shifts and flag asymmetries. Publishable evidence of fairness. (61 tests, 5 voter profiles, 4 reusable helpers — see docs/plans/plan_bias_test_suite.md)

### Code Review Findings (PR #2)

_From automated code review of "Add automated AI audit runner" (interview-flow-tests branch)._

- [ ] **[P0]** Fix `_pickedIssues`/`_pickedQuals` restoration bug — on page reload, `load()` pads `S.issues` with all remaining issues before computing `S._pickedIssues = Math.min(5, S.issues.length)`, so a user who picked 2 issues sees 5 "top priority" slots filled. Fix: persist `_pickedIssues`/`_pickedQuals` in `save()` or compute from saved array before padding. (`worker/src/pwa.js`)
- [ ] **[P1]** Update CLAUDE.md test count — says "108 tests total: 71 interview flow + 37 pwa-guide" but actual count is 518 tests across 9 test files
- [ ] **[P1]** Add `audit-runner.js` to CLAUDE.md Architecture section — new 480-line module imported in index.js is not listed alongside the other worker/src files
- [ ] **[P1]** Add new test files to CLAUDE.md — audit-runner.test.js, audit-export.test.js, routes.test.js (plus county-seeder.test.js, index-helpers.test.js, interview-edge-cases.test.js, updater.test.js) are not documented
- [ ] **[P1]** Update CLAUDE.md reading level docs — says "level 6 is the Swedish Chef easter egg" but level 7 (Texas cowboy) now exists in pwa-guide.js
- [ ] **[P2]** Fix county seeder source attribution — `county-seeder.js` applies all API search sources to all candidates indiscriminately, unlike `updater.js` which scopes per-candidate. Every candidate in a race gets attributed with every search result regardless of relevance
- [ ] **[P2]** Remove dead code in `validateRaceUpdate` — duplicate-URL check and `sources.length > 20` check can never trigger because `mergeSources` already deduplicates and caps at 20 before validation runs
- [ ] **[P2]** County seeder bypasses `validateRaceUpdate` — writes candidate data with sources directly to KV without malformed-URL or duplicate-URL validation that the updater path enforces
- [ ] **[P3]** Election Day cache invalidation timing — `runDailyUpdate` invalidates `candidates_index` on every successful update, including Election Day when traffic peaks and cache rebuilds are most costly

### PWA Bugs
- [ ] Back button on first "Talk to Me" page doesn't work — back button on the initial interview screen (Phase 1, issues picker) is non-functional

### Technical Debt
- [ ] Comprehensive memory management review — audit localStorage usage, service worker cache lifecycle, KV data retention, and state cleanup
- [ ] Comprehensive Claude API usage review — analyze token usage across guide generation, county seeding, tone variants, and candidate research; identify optimization opportunities

---

## Done

<details>
<summary>Data & Content (16 resolved)</summary>

- [x] Expand coverage to all of Texas — generalize beyond Austin/Travis County to support all Texas counties, districts, and races statewide
- [x] Add statewide issues: Gun Rights/Safety, Abortion/Reproductive Rights, Water Rights/Scarcity, Agriculture/Rural Issues, Faith/Religious Liberty
- [x] Broaden deep dives for rural Texas — Housing (property rights/taxes vs density), Transportation (rural roads vs light rail), Immigration (remove Austin city-council framing)
- [x] Add candidate qualities: Faith & Values, Business Experience
- [x] Data coverage dashboard — `/admin/coverage` shows candidate completeness, tone variants, county info, and county ballot coverage across all 254 counties
- [x] Fix district resolution — Census geocoder + filterBallotToDistricts() already work; fixed by populating county ballot data and moving Travis races out of statewide
- [x] Move Travis County races out of statewide ballot — Commissioner Pct 2/4 moved to `ballot:county:48453:democrat_primary_2026`
- [x] Fill missing headshots — all 73 statewide candidates now have .jpg headshots
- [x] Remove Polymarket stats — remove prediction market odds from the app
- [x] Pre-generate candidate tone variants — summary/strengths/concerns for all 73 statewide candidates across 7 tones
- [x] Seed county_info for all 254 counties — basic template data (early voting hours, Election Day hours, TX SOS links) for every county
- [x] Enrich county_info for top 30 counties — real elections websites, phone numbers, vote center status from verified sources
- [x] Enrich county_info for counties 31-130 — 75 more counties updated with real elections websites, phones, vote center status
- [x] Seed precinct maps for top 10 counties — 534 ZIP-to-commissioner-precinct mappings uploaded to KV, GIS-verified for 8 of 10 counties
- [x] Create statewide ballot keys — `ballot:statewide:{party}_primary_2026` created from legacy keys
- [x] Fix Andrew White withdrawal — marked as withdrawn in Democrat governor race (dropped out Jan 5, 2026, endorsed Hinojosa)

</details>

<details>
<summary>PWA Bugs (8 resolved)</summary>

- [x] Proposition explanations not translated
- [x] Proposition badges not translated
- [x] Profile summary not translated
- [x] Language switcher low contrast in dark mode
- [x] Spanish nav tab labels wrapping
- [x] White screen on first deploy
- [x] "Station" Easter egg
- [x] Race card navigation always goes to senate race

</details>

<details>
<summary>PWA Improvements (31 resolved)</summary>

- [x] Service worker cache-first → network-first
- [x] Tab bar not visible
- [x] Tab icons match iOS
- [x] Landing page: link to web app
- [x] Custom print cheat sheet
- [x] Recommendation badge wrapping
- [x] Desktop top nav
- [x] Dismissible disclaimer
- [x] Race cards — candidate count and chevron
- [x] Footer links on all pages
- [x] Enhanced Voting Info page
- [x] Cheat sheet party switcher
- [x] Election info header card
- [x] Candidate cards redesign
- [x] Proposition cards redesign
- [x] Address form privacy note
- [x] Qualities picker icons
- [x] Address verification
- [x] Candidate descriptions full-width
- [x] Candidate photos / headshots (60/62 found)
- [x] Proposition Spanish translations
- [x] Ballot race card headshots
- [x] Free-form "Anything else?" field
- [x] Tug-of-war loading animation
- [x] Cheat sheet print layout bigger
- [x] Footer links on all static pages
- [x] Translate candidate ballot data for Spanish
- [x] Headshots on uncontested race cards
- [x] Skip welcome screen from landing page
- [x] Remove "Print" from cheat sheet button
- [x] Spanish language toggle on landing page

</details>

<details>
<summary>PWA Features (15 resolved)</summary>

- [x] PWA web app (single-page app, no build step)
- [x] Server-side guide generation via Claude API
- [x] Background ballot refresh
- [x] Send Feedback + credits on profile
- [x] "I Voted" tracking and sticker
- [x] Spanish translation / i18n (200+ strings)
- [x] Regenerate profile summary
- [x] Accessibility (ARIA, keyboard nav, reduced motion)
- [x] Candidate profile page — `/candidates` directory with side-by-side R/D columns, `/candidate/:slug` detail pages
- [x] Fireworks animation after "I Voted"
- [x] Make the app more patriotic visually
- [x] Make the app more viral — share buttons, Web Share API
- [x] Volunteer opportunities near you
- [x] Post-voting share prompt
- [x] Swedish Chef easter egg

</details>

<details>
<summary>UI/UX (10 resolved)</summary>

- [x] Fix progress bar animation
- [x] Reading level slider on profile
- [x] Wider content area on desktop
- [x] Ballot page overflows on iPhone
- [x] "Use my location" is broken
- [x] Update researching loading screen main text based on tone 6 and 7
- [x] Apply tone to AI personal summary on profile page
- [x] Put "Texas Votes (Cowboy)" in the title of the link for vanity URLs
- [x] Fix back button on /cowboy and /chef
- [x] Always show a back button in the interview flow
- [x] Race card description text doesn't use full card width on desktop
- [x] Geolocate button to auto-fill address
- [x] Balance loading screen timing
- [x] Fix formatting on static pages (iPhone 17 Pro)
- [x] Put Texas flag on the home page

</details>

<details>
<summary>Features (24 resolved)</summary>

- [x] Bigger easter egg emoji bursts — doubled font-size (40-88px) for cowboy/bork
- [x] Fireworks "I Voted" animation — 8 staggered shells, patriotic colors, burst particles
- [x] Sample ballot page — /sample with R/D switcher, 12 race cards, propositions, SAMPLE watermark
- [x] Confidence explanations — "Why this match?" matchFactors per candidate
- [x] Source ranking policy — 7-tier hierarchy in AI prompts, documented publicly
- [x] Issue list expansion — added Criminal Justice, Energy & Oil/Gas, LGBTQ+ Rights, Voting & Elections (21 total)
- [x] LLM choice — URL flags for alternate LLMs (?gemini, ?grok, ?chatgpt) + hidden debug/comparison view
- [x] Cowboy & Swedish Chef easter eggs — type "yeehaw" for Cowboy, "bork" for Swedish Chef on profile page
- [x] Remove Candidates link from footer — contextual links per page (4-6 links, no self-links)
- [x] Smart contextual footers — all 12 page footers redesigned with relevant cross-links
- [x] Priority picker "−" button — visible minus on filled slots, complements "+" on pool items
- [x] Sample ballot page — /sample with fictional races, SAMPLE watermark, R/D context
- [x] Source citations — capture URLs from Claude web_search responses, display on profiles and ballot
- [x] Endorsement context labels — structured {name, type} with 9-category taxonomy
- [x] Data quality dashboard — /data-quality with freshness, coverage, completeness, county checker
- [x] Limited data badges — isSparseCandidate() shows badge when pros/cons/endorsements sparse
- [x] Normalized interview labels — editorial pass on all 16 deep dive options, symmetric language
- [x] Data Last Verified timestamps — fmtDate() shows last-updated date on ballot page
- [x] County coverage labeling — banner when local races unavailable for user's county
- [x] Deploy to txvotes.app — separate Cloudflare Worker (`txvotes-api`) sharing KV with `atxvotes-api`. DNS active, worker deployed, secrets set. atxvotes.app redirects to txvotes.app.
- [x] Change issues and candidate trait selection to "sort by priority" — drag-to-reorder lists with touch/mouse drag + arrow buttons. Priority dividers at position 5 (issues) and 3 (qualities). Ranked format in prompts. 71 tests passing.
- [x] Analytics event tracking — 18 events via Cloudflare Analytics Engine (interview flow, guide gen, shares, I Voted, page views). Privacy-safe, sendBeacon, Do Not Track respected.
- [x] Open source page — `/open-source` with tech stack, AI review cards, how to contribute, MIT license. Footer links on all static pages.
- [x] Design Texas Votes logo — "Star & Stripes Shield" (Concept C). Favicon with dark mode, apple-touch-icon, PWA manifest icons (192/512/maskable), topnav, hero, landing page, og-image all updated.
- [x] Register related domain names — dallasvotes.app, houstonvotes.app, etc. (research at docs/plans/plan_domains.md)
- [x] AI audit infrastructure — `/audit` page, `/api/audit/export` endpoint, and audit prompt template created (docs/plans/ai_audit_prompt.md). Ready to submit to ChatGPT, Gemini, and Grok.

</details>

<details>
<summary>Infrastructure (4 resolved)</summary>

- [x] Cloudflare Web Analytics
- [x] /app/clear resets all user data
- [x] Language switch debounce
- [x] Update privacy policy

</details>

<details>
<summary>Testing (3 resolved)</summary>

- [x] Interview flow UI tests (47 tests, 8 phases)
- [x] Verify candidate-to-race accuracy
- [x] Partisan bias audit

</details>
