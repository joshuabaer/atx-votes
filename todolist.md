# ATX Votes TODO List

> **Before adding a new item:** Search this list for similar existing bugs/features first.
> If a matching item already exists, increment the attempt count (e.g. `(attempted x2)`) and append
> notes about what was tried. Notify the user that this has been attempted before so we can
> try a different approach. This helps track repeated failures on the same issue.
>
> **Workflow:** Open → Needs Verification → Done (or back to Open if verification fails).
> Items in "Needs Verification" must be tested before being re-attempted or marked done.

---

## Needs Verification

Items recently fixed but not yet tested. **Test these before attempting again or marking done.**

### Bugs

### Improvements

### Features

---

## Open

Items not yet attempted or needing a fresh approach after failed verification.

### Bugs

### Improvements

#### Headshots
- [x] Try harder to find missing candidate photos — Found Anthony Gupta headshot from LXMI Capital website (he was mislabeled as SBOE Dist 5; actually State Rep Dist 48). Searched extensively for Ofelia Maldonado Zapata and Gavino Fernandez Jr. (County Commissioner Pct 4): no individual photos available on Ballotpedia, KUT, Austin Chronicle, Community Impact, Travis County Dem party, Vote411, or campaign sites. Only a KUT composite of all 4 Pct 4 candidates exists. 60/62 headshots now found.

#### Landing Page

#### Ballot Display

#### Loading Animation


#### Interview Flow

#### Pages


#### Print

#### Share

### Features


### Testing

- [x] Interview flow UI tests — 47 tests covering all 8 phases, required field validation (3-5 issues, spectrum, deep dives, 2-3 qualities, street/ZIP), back navigation preserving state, full happy-path walkthrough. Uses happy-dom for DOM simulation.
- [x] Verify candidate-to-race accuracy — cross-referenced against Ballotpedia, Texas Tribune, Travis County Clerk, and Texas SOS. Fixed: added 3 missing GOP Railroad Commissioner candidates (including Jim Matlock at 20% in polls), removed withdrawn Christopher Hurt from GOP TX-10, added 4 missing Dem HD-49 candidates, added 2 missing Dem SBOE-5 candidates. Updated both JSON files and remote KV. Note: statewide races intentionally exclude minor/perennial candidates as editorial choice.
- [x] Partisan bias audit — reviewed all 200+ Spanish translations: no bias found. Added explicit NONPARTISAN instruction blocks to all Claude API prompts (guide system/user, summary system/user). Instructions require factual/issue-based reasoning, prohibit partisan framing and loaded terms, and mandate equal analytical rigor for all candidates.

---

## Done

Verified working. Collapsed for reference.

<details>
<summary>PWA Bugs (8 resolved)</summary>

- [x] PWA: Proposition explanations not translated — 46 Spanish translations for static ifPasses/ifFails data in TR dictionary. Rendering passes ifPasses/ifFails through `t()`. Claude prompt generates reasoning/caveats/strategicNotes in Spanish when `lang=es`. Verified: 392 TR keys, 45 prop translations working.
- [x] Proposition badges not translated — added `t()` wrapping on prop badges and cheat sheet, added Spanish translations for "Lean Yes" → "A favor", "Lean No" → "En contra", "Your Call" → "Tu decisión", plus confidence labels.
- [x] Profile summary not translated — pass `lang` parameter from client to `/app/api/summary` and `/app/api/guide` endpoints. Server adds "Write in Spanish" instruction to Claude prompt when `lang=es`.
- [x] Language switcher low contrast in dark mode — added `.lang-on` class with blue background/white text for active language button, explicit `--border2` border on inactive buttons.
- [x] Spanish nav tab labels wrapping — shortened translations ("Mi boleta" → "Boleta", "Info de votación" → "Info"), added `white-space:nowrap` to `.tab` CSS.
- [x] White screen on first deploy — `APP_HTML` was defined before `CSS` and `APP_JS` variables. With `var` hoisting, they were `undefined` at assignment time. Fixed by moving `APP_HTML` to end of pwa.js.
- [x] "Station" Easter egg — fixed by explicitly setting city field to "Austin" in addition to street and zip when station shortcut is detected.
- [x] Race card navigation always goes to senate race — races don't have `id` fields, so `undefined === undefined` matched first race every time. Changed `renderRaceCard` to match by `office + district` instead.

</details>

<details>
<summary>PWA Improvements (30 resolved)</summary>

