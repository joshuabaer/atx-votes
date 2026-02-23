# Plan: Manual County Selection as Address Fallback

## Problem

The current interview flow (Phase 7) requires users to enter a street address or use geolocation to look up their voting districts. This fails for users who:
- Have privacy concerns about entering their address
- Live at addresses the Census geocoder cannot resolve
- Experience Census API downtime (the app already handles this by proceeding without districts)

When users click "Skip & Build Guide," they get **all races** with no district filtering and no county-level races merged in. A manual county selector would let privacy-conscious users still get county-specific ballot data without revealing their exact address.

## Current Architecture

### Phase 7: Address Entry (`renderAddress()` in pwa.js:1862)

The address form offers three paths:
1. **Geolocation** -- reverse geocodes via Nominatim, fills address fields, user still submits form
2. **Address form submission** -- POSTs to `/app/api/districts` which calls Census geocoder
3. **"Skip & Build Guide"** -- sets `S.address` to empty, `S.districts` stays null, calls `buildGuide()`

### Districts API (`handleDistricts()` in index.js:342)

POSTs to Census geocoder with street/city/state/zip, returns:
```js
{
  congressional: "District 25",      // from Census "Congressional Districts"
  stateSenate: "District 14",        // from Census "Legislative Districts - Upper"
  stateHouse: "District 46",         // from Census "Legislative Districts - Lower"
  countyCommissioner: "Precinct 3",  // from KV precinct_map:{fips} ZIP lookup
  schoolBoard: "Austin ISD",         // from Census "Unified School Districts"
  countyFips: "48453",               // from Census "Counties" geography
  countyName: "Travis"               // from Census "Counties" geography
}
```

### How `S.districts` Is Used

1. **Guide generation** (pwa.js:3068-3073) -- `S.districts` is passed to `/app/api/guide` API; `countyFips` is extracted separately and also passed.
2. **`filterBallotToDistricts()`** (pwa-guide.js:170-192) -- creates a Set from `{congressional, stateSenate, stateHouse, countyCommissioner, schoolBoard}`, then filters `ballot.races` to only include races where `race.district` is null (statewide) or matches the Set.
3. **County ballot merge** (pwa-guide.js:55-73) -- loads `ballot:county:{fips}:{party}_primary_2026` from KV and merges county races into the statewide ballot **before** district filtering.
4. **County info fetch** (pwa.js:3007) -- after districts resolve, fetches `/app/api/county-info?fips={countyFips}` for Vote Info tab.
5. **Ballot display** (pwa.js:1969-1977) -- shows district badges (CD-25, SD-14, HD-46) or "Showing all races."
6. **County ballot availability banner** (pwa.js:1990-1996) -- if `countyBallotAvailable===false` and a countyFips was provided, shows info banner.
7. **Background refresh** (pwa.js:3414-3415) -- includes `county={fips}` in ballot refresh URL.
8. **Persistence** (pwa.js:1566, 1590) -- `S.districts` is saved/loaded from `localStorage` as part of the profile.

### Existing County Data

- `TX_COUNTY_NAMES` (index.js:3720-3772) -- complete FIPS-to-name mapping for all 254 Texas counties (server-side only).
- `TOP_COUNTIES` (county-seeder.js:12-43) -- 30 highest-population counties with seeded ballot data.
- County ballot KV: `ballot:county:{fips}:{party}_primary_2026` -- exists only for seeded counties.
- County info KV: `county_info:{fips}` -- exists only for seeded counties.
- Precinct map KV: `precinct_map:{fips}` -- ZIP-to-commissioner-precinct mapping, exists only for seeded counties.

## What District Information Can Be Inferred From County Alone

| Data point | Requires address? | Available from county only? | Notes |
|---|---|---|---|
| County FIPS + name | No | Yes (is the selection itself) | |
| County-level ballot races | No | Yes | Merged from `ballot:county:{fips}:...` |
| County info (vote centers, hours, etc.) | No | Yes | From `county_info:{fips}` |
| Commissioner precinct | Partially | Only if county has single precinct or user also selects ZIP | Uses `precinct_map:{fips}` with ZIP lookup |
| Congressional district (CD) | Yes | No | Multiple CDs can overlap a single county |
| State Senate district (SD) | Yes | No | Multiple SDs can overlap a single county |
| State House district (HD) | Yes | No | Multiple HDs can overlap a single county |
| School district | Yes | No | Multiple ISDs can overlap a single county |

