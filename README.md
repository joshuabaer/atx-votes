# ATX Votes

A personalized voting guide app for Austin, Texas. Walks any voter through a quick interview about their values, looks up their specific ballot, researches every candidate, and generates personalized recommendations with a printable cheat sheet.

## How It Works

1. **Interview** (2 minutes) — Tap through questions about your top issues, political approach, policy views, candidate qualities, and which primary you're voting in
2. **Address** — Enter your home address so we can find your exact districts and ballot
3. **AI Research** — Claude researches every candidate on your ballot and matches them to your stated values
4. **Your Guide** — Browse personalized recommendations with pros, cons, strategic notes, and honest caveats
5. **Cheat Sheet** — A printable one-page summary to take to the polls (since Travis County doesn't allow phones in the booth)

## Architecture

- **SwiftUI** — iOS 17+, iPhone
- **Claude API** — Powers the voter profile analysis and candidate research/recommendations
- **Local-first** — Profile stored on-device, address never leaves the phone
- **No accounts** — No sign-up, no login, no tracking

## Setup

1. Open `AustinVotes.xcodeproj` in Xcode 15+
2. Add your Claude API key in `ClaudeService.swift` (or configure via environment/Keychain)
3. Build and run on iPhone or Simulator

Without an API key, the app uses sample data from the March 2026 Republican and Democratic primaries (based on real research) — perfect for development and demo.

## App Structure

```
AustinVotes/
├── AustinVotesApp.swift          # App entry point
├── ContentView.swift             # Root: onboarding flow vs main tab view
├── Theme.swift                   # Colors, typography, reusable components
├── Models/
│   ├── VoterProfile.swift        # User's political values and preferences
│   ├── Ballot.swift              # Races, candidates, propositions
│   ├── InterviewQuestion.swift   # Question bank for the interview flow
│   └── SampleData.swift          # Real sample data for development
├── Views/
│   ├── Interview/
│   │   ├── OnboardingFlowView    # Orchestrates the interview flow
│   │   ├── IssuesPickerView      # Pick your top 3-5 issues
│   │   ├── SpectrumPickerView    # Political approach
│   │   ├── PolicyDeepDiveView    # Follow-up questions on top issues
│   │   ├── PoliticianPickerView  # Politicians you admire/dislike
│   │   ├── QualitiesPickerView   # What you value in candidates
│   │   ├── PrimaryPickerView     # Republican or Democrat primary
│   │   ├── AddressEntryView      # Home address for ballot lookup
│   │   └── BuildingGuideView     # Loading screen while guide generates
│   ├── Ballot/
│   │   ├── BallotOverviewView    # All races and propositions
│   │   ├── RaceDetailView        # Deep dive on a single race
│   │   └── CheatSheetView        # Printable one-page summary
│   ├── Logistics/
│   │   └── VotingInfoView        # Dates, ID, locations, resources
│   └── ProfileView.swift         # Your voter profile summary
└── Services/
    ├── VotingGuideStore.swift    # Main app state (ObservableObject)
    └── ClaudeService.swift       # Claude API integration
```

## Screens

### Onboarding (first launch)
- **Welcome** — "Your personalized Austin voting guide in 5 minutes"
- **Issues** — Grid of tappable issue cards (Economy, Safety, Tech, etc.)
- **Spectrum** — Single-select political approach
- **Deep Dive** — Follow-up questions on your top issues
- **Politicians** — Free-text entry for admired/disliked politicians
- **Qualities** — What you value in candidates (competence, integrity, etc.)
- **Primary** — Which party's primary ballot
- **Address** — Street address for ballot lookup
- **Building** — Animated loading screen with step-by-step progress

### Main App (after guide is built)
- **My Ballot** — Key races with star badges, all contested races, propositions, uncontested races
- **Cheat Sheet** — Printable summary table with share button
- **Vote Info** — Countdown, dates, early voting hours, voter ID, what to bring, resources
- **Profile** — Your voter profile summary, values, policy stances

## Design

- Austin-inspired color palette (deep blue, capitol gold, cream background)
- Rounded, friendly typography
- Card-based layout with gentle shadows
- Spring animations on selections
- Progress bar through the interview

## Credits

Created by Joshua Baer, Austin TX — February 2026
Powered by Claude (Anthropic)
