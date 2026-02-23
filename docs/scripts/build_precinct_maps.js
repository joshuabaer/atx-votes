#!/usr/bin/env node
//
// build_precinct_maps.js — Build ZIP-to-commissioner-precinct maps for Texas counties
//
// Uses the Anthropic API with web_search tool to research which ZIP codes
// map to which County Commissioner precincts (1-4). Much more detailed prompting
// than the original seed_precinct_maps.js which returned empty results.
//
// Usage:
//   node docs/scripts/build_precinct_maps.js
//   node docs/scripts/build_precinct_maps.js --test          # Run 3 counties only
//   node docs/scripts/build_precinct_maps.js --county=48339  # Single county
//   node docs/scripts/build_precinct_maps.js --dry-run       # Don't write to KV
//   node docs/scripts/build_precinct_maps.js --skip-kv       # Write results file but skip KV
//
// Results: /tmp/precinct_maps_results.json
// Logs:    /tmp/precinct_maps_build.log

const fs = require("fs");
const { execFileSync } = require("child_process");
const path = require("path");

// ─── Configuration ───────────────────────────────────────────────────────────

let ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Auto-load from worker/.dev.vars if not set
if (!ANTHROPIC_API_KEY) {
  const devVarsPath = path.join(
    process.env.HOME,
    "Library/Mobile Documents/com~apple~CloudDocs/Xcode/ATXVotes/worker/.dev.vars"
  );
  try {
    const devVars = fs.readFileSync(devVarsPath, "utf8");
    const match = devVars.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (match) {
      ANTHROPIC_API_KEY = match[1].trim();
      log("Loaded ANTHROPIC_API_KEY from worker/.dev.vars");
    }
  } catch {
    // ignore
  }
}

if (!ANTHROPIC_API_KEY) {
  console.error("ERROR: Set ANTHROPIC_API_KEY environment variable or add to worker/.dev.vars");
  process.exit(1);
}

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 16384;
const RATE_LIMIT_DELAY_MS = 5000;
const MAX_RETRIES = 3;
const KV_NAMESPACE_ID = "1b02b19492f243c8b503d99d0ff11761";

const WORKER_DIR = path.join(
  process.env.HOME,
  "Library/Mobile Documents/com~apple~CloudDocs/Xcode/ATXVotes/worker"
);
const RESULTS_FILE = "/tmp/precinct_maps_results.json";
const LOG_FILE = "/tmp/precinct_maps_build.log";

// ─── CLI Arguments ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const TEST_MODE = args.includes("--test");
const DRY_RUN = args.includes("--dry-run");
const SKIP_KV = args.includes("--skip-kv");

const countyArg = args.find((a) => a.startsWith("--county="));
const FILTER_COUNTY = countyArg ? countyArg.split("=")[1] : null;

// ─── Logging ────────────────────────────────────────────────────────────────

const logLines = [];

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  logLines.push(line);
}

function saveLog() {
  fs.writeFileSync(LOG_FILE, logLines.join("\n") + "\n");
}

// ─── County Data ────────────────────────────────────────────────────────────
// The 20 counties that need precinct maps, with known ZIP codes and major cities
// to help Claude do better web searches

