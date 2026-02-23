# Precinct Map Automation Research

**Goal:** Find automated approaches to generate ZIP-to-County-Commissioner-Precinct mappings for 20 Texas counties where Claude web_search failed to produce results.

**Missing counties:** Montgomery (48339), El Paso (48141), Nueces (48303), Galveston (48167), Brazoria (48039), Kaufman (48257), Johnson (48251), Parker (48355), Lubbock (48367), Cameron (48061), McLennan (48309), Bell (48027), Gregg (48183), Randall (48381), Potter (48375), Smith (48423), Victoria (48469), Jefferson (48245), Midland (48329), Ector (48135).

**Working counties (10):** Harris, Dallas, Tarrant, Bexar, Travis, Collin, Denton, Hidalgo, Fort Bend, Williamson.

**Current data format:** `precinct_map:{fips}` KV entries containing `{"ZIP_CODE": "PRECINCT_NUMBER", ...}` -- e.g. `{"78701": "3", "78702": "1"}`.

---

## Approach 1: Texas Secretary of State / Election Data

### Availability
The TX SOS elections division (sos.state.tx.us/elections/) does NOT publish commissioner precinct boundary data directly. Their focus is on election administration guidance, not geographic data distribution. The SOS's "Am I Registered?" voter lookup portal (teamrv-mvp.sos.texas.gov) returns precinct information for registered voters, but there is no public API.

