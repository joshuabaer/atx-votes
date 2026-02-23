# Manual Precinct Map Data Entry Plan

**Goal:** Populate `precinct_map:{fips}` KV entries for 20 Texas counties currently missing ZIP-to-commissioner-precinct mappings.

**Background:** The Texas Votes app uses precinct maps to show users which County Commissioner precinct they live in, based on their ZIP code. This affects which local races appear on their personalized voting guide. We currently have precinct maps for 10 counties and need to add 20 more.

---

## 1. Data Format

Each precinct map is a flat JSON object mapping **ZIP codes** (strings) to **commissioner precinct numbers** (strings, typically "1" through "4").

### Real Example: Travis County (48453) -- 47 ZIPs

```json
{
  "78617": "4",
  "78641": "3",
  "78645": "2",
  "78653": "1",
  "78660": "1",
  "78669": "3",
  "78701": "3",
  "78702": "1",
  "78703": "2",
  "78704": "4",
  "78705": "2",
  "78712": "2",
  "78719": "4",
  "78721": "4",
  "78722": "1",
  "78723": "1",
  "78724": "1",
  "78725": "1",
  "78726": "3",
  "78727": "2",
  "78728": "1",
  "78730": "2",
  "78731": "2",
  "78732": "2",
  "78733": "3",
  "78734": "3",
  "78735": "3",
  "78736": "3",
  "78738": "2",
  "78739": "3",
  "78741": "4",
  "78742": "4",
  "78744": "4",
  "78745": "4",
  "78746": "3",
  "78747": "4",
  "78748": "4",
  "78749": "3",
  "78750": "3",
  "78751": "2",
  "78752": "1",
  "78753": "1",
  "78754": "1",
  "78756": "2",
  "78757": "2",
  "78758": "2",
  "78759": "2"
}
```

### Format Rules

- Keys: 5-digit ZIP code strings (e.g., `"78701"`)
- Values: Precinct number strings (e.g., `"1"`, `"2"`, `"3"`, `"4"`)
- Only include ZIP codes **primarily within the county** -- skip ZIPs that are mostly in a neighboring county
- Most Texas counties have exactly 4 commissioner precincts
- Values are strings, not integers (the code does `map[zip]` and returns the string directly)

### Expected ZIP Count by County Size

Based on existing data, here are rough expectations:

| County Population | Expected ZIP Count |
|---|---|
| 800K+ (Harris) | ~130 |
| 300K-600K (Bexar, Tarrant) | ~60-70 |
| 150K-300K (Collin, Denton) | ~35-40 |
| 80K-150K (Williamson, Fort Bend) | ~17-21 |

---

## 2. County-by-County Research Guide

For each county below, you need to find: **which ZIP codes are in the county, and which commissioner precinct each ZIP falls in.**

### General Research Strategy (applies to all counties)

**Step 1: Find ZIP codes in the county**
- Google: `"{county name} county texas zip codes"`
- Or use: https://www.unitedstateszipcodes.org/tx/#zips-list (filter by county)
- Or use: https://www.zip-codes.com/county/tx-{county-name-lowercase}.asp

**Step 2: Find commissioner precinct boundaries**
Try these sources in order of reliability:

1. **County's official GIS/mapping portal** -- best source, often has interactive maps
2. **County Commissioner Court page** -- often lists which areas each commissioner represents
3. **County elections page** -- sometimes has precinct boundary maps
4. **Google: `"{county name} county texas commissioner precinct map"`**
5. **Google: `"{county name} county texas GIS commissioner precincts"`**

**Step 3: Match ZIPs to precincts**
- If you have an interactive GIS map, enter addresses from each ZIP code to determine its precinct
- If you have a static map, overlay it with a ZIP code map to determine assignments
- For ZIPs that straddle precinct boundaries, assign the **dominant precinct** (where most of the population lives)

---

### County 1: Montgomery (FIPS 48339) -- ~620K pop