const COUNTIES_TO_MAP = [
  {
    fips: "48339", name: "Montgomery",
    seat: "Conroe",
    cities: ["Conroe", "The Woodlands", "Magnolia", "Willis", "New Caney", "Porter", "Montgomery", "Splendora", "Cut and Shoot", "Pinehurst"],
    knownZips: ["77301", "77302", "77303", "77304", "77306", "77316", "77318", "77328", "77354", "77355", "77356", "77357", "77362", "77365", "77372", "77378", "77380", "77381", "77382", "77384", "77385", "77386", "77389"],
    hints: "The Woodlands is in the southern part. Conroe is the county seat in the central area. Magnolia is in the west."
  },
  {
    fips: "48141", name: "El Paso",
    seat: "El Paso",
    cities: ["El Paso", "Socorro", "Horizon City", "San Elizario", "Canutillo", "Vinton", "Anthony", "Clint", "Fabens", "Tornillo"],
    knownZips: ["79835", "79836", "79838", "79849", "79901", "79902", "79903", "79904", "79905", "79906", "79907", "79908", "79911", "79912", "79915", "79920", "79922", "79924", "79925", "79927", "79928", "79930", "79932", "79934", "79935", "79936", "79938"],
    hints: "El Paso stretches along the Rio Grande. The eastern part includes Socorro and Horizon City. Fort Bliss is in the northeast."
  },
  {
    fips: "48303", name: "Nueces",
    seat: "Corpus Christi",
    cities: ["Corpus Christi", "Robstown", "Port Aransas", "Agua Dulce", "Bishop", "Driscoll", "Petronila"],
    knownZips: ["78330", "78339", "78343", "78373", "78380", "78401", "78402", "78404", "78405", "78406", "78407", "78408", "78409", "78410", "78411", "78412", "78413", "78414", "78415", "78416", "78417", "78418"],
    hints: "Corpus Christi dominates the county. Robstown is inland to the west. Port Aransas is on the barrier island."
  },
  {
    fips: "48167", name: "Galveston",
    seat: "Galveston",
    cities: ["Galveston", "Texas City", "League City", "Friendswood", "Dickinson", "La Marque", "Santa Fe", "Hitchcock", "Kemah", "Clear Lake Shores", "Bayou Vista", "Tiki Island"],
    knownZips: ["77510", "77511", "77517", "77518", "77539", "77546", "77549", "77550", "77551", "77554", "77563", "77565", "77568", "77573", "77590", "77591", "77592"],
    hints: "League City and Friendswood are in the north. Galveston is on the island in the south. Texas City and La Marque are in the middle."
  },
  {
    fips: "48039", name: "Brazoria",
    seat: "Angleton",
    cities: ["Angleton", "Pearland", "Lake Jackson", "Alvin", "Clute", "Freeport", "Brazoria", "Manvel", "Sweeny", "West Columbia", "Danbury", "Iowa Colony", "Rosharon", "Liverpool"],
    knownZips: ["77511", "77515", "77531", "77534", "77541", "77545", "77546", "77566", "77578", "77581", "77583", "77584", "77588"],
    hints: "Pearland is in the northeast corner near Houston. Angleton is the county seat in the center. Lake Jackson/Freeport are on the coast in the south."
  },
  {
    fips: "48257", name: "Kaufman",
    seat: "Kaufman",
    cities: ["Kaufman", "Terrell", "Forney", "Crandall", "Kemp", "Mabank", "Scurry", "Elmo", "Rosser", "Talty"],
    knownZips: ["75114", "75126", "75142", "75147", "75152", "75157", "75158", "75159", "75160", "75161", "75169"],
    hints: "Forney and Terrell are in the northern part near I-20. Kaufman is the county seat. Kemp and Mabank are in the south near Cedar Creek Lake."
  },
  {
    fips: "48251", name: "Johnson",
    seat: "Cleburne",
    cities: ["Cleburne", "Burleson", "Joshua", "Alvarado", "Grandview", "Keene", "Rio Vista", "Godley", "Venus"],
    knownZips: ["76009", "76028", "76031", "76033", "76035", "76044", "76050", "76058", "76059", "76084", "76093", "76097"],
    hints: "Burleson is in the northeast near Fort Worth. Cleburne is the county seat in the center. Joshua is between them."
  },
  {
    fips: "48355", name: "Parker",
    seat: "Weatherford",
    cities: ["Weatherford", "Hudson Oaks", "Willow Park", "Aledo", "Springtown", "Azle", "Peaster", "Mineral Wells", "Millsap", "Cool"],
    knownZips: ["76008", "76020", "76066", "76067", "76071", "76082", "76085", "76086", "76087", "76088", "76126", "76462"],
    hints: "Weatherford is the county seat in the center. Azle and Springtown are in the north. Aledo and Willow Park are near Fort Worth in the east."
  },
  {
    fips: "48367", name: "Lubbock",
    seat: "Lubbock",
    cities: ["Lubbock", "Wolfforth", "Shallowater", "Slaton", "Idalou", "New Deal", "Ransom Canyon", "Buffalo Springs"],
    knownZips: ["79336", "79363", "79364", "79382", "79401", "79403", "79404", "79406", "79407", "79410", "79411", "79412", "79413", "79414", "79415", "79416", "79423", "79424"],
    hints: "Lubbock city dominates the county. Wolfforth is to the southwest. Slaton is to the southeast. Shallowater is to the northwest."
  },
  {
    fips: "48061", name: "Cameron",
    seat: "Brownsville",
    cities: ["Brownsville", "Harlingen", "San Benito", "Los Fresnos", "Port Isabel", "South Padre Island", "La Feria", "Combes", "Primera", "Rangerville", "Rio Hondo", "Laguna Vista"],
    knownZips: ["78520", "78521", "78526", "78535", "78550", "78552", "78559", "78566", "78567", "78575", "78578", "78583", "78586"],
    hints: "Brownsville is in the south along the border. Harlingen is in the north-central area. San Benito is between them. South Padre Island is on the coast."
  },
  {
    fips: "48309", name: "McLennan",
    seat: "Waco",
    cities: ["Waco", "Hewitt", "Robinson", "Woodway", "Bellmead", "Lacy-Lakeview", "McGregor", "Lorena", "Mart", "West", "Moody", "Crawford"],
    knownZips: ["76621", "76624", "76633", "76638", "76643", "76655", "76657", "76664", "76691", "76701", "76704", "76705", "76706", "76707", "76708", "76710", "76711", "76712"],
    hints: "Waco is the county seat in the center. West is in the north. Hewitt and Woodway are in the southwest. Robinson is to the south."
  },
  {
    fips: "48027", name: "Bell",
    seat: "Belton",
    cities: ["Killeen", "Temple", "Belton", "Harker Heights", "Copperas Cove", "Nolanville", "Salado", "Holland", "Rogers", "Troy", "Morgans Point Resort"],
    knownZips: ["76501", "76502", "76504", "76508", "76511", "76513", "76534", "76539", "76541", "76542", "76543", "76544", "76548", "76549", "76554", "76559", "76571", "76579"],
    hints: "Killeen and Fort Cavazos (formerly Fort Hood) dominate the western part. Temple is in the east. Belton is the county seat in the middle. Salado is in the south."
  },
  {
    fips: "48183", name: "Gregg",
    seat: "Longview",
    cities: ["Longview", "Kilgore", "Gladewater", "White Oak", "Clarksville City", "Lakeport", "Liberty City"],
    knownZips: ["75601", "75602", "75603", "75604", "75605", "75606", "75647", "75662"],
    hints: "Longview is the county seat and largest city, dominating the central and eastern part. Kilgore is in the southwest. Gladewater is in the northwest."
  },
  {
    fips: "48381", name: "Randall",
    seat: "Canyon",
    cities: ["Canyon", "Amarillo (south part)", "Lake Tanglewood", "Palisades", "Umbarger"],
    knownZips: ["79015", "79016", "79091", "79101", "79106", "79109", "79110", "79118", "79119", "79121", "79124"],
    hints: "Canyon is the county seat in the south. Much of the city of Amarillo is in Randall County (the southern part of Amarillo). The county line splits Amarillo between Potter (north) and Randall (south)."
  },
  {
    fips: "48375", name: "Potter",
    seat: "Amarillo",
    cities: ["Amarillo (north part)", "Bushland", "Ady", "Bishop Hills"],
    knownZips: ["79101", "79102", "79103", "79104", "79105", "79106", "79107", "79108", "79109", "79111", "79118", "79119", "79124"],
    hints: "Amarillo straddles the Potter-Randall county line. The northern part of Amarillo is in Potter County. Potter County is north of Randall County."
  },
  {
    fips: "48423", name: "Smith",
    seat: "Tyler",
    cities: ["Tyler", "Lindale", "Whitehouse", "Bullard", "Noonday", "Arp", "Troup", "Winona", "Hideaway"],
    knownZips: ["75701", "75702", "75703", "75704", "75705", "75706", "75707", "75708", "75709", "75750", "75757", "75762", "75771", "75789", "75791", "75798"],
    hints: "Tyler is the county seat and dominant city. Lindale is to the north. Whitehouse is to the south. Bullard is to the south."
  },
  {
    fips: "48469", name: "Victoria",
    seat: "Victoria",
    cities: ["Victoria", "Bloomington", "Inez", "Placedo", "Nursery"],
    knownZips: ["77901", "77902", "77904", "77905", "77968", "77976", "77977"],
    hints: "Victoria city dominates the county. Bloomington is to the southeast. Inez is to the southeast."
  },
  {
    fips: "48245", name: "Jefferson",
    seat: "Beaumont",
    cities: ["Beaumont", "Port Arthur", "Nederland", "Groves", "Port Neches", "Central Gardens", "Bevil Oaks", "Nome", "China"],
    knownZips: ["77616", "77619", "77622", "77627", "77640", "77642", "77651", "77657", "77701", "77702", "77703", "77705", "77706", "77707", "77708", "77713"],
    hints: "Beaumont is in the north. Port Arthur is in the south near the coast. Nederland and Port Neches are in between."
  },
  {
    fips: "48329", name: "Midland",
    seat: "Midland",
    cities: ["Midland", "Greenwood"],
    knownZips: ["79701", "79703", "79705", "79706", "79707"],
    hints: "Midland city dominates the county. Greenwood is a community in the south."
  },
  {
    fips: "48135", name: "Ector",
    seat: "Odessa",
    cities: ["Odessa", "West Odessa", "Gardendale", "Goldsmith", "Notrees"],
    knownZips: ["79744", "79758", "79761", "79762", "79763", "79764", "79765", "79766"],
    hints: "Odessa is the county seat and dominant city. West Odessa is to the west. Gardendale is to the north."
  },
];

