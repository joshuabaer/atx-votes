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

#### Landing Page

#### Ballot Display

#### Interview Flow
- [ ] PWA: Qualities picker icons — add SVG icons matching iOS SF Symbols for each of the 8 qualities. PWA currently shows text-only chips. Reference `QualitiesPickerView.swift`.
- [ ] PWA: Address verification — verify user-entered addresses are valid and within the service area (Austin/Travis County). Could involve geocoding or validating against a known address database.

#### Pages
- [ ] PWA: Regenerate profile summary — add button to regenerate the profile summary via Claude API. Needs server-side endpoint or reuse of existing guide endpoint.

#### Print

#### Share

### Features

- [ ] PWA: Accessibility — ARIA labels on interactive elements, ARIA roles, semantic HTML (real buttons instead of divs with data-action), focus management for navigation, `prefers-reduced-motion` media query to disable animations.
- [ ] iOS: Light/dark mode support — currently forced to light mode via `.preferredColorScheme(.light)`. Define dark-mode variants for all Theme colors and remove forced light mode.
- [ ] iOS: Election countdown widget — WidgetKit extension with systemSmall/systemMedium/lock screen families showing days until Election Day and next key date. App Group shared UserDefaults for data bridge.
- [ ] iOS: More entertaining loading animation — replace simple pulsing icon and status messages with something more engaging during guide build.

### Testing

- [ ] Interview flow UI tests — walk through all interview phases, verify required field validation (3+ issues, 2+ qualities, address fields), verify back navigation preserves selections.

---

## Done

Verified working. Collapsed for reference.

<details>
<summary>iOS Bugs (3 resolved)</summary>

- [x] Onboarding scroll fix — replaced paged TabView with Group+switch in OnboardingFlowView
- [x] Always shows Republican primary results regardless of party choice — added `Ballot.sampleDemocrat`, switched on `profile.primaryBallot`
- [x] PolicyDeepDiveView skips silently for unmapped issues — added deep-dive questions for all 12 issues

</details>

<details>
<summary>iOS Improvements (12 resolved)</summary>

- [x] Complete policy deep-dive questions — all 12 issues covered
- [x] Real candidate data for March 2026 primary — real data from Travis County Clerk, Ballotpedia, Texas Tribune, KUT
- [x] Real proposition data — all 10 Republican and 13 Democratic propositions match actual ballot
- [x] Accuracy disclaimer — DisclaimerBanner on BallotOverviewView, CheatSheetView, RaceDetailView
- [x] Extract election data into separate JSON files — ElectionDataLoader with raw Decodable types
- [x] Structured logging — replaced `print()` with `os.Logger` (subsystem `app.atxvotes`) in VotingGuideStore and SampleData
- [x] Accessibility gaps — added VoiceOver labels/hints to RaceCard, CandidateCard, PropositionCard, share buttons, reminders toggle, section headers
- [x] Dynamic Type support — switched Theme fonts to semantic text styles, set minimum Dynamic Type size to XXLarge, bumped all inline fixed sizes
- [x] Service dependency injection — exposed ClaudeService through VotingGuideStore, removed ad-hoc instantiation in ProfileView
- [x] Error feedback — surface summary regeneration errors in ProfileView, show district lookup failure note in ballot header
- [x] Safe URL/Date construction — extracted static URL/Date constants in VotingInfoView with safe fallbacks
- [x] Design review document — created DESIGN_REVIEW.md with 9-section checklist and automated verification commands

</details>

<details>
<summary>iOS Features (15 resolved)</summary>

- [x] Initial app scaffold — complete interview flow (9 phases), ballot overview, cheat sheet, voting info, profile view, Theme system, sample data, UserDefaults persistence
- [x] Feedback by email — FeedbackHelper with mailto URL on ProfileView
- [x] Share the app with others — ShareLink on BuildingGuideView and CheatSheetView toolbar
- [x] App Store review prompt — SKStoreReviewController after guide completes, once per install
- [x] Cloudflare Worker backend proxy — server-side API key at atxvotes-api.joshuabaer.workers.dev
- [x] Accessibility audit — Reduce Motion, VoiceOver labels, decorative image hiding, element grouping, white-on-white text fix
- [x] Custom domain — registered atxvotes.app, set up DNS, email routing, landing page, API subdomain
- [x] Address-to-district lookup — Census Geocoder API via Cloudflare Worker, filters ballot to user's districts, falls back to all races
- [x] Polling location finder — "Open in Maps" button searches vote centers near user's address + VoteTravis.gov link
- [x] Share voter profile — ShareLink on Profile toolbar, formats as text excluding address for privacy
- [x] Election Day voting locations link — button in Election Day accordion links to Travis County Clerk site
- [x] Profile summary generation — standalone Claude API call + refresh button on Profile card to regenerate
- [x] Push notification reminders — 5 scheduled local notifications from early voting through Election Day with toggle
- [x] Offline mode — ballot cached to UserDefaults, works without network after initial guide generation
- [x] Dark mode support — added adaptive colors across all screens via `prefers-color-scheme`

</details>

<details>
<summary>PWA Bugs (2 resolved)</summary>

- [x] White screen on first deploy — `APP_HTML` was defined before `CSS` and `APP_JS` variables. With `var` hoisting, they were `undefined` at assignment time. Fixed by moving `APP_HTML` to end of pwa.js.
- [x] "Station" Easter egg — fixed by explicitly setting city field to "Austin" in addition to street and zip when station shortcut is detected.

</details>

<details>
<summary>PWA Improvements (16 resolved)</summary>

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

</details>

<details>
<summary>PWA Features (6 resolved)</summary>

- [x] PWA web app — full single-page app at `/app` with inline CSS/JS, no build step. Interview flow (7 phases), ballot display, race detail, propositions, profile, vote info. Hash router, localStorage persistence, dark mode via `prefers-color-scheme`.
- [x] Server-side guide generation — `pwa-guide.js` handles Claude API calls server-side so APP_SECRET and prompts never reach the client. Model fallback: `claude-sonnet-4-6` → `claude-sonnet-4-20250514`.
- [x] Background ballot refresh — `refreshBallots()` fetches latest ballot data on load and merges factual fields (endorsements, polling, fundraising, etc.) while preserving personalized recommendations.
- [x] Send Feedback + credits on profile — "Send Feedback" mailto link (howdy@atxvotes.app) and "Powered by Claude (Anthropic)" credits added to profile page.
- [x] "I Voted" tracking and sticker — CSS sticker graphic on Vote Info page, "I Voted!" button on countdown, replaces countdown with sticker + thank you message when marked, shareable via Web Share API, undo option, persists in localStorage.
- [x] Spanish translation / i18n — English-as-key translation system with 200+ Spanish translations ported from iOS. Auto-detects browser language, language toggle on welcome page and profile. Translates all UI strings including interview questions, deep dives, ballot labels, vote info, and cheat sheet. Data values stay English for API compatibility.

</details>

<details>
<summary>Tests (0 resolved)</summary>

(none yet)

</details>