- **Elections Website:** https://elections.mctx.org/
- **Research Steps:**
  1. Go to https://elections.mctx.org/ and look for precinct/district maps
  2. Check Montgomery County GIS: Google `"Montgomery County Texas GIS map commissioner precincts"`
  3. The county website at https://www.mctx.org may have a "Commissioner Precincts" page
  4. Try: https://www.mctx.org/commissioners_court/index.php for commissioner district info
- **ZIP codes to map:** 77301, 77302, 77303, 77304, 77306, 77316, 77318, 77328, 77333, 77354, 77355, 77356, 77357, 77362, 77365, 77372, 77378, 77380, 77381, 77382, 77384, 77385, 77386, 77387, 77389, and more
- **Expected:** ~25-35 ZIPs, 4 precincts

### County 2: El Paso (FIPS 48141) -- ~865K pop

- **Elections Website:** https://epcountyvotes.com/
- **Research Steps:**
  1. Go to https://epcountyvotes.com/ and look for precinct maps
  2. Google `"El Paso County Texas commissioner precinct map"`
  3. Check the county's main site for GIS portal: https://www.epcounty.com
  4. El Paso is large but geographically concentrated -- most population is in the western tip
- **ZIP codes to map:** 79821, 79835, 79836, 79838, 79849, 79901, 79902, 79903, 79904, 79905, 79906, 79907, 79908, 79911, 79912, 79915, 79920, 79922, 79924, 79925, 79927, 79928, 79930, 79932, 79934, 79935, 79936, 79938, and more
- **Expected:** ~25-35 ZIPs, 4 precincts

### County 3: Nueces (FIPS 48303) -- ~353K pop

- **Elections Website:** https://www.nuecesco.com/county-services/county-clerk/elections-department
- **Research Steps:**
  1. Check Nueces County main site for GIS or maps section
  2. Google `"Nueces County Texas commissioner precinct map"`
  3. Corpus Christi is the county seat -- most population is there
  4. Check: https://www.nuecesco.com for a maps or GIS link
- **ZIP codes to map:** 78330, 78339, 78343, 78370, 78373, 78380, 78401, 78402, 78404, 78405, 78406, 78407, 78408, 78409, 78410, 78411, 78412, 78413, 78414, 78415, 78416, 78417, 78418, 78419
- **Expected:** ~20-25 ZIPs, 4 precincts

### County 4: Galveston (FIPS 48167) -- ~350K pop

- **Elections Website:** https://galvestonvotes.org
- **Research Steps:**
  1. Go to https://galvestonvotes.org and look for district/precinct maps
  2. Google `"Galveston County Texas commissioner precinct map"`
  3. Check: https://www.galvestoncountytx.gov for GIS portal
  4. Note: The island vs. mainland split often defines precinct boundaries
- **ZIP codes to map:** 77510, 77511, 77517, 77518, 77539, 77546, 77550, 77551, 77554, 77563, 77565, 77568, 77573, 77590, 77591, 77592, 77617, 77623, 77650
- **Expected:** ~18-22 ZIPs, 4 precincts

### County 5: Brazoria (FIPS 48039) -- ~372K pop

- **Elections Website:** https://www.brazoriacountyclerktx.gov/departments/elections
- **Research Steps:**
  1. Go to county elections page and look for precinct maps
  2. Google `"Brazoria County Texas commissioner precinct map"`
  3. Check: https://www.brazoriacountytx.gov for GIS/maps section
  4. The county stretches from Pearland south to the coast
- **ZIP codes to map:** 77422, 77430, 77480, 77481, 77486, 77511, 77515, 77531, 77534, 77541, 77566, 77577, 77578, 77581, 77583, 77584, 77588
- **Expected:** ~15-20 ZIPs, 4 precincts

### County 6: Kaufman (FIPS 48257) -- ~145K pop

- **Elections Website:** https://www.kaufmancounty.net/237/Elections
- **Research Steps:**
  1. Check: https://www.kaufmancounty.net for GIS or maps page
  2. Google `"Kaufman County Texas commissioner precinct map"`
  3. Check the current election info page: https://www.kaufmancounty.net/434/CURRENT-ELECTION-INFORMATION
  4. Look for commissioner court member pages showing which areas they represent
