# Plan: Runoff & General Election Support

## Overview

Extend Texas Votes to support the full 2026 election cycle beyond the March 3 primary: the May 26 primary runoff and the November 3 general election. Each election type has distinct rules, ballot formats, and data needs.

---

## Texas 2026 Election Calendar

| Election | Election Day | Early Voting | Voter Reg Deadline |
|---|---|---|---|
| **Primary** | March 3, 2026 | Feb 17 - Feb 27 | Feb 2, 2026 |
| **Primary Runoff** | May 26, 2026 | May 18 - May 22 | April 27, 2026 |
| **General Election** | November 3, 2026 | Oct 19 - Oct 30 | Oct 5, 2026 |

### Sources
- [TX SOS: Primary & Runoff Law Calendar](https://www.sos.state.tx.us/elections/laws/advisory2025-17-mar-3-2026-primary-elec-law-cal-and-may-26-2026-primary-runoff-elec-law-cal.shtml)
- [TX SOS: November 2026 General Election](https://www.sos.texas.gov/elections/laws/2026-november-general-election.shtml)
- [TX SOS: Important Election Dates 2025-2026](https://www.sos.state.tx.us/elections/voter/important-election-dates.shtml)
- [TX SOS: Offices Up for Election in 2026](https://www.sos.state.tx.us/elections/candidates/guide/2026/offices2026.shtml)
- [KERA: What triggers a runoff in Texas](https://www.keranews.org/texas-news/2024-02-27/how-many-primary-races-will-require-overtime-heres-what-you-need-to-know-about-runoffs-in-texas)
- [Texas 2036: Primaries 101](https://texas2036.org/posts/texas-primaries-101-how-they-work-and-what-to-expect-in-2026/)

---

## Election Rules Summary

### Primary Runoff (May 26, 2026)
- **Trigger**: A race goes to runoff when no candidate receives >50% of the vote in the primary.
- **Ballot**: Only the races that went to runoff appear. Each runoff race has exactly 2 candidates (the top two vote-getters from the primary).
- **Party lock**: Voters who voted in one party's primary can ONLY vote in that same party's runoff. Voters who did NOT vote in the primary may vote in either party's runoff (but not both).
- **Much smaller ballot**: Typically only a handful of races per party go to runoff. Many primaries produce outright winners.
- **Same offices**: Runoff races come from the same set of offices as the primary (statewide, district, county).

### General Election (November 3, 2026)
- **All parties on one ballot**: No party picker needed. Republican and Democratic nominees appear side by side, along with any Libertarian, Green, or independent candidates.
- **Party column format**: Texas general election ballots list candidates by party column. The app should show all candidates for each race together.
- **Different races**: Same statewide offices (Governor, Lt. Governor, AG, Comptroller, Land Commissioner, Agriculture Commissioner, Railroad Commissioner) plus U.S. Senate, U.S. House, State Senate, State House, Supreme Court, Court of Criminal Appeals, Courts of Appeals, SBOE, and county-level offices.
- **Propositions**: May include state constitutional amendments (different from primary party propositions).
- **No party registration required**: Any registered voter can vote in the general election.

### Statewide Offices on the 2026 Ballot
- Governor
- Lieutenant Governor
- Attorney General
- Comptroller of Public Accounts
- Commissioner of the General Land Office
- Commissioner of Agriculture
- Railroad Commissioner
- U.S. Senator (John Cornyn's seat)
- U.S. Representatives (all 38 districts)
- State Senate (odd-numbered districts)
- State House (all 150 districts)
- Supreme Court (Chief Justice + 3 seats)
- Court of Criminal Appeals (Presiding Judge + 2 seats)
- Courts of Appeals (various places)
- State Board of Education (8 seats)

---

## 1. Election Cycle Data Model

### 1.1 New Election Type Enum

Define a central concept of "election cycle" used throughout the system:

```javascript
const ELECTION_CYCLES = {
  PRIMARY_2026: {
    id: "primary_2026",
    type: "primary",            // "primary" | "runoff" | "general"
    label: "Texas Primary",
    labelEs: "Primaria de Texas",
    date: "2026-03-03",
    earlyVotingStart: "2026-02-17",
    earlyVotingEnd: "2026-02-27",
    voterRegDeadline: "2026-02-02",
    requiresParty: true,        // user must pick R or D
    parties: ["republican", "democrat"],
  },
  RUNOFF_2026: {
    id: "runoff_2026",
    type: "runoff",
    label: "Texas Primary Runoff",
    labelEs: "Segunda Vuelta de la Primaria de Texas",
    date: "2026-05-26",
    earlyVotingStart: "2026-05-18",
    earlyVotingEnd: "2026-05-22",
    voterRegDeadline: "2026-04-27",
    requiresParty: true,        // locked to same party as primary
    parties: ["republican", "democrat"],
  },
  GENERAL_2026: {
    id: "general_2026",
    type: "general",
    label: "Texas General Election",
    labelEs: "Eleccion General de Texas",
    date: "2026-11-03",
    earlyVotingStart: "2026-10-19",
    earlyVotingEnd: "2026-10-30",
    voterRegDeadline: "2026-10-05",
    requiresParty: false,       // all parties on one ballot
    parties: null,              // not applicable
  },
};
```

This object should live in a shared config file importable by index.js, pwa.js, pwa-guide.js, updater.js, and county-seeder.js.

### 1.2 KV Key Patterns

Current keys (primary):
```
ballot:statewide:republican_primary_2026
ballot:statewide:democrat_primary_2026
ballot:county:{fips}:republican_primary_2026
ballot:county:{fips}:democrat_primary_2026
county_info:{fips}                          (contains primary early voting dates)
manifest
```

New keys (runoff):
```
ballot:statewide:republican_runoff_2026
ballot:statewide:democrat_runoff_2026
ballot:county:{fips}:republican_runoff_2026
ballot:county:{fips}:democrat_runoff_2026
county_info:{fips}:runoff_2026              (runoff-specific early voting dates)
manifest:runoff_2026
```

New keys (general):
```
ballot:statewide:general_2026               (single ballot, all parties)
ballot:county:{fips}:general_2026
county_info:{fips}:general_2026
manifest:general_2026
```

**Key design decisions:**
- Primary data stays in KV permanently. Runoff and general data are added alongside, never replacing primary data (users can review their primary guide later).
- The `manifest` key gains election-cycle-specific variants so clients can check freshness per cycle.
- `county_info` gets cycle-specific variants because early voting dates/hours differ per election.

### 1.3 General Election Ballot Data Shape

The general election ballot differs from primary ballots. Instead of separate R/D ballots, there is one unified ballot with party affiliation on each candidate:

```json
{
  "id": "general_2026",
  "electionDate": "2026-11-03",
  "electionName": "2026 Texas General Election",
  "type": "general",
  "races": [
    {
      "id": "governor_general_2026",
      "office": "Governor",
      "district": null,
      "isContested": true,
      "candidates": [
        {
          "id": "candidate-1",
          "name": "Candidate Name",
          "party": "republican",
          "isIncumbent": false,
          "summary": "...",
          "keyPositions": [],
          "endorsements": [],
          "pros": [],
          "cons": []
        },
        {
          "id": "candidate-2",
          "name": "Other Candidate",
          "party": "democrat",
          "isIncumbent": false,
          "summary": "...",
          ...
        }
      ]
    }
  ],
  "propositions": []
}
```

**Key difference from primary**: Each candidate object gains a `party` field. In primaries, party is implicit (you chose which ballot). In the general, all parties are mixed together per race.

### 1.4 Runoff Ballot Data Shape

Runoff ballots are structurally identical to primary ballots but much smaller:

```json
{
  "id": "republican_runoff_2026",
  "party": "republican",
  "electionDate": "2026-05-26",
  "electionName": "2026 Republican Primary Runoff",
  "type": "runoff",
  "races": [
    {
      "id": "ag_runoff_2026",
      "office": "Attorney General",
      "district": null,
      "isContested": true,
      "primaryResults": {
        "firstPlace": { "name": "Candidate A", "pct": 38.2 },
        "secondPlace": { "name": "Candidate B", "pct": 31.5 }
      },
      "candidates": [
        { "id": "c1", "name": "Candidate A", ... },
        { "id": "c2", "name": "Candidate B", ... }
      ]
    }
  ],
  "propositions": []
}
```

**Key additions**: The `primaryResults` field on each race provides context for users (these two advanced because neither got >50%). The `type: "runoff"` field signals to the UI and guide generator that this is a runoff.

---

## 2. Manifest & Active Election Detection

### 2.1 Enhanced Manifest Structure

```json
{
  "activeElection": "runoff_2026",
  "elections": {
    "primary_2026": {
      "republican": { "updatedAt": "...", "version": 5 },
      "democrat": { "updatedAt": "...", "version": 5 },
      "status": "complete"
    },
    "runoff_2026": {
      "republican": { "updatedAt": "...", "version": 1 },
      "democrat": { "updatedAt": "...", "version": 1 },
      "status": "active"
    },
    "general_2026": {
      "status": "upcoming"
    }
  }
}
```

The `activeElection` field tells the PWA which election to show by default. Status values: `"upcoming"`, `"active"`, `"complete"`.

### 2.2 Auto-Detection Logic

The PWA should auto-detect the current election based on date, with the manifest as the authority:

```javascript
function detectActiveElection(manifest, now) {
  // If manifest specifies activeElection, trust it
  if (manifest && manifest.activeElection) return manifest.activeElection;

  // Fallback: date-based detection
  const d = now || new Date();
  if (d < new Date("2026-03-04")) return "primary_2026";
  if (d < new Date("2026-05-27")) return "runoff_2026";
  return "general_2026";
}
```

---

## 3. API/Routing Changes (index.js)

### 3.1 Ballot Fetch Endpoint

The `/app/api/ballot` endpoint currently hardcodes `_primary_2026`. It needs an `election` parameter:

**Current** (`handleBallotFetch`):
```javascript
let raw = await env.ELECTION_DATA.get(`ballot:statewide:${party}_primary_2026`);
```

**New**:
```javascript
// GET /app/api/ballot?party=republican&county=48453&election=runoff_2026
const election = url.searchParams.get("election") || "primary_2026";

if (election === "general_2026") {
  // General election: single ballot, party param ignored
  raw = await env.ELECTION_DATA.get(`ballot:statewide:general_2026`);
  // Merge county general ballot if county provided
  if (county) {
    const countyRaw = await env.ELECTION_DATA.get(`ballot:county:${county}:general_2026`);
    // ... merge logic
  }
} else {
  // Primary or runoff: party-specific
  if (!party) return jsonResponse({ error: "party required for primary/runoff" }, 400);
  raw = await env.ELECTION_DATA.get(`ballot:statewide:${party}_${election}`);
  // Fall back to legacy key for primary_2026
  if (!raw && election === "primary_2026") {
    raw = await env.ELECTION_DATA.get(`ballot:${party}_primary_2026`);
  }
  if (county) {
    const countyRaw = await env.ELECTION_DATA.get(`ballot:county:${county}:${party}_${election}`);
    // ... merge logic
  }
}
```

### 3.2 County Info Endpoint

The `/app/api/county-info` endpoint needs an optional `election` parameter:

```javascript
// GET /app/api/county-info?fips=48453&election=runoff_2026
const election = url.searchParams.get("election") || "primary_2026";
// Try cycle-specific county info first, fall back to base
let raw = await env.ELECTION_DATA.get(`county_info:${fips}:${election}`);
if (!raw) raw = await env.ELECTION_DATA.get(`county_info:${fips}`);
```

### 3.3 Guide Endpoint

The `/app/api/guide` POST body gains an `election` field:

```javascript
const { party, profile, districts, lang, countyFips, readingLevel, election } = await request.json();
const electionId = election || "primary_2026";
```

The guide handler passes `electionId` through to ballot loading, prompt construction, and response formatting.

### 3.4 Manifest Endpoint

The `/app/api/manifest` endpoint returns the enhanced manifest with all election cycles.

### 3.5 Landing Page

The landing page badge ("Texas Primary -- March 3, 2026") must update dynamically based on `activeElection`. This can be done server-side since the worker knows the current date:

```javascript
function handleLandingPage() {
  const active = detectActiveElectionFromDate(new Date());
  const cycle = ELECTION_CYCLES[active];
  // Use cycle.label, cycle.date for the badge text
}
```

### 3.6 Candidate Profiles

The `loadAllCandidates` function in index.js iterates KV keys with `_primary_2026`. It needs to be election-cycle-aware so that `/candidates` shows candidates for the active election:

```javascript
async function loadAllCandidates(env, electionId) {
  const suffix = electionId || "primary_2026";
  if (electionId === "general_2026") {
    // Load single general ballot
    let raw = await env.ELECTION_DATA.get(`ballot:statewide:general_2026`);
    // ...
  } else {
    for (const party of ["republican", "democrat"]) {
      let raw = await env.ELECTION_DATA.get(`ballot:statewide:${party}_${suffix}`);
      // ...
    }
  }
}
```

---

## 4. PWA Changes (pwa.js)

### 4.1 State Object Changes

Add election cycle tracking to the app state:

```javascript
var S = {
  // Existing fields...
  election: null,       // "primary_2026" | "runoff_2026" | "general_2026"
  electionConfig: null, // the cycle config object
  // General election has one unified ballot instead of repBallot/demBallot
  generalBallot: null,
  // Runoff: track which party the user voted in during primary
  primaryParty: null,
};
```

### 4.2 localStorage Key Namespacing

Current keys:
```
tx_votes_profile
tx_votes_ballot_republican
tx_votes_ballot_democrat
tx_votes_selected_party
tx_votes_has_voted
```

New keys (add election suffix):
```
tx_votes_election                              // which election is active
tx_votes_profile                               // shared across elections (values don't change)
tx_votes_primary_2026_ballot_republican        // primary R ballot
tx_votes_primary_2026_ballot_democrat          // primary D ballot
tx_votes_primary_2026_selected_party           // party for primary
tx_votes_primary_2026_has_voted
tx_votes_runoff_2026_ballot_republican         // runoff R ballot
tx_votes_runoff_2026_ballot_democrat           // runoff D ballot
tx_votes_runoff_2026_has_voted
tx_votes_general_2026_ballot                   // general (single ballot)
tx_votes_general_2026_has_voted
```

**Important**: The user's profile (issues, spectrum, qualities, policy views, freeform, address, districts) is election-agnostic and persists across cycles. Only ballot data and "has voted" status are per-election.

### 4.3 Migration from Current Keys

On first load after the update, migrate existing keys:

```javascript
// One-time migration: un-suffixed keys -> primary_2026-suffixed keys
if (localStorage.getItem('tx_votes_ballot_republican') && !localStorage.getItem('tx_votes_primary_2026_ballot_republican')) {
  localStorage.setItem('tx_votes_primary_2026_ballot_republican', localStorage.getItem('tx_votes_ballot_republican'));
  localStorage.setItem('tx_votes_primary_2026_ballot_democrat', localStorage.getItem('tx_votes_ballot_democrat'));
  localStorage.setItem('tx_votes_primary_2026_selected_party', localStorage.getItem('tx_votes_selected_party'));
  localStorage.setItem('tx_votes_primary_2026_has_voted', localStorage.getItem('tx_votes_has_voted'));
  // Don't delete old keys yet (backwards compat)
}
```

### 4.4 Election Cycle Selector / Auto-Detection

When the app loads, it checks the manifest to determine the active election. If the user already has a guide for the active election, show it. If not, offer to generate one.

**UI approach**: A banner at the top of the ballot page when a new election cycle is active:

```
+--------------------------------------------------+
|  The Texas Primary Runoff is May 26.             |
|  [Build My Runoff Guide]                          |
+--------------------------------------------------+
```

For users who already completed the primary interview, the runoff guide generation can **reuse their existing profile** rather than making them redo the full interview. This is a major UX win.

### 4.5 Adapting the Party Picker

**Primary (current behavior)**: Party picker toggle between Republican and Democrat ballots.

**Runoff**: Same party picker, but the user should be guided to their primary party. If we detect they generated a primary guide for one party (stored in `tx_votes_primary_2026_selected_party`), pre-select that party and show a note: "You voted in the Republican primary, so you can only vote in the Republican runoff."

**General election**: No party picker at all. The ballot page shows all candidates per race. The party picker section (`renderPartyToggle`) should check `electionConfig.requiresParty` and return empty string if false.

```javascript
function renderPartyToggle() {
  if (!S.electionConfig || !S.electionConfig.requiresParty) return '';
  // existing toggle code
}
```

### 4.6 Ballot Page Adaptations

**Runoff ballot (much smaller)**:
- Typically 2-6 races total (only those that went to runoff).
- Each race has exactly 2 candidates.
- Show a "Why this race?" contextual note: "Neither candidate received more than 50% of the vote in the March primary. The top two advance to a head-to-head runoff."
- Optionally show primary results percentages from `primaryResults` on each race card.

**General election ballot**:
- All candidates per race shown together with party labels.
- Party affiliation SHOULD be shown on candidate cards (unlike the primary, where it's intentionally hidden because everyone is the same party).
- Color-code or tag candidates by party: (R), (D), (L), (G), (I).
- Candidate cards need a small party badge.
- The nonpartisan design principle still applies: party labels are informational, not preferential.

### 4.7 Interview Flow Changes

**Carry forward profile**: When a new election cycle becomes active, users who already completed the interview should NOT have to redo it. Their profile (issues, spectrum, policy views, qualities, freeform, address, districts) carries forward.

**What changes per election**:
- For the runoff, the only step is to regenerate the guide with runoff ballot data. No new interview needed.
- For the general election, the user may want to update their profile since their views or priorities may have evolved over 8 months. Offer an optional "Update Your Profile" flow, but default to reusing existing profile.

**Simplified runoff flow**:
1. App detects runoff is active.
2. Shows banner: "The primary runoff is May 26. Build your runoff guide using your existing profile."
3. User taps button -> goes directly to loading screen -> generates runoff guide.
4. No interview re-take needed.

**General election flow**:
1. App detects general election is active.
2. If user has existing profile: "The general election is November 3. [Build My General Election Guide] or [Update My Profile First]".
3. If "Build My Guide": skip interview, go straight to guide generation with existing profile.
4. If "Update Profile": re-enter interview with fields pre-populated from existing profile (not blank).

### 4.8 Loading Screen Text

Current loading messages reference the primary. These need to be election-aware:

```javascript
// Primary
"Finding your ballot..."
"Researching candidates..."
"Researching Republicans..."
"Researching Democrats..."

// Runoff
"Finding your runoff ballot..."
"Analyzing the runoff candidates..."
"Building your runoff recommendations..."

// General (only one ballot to generate, not two)
"Finding your general election ballot..."
"Analyzing all candidates..."
"Building your recommendations..."
```

For the general election, the loading flow is different: only ONE API call is needed (one unified ballot) instead of two parallel calls (rep + dem). This simplifies `doGuide()`.

### 4.9 Vote Info Tab

The Vote Info tab pulls dates from `county_info`. It needs to display dates for the active election:

```javascript
// Current: hardcoded March 3, 2026
"var election=new Date(2026,2,3);"

// New: use electionConfig
"var election=new Date(S.electionConfig.date);"
```

The countdown ("X days until Election Day"), early voting dates, and Election Day info should all read from the active election config.

### 4.10 "I Voted" Feature

The "I Voted" sticker and tracking should be per-election. A user should be able to mark "I Voted" for the primary, runoff, and general election independently.

```javascript
"var hasVotedKey = 'tx_votes_' + S.election + '_has_voted';"
"S.hasVoted = !!localStorage.getItem(hasVotedKey);"
```

The sticker text should match the election: "I Voted in the Primary!", "I Voted in the Runoff!", "I Voted!"

### 4.11 Share Text

Share messages currently reference "The Texas primary is March 3." These need to be election-aware:

```javascript
// Current
"The Texas primary is March 3. Get your free personalized voting guide at txvotes.app"

// Dynamic
`The Texas ${electionLabel} is ${electionDate}. Get your free personalized voting guide at txvotes.app`
```

### 4.12 Previous Election Guide Access

After the primary is over, users who generated a primary guide should still be able to view it. Add a "Previous Elections" section on the Profile tab:

```
Your Guides
- Texas Primary (March 3) [View]
- Texas Runoff (May 26) [Active]
```

This is low-priority but adds value for returning users.

---

## 5. Guide Generation Changes (pwa-guide.js)

### 5.1 Ballot Loading by Election Cycle

The `handlePWA_Guide` function currently hardcodes `_primary_2026` in KV key lookups. Parameterize by election:

```javascript
export async function handlePWA_Guide(request, env) {
  const { party, profile, districts, lang, countyFips, readingLevel, election } = await request.json();
  const electionId = election || "primary_2026";

  if (electionId === "general_2026") {
    // Load unified general ballot
    var raw = await env.ELECTION_DATA.get("ballot:statewide:general_2026");
    // No party-specific loading
  } else {
    // Primary or runoff
    if (!party) return json({ error: "party required for primary/runoff" }, 400);
    var raw = await env.ELECTION_DATA.get(`ballot:statewide:${party}_${electionId}`);
    if (!raw && electionId === "primary_2026") {
      raw = await env.ELECTION_DATA.get(`ballot:${party}_primary_2026`);
    }
  }
  // ... rest of function
}
```

### 5.2 Prompt Adjustments by Election Type

**Primary prompt** (current): "Recommend ONE candidate per race and a stance on each proposition."

**Runoff prompt**: Add context about why these candidates are in the runoff:

```
"These candidates are in a runoff because neither received more than 50% of the vote in the March primary. " +
"The voter is choosing between the top two finishers. Focus on direct comparisons between the two candidates."
```

For runoff races that include `primaryResults`, include that in the prompt:
```
"In the primary, Candidate A received 38.2% and Candidate B received 31.5%."
```

**General election prompt**: Different framing entirely:

```
"This is the November general election. All party nominees appear on one ballot. " +
"Recommend ONE candidate per race. Each candidate's party affiliation is listed. " +
"The voter may prefer candidates from any party. Focus on how each candidate's " +
"positions align with the voter's stated values, regardless of party."
```

Remove party-specific language like "Republican primary" from the prompt. Instead:
```
"VOTER: General election | Spectrum: Conservative"
```

### 5.3 General Election Guide -- Single API Call

Currently `doGuide()` in pwa.js makes TWO parallel API calls (one for R ballot, one for D ballot). For the general election, only ONE call is needed:

```javascript
if (S.election === "general_2026") {
  // Single API call for unified ballot
  var result = await fetch('/app/api/guide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile: profile,
      districts: S.districts,
      lang: LANG,
      countyFips: cFips,
      readingLevel: S.readingLevel,
      election: 'general_2026'
    })
  }).then(r => r.json());

  if (result && result.ballot) {
    S.generalBallot = result.ballot;
  }
} else {
  // Primary/runoff: two parallel calls (existing logic)
}
```

### 5.4 General Election Candidate Display with Party Labels

The `buildCondensedBallotDescription` function needs to include party affiliation for general election candidates:

```javascript
function buildCondensedBallotDescription(ballot) {
  // ...
  for (var j = 0; j < race.candidates.length; j++) {
    var c = race.candidates[j];
    var inc = c.isIncumbent ? " (incumbent)" : "";
    var partyTag = c.party ? " [" + c.party.charAt(0).toUpperCase() + "]" : "";
    lines.push("  - " + c.name + inc + partyTag);
    // ...
  }
}
```

### 5.5 Translation Handling

For the general election, candidate translations still work the same way (piggyback on the API call). The prompt format for `candidateTranslations` doesn't change structurally.

---

## 6. Updater Changes (updater.js)

### 6.1 Election-Cycle-Aware Updates

The `BALLOT_KEYS` constant currently targets `_primary_2026`. Parameterize:

```javascript
function getBallotKeys(electionId) {
  if (electionId === "general_2026") {
    return { general: `ballot:statewide:general_2026` };
  }
  return {
    republican: `ballot:statewide:republican_${electionId}`,
    democrat: `ballot:statewide:democrat_${electionId}`,
  };
}
```

### 6.2 Active Election Detection in Cron

The daily cron job should update the currently active election's data:

```javascript
export async function runDailyUpdate(env, options = {}) {
  const manifest = JSON.parse(await env.ELECTION_DATA.get("manifest") || "{}");
  const activeElection = manifest.activeElection || detectActiveElectionFromDate(new Date());
  const electionId = options.election || activeElection;

  const keys = getBallotKeys(electionId);
  // ... update logic per key
}
```

### 6.3 Updater Prompt Adjustments

The `researchRace` function currently mentions "March 3, 2026 Texas Primary Election". This must be dynamic:

```javascript
const electionLabel = getElectionLabel(electionId);
// "May 26, 2026 Texas Primary Runoff"
// "November 3, 2026 Texas General Election"

const userPrompt = `Research the latest updates for this ${partyLabel} ${electionLabel} race:\n\n...`;
```

### 6.4 Cron Frequency

Current: Daily at 6 AM CT.

Consider more frequent updates approaching election dates:
- 14 days before: twice daily (6 AM + 6 PM CT)
- 3 days before: four times daily

This can be managed by adding more cron entries in wrangler.toml or by having the single daily cron check proximity to election day and conditionally run additional updates.

For simplicity, keep the single daily cron but add admin trigger capability (already exists) for manual refreshes.

---

## 7. County Seeder Changes (county-seeder.js)

### 7.1 Election Cycle Parameter

All seeder functions need an `election` parameter:

```javascript
export async function seedCountyBallot(countyFips, countyName, party, env, election = "primary_2026") {
  const electionLabel = getElectionLabel(election);
  const prompt = `Research ALL local ${partyLabel} races for ${countyName} County, Texas in the ${electionLabel}...`;
  const key = `ballot:county:${countyFips}:${party}_${election}`;
  // ...
}
```

### 7.2 County Info Per Election

```javascript
export async function seedCountyInfo(countyFips, countyName, env, election = "primary_2026") {
  const cycle = ELECTION_CYCLES[election.toUpperCase()];
  const prompt = `Research the voting information for ${countyName} County, Texas for the ${cycle.label} on ${cycle.date}.
    Find: ... Early voting dates (early voting is ${cycle.earlyVotingStart} - ${cycle.earlyVotingEnd}) ...`;

  const key = election === "primary_2026"
    ? `county_info:${countyFips}`                    // primary uses existing key for compat
    : `county_info:${countyFips}:${election}`;       // runoff/general use suffixed keys
  // ...
}
```

### 7.3 General Election Seeder

The general election seeder is different because it produces a unified ballot (not party-specific):

```javascript
export async function seedCountyBallotGeneral(countyFips, countyName, env) {
  const prompt = `Research ALL local races for ${countyName} County, Texas in the November 3, 2026 General Election.
    Include candidates from ALL parties (Republican, Democrat, Libertarian, Green, Independent).
    For each candidate, include their party affiliation.
    ...`;
  const key = `ballot:county:${countyFips}:general_2026`;
  // ...
}
```

### 7.4 Runoff Data Population

Runoff ballot data is unique because it derives from primary results. After primary election day (March 3), we need to:

1. Wait for official results to be certified (typically 1-2 weeks).
2. Identify which races went to runoff (no candidate >50%).
3. Create runoff ballot entries with only those races and the top 2 candidates.

This could be a dedicated `seedRunoffBallots` function:

```javascript
export async function seedRunoffBallots(env) {
  // For each party
  for (const party of ["republican", "democrat"]) {
    const primaryRaw = await env.ELECTION_DATA.get(`ballot:statewide:${party}_primary_2026`);
    const primary = JSON.parse(primaryRaw);

    // Use Claude + web_search to find official primary results
    const resultsPrompt = `Search for the official results of the March 3, 2026 Texas ${party} Primary.
      For each contested race, list whether a runoff is needed (no candidate got >50%)
      and the top two candidates with their vote percentages...`;

    const results = await callClaudeWithSearch(env, resultsPrompt);

    // Build runoff ballot from races that need runoffs
    const runoffBallot = {
      id: `${party}_runoff_2026`,
      party: party,
      type: "runoff",
      electionDate: "2026-05-26",
      electionName: `2026 ${party.charAt(0).toUpperCase() + party.slice(1)} Primary Runoff`,
      races: [],
      propositions: [],
    };

    for (const raceResult of results.races) {
      if (!raceResult.needsRunoff) continue;
      // Find the original race in primary ballot
      // Keep only top 2 candidates
      // Add primaryResults field
      // Push to runoffBallot.races
    }

    await env.ELECTION_DATA.put(
      `ballot:statewide:${party}_runoff_2026`,
      JSON.stringify(runoffBallot)
    );
  }
}
```

---

## 8. Static Page Updates

### 8.1 Landing Page
- Badge text: dynamic based on active election
- CTA: "Build My Voting Guide" (works for all elections)
- Translations: add Spanish for runoff and general election labels

### 8.2 Support/FAQ Page
- "Which elections are covered?": Update to list all three election cycles
- Add FAQ about runoff party lock rules

### 8.3 Nonpartisan Page
- No changes needed (principles apply to all elections)

### 8.4 Privacy Policy
- No changes needed (same data practices)

---

## 9. Implementation Timeline

### Phase 1: Foundation (March 4 - March 15) -- Immediately After Primary

**Priority: Set up the architecture before runoff data exists**

- [ ] Create shared `ELECTION_CYCLES` config object
- [ ] Add `election` parameter to `handleBallotFetch`, `handleCountyInfo`, `handlePWA_Guide`, `handlePWA_Summary`
- [ ] Enhance manifest structure to support multiple elections
- [ ] Add `election` field to PWA state object
- [ ] Implement localStorage key migration (current -> primary_2026-suffixed)
- [ ] Add date-based active election detection
- [ ] Update landing page badge to be dynamic

### Phase 2: Runoff Support (March 15 - April 15) -- Well Before Runoff Early Voting

**Priority: Be ready for runoff by early voting start (May 18)**

- [ ] Build `seedRunoffBallots` function
- [ ] Wait for certified primary results, then seed runoff ballots
- [ ] Seed county-specific runoff data for top 30 counties
- [ ] Update updater.js to handle runoff election keys
- [ ] Update pwa-guide.js prompts for runoff context
- [ ] Add "Build My Runoff Guide" banner to PWA (reuse existing profile)
- [ ] Add primary results context to runoff race cards
- [ ] Show party-lock warning ("You voted in the R primary")
- [ ] Update Vote Info tab dates for runoff cycle
- [ ] Update loading screen messages for runoff
- [ ] Update share text for runoff
- [ ] Update "I Voted" for runoff
- [ ] Seed county_info:*:runoff_2026 for top 30 counties
- [ ] Test full runoff flow end-to-end

### Phase 3: General Election Support (June - September)

**Priority: Be ready for general election by early voting start (Oct 19)**

- [ ] Build unified general election ballot data shape (candidates have party field)
- [ ] Build general election seeder (all parties on one ballot)
- [ ] Seed statewide general election ballot after runoff results certified
- [ ] Seed county general election ballots for top 30 counties
- [ ] Remove party picker for general election (`requiresParty: false`)
- [ ] Add party badges to candidate cards for general election
- [ ] Update guide generation: single API call for unified ballot
- [ ] Update guide prompts for general election cross-party comparison
- [ ] Handle general election `doGuide()` flow (one call, not two)
- [ ] Update Vote Info tab for general election dates
- [ ] Update loading messages for general election
- [ ] Add "Previous Elections" section to Profile tab
- [ ] Seed county_info:*:general_2026 for top 30 counties
- [ ] Test full general election flow end-to-end

### Phase 4: Polish (October)

- [ ] Final copy review across all election types
- [ ] Spanish translations for all new strings
- [ ] Edge case testing (user with primary guide visits during general)
- [ ] Performance testing (KV reads for multiple election cycles)
- [ ] Update all static pages with general election info

---

## 10. Key Decisions to Make

### 10.1 Should users re-interview for each election?
**Recommendation**: No. Profile carries forward. Offer an optional "Update Profile" path but default to reusing the existing profile. This is a major UX advantage -- returning users can get their runoff/general guide in one tap.

### 10.2 How to handle users who switch parties between elections?
The runoff is party-locked (you must vote in the same party as your primary). The general election has no party restriction. The app should:
- Runoff: Pre-select the user's primary party, show warning about party lock.
- General: No party selection at all.

### 10.3 Where to store the election cycle config?
**Recommendation**: In a new file `worker/src/election-config.js` that exports `ELECTION_CYCLES` and helper functions. Import it from all files that need it (index.js, pwa.js, pwa-guide.js, updater.js, county-seeder.js).

### 10.4 How to handle the "gap" between elections?
After the primary (March 3) and before the runoff (May 26), there's a ~12-week gap. The app should show:
- "The primary is over. Runoff results coming soon." (if runoff data not yet seeded)
- "Build your runoff guide" (once runoff data is available)
- Keep the primary guide viewable as "Previous Election"

Similarly, between the runoff (May 26) and general election (November 3), there's a ~5-month gap.

### 10.5 What about primary results data?
After each election, if we can ingest official results, we could show:
- Who won each race
- Whether the user's recommendations matched the winners
- This is a nice-to-have, not a blocker

### 10.6 Service worker cache strategy
The service worker cache name is currently `txvotes-v2`. Consider bumping to `txvotes-v3` when deploying election cycle support so all users get the new code. The `/app/clear` endpoint already handles cache clearing.

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Runoff races not known until primary results certified | Certain | Delays runoff data | Monitor TX SOS for results; prepare seeder script in advance |
| Very few races go to runoff (small ballot) | Likely | Underwhelming UX | Frame as "focused" guide; note which races were decided in primary |
| General election ballot data not available until after runoffs | Certain | Delays general data | Start with statewide races (known from primary); add third-party candidates as filed |
| Users confused by election cycle switching | Moderate | Support burden | Clear banners, date labels, election name on every screen |
| localStorage space limits with 3 elections of data | Low | Data loss | Each ballot is ~50-100KB JSON; 3 elections x 2 parties = ~600KB; well within 5-10MB limit |
| API costs increase (3x elections worth of guide generation) | Certain | Higher costs | Each user only generates 1 guide per election; runoff ballot is smaller (fewer tokens) |

---

## 12. Files to Modify

| File | Changes |
|---|---|
| `worker/src/election-config.js` | **NEW** -- shared election cycle config and helpers |
| `worker/src/index.js` | Add `election` param to ballot/county-info/guide endpoints; dynamic landing page; update candidate profiles |
| `worker/src/pwa.js` | Election state, localStorage migration, conditional party picker, ballot page per election type, Vote Info dates, loading messages, share text, I Voted per election |
| `worker/src/pwa-guide.js` | Election-aware ballot loading, election-specific prompts, general election single-ballot handling |
| `worker/src/updater.js` | Parameterize by election cycle, dynamic prompts, manifest updates per election |
| `worker/src/county-seeder.js` | Election parameter on all functions, general election seeder, runoff ballot seeder |
| `worker/wrangler.toml` | Possibly add additional cron schedules near election dates |
| `todolist.md` | Update the "Create versions for runoffs and general election" item |