**Key insight:** County selection alone gives you county ballot races and county voting info but cannot narrow statewide district races. Users who select county only will see **all statewide/district races** (same as "skip") **plus** county-specific local races. This is still a significant improvement over bare "skip."

## Design

### UI Placement: Within Phase 7 (Address)

Add a "Select Your County" option as a third path, placed between the address form and the "Skip" button. The Phase 7 screen would become:

```
Where do you vote?
We'll look up your districts to show the right races.

[Use My Location]

--- Address Form ---
Street Address: [_________]
City: [_______]  ZIP: [_____]
State: TX
[Build My Guide]

--- OR ---

Don't want to enter your address?
Select your county to see local races:
[-- Select County --  v]
[Build Guide with County]

--- OR ---

You can skip entirely -- we'll show all races.
[Skip & Build Guide]
```

### County Dropdown Population

**Option A: Hardcoded in PWA (recommended)**

Embed a `TX_COUNTIES` array directly in the PWA JS code. This is a static list that changes essentially never (Texas has had 254 counties since 1931). The data is ~5KB compressed. Format:

```js
var TX_COUNTIES = [
  {f:"48001",n:"Anderson"}, {f:"48003",n:"Andrews"}, ...
];
```

Sort alphabetically by name for the `<select>` dropdown. The server already has `TX_COUNTY_NAMES` in index.js which can be the source of truth.

**Option B: API endpoint**

Add `GET /app/api/counties` that returns the list from `TX_COUNTY_NAMES`. Adds a network round-trip but keeps the PWA smaller. Not recommended -- the data is static and the PWA is already large.

**Recommendation:** Option A. The ~5KB is negligible in a 2300+ line inline JS file.

### Integration with `S.districts`

When the user selects a county and clicks "Build Guide with County," set:

```js
S.districts = {
  congressional: null,
  stateSenate: null,
  stateHouse: null,
  countyCommissioner: null,   // could be populated if ZIP is also provided
  schoolBoard: null,
  countyFips: selectedFips,
  countyName: selectedName
};
S.address = { street: '', city: '', state: 'TX', zip: '' };
```

This is compatible with the existing flow because:
- `filterBallotToDistricts()` creates a Set from `[null, null, null, null, null].filter(Boolean)` which is an empty Set. Every race where `!race.district` returns true passes through. Races with a district value get filtered **out** by `districtValues.has(race.district)` which returns false for an empty Set.

**Problem:** With all district values null, `filterBallotToDistricts()` would filter out ALL district-specific races (CD, SD, HD races) because the Set would be empty and `districtValues.has("District 25")` would return false.

**Fix required in `filterBallotToDistricts()`:** When `districts` is provided but all district values (except countyFips/countyName) are null, treat it as "show all races" (skip filtering), same as when `districts` is null. Alternatively, only apply filtering when at least one district value is non-null.

Proposed change to `filterBallotToDistricts()` in pwa-guide.js:

```js
function filterBallotToDistricts(ballot, districts) {
  var districtValues = new Set(
    [
      districts.congressional,
      districts.stateSenate,
      districts.stateHouse,
      districts.countyCommissioner,
      districts.schoolBoard,
    ].filter(Boolean)
  );

  // If no specific district values, return all races (county-only selection)
  if (districtValues.size === 0) {
    return {
      id: ballot.id,
      party: ballot.party,
      electionDate: ballot.electionDate,
      electionName: ballot.electionName,
      districts: districts,
      races: ballot.races,
      propositions: ballot.propositions || [],
    };
  }

  return {
    id: ballot.id,
    party: ballot.party,
    electionDate: ballot.electionDate,
    electionName: ballot.electionName,
    districts: districts,
    races: ballot.races.filter(function (race) {
      if (!race.district) return true;
      return districtValues.has(race.district);
    }),
    propositions: ballot.propositions || [],
  };
}
```

### County Info Fetch

After county selection, immediately fetch county info (same as address flow):

```js
fetch('/app/api/county-info?fips=' + selectedFips)
  .then(function(r) { return r.ok ? r.json() : null })
  .then(function(ci) { if (ci) S.countyInfo = ci })
  .catch(function() {});
```

This populates the Vote Info tab with county-specific hours, locations, and contact info.

### Ballot Display

With county-only selection, the ballot header (pwa.js:1969-1977) should show:
- The county name instead of district badges: "Travis County" badge
- Or: "Showing all statewide races + Travis County local races"