- **ZIP codes to map:** 75114, 75126, 75142, 75152, 75157, 75158, 75160, 75161, 75169, 75474, 75103, 75143, 75147
- **Expected:** ~10-15 ZIPs, 4 precincts

### County 7: Johnson (FIPS 48251) -- ~175K pop

- **Elections Website:** https://www.johnsoncountytx.org/departments/elections-office
- **Research Steps:**
  1. Check: https://www.johnsoncountytx.org for maps or GIS section
  2. Google `"Johnson County Texas commissioner precinct map"`
  3. Cleburne is the county seat
  4. Look for commissioner court page listing areas of representation
- **ZIP codes to map:** 76009, 76028, 76031, 76033, 76035, 76036, 76044, 76050, 76058, 76059, 76070, 76084, 76093, 76097
- **Expected:** ~12-16 ZIPs, 4 precincts

### County 8: Parker (FIPS 48355) -- ~148K pop

- **Elections Website:** https://www.parkercountytx.gov/118/Elections
- **Research Steps:**
  1. Check: https://www.parkercountytx.gov for GIS or maps portal
  2. Google `"Parker County Texas commissioner precinct map"`
  3. Weatherford is the county seat
  4. Check: https://www.parkercountytx.gov/530/Early-Vote-and-Election-Day-Locations for boundary clues
- **ZIP codes to map:** 76006, 76008, 76020, 76066, 76067, 76071, 76073, 76082, 76085, 76086, 76087, 76088, 76108, 76126, 76462, 76484, 76485, 76486, 76487
- **Expected:** ~12-18 ZIPs, 4 precincts

### County 9: Lubbock (FIPS 48367) -- ~310K pop

- **Elections Website:** https://votelubbock.gov/
- **Research Steps:**
  1. Go to https://votelubbock.gov/ and look for precinct maps
  2. Google `"Lubbock County Texas commissioner precinct map"`
  3. Check: https://www.votelubbock.org/election-information/election-day-vote-centers-and-maps/ for maps
  4. Most population is in the city of Lubbock
- **ZIP codes to map:** 79401, 79402, 79403, 79404, 79406, 79407, 79410, 79411, 79412, 79413, 79414, 79415, 79416, 79423, 79424, 79416, 79382, 79363, 79336, 79381, 79423
- **Expected:** ~15-22 ZIPs, 4 precincts

### County 10: Cameron (FIPS 48061) -- ~421K pop

- **Elections Website:** https://www.cameroncountytx.gov/elections/
- **Research Steps:**
  1. Go to https://www.cameroncountytx.gov/elections/ and look for precinct maps
  2. Google `"Cameron County Texas commissioner precinct map"`
  3. Major cities: Brownsville, Harlingen, San Benito
  4. Check main county site for GIS portal
- **ZIP codes to map:** 78520, 78521, 78523, 78526, 78535, 78550, 78552, 78559, 78566, 78567, 78575, 78578, 78580, 78583, 78586, 78597, 78520
- **Expected:** ~15-20 ZIPs, 4 precincts

### County 11: McLennan (FIPS 48309) -- ~256K pop

- **Elections Website:** https://www.mclennan.gov/337/Elections
- **Research Steps:**
  1. Check: https://www.mclennan.gov for GIS or maps section
  2. Google `"McLennan County Texas commissioner precinct map"`
  3. Also try: http://www.mclennanvotes.com for maps
  4. Waco is the county seat and main population center
- **ZIP codes to map:** 76501, 76504, 76511, 76524, 76557, 76622, 76624, 76630, 76632, 76633, 76634, 76638, 76640, 76643, 76655, 76657, 76664, 76682, 76689, 76691, 76701, 76704, 76705, 76706, 76707, 76708, 76710, 76711, 76712, 76714, 76798
- **Expected:** ~20-30 ZIPs, 4 precincts

### County 12: Bell (FIPS 48027) -- ~355K pop

- **Elections Website:** https://www.bellcountytx.com/departments/elections/
- **Research Steps:**
  1. Check: https://www.bellcountytx.com for GIS or maps section
  2. Google `"Bell County Texas commissioner precinct map"`
  3. Major cities: Killeen, Temple, Belton
  4. Fort Cavazos (formerly Fort Hood) is a significant geographic factor
