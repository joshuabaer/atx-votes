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

- [ ] PWA: Recommendation badge wrapping — added `white-space:nowrap` on `.badge` and `flex-shrink:0` on `.cand-tags` to prevent "Good Match" and other badges from wrapping text.
- [ ] PWA: Desktop top nav — added responsive top nav bar (`@media(min-width:600px)`) with brand + nav links + SVG icons, hides bottom tabs on desktop.

### Features

---

## Open

Items not yet attempted or needing a fresh approach after failed verification.

### Bugs

- [ ] PWA: "Station" Easter egg not working — typing "station" in the address form should auto-fill "701 Brazos St." / Austin / 78701 and immediately build the guide. Debug the submit handler and station detection logic in pwa.js.

### Improvements

#### Landing Page
- [ ] Landing page: link directly to web app — change the landing page at `/` to link directly to `/app` instead of promoting the iOS TestFlight download. The web app is the primary experience.

#### Ballot Display
- [ ] PWA: Election info header card — add a header card to the ballot page showing election name, date, and the user's districts (Congressional, State House, State Senate). Show "Showing all races" fallback if no districts. Reference iOS `BallotOverviewView.swift` lines 241-301.
- [ ] PWA: Make disclaimer banner dismissible — add a close/dismiss button to the AI-Generated Recommendations disclaimer. Store dismissed state in session (show again on next visit).
- [ ] PWA: Race cards — candidate count and chevron — add candidate count text and a chevron-right indicator to `renderRaceCard` to signal tappability.
- [ ] PWA: Candidate cards — avatar and color-coded pros/cons — add avatar circle (first letter), color-coded Strengths (green) / Concerns (red) headers, flow-layout position chips. Reference iOS `RaceDetailView.swift`.
- [ ] PWA: Proposition cards — side-by-side layout and icons — add side-by-side supporters vs opponents, color-coded If Passes (green check) / If Fails (red X), brain icon for AI reasoning, confidence display. Reference iOS `BallotOverviewView.swift` lines 610-791.

#### Interview Flow
- [ ] PWA: Qualities picker icons — add SVG icons matching iOS SF Symbols for each of the 8 qualities. PWA currently shows text-only chips. Reference `QualitiesPickerView.swift`.
- [ ] PWA: Address form — privacy note and focus management — add privacy note with lock icon ("Your address stays on your device..."), auto-focus on street input, ensure proper `inputmode` attributes.
- [ ] PWA: Address verification — verify user-entered addresses are valid and within the service area (Austin/Travis County). Could involve geocoding or validating against a known address database.

#### Pages
- [ ] PWA: Footer links on Vote Info and Profile pages — the ballot page has footer links (Nonpartisan by Design, Privacy Policy, contact email) but Vote Info and Profile do not. Add to all post-interview pages.
- [ ] PWA: Enhance Voting Info page — add 6 expandable accordion sections: Key Dates (strikethrough for passed dates), Early Voting hours by date range, Election Day details with open primary explanation, Voter ID (7 accepted IDs with icons), What to Bring (phone-not-allowed warning), Resources (5 links: LWV, VOTE411, VoteTravis, VoteTexas, KUT). Also: polling location link, Travis County Elections phone number. Reference `VotingInfoView.swift`.
- [ ] PWA: Send Feedback link and credits on profile — add "Send Feedback" mailto link (howdy@atxvotes.app) and "Powered by Claude (Anthropic)" credits to profile page.
- [ ] PWA: Regenerate profile summary — add button to regenerate the profile summary via Claude API. Needs server-side endpoint or reuse of existing guide endpoint.

#### Print
- [ ] PWA: Custom print cheat sheet — a dedicated print-optimized page designed to fit on one page and be easy to read at the polling booth. Table-style layout with race/candidate pairs, proposition recommendations, key race indicators, compact formatting. Accessible via "Print Cheat Sheet" button. Reference iOS `CheatSheetView.swift`.

### Features

- [ ] PWA: "I Voted" tracking and sticker — toggle button to mark as voted on Vote Info page, update countdown to "You voted!", shareable "I Voted" graphic (CSS/SVG-based). Store in localStorage.
- [ ] PWA: Spanish translation / i18n — add i18n system (translations object keyed by language) and translate all strings to Spanish. Detect browser language via `navigator.language`. iOS already has Spanish translation.
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
<summary>PWA Bugs (1 resolved)</summary>

- [x] White screen on first deploy — `APP_HTML` was defined before `CSS` and `APP_JS` variables. With `var` hoisting, they were `undefined` at assignment time. Fixed by moving `APP_HTML` to end of pwa.js.

</details>

<details>
<summary>PWA Improvements (3 resolved)</summary>

- [x] Service worker cache-first → network-first — old v1 SW served stale HTML. Changed to v2 network-first, added `/app/clear` cache-clearing route, added `Cache-Control: no-cache` header.
- [x] Tab bar not visible — `position:fixed` tab bar inside `#app` wasn't rendering on some browsers. Moved to flex layout: body is `display:flex;flex-direction:column`, `#app` scrolls (`flex:1;overflow-y:auto`), tab bar is a natural flex child in separate `#tabs` div.
- [x] Tab icons match iOS — replaced emoji tab icons with inline SVGs matching iOS SF Symbols: `checkmark.seal.fill`, `info.circle.fill`, `person.circle.fill`. Labels updated to match ("My Ballot").

</details>

<details>
<summary>PWA Features (3 resolved)</summary>

- [x] PWA web app — full single-page app at `/app` with inline CSS/JS, no build step. Interview flow (7 phases), ballot display, race detail, propositions, profile, vote info. Hash router, localStorage persistence, dark mode via `prefers-color-scheme`.
- [x] Server-side guide generation — `pwa-guide.js` handles Claude API calls server-side so APP_SECRET and prompts never reach the client. Model fallback: `claude-sonnet-4-6` → `claude-sonnet-4-20250514`.
- [x] Background ballot refresh — `refreshBallots()` fetches latest ballot data on load and merges factual fields (endorsements, polling, fundraising, etc.) while preserving personalized recommendations.

</details>

<details>
<summary>Tests (0 resolved)</summary>

(none yet)

</details>