- [x] Service worker cache-first → network-first — old v1 SW served stale HTML. Changed to v2 network-first, added `/app/clear` cache-clearing route, added `Cache-Control: no-cache` header.
- [x] Tab bar not visible — `position:fixed` tab bar inside `#app` wasn't rendering on some browsers. Moved to flex layout: body is `display:flex;flex-direction:column`, `#app` scrolls (`flex:1;overflow-y:auto`), tab bar is a natural flex child in separate `#tabs` div.
- [x] Tab icons match iOS — replaced emoji tab icons with inline SVGs matching iOS SF Symbols: `checkmark.seal.fill`, `info.circle.fill`, `person.circle.fill`. Labels updated to match ("My Ballot").
- [x] Landing page: link to web app — replaced TestFlight download CTA with "Build My Voting Guide" linking to `/app`. Added "Works on any device" note. Removed iOS-only messaging.
- [x] Custom print cheat sheet — dedicated `#/cheatsheet` route with compact table layout matching iOS CheatSheetView. Contested races with star indicators, propositions with color-coded recommendations (green/red/orange), uncontested races. Print button triggers `window.print()` with `@media print` CSS that hides nav/buttons and fits on one page. Shows voter address, party badge, election date.
- [x] Recommendation badge wrapping — added `white-space:nowrap` on `.badge` and `flex-shrink:0` on `.cand-tags`.
- [x] Desktop top nav — responsive top nav bar (`@media(min-width:600px)`) with brand + nav links + SVG icons, hides bottom tabs on desktop.
- [x] Dismissible disclaimer — added close button (×) to AI-Generated Recommendations banner, uses session state so it reappears on next visit.
- [x] Race cards — candidate count and chevron — shows "N candidates" and a › chevron on every race card to signal tappability.
- [x] Footer links on all pages — Nonpartisan by Design, Privacy Policy, and contact links now appear on Vote Info and Profile pages in addition to Ballot.
- [x] Enhanced Voting Info page — 6 expandable accordion sections (Key Dates with strikethrough for past dates, Early Voting hours by date range, Election Day with open primary explanation, Voter ID with checkmarks, What to Bring with phone warning, Resources with 5 links). Plus polling location card and Travis County Elections contact info.
- [x] Cheat sheet party switcher — added party switcher to cheat sheet page, hidden in print via `@media print`.
- [x] Election info header card — centered card at top of ballot showing "Texas [Party] Primary", date, and user's district badges (CD/SD/HD) or "Showing all races" fallback.
- [x] Candidate cards — avatar circle (first letter, rotating colors), color-coded Strengths (green) / Concerns (red) headers, flow-layout position chips replacing bullet lists.
- [x] Proposition cards — color-coded If Passes (green check) / If Fails (red X) boxes always visible, brain icon AI reasoning, side-by-side supporters vs opponents columns, fiscal impact and caveats with icons.
- [x] Address form privacy note — lock icon with green-tinted privacy reassurance ("Your address stays on your device..."), auto-focus on street input, proper inputmode attributes.
- [x] Qualities picker icons — 8 inline SVG icons matching iOS SF Symbols (bar chart, shield, standing figure, briefcase, lightbulb, arrows, flag, people group) displayed in quality chips during interview and on profile page.
- [x] Address verification — client-side validation (street required, 5-digit ZIP), pre-verifies address via Census Geocoder before guide generation. Shows error on form if address not found with option to fix or skip. Spinner loading state during verification. Spanish translations included.
- [x] Candidate descriptions full-width — moved summary text below the avatar+name header row so it spans the full card width instead of being indented by the avatar column.
- [x] Candidate photos — headshots served via Cloudflare static assets at `/headshots/`. 62 real photos (JPG/PNG) with initial-letter fallback for 3 placeholder candidates. `onerror` cascade tries `.jpg` then `.png` then letter initial. Avatar bumped to 48px with `overflow:hidden` for circular crop.
- [x] Proposition Spanish translations — 23 proposition titles and descriptions (13 Democrat + 10 Republican) translated to Spanish. Shown below English text in italic when language is set to Spanish, using `prop-trans` CSS class.
- [x] Ballot race card headshots — small 30px candidate headshot row on each race card in the ballot overview. Recommended candidate highlighted with blue border. Same `.jpg → .png → initial` fallback cascade.
- [x] PWA: Free-form "Anything else?" field — phase 5 textarea between Qualities and Address. Optional field stored in `S.freeform`, persisted in localStorage, shown on profile page. Text passed to Claude in both guide and summary prompts. Skip button available.
- [x] PWA: Bouncing mascot loading animation → tug-of-war — replaced with pure CSS 🫏 ⭐ 🐘 tug-of-war animation. Animals scale alternately on 1.6s loop. Star is static. `prefers-reduced-motion` disables animation.
- [x] Cheat sheet print layout bigger — 18px table text, 28px header, 16px metadata. Cell padding 7px. Hardcoded even-row background. Page margins 0.5in.
- [x] Footer links on all static pages — consistent footer on all 4 public pages with Nonpartisan, Privacy, and contact links.
- [x] Translate candidate ballot data for Spanish — guide generation now requests `candidateTranslations` from Claude when `lang=es`. Merges translated summary, keyPositions, pros, cons into ballot response. `max_tokens` doubled to 8192 for Spanish.
- [x] Headshots on uncontested race cards — 40px circular headshot with initial fallback on uncontested races in ballot view.
- [x] Skip welcome screen from landing page — landing page CTA links to `/app?start=1`, PWA init jumps to Phase 1 if user hasn't completed a guide. URL cleaned via `history.replaceState`.
- [x] Remove "Print" from cheat sheet button — ballot page button renamed to "Cheat Sheet" with clipboard icon. Print button on cheat sheet page itself still says "Print Cheat Sheet."