- **ZIP codes to map:** 76501, 76502, 76504, 76508, 76511, 76513, 76534, 76539, 76541, 76542, 76543, 76544, 76547, 76548, 76549, 76554, 76559, 76569, 76571, 76579
- **Expected:** ~18-22 ZIPs, 4 precincts

### County 13: Gregg (FIPS 48183) -- ~120K pop

- **Elections Website:** https://www.greggcountyvotes.com/
- **Research Steps:**
  1. Check the county's polling place/precinct maps: https://www.greggcountyvotes.com/maps/county-voting-precincts/
  2. Google `"Gregg County Texas commissioner precinct map"`
  3. Longview is the county seat
  4. Gregg County has a helpful GIS mapping page
- **ZIP codes to map:** 75601, 75602, 75603, 75604, 75605, 75606, 75607, 75615, 75647, 75662, 75693
- **Expected:** ~8-12 ZIPs, 4 precincts

### County 14: Randall (FIPS 48381) -- ~138K pop

- **Elections Website:** https://www.randallcounty.gov/166/Election-Administration
- **Research Steps:**
  1. Check: https://www.randallcounty.gov for maps or GIS section
  2. Google `"Randall County Texas commissioner precinct map"`
  3. Canyon is the county seat; much of Amarillo is also in Randall County
  4. Note: Amarillo straddles Randall and Potter counties -- be careful with shared ZIPs
- **ZIP codes to map:** 79015, 79016, 79091, 79106, 79109, 79110, 79118, 79119, 79121, 79124
- **Expected:** ~8-12 ZIPs, 4 precincts

### County 15: Potter (FIPS 48375) -- ~117K pop

- **Elections Website:** https://www.pottercountytexasvotes.gov/
- **Research Steps:**
  1. Check: https://www.pottercountytexasvotes.gov/where-to-vote for maps
  2. Google `"Potter County Texas commissioner precinct map"`
  3. Also check: https://www.co.potter.tx.us/
  4. Northern portion of Amarillo is in Potter County
- **ZIP codes to map:** 79101, 79102, 79103, 79104, 79105, 79106, 79107, 79108, 79109, 79111, 79118, 79119, 79124
- **Expected:** ~8-12 ZIPs, 4 precincts
- **CAUTION:** Some Amarillo ZIPs overlap with Randall County. Only include ZIPs primarily in Potter.

### County 16: Smith (FIPS 48423) -- ~232K pop

- **Elections Website:** https://www.smith-county.com/233/Current-Election-Information
- **Research Steps:**
  1. Check: https://www.smith-county.com/213/Elections for maps
  2. Google `"Smith County Texas commissioner precinct map"`
  3. Tyler is the county seat
  4. Check: https://www.smith-county.com/396/Current-Sample-Ballots for precinct info
- **ZIP codes to map:** 75701, 75702, 75703, 75704, 75706, 75707, 75708, 75709, 75750, 75757, 75762, 75771, 75789, 75791, 75792, 75798, 75799
- **Expected:** ~12-18 ZIPs, 4 precincts

### County 17: Victoria (FIPS 48469) -- ~92K pop

- **Elections Website:** https://www.vctxelections.org/
- **Research Steps:**
  1. Go to https://www.vctxelections.org/ and look for precinct/district maps
  2. Google `"Victoria County Texas commissioner precinct map"`
  3. Victoria is the only significant city in the county
  4. Smaller county -- may have fewer ZIPs
- **ZIP codes to map:** 77901, 77902, 77904, 77905, 77968, 77973, 77974, 77976, 77977
- **Expected:** ~6-10 ZIPs, 4 precincts

### County 18: Jefferson (FIPS 48245) -- ~256K pop

- **Elections Website:** https://www.jeffersonelections.com/
- **Research Steps:**
  1. Go to https://www.jeffersonelections.com/ and look for precinct maps
  2. Google `"Jefferson County Texas commissioner precinct map"`
  3. Major cities: Beaumont, Port Arthur, Nederland
  4. The county spans from Beaumont south to the coast