Currently the code checks `S.districts.congressional || stateSenate || stateHouse` for badges, and falls through to "Showing all races." For county-only, add a branch:

```js
if (S.districts && S.districts.countyFips && !S.districts.congressional) {
  // Show county badge only
  h += '<span class="badge badge-blue">' + esc(S.districts.countyName) + ' County</span>';
  h += '<div style="font-size:13px;color:var(--text2);margin-top:4px">' +
    t('Showing all statewide races plus local races') + '</div>';
}
```

### State Management & Persistence

No changes needed to `save()` or `load()` -- `S.districts` already serializes/deserializes the full object, and `S.address` is already persisted. A county-only selection with empty address is naturally handled.

### Optional Enhancement: ZIP Code for Commissioner Precincts

Since `precinct_map:{fips}` maps ZIP codes to commissioner precincts, the county selection UI could optionally include a ZIP code field:

```
[-- Select County --  v]
ZIP (optional, for commissioner precinct): [_____]
[Build Guide with County]
```

If ZIP is provided, the client could call a lightweight endpoint to look up the commissioner precinct before calling `buildGuide()`. This would enable filtering county commissioner races too. However, this adds complexity and may not be necessary for v1.

## Changes Required

### Files to Modify

1. **`worker/src/pwa.js`**
   - Add `TX_COUNTIES` data array (~254 entries, ~5KB)
   - Modify `renderAddress()` to include county dropdown section between form and skip button
   - Add click handler for `select-county` action (or new form submission for county form)
   - Add Spanish translations for new strings: "Select your county," "Don't want to enter your address?", "Build Guide with County," etc.
   - Modify ballot header display logic for county-only mode

2. **`worker/src/pwa-guide.js`**
   - Modify `filterBallotToDistricts()` to pass through all races when no specific district values are set (only countyFips/countyName present)

3. **`worker/tests/interview-flow.test.js`** (and possibly `pwa-guide.test.js`)
   - Add tests for county-only selection flow
   - Add tests for `filterBallotToDistricts()` with empty district values
   - Test that county FIPS is correctly passed to guide API
   - Test county info fetch triggers after county selection

### Files NOT Modified

- `worker/src/index.js` -- no new API endpoints needed; existing `/app/api/guide`, `/app/api/county-info`, and `/app/api/ballot` all already accept countyFips
- `worker/src/county-seeder.js` -- no changes to seeding logic
- `worker/src/updater.js` -- no changes to update logic

## Translation Strings Needed

| English | Context |
|---|---|
| `"Don't want to enter your address?"` | Section header above county dropdown |
| `"Select your county to see local races:"` | Label for dropdown |
| `"Select County"` | Dropdown placeholder |
| `"Build Guide with County"` | Submit button for county selection |
| `"Showing all statewide races plus local races"` | Ballot header when county-only |

## Open Questions

1. **Should "top counties" be highlighted?** We could put the 30 seeded counties at the top of the dropdown (since they actually have county ballot data) with a separator, then list all 254 below. Users in unseeded counties would get county info fetch (which may 404) but no county races.

2. **Should we show a note when county ballot data is unavailable?** The existing `countyBallotAvailable===false` banner already handles this. No extra work needed.

3. **Should the county dropdown remember the selection if the user goes back?** Yes -- it should be persisted in `S.districts.countyFips` and the dropdown should pre-select it on re-render. The existing save/load for `S.districts` handles this.

4. **Should address entry still be available after county selection?** Yes -- the user could change their mind. The address form remains fully functional above the county dropdown. If they submit an address, it overwrites the county-only districts with full district data.

## Effort Estimate

- **Small** (1-2 hours): Core county dropdown + integration with existing flow
- **Medium** (adds ~30 min): Spanish translations, ballot header county badge
- **Optional** (adds ~1 hour): ZIP code for commissioner precincts, top-counties highlighting

## Sequence of Implementation

1. Modify `filterBallotToDistricts()` to handle empty district values (required first -- without this, county-only selection would filter out all district races)
2. Add `TX_COUNTIES` data to pwa.js
3. Modify `renderAddress()` UI with county dropdown section
4. Add click/form handler for county selection that sets `S.districts` and calls `buildGuide()`
5. Add county info fetch after county selection
6. Modify ballot header to show county badge for county-only mode
7. Add Spanish translations
8. Write tests
