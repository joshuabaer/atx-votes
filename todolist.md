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
- [ ] Design a candidate/community data submission system — allow candidates and others to submit data for races with limited info. Must be trusted, not spammable or gameable (needs verification/moderation design)
- [x] Add filter by county to candidates list — dropdown with All Counties / Statewide Only / per-county options, race count indicator, statewide races always visible per county, Spanish translations
- [ ] Make city/region support self-service — configuration-driven approach so any city/region can set up their own voting guide without code changes
- [ ] Create versions for runoffs and general election — support multiple election cycles beyond the primary (detailed plan at docs/plans/plan_runoff_general_election.md, 4-phase timeline March-October)
- [x] Add Related Links sections to transparency pages — add "Nonpartisan by Design" link to bottom of Data Quality page, and replicate the Data Quality page's Related Links section on AI Audit, Nonpartisan, and Open Source pages (cross-linking between all transparency pages)
- [ ] Integrate DeepSeek model — add as another LLM option like Claude/GPT/Gemini/Grok for guide generation, vanity URL, audit provider. Must include a prominent persistent warning banner: "This is a Chinese open-source model, available for research/comparison purposes only. No personal information is shared with China — all processing runs through US-hosted API infrastructure."
- [ ] Create new txvotes repo in GitHub — fresh copy of the code without all the dev history

### Audit Score Improvements
_Latest audit: ChatGPT 7.5, Gemini 7.5, Claude 7.8, Grok 7.8 (avg 7.7/10). All dimensions identical: Bias 8, Accuracy 7, Framing 8, Pros/Cons 7, Transparency 9. Remaining:_

- [ ] Add human spot-checking of AI-generated candidate data — manual review process for AI-generated summaries, pros/cons, and endorsements to catch errors
- [x] Add automated balance checks for pros/cons — balance-check.js module, /api/balance-check endpoint, integrated into data quality dashboard (53 tests)
- [x] Surface collected pros/cons directly in recommendation output — strengths (green) and concerns (orange) boxes in ballot recommendation view
- [x] Create simplified transparency page for non-technical users — /how-it-works with 4-step walkthrough, plain language, linked from all transparency pages
- [x] Add user-facing error/bias reporting mechanism — "Flag this info" button on candidate cards, modal with issue types, sends to flagged@txvotes.app
- [x] Implement automated bias test suite — same voter profile with swapped party ballots, measure recommendation shifts and flag asymmetries. Publishable evidence of fairness. (61 tests, 5 voter profiles, 4 reusable helpers — see docs/plans/plan_bias_test_suite.md)

### Code Review Findings (PR #2)

_From automated code review of "Add automated AI audit runner" (interview-flow-tests branch)._

- [x] **[P0]** Fix `_pickedIssues`/`_pickedQuals` restoration bug — persist picked counts in save(), restore before padding in load()
- [x] **[P1]** Update CLAUDE.md test count — updated to 581 tests across 10 files with per-file breakdown
- [x] **[P1]** Add `audit-runner.js` to CLAUDE.md Architecture section
- [x] **[P1]** Add new test files to CLAUDE.md — all 10 test files listed with counts
- [x] **[P1]** Update CLAUDE.md reading level docs — added level 7 (Texas cowboy)
- [x] **[P2]** Fix county seeder source attribution — scoped per-candidate, matching updater.js pattern
- [x] **[P2]** Remove dead code in `validateRaceUpdate` — removed unreachable dedup/cap checks
- [x] **[P2]** County seeder bypasses `validateRaceUpdate` — now validates before KV writes
- [x] **[P3]** Election Day cache invalidation timing — skip cache invalidation on Election Day to avoid peak-load rebuilds

### PWA Bugs
- [x] Back button on first "Talk to Me" page doesn't work — Phase 0 now renders welcome screen, back from Phase 1 returns to it
- [x] Phase 0 should render the website home page, not the welcome screen — Phase 0 now redirects to landing page (/), ?start=1 auto-advances to Phase 1

### Daily Updater & Freshness
- [ ] Add county ballots and voting info to daily updater refresh — currently only statewide races are auto-updated; county ballots, county_info, and precinct maps are seeded once and never refreshed
- [ ] Design a post-Election Day site and have it ready to automatically switch when the polls close — currently the site shows stale "March 3, 2026" messaging with no post-election UX, no runoff messaging, no results. After election ends, app still shows "Vote Now" CTAs and generates guides for concluded races.
- [x] Put more accurate text for unseeded county polling hours — replaced Travis County-specific fallback with generic statewide text ("Early voting hours vary by county")

### Staleness & Caching (from audit)
_Audit found 12 stale data risks across KV, service worker, localStorage, and daily updater._

#### HIGH
- [x] **[H1]** Add TTL to `candidates_index` KV cache — `expirationTtl: 3600` (1 hour)
- [x] **[H2]** PWA ballot refresh now merges county races — detects new races by office|district key and appends them
- [x] **[H3]** Deduplicate statewide + county race merge in guide generation — filters by office|district before concat

#### MEDIUM
- [x] **[M1]** Use manifest version for cache invalidation — addressed by H1 TTL
- [x] **[M2]** Service worker cache expiration — stale fallbacks (>1hr) discarded; API responses remain network-only
- [x] **[M3]** Post-election cache auto-transition — addressed by H1 TTL + M2

#### LOW
- [x] **[L1]** Add staleness warning to localStorage data — banner "Your ballot data may be outdated. Tap to refresh." after 48 hours
- [x] **[L2]** Add TTL to county_info KV writes — `expirationTtl: 604800` (7 days)
- [x] **[L3]** Add TTL to precinct_map KV writes — `expirationTtl: 2592000` (30 days)
- [x] **[L4]** Reduce PWA manifest cache duration — `max-age=3600` (1 hour)

### Monitoring & Alerts
- [ ] Design a way to get notified about app problems — error alerting, uptime monitoring, KV health checks, failed cron runs, etc.

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