// ─── Anthropic API ───────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callClaudeWithSearch(prompt, systemPrompt) {
  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 15 }],
    messages: [{ role: "user", content: prompt }],
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const wait = (attempt + 1) * 15000;
      log(`  Rate limited (429), waiting ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }

    if (response.status === 529) {
      const wait = (attempt + 1) * 10000;
      log(`  Overloaded (529), waiting ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      const text = await response.text();
      throw new Error(`Auth error (${response.status}): check ANTHROPIC_API_KEY — ${text.slice(0, 200)}`);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Claude API returned ${response.status}: ${text.slice(0, 300)}`);
    }

    const result = await response.json();

    // Log token usage
    if (result.usage) {
      log(`  Tokens: input=${result.usage.input_tokens}, output=${result.usage.output_tokens}`);
    }

    // Collect all text blocks
    const textBlocks = (result.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text);

    if (textBlocks.length === 0) {
      log(`  WARNING: No text blocks in response`);
      return { parsed: null, rawText: "" };
    }

    const fullText = textBlocks.join("\n");
    let cleaned = fullText.trim();

    // Extract JSON from fenced code block or raw braces
    const fenceMatch = cleaned.match(/```json\s*([\s\S]*?)```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    } else {
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      }
    }

    try {
      const parsed = JSON.parse(cleaned);
      return { parsed, rawText: fullText };
    } catch (e) {
      log(`  WARNING: Failed to parse JSON: ${e.message}`);
      log(`  Raw text (first 500 chars): ${fullText.slice(0, 500)}`);
      return { parsed: null, rawText: fullText };
    }
  }

  throw new Error("Claude API returned 429/529 after all retries");
}

// ─── Prompt Building ─────────────────────────────────────────────────────────

function buildPrompt(county) {
  const zipList = county.knownZips.join(", ");
  return `I need to determine which County Commissioner precinct each ZIP code belongs to in ${county.name} County, Texas (FIPS: ${county.fips}). The county seat is ${county.seat}.

STEP 1 - RESEARCH: Search the web for the commissioner precinct boundaries in ${county.name} County, Texas. Try these searches:
- "${county.name} County Texas commissioner precinct map"
- "${county.name} County Texas commissioner precinct boundaries"
- "${county.name} County Texas commissioners court precincts"
- "${county.seat} TX county commissioner districts"
- site:${county.name.toLowerCase().replace(/ /g, "")}county.org OR site:co.${county.name.toLowerCase().replace(/ /g, "-")}.tx.us commissioner precinct

Look for:
- Official county GIS maps showing commissioner precinct boundaries
- County elections pages that list which areas/voting precincts are in which commissioner precinct
- County commissioner pages that describe the geographic area each commissioner represents
- ArcGIS or other interactive maps
- News articles about redistricting that describe the precinct boundaries

STEP 2 - GEOGRAPHY: ${county.name} County has these major cities/areas: ${county.cities.join(", ")}.
${county.hints}

The county has 4 commissioner precincts (numbered 1-4). Based on what you find, determine the geographic boundaries of each precinct.

STEP 3 - ZIP MAPPING: Map each of these ZIP codes to the commissioner precinct that covers the majority of its area:
${zipList}

For each ZIP code, reason about which part of the county it's in, and which commissioner precinct covers that area.

IMPORTANT RULES:
- Texas counties have exactly 4 Commissioner Precincts (1, 2, 3, 4)
- Every ZIP code listed above should be assigned to exactly one precinct
- If a ZIP spans multiple precincts, assign it to the precinct covering the majority
- All 4 precincts should have at least some ZIP codes assigned
- Only include ZIP codes that are primarily within ${county.name} County
- Base your answer on the actual commissioner precinct boundaries you find, NOT voting precinct numbers

Return your answer as a JSON object with this structure:
{
  "county_fips": "${county.fips}",
  "county_name": "${county.name}",
  "precincts": {
    "1": { "name": "Precinct 1", "description": "brief geographic description", "zips": ["zip1", "zip2"] },
    "2": { "name": "Precinct 2", "description": "brief geographic description", "zips": ["zip1", "zip2"] },
    "3": { "name": "Precinct 3", "description": "brief geographic description", "zips": ["zip1", "zip2"] },
    "4": { "name": "Precinct 4", "description": "brief geographic description", "zips": ["zip1", "zip2"] }
  },
  "source": "URL or description of the primary source used",
  "confidence": "high" or "medium" or "low",
  "notes": "any important caveats"
}

Return ONLY the JSON object, no other text.`;
}

const SYSTEM_PROMPT = `You are a geographic data researcher specializing in Texas county government boundaries. Your task is to determine which County Commissioner precinct each ZIP code belongs to.

KEY FACTS:
- Every Texas county has a Commissioners Court with 4 commissioner precincts
- Commissioner precincts are geographic districts, each represented by one commissioner
- They are different from voting precincts (election precincts) — do NOT confuse them
- Commissioner precinct boundaries are drawn by the county and may not follow neat geographic lines

RESEARCH APPROACH:
1. Use web_search extensively to find official county maps and boundary information
2. Look at county government websites, GIS portals, and election administration pages
3. Cross-reference multiple sources when possible
4. If you find a commissioner for a specific area, that tells you which precinct covers that area

IMPORTANT: If you cannot find definitive boundary information, make your BEST ESTIMATE based on:
- The general geographic layout of the county (north/south/east/west quadrants)
- Which commissioner represents which area (often mentioned in county news)
- Standard Texas county patterns (precincts often divide counties into roughly equal population quadrants)

Always return a complete mapping — do NOT return empty results. A best-guess mapping is more useful than no mapping.

Return ONLY valid JSON. No markdown formatting, no explanatory text outside the JSON.`;

// ─── KV Operations ──────────────────────────────────────────────────────────

function writeToKV(key, value) {
  if (DRY_RUN || SKIP_KV) {
    log(`  [${DRY_RUN ? "DRY RUN" : "SKIP KV"}] Would write KV key: ${key} (${JSON.stringify(value).length} bytes)`);
    return true;
  }

  const tmpFile = `/tmp/kv_precinct_${Date.now()}.json`;
  fs.writeFileSync(tmpFile, JSON.stringify(value));

  try {
    execFileSync(
      "npx",
      ["wrangler", "kv", "key", "put", `--namespace-id=${KV_NAMESPACE_ID}`, "--remote", key, "--path", tmpFile],
      { cwd: WORKER_DIR, stdio: "pipe", timeout: 30000 }
    );
    log(`  Wrote KV: ${key}`);
    return true;
  } catch (err) {
    log(`  ERROR writing KV ${key}: ${err.message}`);
    return false;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

// ─── Process a Single County ─────────────────────────────────────────────────

async function processCounty(county) {
  log(`\nProcessing: ${county.name} County (${county.fips})`);
  log(`  Known ZIPs: ${county.knownZips.length}`);
  log(`  Cities: ${county.cities.join(", ")}`);

  const prompt = buildPrompt(county);
  const { parsed, rawText } = await callClaudeWithSearch(prompt, SYSTEM_PROMPT);

  if (!parsed) {
    log(`  FAILED: Could not parse response`);
    return {
      fips: county.fips,
      name: county.name,
      success: false,
      error: "Could not parse response",
      rawText: rawText.slice(0, 2000),
    };
  }

  // Validate the result
  const precincts = parsed.precincts;
  if (!precincts || typeof precincts !== "object") {
    log(`  FAILED: Response missing 'precincts' field`);
    return {
      fips: county.fips,
      name: county.name,
      success: false,
      error: "Missing precincts field",
      rawResponse: parsed,
    };
  }

  // Check all 4 precincts exist
  const precinctNums = Object.keys(precincts).sort();
  const missing = ["1", "2", "3", "4"].filter((n) => !precinctNums.includes(n));
  if (missing.length > 0) {
    log(`  WARNING: Missing precincts: ${missing.join(", ")}`);
  }

  // Count ZIPs
  let totalZips = 0;
  const zipsByPrecinct = {};
  for (const [num, data] of Object.entries(precincts)) {
    const zips = data.zips || [];
    zipsByPrecinct[num] = zips.length;
    totalZips += zips.length;
  }

  log(`  Result: ${totalZips} ZIPs across precincts: ${JSON.stringify(zipsByPrecinct)}`);
  log(`  Confidence: ${parsed.confidence || "unknown"}`);
  log(`  Source: ${parsed.source || "not specified"}`);

  if (totalZips === 0) {
    log(`  FAILED: No ZIP codes in result`);
    return {
      fips: county.fips,
      name: county.name,
      success: false,
      error: "No ZIP codes in result",
      rawResponse: parsed,
    };
  }

  // Build the flat ZIP-to-precinct map for KV (the format the app uses)
  const flatMap = {};
  for (const [num, data] of Object.entries(precincts)) {
    for (const zip of (data.zips || [])) {
      // Validate ZIP format
      if (/^\d{5}$/.test(zip)) {
        flatMap[zip] = num;
      } else {
        log(`  WARNING: Invalid ZIP "${zip}" in precinct ${num}, skipping`);
      }
    }
  }

  const flatZipCount = Object.keys(flatMap).length;
  log(`  Flat map: ${flatZipCount} valid ZIP entries`);

  // Write to KV
  const kvKey = `precinct_map:${county.fips}`;
  const kvWritten = writeToKV(kvKey, flatMap);

  return {
    fips: county.fips,
    name: county.name,
    success: true,
    kvWritten,
    flatMap,
    richData: parsed,
    zipCount: flatZipCount,
    zipsByPrecinct,
    confidence: parsed.confidence,
    source: parsed.source,
    notes: parsed.notes,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log("=== Texas County Precinct Map Builder ===");
  log(`Mode: ${DRY_RUN ? "DRY RUN" : SKIP_KV ? "SKIP KV" : "LIVE"}`);
  log(`Model: ${MODEL}`);
  log(`Time: ${new Date().toISOString()}`);
  log("");

  // Determine which counties to process
  let counties = [...COUNTIES_TO_MAP];
  if (FILTER_COUNTY) {
    counties = counties.filter((c) => c.fips === FILTER_COUNTY);
    if (counties.length === 0) {
      log(`ERROR: County ${FILTER_COUNTY} not found in the list`);
      process.exit(1);
    }
    log(`Filtering to single county: ${counties[0].name} (${counties[0].fips})`);
  } else if (TEST_MODE) {
    counties = counties.slice(0, 3);
    log(`TEST MODE: Processing only first 3 counties`);
  }

  log(`Counties to process: ${counties.length}`);
  const estimatedMinutes = Math.ceil(counties.length * 30 / 60);
  const estimatedCost = (counties.length * 0.15).toFixed(2);
  log(`Estimated: ~${estimatedMinutes} minutes, ~$${estimatedCost} API cost`);
  log("");

  // Process counties
  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < counties.length; i++) {
    const county = counties[i];
    log(`\n[${ i + 1}/${counties.length}] ─────────────────────────────────────`);

    try {
      const result = await processCounty(county);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (err) {
      log(`  FATAL ERROR for ${county.name}: ${err.message}`);
      results.push({
        fips: county.fips,
        name: county.name,
        success: false,
        error: err.message,
      });
      failCount++;

      // Stop on auth errors
      if (err.message.includes("Auth error")) {
        log("FATAL: Authentication failed. Stopping.");
        break;
      }
    }

    // Rate limit between counties
    if (i < counties.length - 1) {
      log(`  Waiting ${RATE_LIMIT_DELAY_MS / 1000}s before next county...`);
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  // ─── Summary ────────────────────────────────────────────────────────────────

  log("\n\n=== SUMMARY ===");
  log(`Processed: ${results.length} counties`);
  log(`Success: ${successCount}`);
  log(`Failed: ${failCount}`);

  if (successCount > 0) {
    log("\nSuccessful counties:");
    for (const r of results.filter((r) => r.success)) {
      log(`  ${r.fips} ${r.name}: ${r.zipCount} ZIPs, confidence=${r.confidence}, precincts=${JSON.stringify(r.zipsByPrecinct)}`);
    }
  }

  if (failCount > 0) {
    log("\nFailed counties:");
    for (const r of results.filter((r) => !r.success)) {
      log(`  ${r.fips} ${r.name}: ${r.error}`);
    }
  }

  // Save results file
  const output = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    totalCounties: results.length,
    successful: successCount,
    failed: failCount,
    results: results,
  };
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(output, null, 2));
  log(`\nResults written to: ${RESULTS_FILE}`);

  // Save log
  saveLog();
  log(`Log written to: ${LOG_FILE}`);
}

main().catch((err) => {
  log(`\nFATAL: ${err.message}`);
  saveLog();
  process.exit(1);
});
