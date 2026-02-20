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

(none)

### Improvements

(none)

### Features

(none)

---

## Open

Items not yet attempted or needing a fresh approach after failed verification.

### Bugs

(none)

### Improvements

(none)

### Features

- [ ] More entertaining loading animation — BuildingGuideView currently shows a simple pulsing icon and rotating status messages while the guide builds. Replace with something more engaging (e.g. animated ballot being filled in, fun voting facts, progress stages with illustrations)
- [ ] Light/dark mode support — currently forced to light mode via `.preferredColorScheme(.light)` on ContentView. Define dark-mode variants for all Theme colors (backgroundCream, cardBackground, textPrimary, textSecondary, etc.) and remove the forced light mode so the app respects the system setting
- [ ] Election countdown widget — WidgetKit extension with systemSmall/systemMedium/lock screen families showing days until Election Day and next key date. Use App Group shared UserDefaults for data bridge

### Testing

- [ ] Interview flow UI tests — walk through all 8 interview phases, verify required field validation (3+ issues, 2+ qualities, address fields), verify back navigation preserves selections

---

## Done

Verified working. Collapsed for reference.

<details>
<summary>Bugs (3 resolved)</summary>

- [x] Onboarding scroll fix — replaced paged TabView with Group+switch in OnboardingFlowView
- [x] Always shows Republican primary results regardless of party choice — added `Ballot.sampleDemocrat`, switched on `profile.primaryBallot`
- [x] PolicyDeepDiveView skips silently for unmapped issues — added deep-dive questions for all 12 issues

</details>

<details>
<summary>Improvements (12 resolved)</summary>

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
<summary>Features (15 resolved)</summary>

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

</details>

<details>
<summary>Tests (0 resolved)</summary>

(none yet)

</details>