- **ZIP codes to map:** 77611, 77613, 77615, 77619, 77622, 77627, 77629, 77640, 77642, 77651, 77655, 77657, 77701, 77702, 77703, 77705, 77706, 77707, 77708, 77713
- **Expected:** ~15-22 ZIPs, 4 precincts

### County 19: Midland (FIPS 48329) -- ~164K pop

- **Elections Website:** https://www.co.midland.tx.us/328/Elections-Office
- **Research Steps:**
  1. Check: https://www.co.midland.tx.us for GIS or maps section
  2. Google `"Midland County Texas commissioner precinct map"`
  3. Also check: https://www.co.midland.tx.us/967/Current-Elections
  4. Midland is the main city; relatively compact urban area
- **ZIP codes to map:** 79701, 79703, 79705, 79706, 79707, 79765
- **Expected:** ~5-8 ZIPs, 4 precincts

### County 20: Ector (FIPS 48135) -- ~165K pop

- **Elections Website:** https://www.co.ector.tx.us/page/ector.Elections
- **Research Steps:**
  1. Check: https://www.co.ector.tx.us for GIS or maps section
  2. Google `"Ector County Texas commissioner precinct map"`
  3. Odessa is the county seat and main city
  4. Ector and Midland are adjacent -- be careful with overlapping ZIPs
- **ZIP codes to map:** 79720, 79758, 79761, 79762, 79763, 79764, 79765, 79766
- **Expected:** ~5-10 ZIPs, 4 precincts

---

## 3. How to Enter the Data

### Prerequisites

```bash
cd /Users/joshuabaer/Library/Mobile\ Documents/com~apple~CloudDocs/Xcode/ATXVotes/worker
```

You must have Wrangler configured and authenticated with Cloudflare.

### Write Command

For each county, create a JSON file and pipe it into KV. Use the `--remote` flag to write to production KV (not local).

**Option A: Inline JSON (for small counties)**

```bash
echo '{"79701":"2","79703":"3","79705":"1","79706":"4","79707":"3"}' | \
  npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48329" \
  --path - -c wrangler.txvotes.toml --remote
```

**Option B: From a file (for larger counties, recommended)**

1. Create a temp JSON file:
```bash
cat > /tmp/precinct_montgomery.json << 'EOF'
{"77301":"1","77302":"2","77303":"3","77304":"4","77316":"2","77318":"3"}
EOF
```

2. Write it to KV:
```bash
npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48339" \
  --path /tmp/precinct_montgomery.json -c wrangler.txvotes.toml --remote
```

### Full Command Reference for All 20 Counties

Replace `{JSON}` with the actual data you researched:

```bash
# 1. Montgomery (48339)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48339" --path - -c wrangler.txvotes.toml --remote

# 2. El Paso (48141)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48141" --path - -c wrangler.txvotes.toml --remote

# 3. Nueces (48303)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48303" --path - -c wrangler.txvotes.toml --remote

# 4. Galveston (48167)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48167" --path - -c wrangler.txvotes.toml --remote

# 5. Brazoria (48039)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48039" --path - -c wrangler.txvotes.toml --remote

# 6. Kaufman (48257)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48257" --path - -c wrangler.txvotes.toml --remote

# 7. Johnson (48251)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48251" --path - -c wrangler.txvotes.toml --remote

# 8. Parker (48355)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48355" --path - -c wrangler.txvotes.toml --remote

# 9. Lubbock (48367)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48367" --path - -c wrangler.txvotes.toml --remote

# 10. Cameron (48061)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48061" --path - -c wrangler.txvotes.toml --remote

# 11. McLennan (48309)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48309" --path - -c wrangler.txvotes.toml --remote

# 12. Bell (48027)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48027" --path - -c wrangler.txvotes.toml --remote

# 13. Gregg (48183)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48183" --path - -c wrangler.txvotes.toml --remote

# 14. Randall (48381)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48381" --path - -c wrangler.txvotes.toml --remote

# 15. Potter (48375)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48375" --path - -c wrangler.txvotes.toml --remote

# 16. Smith (48423)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48423" --path - -c wrangler.txvotes.toml --remote

# 17. Victoria (48469)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48469" --path - -c wrangler.txvotes.toml --remote

# 18. Jefferson (48245)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48245" --path - -c wrangler.txvotes.toml --remote

# 19. Midland (48329)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48329" --path - -c wrangler.txvotes.toml --remote

# 20. Ector (48135)
echo '{JSON}' | npx wrangler kv key put --binding ELECTION_DATA "precinct_map:48135" --path - -c wrangler.txvotes.toml --remote
```