### Related resource
The SOS publishes [Precincts and Polling Places guidance](https://www.sos.state.tx.us/elections/forms/precincts-and-polling-places-county.pdf) for counties, but this is a procedural document, not data.

### Verdict: NOT VIABLE as a data source.

---

## Approach 2: Texas Legislative Council / Capitol Data Portal

### Availability
The Texas Legislative Council publishes voting precinct shapefiles through the [Capitol Data Portal](https://data.capitol.texas.gov/dataset/precincts):
- **Precincts24G.zip** -- 2024 general election voting precinct shapefiles
- **Precincts24G_Districts.xlsx** -- Maps voting precincts to Congressional, State Senate, State House, and SBOE districts

### Critical limitation
These are **voting precincts** (election administration boundaries), NOT commissioner precincts. The Districts.xlsx file maps voting precincts to state/federal legislative districts but does **NOT** include county commissioner precincts.

The Capitol Data Portal also publishes congressional district plans (PLANC* datasets) and state legislative plans, but no commissioner court plans. Commissioner precincts are drawn by individual county commissioners courts, not the state legislature.

### Could it still help?
**Yes, indirectly.** The voting precinct shapefiles contain the BOUNDARIES of every voting precinct in the state. If we could overlay commissioner precinct boundaries on top, a spatial join would produce the voting-precinct-to-commissioner-precinct mapping. From there, we would still need to cross-reference with ZIP codes.

### Verdict: USEFUL AS BUILDING BLOCK but not a direct solution.

---

## Approach 3: Census Bureau TIGER/Line Shapefiles

### Availability
The Census Bureau publishes [TIGER/Line Shapefiles](https://www.census.gov/cgi-bin/geo/shapefiles/index.php) for Texas including:
- **County Subdivisions** (Census County Divisions / CCDs) -- statistical areas, NOT commissioner precincts
- **Voting Districts** (VTDs) -- census equivalents of voting precincts
- **County boundaries** -- whole counties only

### Critical limitation
TIGER/Line does NOT include county commissioner precincts as a geographic entity. The Census Bureau's [Geocoder API](https://geocoding.geo.census.gov/geocoder/) returns state, county, tract, block, congressional district, and state legislative district -- but NOT commissioner precincts.

County Subdivisions (CCDs) in Texas are statistical constructs (e.g., "Corpus Christi CCD") that do NOT correspond to commissioner precincts.

### Verdict: NOT VIABLE for commissioner precincts directly. VTD boundaries could be useful as part of a spatial join approach.

---

## Approach 4: County GIS Portals / ArcGIS Open Data

### Availability
Many Texas counties publish commissioner precinct boundaries through ArcGIS Hub or their own GIS portals. Confirmed sources found:

| County | FIPS | ArcGIS/GIS Data Available? | Format |
|--------|------|---------------------------|--------|
| Montgomery | 48339 | YES -- [Geocore Open Data](https://data-moco.opendata.arcgis.com/datasets/MOCO::county-commissioner-precincts/about) | Shapefile/GeoJSON |
| El Paso | 48141 | YES -- [Commissioner Maps](https://epcountyvotes.com/maps/county-commissioner-maps); [Redistricting](https://www.epcounty.com/redistricting/maps.htm) | PDF maps |
| Nueces | 48303 | YES -- [ArcGIS Web Map](https://www.arcgis.com/apps/mapviewer/index.html?webmap=b9eba7f267ab4d2f8be1fea92c71ea6b); [County Maps](https://www.nuecesco.com/quick-links/maps/nueces-county-commissioners-precinct-maps) | ArcGIS/PDF |
| Galveston | 48167 | YES -- [ArcGIS App](https://www.arcgis.com/apps/webappviewer/index.html?id=ffb008277ace4c6b9d9f82c1838ee8a0) | ArcGIS viewer |
| Lubbock | 48367 | YES -- [Elections Maps](https://www.votelubbock.org/maps/county-commissioners-maps/) | PDF maps |
| Cameron | 48061 | YES -- [Commissioner Map PDF](https://www.cameroncountytx.gov/wp-content/uploads/2022/02/Commissioner-Pcts-Map_2022.pdf); [ArcGIS](https://www.arcgis.com/apps/View/index.html?appid=6d502cbed72f4e62aeabd558c85a09da) | PDF/ArcGIS |
| Bell | 48027 | YES -- [Precinct Maps](https://www.bellcountytx.com/departments/elections/precinct_maps.php) | PDF |
| Smith | 48423 | YES -- [GIS Downloads](https://www.smithcountymapsite.org/downloads/); [County Maps](https://www.smith-county.com/391/County-Maps) | Shapefile/PDF |
| Johnson | 48251 | YES -- [Precinct Maps](https://www.johnsoncountytx.org/departments/elections-office/precinct-maps) | Web page with precinct lists |

Most remaining counties have at least PDF maps of commissioner precincts on their elections websites.

### Automation potential
- Counties with ArcGIS REST services (Montgomery, Nueces, Galveston, Cameron) can be queried programmatically via the ArcGIS REST API to download GeoJSON boundaries.
- Counties with downloadable shapefiles (Smith) can be processed with Python/GDAL.
- Counties with only PDF maps would need manual data entry or OCR.

### Verdict: BEST SOURCE for individual counties. Partially automatable. Mixed formats.

---

## Approach 5: TNRIS (Texas Geographic Information Office)

### Availability
[TNRIS](https://tnris.org/) (now TxGIO) operates the [DataHub](https://data.tnris.org/) with statewide GIS datasets including land parcels, address points, and boundary data.

### Critical limitation
TNRIS does NOT appear to publish a statewide county commissioner precinct dataset. Their focus is on natural resources, imagery, and land parcels. Political boundary data at the sub-county level is not part of their standard offerings.

### Verdict: NOT VIABLE.

---

## Approach 6: Scraping County Election Websites

### Availability
Many county elections websites publish voting-precinct-to-commissioner-precinct mappings in structured or semi-structured format:

- **Johnson County:** Lists commissioner precincts with their voting precincts directly on the web page (e.g., "Commissioner Precinct 1: Voting Precincts 6, 14, 15, 16, 17, 18, 19, 23, 30, 33, 36, 37")
- **Bell County:** Provides combined "Voting and Commissioner Precincts" PDF maps
- **Tarrant County:** Organizes voting precinct maps BY commissioner precinct in their web interface
- **Multiple counties:** Offer voter lookup tools where entering an address returns the commissioner precinct

### Automation potential
- Structured HTML tables: Easily scraped with standard tools.
- PDF maps: Would require manual extraction or AI-assisted OCR.
- Voter lookup forms: Could theoretically be queried programmatically, but most use CAPTCHA or rate limiting, and automated scraping of government forms may raise legal/ethical concerns.

### Verdict: VIABLE for counties with structured web data. NOT scalable for PDF-only counties.

---

## Approach 7: Address Geocoding Against Precinct Shapefiles

### How it would work
1. Obtain commissioner precinct boundary shapefiles (from county GIS portals)
2. Obtain ZIP code boundary centroids (from Census ZCTA data or commercial sources)
3. Perform point-in-polygon spatial join (which ZIP centroid falls in which commissioner precinct)
4. Generate the ZIP-to-commissioner-precinct mapping

### Available tools
- **Python + GeoPandas + Shapely:** `gpd.sjoin()` for spatial joins -- free, well-documented
- **QGIS:** Open-source desktop GIS for manual spatial joins
- **Census Geocoder API:** Returns county, tract, block -- but NOT commissioner precincts
- **Geocodio API:** Returns congressional, state legislative, school districts -- but NOT commissioner precincts
- **USgeocoder API:** Returns county subdivision, voting district -- but NOT commissioner precincts specifically

### Critical limitation
This approach requires having the commissioner precinct shapefiles FIRST (from Approach 4), so it's not a standalone solution. It's a PROCESSING step, not a data source.

### ZIP boundary caveat
ZIP codes don't align neatly with commissioner precincts. A single ZIP may span multiple commissioner precincts. The current system maps each ZIP to a single precinct (the one containing the majority of the ZIP's area), which is an approximation.

### Verdict: VIABLE as a processing pipeline IF shapefiles are available. Excellent for automation.

---

## Approach 8: Texas Redistricting Commission Data

### Availability
After 2020 redistricting, county commissioners courts adopted new commissioner precinct boundaries by November 2021. The [Texas Redistricting website](https://redistricting.capitol.texas.gov/) publishes state-level plans (Congressional, State Senate, State House, SBOE) but NOT county commissioner precinct plans.

The [Redistricting Data Hub](https://redistrictingdatahub.org/state/texas/) also does not publish county commissioner precinct boundaries.

### Why not?
Commissioner precinct redistricting is done at the county level by each county's commissioners court, not by the Texas Legislature or a state commission. There are 254 counties, each doing their own redistricting independently. No central repository collects all of these plans.

### Verdict: NOT VIABLE as a centralized source.

---

## KEY DISCOVERY: Voting Precinct Numbering Convention

During research, a significant pattern emerged: **In many Texas counties, the first digit of the three-digit voting precinct number indicates the commissioner precinct.**

Example from Travis County: Precinct 234 is in Commissioner Precinct 2; Precinct 406 is in Commissioner Precinct 4.

### But this is NOT universal!
Counter-example from Johnson County: Commissioner Precinct 1 includes voting precincts 6, 14, 15, 16, 17, 18, 19, 23, 30, 33, 36, 37 -- the first digits are 0, 1, 1, 1, 1, 1, 1, 2, 3, 3, 3, 3. No pattern.

This convention appears to be common in **larger, urban counties** but is NOT mandated by Texas Election Code Section 42 (which only requires precincts be "identified by a number" -- no format requirements). Many smaller/rural counties use sequential numbering unrelated to commissioner precincts.

### Could it help?
For counties that DO follow the convention, the state's voting precinct shapefile could be used to derive commissioner precincts automatically. But we would need to VERIFY which counties follow the convention, which defeats the purpose of automation.

### Verdict: INTERESTING but UNRELIABLE as a general solution.

---

## RECOMMENDED APPROACH: Hybrid Pipeline

Based on this research, no single automated source covers all 20 counties. The recommended approach is a multi-step hybrid pipeline:

### Phase 1: ArcGIS REST API Scraping (Estimated: 5-8 counties)

Counties with ArcGIS-hosted commissioner precinct layers can be queried programmatically:

```javascript
// Example: Query ArcGIS REST service for commissioner precinct boundaries
const url = `https://{county-arcgis-server}/arcgis/rest/services/CommPrecinct/MapServer/0/query`;
const params = new URLSearchParams({
  where: '1=1',
  outFields: '*',
  f: 'geojson',
  returnGeometry: true
});
const response = await fetch(`${url}?${params}`);
const geojson = await response.json();
```

Then perform spatial join with ZIP code centroids to get the mapping.

**Target counties:** Montgomery, Nueces, Galveston, Cameron (confirmed ArcGIS presence).

### Phase 2: County Website Structured Data (Estimated: 5-7 counties)

For counties that publish voting-precinct-to-commissioner-precinct mappings on their websites (HTML tables or structured text):

1. Scrape the mapping from the county elections website
2. Cross-reference voting precincts with the state's precinct shapefile to get geographic coverage
3. Overlay with ZIP code boundaries

**Target counties:** Johnson, Bell, Lubbock, Smith, and others with structured web data.

### Phase 3: Manual Data Entry from PDF Maps (Estimated: 5-8 counties)

For counties with only PDF maps:
1. Download the commissioner precinct map PDF
2. Manually determine which ZIPs fall primarily in which precinct by visual inspection
3. Enter the data as JSON

This is the same approach used for the existing 10 working counties and documented in `manual_precinct_data_entry.md`.

**Target counties:** El Paso, Parker, Kaufman, and others with PDF-only data.

### Phase 4: Verification

For all approaches, verify the generated mappings by:
1. Spot-checking 2-3 addresses per county using the county's voter lookup tool
2. Comparing ZIP counts against known ZIP code lists for each county
3. Ensuring all 4 commissioner precincts are represented

---

## ALTERNATIVE: Build a Spatial Join Script

A more scalable long-term approach:

### One-time setup
1. Download voting precinct shapefiles from Capitol Data Portal (statewide coverage)
2. For each target county, download commissioner precinct shapefiles from the county GIS portal
3. Download ZCTA (ZIP Code Tabulation Area) shapefiles from Census

### Processing script (Python + GeoPandas)
```python
import geopandas as gpd

# Load ZIP code boundaries for the county
zips = gpd.read_file('zcta_boundaries.shp')
zips = zips[zips['ZCTA5CE20'].str.startswith(('7', '8'))]  # Texas ZIPs

# Load commissioner precinct boundaries for the county
comm_pcts = gpd.read_file('county_commissioner_precincts.shp')

# Compute ZIP centroids
zips['centroid'] = zips.geometry.centroid
zip_points = zips.set_geometry('centroid')

# Spatial join: which commissioner precinct contains each ZIP centroid?
joined = gpd.sjoin(zip_points, comm_pcts, how='left', predicate='within')

# Extract the mapping
mapping = {}
for _, row in joined.iterrows():
    mapping[row['ZCTA5CE20']] = str(int(row['PRECINCT']))

print(json.dumps(mapping, indent=2))
```

### Pros
- Deterministic, reproducible, verifiable
- Works for any county with shapefile data
- Can be re-run after redistricting

### Cons
- Requires Python + GeoPandas environment (not available in Cloudflare Worker)
- Must collect shapefiles from 20 different county GIS portals
- ZIP-to-precinct is inherently approximate (ZIP boundaries cross precincts)
- One-time development effort is significant

---

## EFFORT ESTIMATE

| Approach | Counties Covered | Development Time | Data Collection Time |
|----------|-----------------|-----------------|---------------------|
| ArcGIS REST API | 4-6 | 4 hours | 2 hours |
| Web scraping | 5-7 | 3 hours | 3 hours |
| Manual from PDFs | 5-8 | 0 hours | 8-12 hours |
| Spatial join script | All 20 (if shapefiles found) | 6 hours | 4 hours |

### Fastest path (estimated 12-16 hours total):
1. Manual PDF-based entry for all 20 counties (proven approach from existing 10)
2. Use AI assistance to read PDF maps and generate initial JSON
3. Verify spot-check with county voter lookup tools

### Most automated path (estimated 10-14 hours total):
1. Build spatial join script
2. Collect shapefiles from county GIS portals (may not exist for all 20)
3. Fall back to manual for counties without downloadable shapefiles
4. Verify all results

---

## DATA SOURCE SUMMARY

| Source | Has Commissioner Precincts? | Statewide? | Format | API? | Free? |
|--------|---------------------------|-----------|--------|------|-------|
| TX SOS | No | - | - | No | - |
| Capitol Data Portal | No (voting precincts only) | Yes | SHP/XLSX | No | Yes |
| Census TIGER/Line | No | - | - | Partial | Yes |
| TNRIS/TxGIO | No | - | - | No | - |
| Redistricting Data Hub | No | - | - | No | - |
| County ArcGIS Portals | YES (per county) | No | GeoJSON/SHP | Yes | Yes |
| County Election Websites | YES (per county) | No | HTML/PDF | No | Yes |
| Geocodio | No | - | - | Yes | Paid |
| USgeocoder | No | - | - | Yes | Paid |
| Census Geocoder | No | - | - | Yes | Yes |
| TX Voter File | Has voting precinct | Yes | Fixed-width | No | Paid |

---

## RECOMMENDATION

**For the March 2026 primary election deadline:**

**Do Phase 3 (manual data entry) for all 20 counties.** This is the proven approach that already worked for the first 10 counties. It requires no development, no external dependencies, and produces verified results. Target: 2-3 days of focused work.

**For longer-term automation:**

Build the spatial join script (Alternative approach) and collect commissioner precinct shapefiles from county GIS portals. This creates a repeatable pipeline for future redistricting cycles and additional counties. Target: 1 sprint of development work after the election.
