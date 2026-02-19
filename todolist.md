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

- [ ] Onboarding scroll fix — replaced paged TabView with Group+switch in OnboardingFlowView to fix vertical ScrollView gesture conflict. Transition animation preserved with `.asymmetric(insertion: .move(edge: .trailing), removal: .move(edge: .leading))`.

### Improvements

- [ ] Fictional candidate names in sample data — replaced all real politician names in SampleData.swift (Cornyn→Langford, Paxton→Mercer, Abbott→Brackett, etc.) and VotingGuideStore preview data. Propositions also neutralized (Sharia→foreign law, Dem chairs→opposing-party chairs).
- [ ] Accuracy disclaimer — added `DisclaimerBanner` component (Theme.swift). Dismissible banner at top of BallotOverviewView, persistent warning footer on CheatSheetView and RaceDetailView, and disclaimer line in cheat sheet share text.

### Features

- [ ] Feedback by email — added `FeedbackHelper` (Theme.swift) with mailto URL and "Send Feedback" button on ProfileView using `Link(destination:)`. Pre-fills subject line.

---

## Open

Items not yet attempted or needing a fresh approach after failed verification.

### Bugs

- [ ] Always shows Republican primary results regardless of party choice — selecting Democrat in PrimaryPickerView still generates `Ballot.sampleRepublican` because `ClaudeService.generateVotingGuide()` is stubbed and always returns the Republican sample ballot. Need `Ballot.sampleDemocrat` in SampleData.swift and logic in the stub to return the correct one based on `voterProfile.primaryBallot`
- [ ] PolicyDeepDiveView skips silently for unmapped issues — only housing, safety, economy/taxes, and tech have deep-dive questions. Other issues (healthcare, education, environment, infrastructure, transportation, immigration, civil rights) hit a `default: break` and show "Got it! Moving on..." with no meaningful interaction.

### Improvements

- [ ] Complete policy deep-dive questions — add InterviewQuestions entries for all 12 issues (healthcare, education, environment, infrastructure, transportation, immigration, civil rights are missing)
- [ ] Democratic primary sample ballot — only `Ballot.sampleRepublican` exists in SampleData.swift. Need `Ballot.sampleDemocrat` with Austin-area Democratic primary races (U.S. Rep CD-37, County Commissioner, etc.)
- [ ] Real candidate data for March 2026 primary — all candidate info in SampleData.swift is placeholder. Research actual candidates, positions, endorsements, and fundraising for Travis County races
- [ ] Real proposition data — verify the 10 sample propositions match actual March 2026 ballot propositions for Travis County

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
- [ ] Share the app with others — add a share sheet button that lets users share a link/message about ATX Votes. Show it prominently after the cheat sheet is first generated (BuildingGuideView → completion) and on CheatSheetView alongside the existing ShareLink. Use a friendly message like "I just built my personalized voting guide for the March 2026 primary with ATX Votes!"
- [ ] Prompt to leave App Store review — trigger `SKStoreReviewController.requestReview()` right after the cheat sheet is first generated (when `guideComplete` flips to true). Only prompt once per install. Guard with a UserDefaults flag so it doesn't re-trigger on subsequent launches
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
