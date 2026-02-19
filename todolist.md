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

- [ ] Address-to-district lookup — added `/api/districts` endpoint to Worker using Census Geocoder API. New `DistrictLookupService.swift` calls it during guide build. `Ballot.filtered(to:)` filters races to user's actual districts. Districts cached in VoterProfile. Falls back to all races if lookup fails.
- [ ] Polling location finder — added "Find My Polling Location" card to VotingInfoView with "Open in Maps" button (searches "Vote Center" near user's address) and VoteTravis.gov link. Requires EnvironmentObject for address access.
- [ ] Share voter profile — added ShareLink to ProfileView toolbar (square.and.arrow.up icon). Formats profile as shareable text: political outlook, AI summary, top issues, candidate qualities, policy stances, admired/disliked politicians. Excludes address for privacy.
- [ ] Election Day voting locations link — added "Find Election Day locations" button in the Election Day accordion section of VotingInfoView. Links to Travis County Clerk elections page.
- [ ] Profile summary generation — added standalone `ClaudeService.generateProfileSummary()` that calls Claude API with voter profile data and returns a 2-3 sentence synthesis. Added refresh button (arrow.trianglehead.2.clockwise) on ProfileView summary card to regenerate. Summary was already generated during guide build; this adds standalone regeneration.
- [ ] Push notification reminders — added `NotificationService` with 5 scheduled local notifications: early voting start (Feb 17), mid-week reminder (Feb 24), last day of early voting (Feb 27), election eve (Mar 2), Election Day (Mar 3). Toggle card on VotingInfoView requests permission and schedules/cancels all reminders. State persisted in UserDefaults.

---

## Open

Items not yet attempted or needing a fresh approach after failed verification.

### Bugs

(none)

### Improvements

(none)

### Features

- [ ] Cloud persistence / backup — currently UserDefaults only. Consider CloudKit or similar for syncing voter profile and guide across devices
- [ ] iPad / larger screen layout — current views are iPhone-optimized. Consider NavigationSplitView or multi-column layout for iPad
- [ ] Offline mode — cache the generated ballot so the app works without network after initial guide generation
- [ ] More entertaining loading animation — BuildingGuideView currently shows a simple pulsing icon and rotating status messages while the guide builds. Replace with something more engaging (e.g. animated ballot being filled in, fun voting facts, progress stages with illustrations)
- [ ] Light/dark mode support — currently forced to light mode via `.preferredColorScheme(.light)` on ContentView. Define dark-mode variants for all Theme colors (backgroundCream, cardBackground, textPrimary, textSecondary, etc.) and remove the forced light mode so the app respects the system setting

### Testing

- [ ] VotingGuideStore tests — verify phase navigation (advance/goBack), profile data accumulation, progress fraction calculation, save/load from UserDefaults, reset behavior
- [ ] ClaudeService tests — test API call construction, JSON parsing of ballot response, error handling for network failures and malformed responses
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
<summary>Improvements (5 resolved)</summary>

- [x] Complete policy deep-dive questions — all 12 issues covered
- [x] Real candidate data for March 2026 primary — real data from Travis County Clerk, Ballotpedia, Texas Tribune, KUT
- [x] Real proposition data — all 10 Republican and 13 Democratic propositions match actual ballot
- [x] Accuracy disclaimer — DisclaimerBanner on BallotOverviewView, CheatSheetView, RaceDetailView
- [x] Extract election data into separate JSON files — ElectionDataLoader with raw Decodable types

</details>

<details>
<summary>Features (8 resolved)</summary>

- [x] Initial app scaffold — complete interview flow (9 phases), ballot overview, cheat sheet, voting info, profile view, Theme system, sample data, UserDefaults persistence
- [x] Feedback by email — FeedbackHelper with mailto URL on ProfileView
- [x] Share the app with others — ShareLink on BuildingGuideView and CheatSheetView toolbar
- [x] App Store review prompt — SKStoreReviewController after guide completes, once per install
- [x] Cloudflare Worker backend proxy — server-side API key at atxvotes-api.joshuabaer.workers.dev
- [x] Accessibility audit — Reduce Motion, VoiceOver labels, decorative image hiding, element grouping, white-on-white text fix

</details>

<details>
<summary>Tests (0 resolved)</summary>

(none yet)

</details>
