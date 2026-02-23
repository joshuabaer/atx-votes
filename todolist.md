# Texas Votes TODO List

---

## Open

### Data & Content
- [ ] Enrich county_info for remaining ~120 counties — elections websites, phone numbers, vote center status for smallest/rural counties
- [ ] Seed county ballots for top 30 counties — local races for both parties via Claude + web_search (running now, script at docs/scripts/seed_county_ballots.js)
- [ ] Fill sparse candidate data — endorsements (43% missing), Democrat polling (55% missing), Democrat fundraising (35% missing)
- [x] Pre-generate candidate tone variants in KV — 259 tone variants generated for all 73 statewide candidates across 4 tones (1 JSON parse error on Lauren B. Pena cowboy tone)
- [ ] Candidate contact outreach — for each candidate, identify the best contact name and email address for asking them to review their candidate info on our website (research done, see docs/plans/candidate_contacts.md)

### Bugs
- [x] Recommendation engine should not recommend withdrawn candidates — e.g. Andrew White (dropped out Jan 5, 2026). Guide generation and ballot display should filter out candidates marked as withdrawn.
- [x] Candidates page throwing Error 1101 — `nameToSlug` crashing on null candidate name in KV data. Fixed with null guard.

### Features
- [ ] Make city/region support self-service — configuration-driven approach so any city/region can set up their own voting guide without code changes
- [ ] Create versions for runoffs and general election — support multiple election cycles beyond the primary (detailed plan at docs/plans/plan_runoff_general_election.md, 4-phase timeline March-October)
- [ ] LLM choice — let users choose which LLM and model to use for generating their ballot (Claude, GPT, Gemini, Grok)
- [x] URL flags for alternate LLMs — `?gemini`, `?grok`, and `?chatgpt` query params that tell the app to use that LLM for generating recommendations instead of Claude. Routes to OpenAI gpt-4o, Gemini 2.5 Flash, or Grok 3. API keys already set from audit runner.
- [x] Hidden LLM debug/comparison view — 5-tap version number in footer → `#/debug/compare`. Race-by-race and agreement summary views, cached in localStorage. Vanity URLs `/gemini`, `/grok`, `/chatgpt` with branded link previews. "Powered by" badge on loading screen and ballot header.
- [x] Cowboy & Swedish Chef easter eggs — triple-tap "Reading Level" on profile unlocks Swedish Chef (tone 6), type "yeehaw" unlocks Cowboy (tone 7). Both trigger emoji burst, haptic feedback, and immediate guide recalculation.
- [ ] Make priority list removal more obvious — add a visible "−" button on selected items in the two-zone picker (issues & qualities) to complement the "+" on pool items, so it's clear you can click to remove
- [ ] Change Swedish Chef easter egg trigger — switch from triple-tap "Reading Level" label to typing "bork" on the profile page (matches the "yeehaw" pattern for Cowboy)
- [ ] Sample ballot on home page — "Show me a sample" button that instantly displays a pre-generated example ballot, clearly watermarked as a sample, skipping the full interview. Very fast first impression for new visitors.
- [ ] Create new txvotes repo in GitHub — fresh copy of the code without all the dev history

### Audit Score Improvements
_From AI audit synthesis (ChatGPT 6/10, Gemini 8.6/10, Claude 7.8/10). Ranked by impact x feasibility._

#### Tier 1: High Impact, Low Effort
- [ ] Add "limited data" badge for low-information candidates — check field completeness at render time, show a visible badge on candidate cards when pros/cons/endorsements are sparse. Prevents information asymmetry from looking like favoritism. (Flagged by: ChatGPT + Gemini, affects Balance of Pros/Cons score)
- [ ] Normalize loaded interview option labels — editorial pass on deep dive answer wording to reduce rhetorical heat ("Don't overreact," "Second Amendment is non-negotiable," "Tax the wealthy more") while preserving meaning. Use strictly descriptive, symmetric language. (Flagged by: ChatGPT, affects Fairness of Framing score)
- [ ] Add "Data Last Verified" timestamp per candidate — show when each candidate's data was last updated by the daily updater. Already tracked in the pipeline, just needs display. (Flagged by: Gemini, affects Factual Accuracy score)
- [ ] Expand county coverage labeling — in-product indicator when local race data is incomplete for the user's county ("Local races not yet available for your county"). Sets honest expectations instead of silent omission. (Flagged by: ChatGPT + Gemini, affects Factual Accuracy + Balance scores)

#### Tier 2: High Impact, More Effort
- [ ] Add source citations per candidate field — require a `sources` array per candidate with URL + access date for key claims (endorsements, positions, polling). The single biggest trust improvement identified by both audits. (Flagged by: ChatGPT + Gemini, affects Factual Accuracy + Transparency scores)
- [ ] Implement automated bias test suite — same voter profile with swapped party ballots, measure recommendation shifts and flag asymmetries. Publishable evidence of fairness. (Flagged by: ChatGPT + Gemini, affects Partisan Bias score)
- [ ] Add "why this confidence level" explanations — show which specific voter answers drove each recommendation, not just a narrative summary. (Flagged by: Gemini, affects Transparency score)
- [ ] Add endorsement context labels — short neutral descriptor for each endorsement (e.g., "industry group," "labor org," "editorial board") so users understand what each endorsement means. (Flagged by: ChatGPT, affects Balance of Pros/Cons score)

#### Tier 3: Nice to Have
- [ ] Publish a data quality dashboard (public) — last-updated per race, source counts, completeness indicators visible to voters. (Flagged by: ChatGPT, affects Transparency score)
- [ ] Document and enforce a source ranking policy — official source priority rules (SOS filing > county office > campaign site > local news), allowlist/denylist for web_search results. (Flagged by: ChatGPT, affects Factual Accuracy score)
- [ ] Add issue list completeness review — evaluate interview topics against politically salient issues not currently covered (election administration, energy/oil & gas, spending/debt, criminal justice specifics, LGBTQ policy). Publish rubric with public feedback intake. (Flagged by: ChatGPT + Gemini, affects Partisan Bias + Fairness scores)

### Technical Debt
- [x] AI audit execution — automated daily cron calls ChatGPT, Gemini, and Grok APIs; results on /audit page; stops after election day
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
<summary>Features (7 resolved)</summary>

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