---

## 4. Tips for Finding the Data

### What You Are Looking For

- **Commissioner precincts** -- NOT voting precincts. These are different things.
  - Commissioner precincts: Usually 4 per county. These are the geographic districts for County Commissioners Court members.
  - Voting precincts: Usually dozens to hundreds per county. These are for election administration.
- You need the **commissioner precinct** (also called "commissioners court precinct" or just "county precinct")

### Best Sources (in order of reliability)

1. **County GIS/mapping portals** -- Many Texas counties have interactive maps where you can search by address and see which commissioner precinct it falls in. This is the gold standard.

2. **County commissioner pages** -- Often list which areas/cities each commissioner represents, which you can cross-reference with ZIP codes.

3. **County redistricting documents** -- After the 2020 Census, counties redrew precinct lines. These documents often have detailed maps with clear boundaries.

4. **Texas Association of Counties** -- https://www.county.org may have useful links.

5. **Google Maps overlays** -- Some counties publish KML/KMZ files of their commissioner precinct boundaries that you can open in Google Earth.

### Handling Edge Cases

- **ZIP codes spanning multiple precincts:** This is common, especially in urban areas. Assign the precinct where the **majority of the population** within that ZIP lives. If it's truly 50/50, pick the one containing the ZIP's post office or geographic center.

- **ZIP codes spanning county lines:** Only include a ZIP if the county in question contains a significant portion of that ZIP's population. When in doubt, include it -- a partial match is better than no match.

- **Shared ZIPs between adjacent counties (Randall/Potter, Midland/Ector):** Include the ZIP in BOTH county maps if residents of both counties could have that ZIP code. The app looks up the precinct map using the county FIPS determined from the user's address, so the correct county's map will be consulted.

- **PO Box ZIPs:** Skip them. These are not residential ZIPs and won't have meaningful precinct assignments.

### Quick Sanity Checks While Researching

- Every county should have all 4 precincts represented in its map
- No precinct should have 0 ZIPs assigned
- The number of ZIPs per precinct should be roughly proportional (not 30 in one and 2 in another)
- Cross-reference with a general map of the county to make sure the geographic spread makes sense (precincts should be contiguous regions)

---

## 5. Verification Steps

### After entering each county's data:

**Step 1: Read back the data from KV**

```bash
npx wrangler kv key get --binding ELECTION_DATA "precinct_map:{FIPS}" \
  -c wrangler.txvotes.toml --remote
```

Verify the JSON is valid and matches what you entered.

**Step 2: Validate the JSON structure**

```bash
npx wrangler kv key get --binding ELECTION_DATA "precinct_map:{FIPS}" \
  -c wrangler.txvotes.toml --remote 2>/dev/null | \
  python3 -c "
import json, sys
d = json.load(sys.stdin)
print(f'Total ZIPs: {len(d)}')
from collections import Counter
c = Counter(d.values())
for pct in sorted(c.keys()):
    print(f'  Precinct {pct}: {c[pct]} ZIPs')
# Check all values are valid precinct numbers
bad = [k for k,v in d.items() if v not in ('1','2','3','4')]
if bad:
    print(f'WARNING: Invalid precinct values for ZIPs: {bad}')
# Check all keys are 5-digit ZIPs
bad_zips = [k for k in d.keys() if not (k.isdigit() and len(k) == 5)]
if bad_zips:
    print(f'WARNING: Invalid ZIP codes: {bad_zips}')
"
```

Expected output should show:
- A reasonable number of total ZIPs
- All 4 precincts represented
- No warnings about invalid values

**Step 3: Test in the live app**

