# ATX Votes TODO List

---

## Open

- [x] Expand coverage to all of Texas — generalize beyond Austin/Travis County to support all Texas counties, districts, and races statewide
- [ ] Make city/region support self-service — configuration-driven approach so any city/region can set up their own voting guide without code changes
- [ ] Create versions for runoffs and general election — support multiple election cycles beyond the primary
- [x] Add statewide issues: Gun Rights/Safety, Abortion/Reproductive Rights, Water Rights/Scarcity, Agriculture/Rural Issues, Faith/Religious Liberty
- [x] Broaden deep dives for rural Texas — Housing (property rights/taxes vs density), Transportation (rural roads vs light rail), Immigration (remove Austin city-council framing)
- [x] Add candidate qualities: Faith & Values, Business Experience
- [x] Fix progress bar animation — dots jump back and forth between 4th and 5th position, line moves awkwardly during the loading screen
- [x] Reading level slider on profile — adjusts language complexity across the app on a scale from "high school" to "political science professor"
- [x] Wider content area on desktop — currently displays phone-width on computer screens
- [x] Ballot page overflows on iPhone — party switcher, "Good Match" badge, and Share button clip off the right edge on iPhone 17 Pro
- [x] "Use my location" is broken — shows "Location not available" error
- [x] Update researching loading screen main text based on tone 6 and 7 — show themed text when Swedish Chef or Cowboy tones are active
- [x] Apply tone to AI personal summary on profile page — summary is regenerated with current tone when user hits "Reprocess Guide"
- [x] Put "Texas Votes (Cowboy)" in the title of the link for txvotes.app/cowboy and "(Swedish Chef)" for /chef
- [ ] Candidate profile page — a page for each candidate where they can verify all information and background we have about them in one place
- [ ] AI audit — figure out the best way to have ChatGPT, Gemini, and Grok audit the detailed content and methodologies of this app
- [x] Data coverage dashboard — `/admin/coverage` shows candidate completeness, tone variants, county info, and county ballot coverage across all 254 counties
- [x] Fix district resolution — Census geocoder + filterBallotToDistricts() already work; fixed by populating county ballot data and moving Travis races out of statewide
- [x] Move Travis County races out of statewide ballot — Commissioner Pct 2/4 moved to `ballot:county:48453:democrat_primary_2026`
- [ ] Seed county ballots for top 20 counties by population — covers ~75% of TX voters with local races
- [ ] Seed county_info for remaining 202 counties — voting logistics (hours, locations, contact) for rural/smaller counties
- [ ] Fill missing headshots — 9 candidates completely missing, 2 have SVG only (need .jpg/.png)
- [ ] Fill sparse candidate data — endorsements (43% missing), Democrat polling (55% missing), Democrat fundraising (35% missing)
- [x] Pre-generate candidate tone variants — summary/strengths/concerns for all 73 statewide candidates across 7 tones
- [ ] LLM choice — let users choose which LLM and model to use for generating their ballot (Claude, GPT, Gemini, Grok)
- [x] Fireworks animation after "I Voted" — celebratory fireworks/confetti when the user taps the "I Voted" button
- [ ] Make the app more patriotic visually — red/white/blue theme touches, stars, flag-inspired design elements
- [ ] Make the app more viral — built-in sharing prompts, social hooks, referral mechanics
- [ ] Volunteer opportunities near you — add a "Volunteer" section on the Vote Info page showing nearby volunteer opportunities
- [ ] Post-voting share prompt — after voting, ask the user to share the app with 3 people who could use encouragement to vote
- [x] Fix back button on /cowboy and /chef — after entering via a vanity URL, the browser back button doesn't work properly; it should clear data and take you back to /cowboy (or /chef)
- [x] Always show a back button in the interview flow — e.g., the tone picker screen has no way to go back to the previous step
- [ ] Open source code — create an open source page on the website that links to the repo and includes links to 3 different AI code reviews to demonstrate fairness and impartiality
- [x] Remove Polymarket stats — remove prediction market odds from the app
- [ ] Create new txvotes repo in GitHub — fresh copy of the code without all the dev history
- [ ] Put Texas flag on the home page — add Texas flag graphic to the landing/welcome page
- [ ] Fix formatting on static pages (iPhone 17 Pro) — landing page and nonpartisan page have margins too wide, text is squeezed into a narrow column with excessive padding; "Build My Voting Guide" button and badge text wrap awkwardly
- [ ] Change issues and candidate trait selection to "sort by priority" — instead of "select your top 3-5", let users drag/sort issues by importance
- [x] Race card description text doesn't use full card width on desktop — text column is narrower than the card, wasting space next to the "Good Match" badge
- [x] Integrate Polymarket predictions — show prediction market odds alongside race recommendations
- [x] Geolocate button to auto-fill address — use browser geolocation to fill in street, city, and ZIP; hardcode state to TX
- [x] Balance loading screen timing — "Researching Republicans" and "Researching Democrats" should show for roughly equal time; currently the first one displays much longer and looks uneven
- [x] Swedish Chef easter egg — secret tone option that generates the entire guide in Swedish Chef from the Muppets ("Bork bork bork!")

---

## Done

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
<summary>PWA Features (8 resolved)</summary>

- [x] PWA web app (single-page app, no build step)
- [x] Server-side guide generation via Claude API
- [x] Background ballot refresh
- [x] Send Feedback + credits on profile
- [x] "I Voted" tracking and sticker
- [x] Spanish translation / i18n (200+ strings)
- [x] Regenerate profile summary
- [x] Accessibility (ARIA, keyboard nav, reduced motion)

</details>

<details>
<summary>Infrastructure (3 resolved)</summary>

- [x] Cloudflare Web Analytics
- [x] /app/clear resets all user data
- [x] Language switch debounce

</details>

<details>
<summary>Testing (3 resolved)</summary>

- [x] Interview flow UI tests (47 tests, 8 phases)
- [x] Verify candidate-to-race accuracy
- [x] Partisan bias audit

</details>
