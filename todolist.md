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

---

## Open

Items not yet attempted or needing a fresh approach after failed verification.

### Bugs

- [ ] White-on-white text in input boxes — text input fields for address entry and politician names show white text on a white background, making typed text invisible

### Improvements

(none)

### Features

- [ ] Claude API integration — ClaudeService has full HTTP infrastructure and well-written system prompts but `generateVotingGuide()` returns `Ballot.sampleRepublican` when apiKey is empty. Implement `parseGuideResponse()` JSON parsing. Add secure API key storage (Keychain or environment variable)
- [ ] Address-to-district lookup — address is collected in AddressEntryView but never used to determine real districts. Integrate with Google Civic Information API, Census Geocoder, or similar to map street address → congressional district, state house, state senate, county commissioner precinct, school board district
- [ ] Profile summary generation — `ClaudeService.generateProfileSummary()` returns hardcoded placeholder text. Wire up to Claude API to generate a natural-language summary of the voter's values and preferences
- [ ] Personalized ballot generation — connect voter profile (issues, spectrum, qualities, policy stances, admired/disliked politicians) to Claude API to generate tailored race recommendations and proposition analysis
- [ ] Cloud persistence / backup — currently UserDefaults only. Consider CloudKit or similar for syncing voter profile and guide across devices
- [ ] Polling location finder — add a map view or link to find the user's nearest early voting / Election Day polling location based on their address
- [ ] Push notification reminders — remind users about early voting dates, Election Day, and registration deadlines
- [ ] iPad / larger screen layout — current views are iPhone-optimized. Consider NavigationSplitView or multi-column layout for iPad
- [ ] Accessibility audit — verify VoiceOver labels, Dynamic Type support, and Reduce Motion throughout all views
- [ ] Offline mode — cache the generated ballot so the app works without network after initial guide generation

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