</details>

<details>
<summary>PWA Features (8 resolved)</summary>

- [x] PWA web app — full single-page app at `/app` with inline CSS/JS, no build step. Interview flow (7 phases), ballot display, race detail, propositions, profile, vote info. Hash router, localStorage persistence, dark mode via `prefers-color-scheme`.
- [x] Server-side guide generation — `pwa-guide.js` handles Claude API calls server-side so APP_SECRET and prompts never reach the client. Model fallback: `claude-sonnet-4-6` → `claude-sonnet-4-20250514`.
- [x] Background ballot refresh — `refreshBallots()` fetches latest ballot data on load and merges factual fields (endorsements, polling, fundraising, etc.) while preserving personalized recommendations.
- [x] Send Feedback + credits on profile — "Send Feedback" mailto link (howdy@atxvotes.app) and "Powered by Claude (Anthropic)" credits added to profile page.
- [x] "I Voted" tracking and sticker — CSS sticker graphic on Vote Info page, "I Voted!" button on countdown, replaces countdown with sticker + thank you message when marked, shareable via Web Share API, undo option, persists in localStorage.
- [x] Spanish translation / i18n — English-as-key translation system with 200+ Spanish translations ported from iOS. Auto-detects browser language, language toggle on welcome page and profile. Translates all UI strings including interview questions, deep dives, ballot labels, vote info, and cheat sheet. Data values stay English for API compatibility.
- [x] Regenerate profile summary — "Regenerate Summary" button on profile page calls new `POST /app/api/summary` endpoint. Server-side Claude call with dedicated summary prompt (matching iOS). Shows loading state, persists to localStorage, Spanish translations included.
- [x] Accessibility — `prefers-reduced-motion` disables all animations, `focus-visible` outlines for keyboard nav, skip link, semantic HTML (`<main>`, `role="navigation"`), ARIA roles on tabs (`role="tablist"`/`role="tab"`/`aria-selected`), chips/radios (`role="option"`/`role="radio"`/`aria-checked`), accordions (`role="button"`/`aria-expanded`), race cards (`role="link"`/`aria-label`), keyboard Enter/Space handler for `div[data-action]`, `aria-live="polite"` on loading status.

</details>

<details>
<summary>Infrastructure (3 resolved)</summary>

- [x] Add analytics — used Cloudflare Web Analytics instead of Google Analytics (privacy-friendly, no cookies, no personal data, GDPR-compliant). Beacon script injected at response level via HTMLRewriter in fetch handler — covers all HTML pages automatically. Token `9c181c37d90740429efef870887a9774` configured via `CF_BEACON_TOKEN` env var in wrangler.toml. Deployed and verified live. Updated privacy policy and nonpartisan page disclosures.
- [x] /app/clear resets all user data — `localStorage.clear()` added to clear page, wiping profile, ballots, party selection, and language preference alongside SW cache flush. Full fresh start.
- [x] Language switch debounce — changed welcome page language toggle from `<a href="#">` to `<button>`, added 500ms debounce guard to `setLang` to prevent phantom double-click from reverting language on mobile.

</details>

<details>
<summary>Tests (1 resolved)</summary>

- [x] Interview flow UI tests — 47 tests covering all 8 phases with happy-dom DOM simulation.

</details>