1. Go to https://txvotes.app
2. Enter an address in the county you just added
3. Check that the guide shows "County Commissioner Precinct X" in the district info
4. Test at least one address from each precinct to confirm all 4 work

**Step 4: Spot-check accuracy**

Pick 2-3 addresses from the county at random, look up their commissioner precinct on the county's official site, and verify they match what the app shows.

### After entering ALL 20 counties:

**Full inventory check:**

```bash
npx wrangler kv key list --binding ELECTION_DATA -c wrangler.txvotes.toml --remote 2>/dev/null | \
  python3 -c "
import json, sys
keys = [k['name'] for k in json.load(sys.stdin) if k['name'].startswith('precinct_map:')]
print(f'Total precinct maps: {len(keys)}')
for k in sorted(keys):
    print(f'  {k}')
"
```

You should see 30 total precinct maps (10 existing + 20 new).

**Batch validation script:**

```bash
for fips in 48339 48141 48303 48167 48039 48257 48251 48355 48367 48061 48309 48027 48183 48381 48375 48423 48469 48245 48329 48135; do
  echo "=== $fips ==="
  npx wrangler kv key get --binding ELECTION_DATA "precinct_map:$fips" \
    -c wrangler.txvotes.toml --remote 2>/dev/null | \
    python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    from collections import Counter
    c = Counter(d.values())
    pcts = ', '.join(f'P{k}={v}' for k,v in sorted(c.items()))
    print(f'  OK: {len(d)} ZIPs ({pcts})')
except:
    print('  MISSING or INVALID')
"
done
```

---

## 6. Recommended Order of Work

Start with the smaller/simpler counties (fewer ZIPs, easier to verify) and work up to larger ones:

| Priority | County | FIPS | Why |
|---|---|---|---|
| 1 | Midland | 48329 | ~5-8 ZIPs, compact city |
| 2 | Ector | 48135 | ~5-10 ZIPs, compact city |
| 3 | Victoria | 48469 | ~6-10 ZIPs, single city |
| 4 | Gregg | 48183 | ~8-12 ZIPs, has GIS maps page |
| 5 | Potter | 48375 | ~8-12 ZIPs |
| 6 | Randall | 48381 | ~8-12 ZIPs, do alongside Potter for Amarillo overlap |
| 7 | Kaufman | 48257 | ~10-15 ZIPs |
| 8 | Johnson | 48251 | ~12-16 ZIPs |
| 9 | Parker | 48355 | ~12-18 ZIPs |
| 10 | Brazoria | 48039 | ~15-20 ZIPs |
| 11 | Galveston | 48167 | ~18-22 ZIPs |
| 12 | Cameron | 48061 | ~15-20 ZIPs |
| 13 | Jefferson | 48245 | ~15-22 ZIPs |
| 14 | Lubbock | 48367 | ~15-22 ZIPs |
| 15 | Smith | 48423 | ~12-18 ZIPs |
| 16 | Nueces | 48303 | ~20-25 ZIPs |
| 17 | Bell | 48027 | ~18-22 ZIPs |
| 18 | McLennan | 48309 | ~20-30 ZIPs |
| 19 | Montgomery | 48339 | ~25-35 ZIPs |
| 20 | El Paso | 48141 | ~25-35 ZIPs |

---

## 7. Tracking Progress

Use this checklist to track which counties are done:

```
[ ] Midland (48329)
[ ] Ector (48135)
[ ] Victoria (48469)
[ ] Gregg (48183)
[ ] Potter (48375)
[ ] Randall (48381)
[ ] Kaufman (48257)
[ ] Johnson (48251)
[ ] Parker (48355)
[ ] Brazoria (48039)
[ ] Galveston (48167)
[ ] Cameron (48061)
[ ] Jefferson (48245)
[ ] Lubbock (48367)
[ ] Smith (48423)
[ ] Nueces (48303)
[ ] Bell (48027)
[ ] McLennan (48309)
[ ] Montgomery (48339)
[ ] El Paso (48141)
```

**Time estimate:** Allow 15-30 minutes per county for research + data entry + verification. Total: approximately 5-10 hours for all 20 counties.
