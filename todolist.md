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

- [ ] Onboarding scroll fix — replaced paged TabView with Group+switch in OnboardingFlowView to fix vertical ScrollView gesture conflict. Also removed broad `.animation()` modifiers from ContentView and OnboardingFlowView that were redundant (withAnimation in store already handles transitions). Note: scrolling was actually working — the simulator requires click-and-drag, not trackpad scroll.
- [ ] Always shows Republican primary results regardless of party choice — added `Ballot.sampleDemocrat` with 5 Democratic races (CD-37, County Commissioner Pct 2, District Attorney, State Rep Dist 48, Justice of Peace) and 8 propositions. Updated `ClaudeService.generateVotingGuide()` to switch on `profile.primaryBallot` and return the correct sample ballot.
- [ ] PolicyDeepDiveView skips silently for unmapped issues — added deep-dive questions for all 7 missing issues (education, healthcare, environment, infrastructure, transportation, immigration, civil rights). Removed `default: break` from switch. Each question has 4 options covering the political spectrum from conservative to progressive.

### Improvements

- [ ] Complete policy deep-dive questions — added InterviewQuestions entries for all 12 issues: education, healthcare, environment, infrastructure, transportation, immigration, civil rights (IDs 104-110). Updated PolicyDeepDiveView switch to handle all cases (no more `default: break`). Also added dedup guard for economy/taxes sharing a question.
- [ ] Real candidate data for March 2026 primary — replaced all fictional candidates with real March 2026 Texas primary data from Travis County Clerk, Ballotpedia, Texas Tribune, and KUT. Republican ballot: 9 races (Senate, AG, Comptroller, Ag Commissioner, Governor, Lt. Gov, Railroad Commissioner, CD-10, CD-37, State Rep 48). Democratic ballot: 10 races (Senate, Governor, Lt. Gov, AG, Comptroller, CD-37, Commissioner Pct 2 & 4, State Rep 49 & 48, SBOE 5). All 10 Republican and 13 Democratic propositions are real. Sources cited in file header.
- [ ] Real proposition data — all 10 Republican and 13 Democratic primary propositions now match the actual March 2026 ballot.
- [ ] Accuracy disclaimer — added `DisclaimerBanner` component (Theme.swift). Dismissible banner at top of BallotOverviewView, persistent warning footer on CheatSheetView and RaceDetailView, and disclaimer line in cheat sheet share text.
- [ ] Extract election data into separate JSON files — created `ElectionData/republican_primary_2026.json` and `democrat_primary_2026.json` with full ballot data. Rewrote SampleData.swift with `ElectionDataLoader` and intermediate Raw* Decodable types (no UUIDs in JSON, string enums, simple date strings). To update for a new election: edit the JSON files — no Swift changes needed.

### Features

- [ ] Feedback by email — added `FeedbackHelper` (Theme.swift) with mailto URL and "Send Feedback" button on ProfileView using `Link(destination:)`. Pre-fills subject line.
- [ ] Share the app with others — added ShareLink on BuildingGuideView (prominent button after guide completes with "Help your friends vote informed!") and CheatSheetView toolbar (person.2.fill icon alongside existing share). Message: "I just built my personalized voting guide..."
- [ ] App Store review prompt — triggers `SKStoreReviewController.requestReview()` 2 seconds after guide first completes. Guarded by UserDefaults flag (`austin_votes_review_prompted`) so it only fires once per install.
- [ ] Cloudflare Worker backend proxy — replaced client-side API key with Cloudflare Worker at `atxvotes-api.joshuabaer.workers.dev`. `/api/guide` proxies to Anthropic with server-side key. Removed KeychainHelper, API key UI from ProfileView, SampleDataBanner. Users get personalized recommendations without setup.
- [ ] Address-to-district lookup — added `/api/districts` endpoint to Worker using Census Geocoder API. New `DistrictLookupService.swift` calls it during guide build. `Ballot.filtered(to:)` filters races to user's actual districts. Districts cached in VoterProfile. Falls back to all races if lookup fails.
- [ ] Polling location finder — added "Find My Polling Location" card to VotingInfoView with "Open in Maps" button (searches "Vote Center" near user's address) and VoteTravis.gov link. Requires EnvironmentObject for address access.
- [ ] Accessibility audit — added Reduce Motion support (ProgressBarView, BuildingGuideView pulsing animation, transitions), VoiceOver labels (IssueCard selected state, accordion expand/collapse hints, PropositionCard labels, StarBadge, ChipView remove buttons), decorative image hiding (.accessibilityHidden), element grouping (.accessibilityElement(children: .combine) on WelcomeFeatureRow, DisclaimerBanner, ProgressBarView). Fixed white-on-white text in AddressEntryView and PoliticianPickerView TextFields by adding .foregroundColor(Theme.textPrimary).
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
- [ ] Light/dark mode support — currently forced to light mode via `.preferredColorScheme(.light)` on ContentView. Define dark-mode variants for all Theme colors (backgroundCream, cardBackground, textPrimary, textSecondary, etc.) and remove the forced light mode so the app respects the system setting

### Testing

- [ ] VotingGuideStore tests — verify phase navigation (advance/goBack), profile data accumulation, progress fraction calculation, save/load from UserDefaults, reset behavior
- [ ] ClaudeService tests — test API call construction, JSON parsing of ballot response, error handling for network failures and malformed responses
- [ ] Interview flow UI tests — walk through all 8 interview phases, verify required field validation (3+ issues, 2+ qualities, address fields), verify back navigation preserves selections

---

## Done

Verified working. Collapsed for reference.

<details>
<summary>Bugs (0 resolved)</summary>

(none yet)

</details>

<details>
<summary>Improvements (0 resolved)</summary>

(none yet)

</details>

<details>
<summary>Features (1 resolved)</summary>

- [x] Initial app scaffold — complete interview flow (9 phases), ballot overview with race cards and proposition cards, cheat sheet with share, voting info with accordions, profile view, Theme system with Austin-inspired colors, sample Republican ballot data, UserDefaults persistence

</details>

<details>
<summary>Tests (0 resolved)</summary>

(none yet)

</details>
