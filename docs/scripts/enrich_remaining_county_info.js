#!/usr/bin/env node
//
// enrich_remaining_county_info.js — Enrich county_info for ~120 remaining TX counties
//
// Reads existing county_info from KV, identifies counties with template/generic data,
// and uses Claude + web_search to research real election info for each.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... node docs/scripts/enrich_remaining_county_info.js
//
// Options:
//   --dry-run         Print what would be written, don't touch KV
//   --county=48001    Enrich only one county (by FIPS)
//   --check-only      Just list which counties need enrichment, don't enrich
//   --skip-check      Skip KV reads, process all counties not in progress file (fast)
//   --force           Re-enrich even counties that appear already enriched
//   --reset           Delete progress file and start fresh
//   --batch=N         Process at most N counties per run (default: all)
//   --reverse         Process counties in reverse order
//
// Progress is saved to /tmp/enrich_county_info_progress.json after every step.
// Re-running the script will skip already-completed steps.

const fs = require("fs");
const { execFileSync } = require("child_process");
const path = require("path");

// ─── Configuration ───────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("ERROR: Set ANTHROPIC_API_KEY environment variable");
  process.exit(1);
}

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;
const RATE_LIMIT_DELAY_MS = 2000;
const MAX_RETRIES = 3;
const KV_NAMESPACE_ID = "1b02b19492f243c8b503d99d0ff11761";

// Wrangler project directory
const WORKER_DIR = path.join(
  process.env.HOME,
  "Library/Mobile Documents/com~apple~CloudDocs/Xcode/ATXVotes/worker"
);
const PROGRESS_FILE = "/tmp/enrich_county_info_progress.json";
const LOG_FILE = "/tmp/enrich_county_info_log.json";

// All 254 Texas county FIPS codes and names (from index.js TX_COUNTY_NAMES)
const TX_COUNTY_NAMES = {
  "48001":"Anderson","48003":"Andrews","48005":"Angelina","48007":"Aransas","48009":"Archer",
  "48011":"Armstrong","48013":"Atascosa","48015":"Austin","48017":"Bailey","48019":"Bandera",
  "48021":"Bastrop","48023":"Baylor","48025":"Bee","48027":"Bell","48029":"Bexar",
  "48031":"Blanco","48033":"Borden","48035":"Bosque","48037":"Bowie","48039":"Brazoria",
  "48041":"Brazos","48043":"Brewster","48045":"Briscoe","48047":"Brooks","48049":"Brown",
  "48051":"Burleson","48053":"Burnet","48055":"Caldwell","48057":"Calhoun","48059":"Callahan",
  "48061":"Cameron","48063":"Camp","48065":"Carson","48067":"Cass","48069":"Castro",
  "48071":"Chambers","48073":"Cherokee","48075":"Childress","48077":"Clay","48079":"Cochran",
  "48081":"Coke","48083":"Coleman","48085":"Collin","48087":"Collingsworth","48089":"Colorado",
  "48091":"Comal","48093":"Comanche","48095":"Concho","48097":"Cooke","48099":"Coryell",
  "48101":"Cottle","48103":"Crane","48105":"Crockett","48107":"Crosby","48109":"Culberson",
  "48111":"Dallam","48113":"Dallas","48115":"Dawson","48117":"Deaf Smith","48119":"Delta",
  "48121":"Denton","48123":"DeWitt","48125":"Dickens","48127":"Dimmit","48129":"Donley",
  "48131":"Duval","48133":"Eastland","48135":"Ector","48137":"Edwards","48139":"Ellis",
  "48141":"El Paso","48143":"Erath","48145":"Falls","48147":"Fannin","48149":"Fayette",
  "48151":"Fisher","48153":"Floyd","48155":"Foard","48157":"Fort Bend","48159":"Franklin",
  "48161":"Freestone","48163":"Frio","48165":"Gaines","48167":"Galveston","48169":"Garza",
  "48171":"Gillespie","48173":"Glasscock","48175":"Goliad","48177":"Gonzales","48179":"Gray",
  "48181":"Grayson","48183":"Gregg","48185":"Grimes","48187":"Guadalupe","48189":"Hale",
  "48191":"Hall","48193":"Hamilton","48195":"Hansford","48197":"Hardeman","48199":"Hardin",
  "48201":"Harris","48203":"Harrison","48205":"Hartley","48207":"Haskell","48209":"Hays",
  "48211":"Hemphill","48213":"Henderson","48215":"Hidalgo","48217":"Hill","48219":"Hockley",
  "48221":"Hood","48223":"Hopkins","48225":"Houston","48227":"Howard","48229":"Hudspeth",
  "48231":"Hunt","48233":"Hutchinson","48235":"Irion","48237":"Jack","48239":"Jackson",
  "48241":"Jasper","48243":"Jeff Davis","48245":"Jefferson","48247":"Jim Hogg","48249":"Jim Wells",
  "48251":"Johnson","48253":"Jones","48255":"Karnes","48257":"Kaufman","48259":"Kendall",
  "48261":"Kenedy","48263":"Kent","48265":"Kerr","48267":"Kimble","48269":"King",
  "48271":"Kinney","48273":"Kleberg","48275":"Knox","48277":"Lamar","48279":"Lamb",
  "48281":"Lampasas","48283":"La Salle","48285":"Lavaca","48287":"Lee","48289":"Leon",
  "48291":"Liberty","48293":"Limestone","48295":"Lipscomb","48297":"Live Oak","48299":"Llano",
  "48301":"Loving","48303":"Lubbock","48305":"Lynn","48307":"McCulloch","48309":"McLennan",
  "48311":"McMullen","48313":"Madison","48315":"Marion","48317":"Martin","48319":"Mason",
  "48321":"Matagorda","48323":"Maverick","48325":"Medina","48327":"Menard","48329":"Midland",
  "48331":"Milam","48333":"Mills","48335":"Mitchell","48337":"Montague","48339":"Montgomery",
  "48341":"Moore","48343":"Morris","48345":"Motley","48347":"Nacogdoches","48349":"Navarro",
  "48351":"Newton","48353":"Nolan","48355":"Nueces","48357":"Ochiltree","48359":"Oldham",
  "48361":"Orange","48363":"Palo Pinto","48365":"Panola","48367":"Parker","48369":"Parmer",
  "48371":"Pecos","48373":"Polk","48375":"Presidio","48377":"Rains","48379":"Randall",
  "48381":"Reagan","48383":"Real","48385":"Red River","48387":"Reeves","48389":"Refugio",
  "48391":"Roberts","48393":"Robertson","48395":"Rockwall","48397":"Runnels","48399":"Rusk",
  "48401":"Sabine","48403":"San Augustine","48405":"San Jacinto","48407":"San Patricio","48409":"San Saba",
  "48411":"Schleicher","48413":"Scurry","48415":"Shackelford","48417":"Shelby","48419":"Sherman",
  "48421":"Smith","48423":"Somervell","48425":"Starr","48427":"Stephens","48429":"Sterling",
  "48431":"Stonewall","48433":"Sutton","48435":"Swisher","48437":"Tarrant","48439":"Taylor",
  "48441":"Terrell","48443":"Terry","48445":"Throckmorton","48447":"Titus","48449":"Tom Green",
  "48451":"Travis","48453":"Trinity","48455":"Tyler","48457":"Upshur","48459":"Upton",
  "48461":"Uvalde","48463":"Val Verde","48465":"Van Zandt","48467":"Victoria","48469":"Walker",
  "48471":"Waller","48473":"Ward","48475":"Washington","48477":"Webb","48479":"Wharton",
  "48481":"Wheeler","48483":"Wichita","48485":"Wilbarger","48487":"Willacy","48489":"Williamson",
  "48491":"Wilson","48493":"Winkler","48495":"Wise","48497":"Wood","48499":"Yoakum",
  "48501":"Young","48503":"Zapata","48505":"Zavala","48507":"Zablocki"
};

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const CHECK_ONLY = args.includes("--check-only");
const FORCE = args.includes("--force");
const RESET = args.includes("--reset");
const REVERSE = args.includes("--reverse");

const countyArg = args.find((a) => a.startsWith("--county="));
const FILTER_COUNTY = countyArg ? countyArg.split("=")[1] : null;

const SKIP_CHECK = args.includes("--skip-check");

const batchArg = args.find((a) => a.startsWith("--batch="));
const BATCH_LIMIT = batchArg ? parseInt(batchArg.split("=")[1], 10) : Infinity;

// ─── Template Detection ──────────────────────────────────────────────────────

// These patterns indicate template/generic data that needs enrichment.
// Enriched counties have real county-specific URLs and phone numbers.
const TEMPLATE_INDICATORS = [
  // Generic state-level URLs used as placeholders
  "votertexas.gov/voting-in-texas",
  "teamrv-mvp.sos.texas.gov",
  // No real elections website (null or empty)
  null,
  "",
];

// Known template early voting text
const TEMPLATE_EARLY_VOTING_NOTE = "Hours vary by county";

/**
 * Determines if a county_info entry is template/generic data.
 * Returns true if the county needs enrichment.
 */
function needsEnrichment(info) {
  if (!info) return true;

  // If electionsWebsite is a template/generic URL or missing, needs enrichment
  const website = info.electionsWebsite;
  if (!website || website === "null") return true;

  // Check for generic state-level URLs used as templates
  for (const indicator of TEMPLATE_INDICATORS) {
    if (indicator && website.includes(indicator)) return true;
  }

  // If the website is just the TX SOS county election page (generic reference), needs enrichment
  if (website.includes("sos.state.tx.us/elections") && !website.includes(info.countyName?.toLowerCase())) {
    return true;
  }

  // If phone is missing or clearly template
  if (!info.electionsPhone || info.electionsPhone === "null" || info.electionsPhone === "(512) 463-5650") {
    // TX SOS main number used as template
    return true;
  }

  // If early voting data looks like template (single generic period)
  if (info.earlyVoting && info.earlyVoting.note === TEMPLATE_EARLY_VOTING_NOTE) {
    return true;
  }

  return false;
}

// ─── Progress Tracking ───────────────────────────────────────────────────────

function resetProgress() {
  try {
    fs.unlinkSync(PROGRESS_FILE);
    console.log(`Deleted progress file: ${PROGRESS_FILE}`);
  } catch {
    console.log(`No progress file to delete.`);
  }
}

function loadProgress() {
  try {
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
    // Clear stale errors
    const staleErrorCount = (data.errors || []).length;
    if (staleErrorCount > 0) {
      console.log(`Clearing ${staleErrorCount} stale error(s) from previous run(s)`);
      data.errors = [];
    }
    return data;
  } catch {
    return { completed: {}, errors: [], startedAt: new Date().toISOString() };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function isCompleted(progress, stepKey) {
  return progress.completed[stepKey] === true;
}

function markCompleted(progress, stepKey, meta = {}) {
  progress.completed[stepKey] = true;
  progress.lastCompleted = { step: stepKey, at: new Date().toISOString(), ...meta };
  saveProgress(progress);
}

function classifyError(error) {
  const msg = error.message || String(error);
  if (msg.includes("401") || msg.includes("403")) return "AUTH";
  if (msg.includes("429")) return "RATE_LIMIT";
  if (msg.includes("529")) return "OVERLOADED";
  if (msg.includes("500") || msg.includes("502") || msg.includes("503")) return "SERVER";
  if (msg.includes("fetch") || msg.includes("ECONN") || msg.includes("ETIMEDOUT")) return "NETWORK";
  return "OTHER";
}

function markError(progress, stepKey, error) {
  const category = classifyError(error);
  const entry = {
    step: stepKey,
    error: error.message || String(error),
    category,
    at: new Date().toISOString(),
  };
  progress.errors.push(entry);
  if (!progress.currentRunErrors) progress.currentRunErrors = [];
  progress.currentRunErrors.push(entry);
  saveProgress(progress);
}

// ─── KV Operations ──────────────────────────────────────────────────────────

function readFromKV(key) {
  try {
    const result = execFileSync(
      "npx",
      ["wrangler", "kv", "key", "get", `--namespace-id=${KV_NAMESPACE_ID}`, "--remote", key],
      { cwd: WORKER_DIR, stdio: "pipe", timeout: 30000, encoding: "utf8" }
    );
    return JSON.parse(result.trim());
  } catch {
    return null;
  }
}

function writeToKV(key, value) {
  if (DRY_RUN) {
    const preview = JSON.stringify(value).slice(0, 200);
    console.log(`  [DRY RUN] Would write KV key: ${key}`);
    console.log(`  [DRY RUN] Value preview: ${preview}...`);
    return;
  }

  const tmpFile = `/tmp/kv_value_${Date.now()}.json`;
  fs.writeFileSync(tmpFile, JSON.stringify(value));

  try {
    execFileSync(
      "npx",
      ["wrangler", "kv", "key", "put", `--namespace-id=${KV_NAMESPACE_ID}`, "--remote", key, "--path", tmpFile],
      { cwd: WORKER_DIR, stdio: "pipe", timeout: 30000 }
    );
    console.log(`  Wrote KV: ${key}`);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

// ─── Anthropic API ───────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callClaudeWithSearch(prompt, maxUses = 5) {
  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system:
      "You are a nonpartisan election data researcher for Texas. " +
      "Use web_search to find verified, factual information about county elections offices. " +
      "Return ONLY valid JSON. Never fabricate information — if you cannot verify something, use null.\n\n" +
      "SOURCE PRIORITY:\n" +
      "1. County government websites ({county}.tx.us, {county}county.org, etc.)\n" +
      "2. Texas Secretary of State county directory (sos.state.tx.us/elections/voter/county.shtml)\n" +
      "3. County clerk office pages\n" +
      "4. VoterTexas.gov\n" +
      "5. Ballotpedia\n" +
      "AVOID: blogs, social media, outdated sources",
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxUses }],
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
      const wait = (attempt + 1) * 10000;
      console.log(`  Rate limited (429), waiting ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }

    if (response.status === 529) {
      const wait = (attempt + 1) * 5000;
      console.log(`  Overloaded (529), waiting ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      const status = response.status;
      if (status === 401 || status === 403) {
        throw new Error(`Claude API auth error (${status}): check ANTHROPIC_API_KEY — ${text.slice(0, 200)}`);
      }
      throw new Error(`Claude API returned ${status}: ${text.slice(0, 200)}`);
    }

    const result = await response.json();
    const textBlocks = (result.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text);
    if (textBlocks.length === 0) return null;

    const fullText = textBlocks.join("\n");
    let cleaned = fullText.trim();

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
      return JSON.parse(cleaned);
    } catch {
      throw new Error(`Failed to parse response as JSON: ${cleaned.slice(0, 100)}...`);
    }
  }

  throw new Error("Claude API returned 429/529 after all retries");
}

// ─── County Info Prompt ──────────────────────────────────────────────────────

function buildCountyInfoPrompt(countyFips, countyName) {
  return `Research the elections office information for ${countyName} County, Texas.

I need VERIFIED contact information for the county elections administrator or county clerk who handles elections.

Search for:
1. The official ${countyName} County elections website URL (the actual county government page, NOT the TX Secretary of State page)
2. The county elections office phone number
3. Does the county use Vote Centers (voters can vote at any location) or precinct-based voting (must vote at assigned location)?
4. Early voting dates and hours for the March 3, 2026 Texas Primary Election (early voting is Feb 17-27, 2026)
5. Election Day hours (typically 7:00 AM - 7:00 PM statewide)
6. Where voters can find their polling locations

Also check the Texas Secretary of State county election official directory at:
https://www.sos.state.tx.us/elections/voter/county.shtml

Return ONLY this JSON:
{
  "countyFips": "${countyFips}",
  "countyName": "${countyName}",
  "voteCenters": true or false,
  "electionsWebsite": "URL of the county's own elections page (NOT sos.state.tx.us)",
  "electionsPhone": "phone number of the county elections office",
  "earlyVoting": {
    "periods": [
      { "dates": "Feb 17-21", "hours": "8:00 AM - 5:00 PM" },
      { "dates": "Feb 22", "hours": "7:00 AM - 7:00 PM" }
    ],
    "note": "optional note about early voting"
  },
  "electionDay": {
    "hours": "7:00 AM - 7:00 PM",
    "locationUrl": "URL where voters can find their polling location"
  },
  "phoneInBooth": null,
  "resources": [
    { "name": "${countyName} County Elections", "url": "county elections URL" },
    { "name": "Texas Secretary of State", "url": "https://www.sos.state.tx.us/elections/voter/county.shtml" }
  ]
}

IMPORTANT RULES:
- Return ONLY valid JSON
- The electionsWebsite MUST be the county's own website, not sos.state.tx.us or votertexas.gov
- If the county is very small and has no dedicated elections website, use the county clerk's page
- Use null for any field you cannot verify from official sources
- Many small Texas counties handle elections through the County Clerk's office
- Phone numbers should be in format (XXX) XXX-XXXX
- For vote centers: most small rural Texas counties use precinct-based voting, not vote centers`;
}

// ─── Enrichment Logic ────────────────────────────────────────────────────────

async function enrichCountyInfo(fips, countyName, progress) {
  const stepKey = `enrich:${fips}`;
  if (isCompleted(progress, stepKey)) {
    console.log(`  [SKIP] ${countyName} County (${fips}) already enriched`);
    return;
  }

  console.log(`  Researching ${countyName} County (${fips})...`);
  try {
    const result = await callClaudeWithSearch(
      buildCountyInfoPrompt(fips, countyName),
      5 // 5 web searches should be enough for county info
    );
    if (!result) {
      throw new Error("No response from Claude");
    }

    // Ensure countyFips and countyName are set correctly
    result.countyFips = fips;
    result.countyName = countyName;

    // Validate: the result should have a real elections website
    if (result.electionsWebsite &&
        !result.electionsWebsite.includes("sos.state.tx.us") &&
        !result.electionsWebsite.includes("votertexas.gov")) {
      console.log(`  Found: ${result.electionsWebsite}`);
      if (result.electionsPhone) console.log(`  Phone: ${result.electionsPhone}`);
      if (result.voteCenters !== null) console.log(`  Vote centers: ${result.voteCenters}`);
    } else {
      console.log(`  WARNING: Could not find county-specific website for ${countyName}`);
      console.log(`  Got: ${result.electionsWebsite || "(null)"}`);
      // Still write the result — it may have phone/vote center info even without a county URL
    }

    const key = `county_info:${fips}`;
    writeToKV(key, result);
    markCompleted(progress, stepKey, { county: countyName, website: result.electionsWebsite });
    console.log(`  ${countyName} County: done`);
  } catch (err) {
    const category = classifyError(err);
    console.error(`  ERROR [${category}] ${countyName} County: ${err.message}`);
    markError(progress, stepKey, err);
    if (category === "AUTH") throw err;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Texas County Info Enrichment ===");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : CHECK_ONLY ? "CHECK ONLY" : "LIVE"}`);
  console.log(`Worker dir: ${WORKER_DIR}`);
  console.log("");

  // Handle --reset flag
  if (RESET) {
    resetProgress();
  }

  const progress = loadProgress();
  progress.currentRunErrors = [];

  const allFips = Object.keys(TX_COUNTY_NAMES).sort();
  const countiesToEnrich = [];
  const alreadyEnriched = [];
  const noData = [];

  if (SKIP_CHECK) {
    // Fast mode: skip KV reads, just process all counties not in progress file
    console.log("Skipping KV check (--skip-check). Using progress file only.");
    console.log("");

    for (const fips of allFips) {
      const countyName = TX_COUNTY_NAMES[fips];
      if (FILTER_COUNTY && fips !== FILTER_COUNTY) continue;

      if (!FORCE && isCompleted(progress, `enrich:${fips}`)) {
        alreadyEnriched.push({ fips, name: countyName, reason: "completed in previous run" });
      } else {
        countiesToEnrich.push({ fips, name: countyName, reason: "not in progress file" });
      }
    }
  } else {
    // Full check: read each county_info from KV to detect template data
    console.log("Reading existing county_info from KV to identify template data...");
    console.log("(This reads each county individually — may take 5-8 minutes for all 254)");
    console.log("Tip: use --skip-check on subsequent runs to skip this and use progress file only.");
    console.log("");

    let checked = 0;
    for (const fips of allFips) {
      const countyName = TX_COUNTY_NAMES[fips];

      // Filter to single county if specified
      if (FILTER_COUNTY && fips !== FILTER_COUNTY) continue;

      checked++;
      if (checked % 25 === 0) {
        process.stdout.write(`  Checked ${checked} counties...\r`);
      }

      // Check if already completed in progress file (from previous run)
      if (!FORCE && isCompleted(progress, `enrich:${fips}`)) {
        alreadyEnriched.push({ fips, name: countyName, reason: "completed in previous run" });
        continue;
      }

      // Read existing data from KV
      const existing = readFromKV(`county_info:${fips}`);

      if (!existing) {
        noData.push({ fips, name: countyName });
        countiesToEnrich.push({ fips, name: countyName, reason: "no data" });
      } else if (FORCE || needsEnrichment(existing)) {
        countiesToEnrich.push({
          fips,
          name: countyName,
          reason: FORCE ? "forced" : "template data",
          currentWebsite: existing.electionsWebsite,
          currentPhone: existing.electionsPhone,
        });
      } else {
        alreadyEnriched.push({
          fips,
          name: countyName,
          reason: "already enriched",
          website: existing.electionsWebsite,
        });
      }
    }
    console.log("");
  }

  console.log(`\n=== Assessment ===`);
  console.log(`Total counties checked: ${alreadyEnriched.length + countiesToEnrich.length}`);
  console.log(`Already enriched: ${alreadyEnriched.length}`);
  console.log(`Need enrichment: ${countiesToEnrich.length}`);
  if (noData.length > 0) {
    console.log(`No data at all: ${noData.length}`);
  }
  console.log("");

  if (countiesToEnrich.length === 0) {
    console.log("All counties are already enriched! Nothing to do.");
    return;
  }

  // Show which counties need enrichment
  console.log("Counties needing enrichment:");
  for (const c of countiesToEnrich.slice(0, 30)) {
    const extra = c.currentWebsite ? ` (current: ${c.currentWebsite})` : "";
    console.log(`  ${c.fips} ${c.name} — ${c.reason}${extra}`);
  }
  if (countiesToEnrich.length > 30) {
    console.log(`  ... and ${countiesToEnrich.length - 30} more`);
  }
  console.log("");

  if (CHECK_ONLY) {
    console.log("=== CHECK ONLY MODE — not enriching ===");

    // Show detailed breakdown
    if (alreadyEnriched.length > 0) {
      console.log(`\nAlready enriched (${alreadyEnriched.length}):`);
      for (const c of alreadyEnriched.slice(0, 20)) {
        console.log(`  ${c.fips} ${c.name} — ${c.website || c.reason}`);
      }
      if (alreadyEnriched.length > 20) {
        console.log(`  ... and ${alreadyEnriched.length - 20} more`);
      }
    }
    return;
  }

  // Apply batch limit
  let counties = countiesToEnrich;
  if (REVERSE) {
    counties = [...counties].reverse();
    console.log("Running in REVERSE order");
  }
  if (BATCH_LIMIT < counties.length) {
    counties = counties.slice(0, BATCH_LIMIT);
    console.log(`Batch limited to ${BATCH_LIMIT} counties`);
  }

  // Estimate time and cost
  const estimatedMinutes = Math.ceil(counties.length * (RATE_LIMIT_DELAY_MS + 12000) / 60000);
  const estimatedCost = (counties.length * 0.08).toFixed(2);
  console.log(`Estimated: ~${estimatedMinutes} minutes, ~$${estimatedCost} API cost`);
  console.log(`KV writes: ${counties.length} (well within 1M/month limit)`);
  console.log("");

  // Step 2: Enrich each county
  let processed = 0;
  for (const county of counties) {
    processed++;
    console.log(`\n[${processed}/${counties.length}] ${county.name} County (${county.fips})`);

    await enrichCountyInfo(county.fips, county.name, progress);
    await sleep(RATE_LIMIT_DELAY_MS);
  }

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log("\n\n=== ENRICHMENT COMPLETE ===");
  const completedCount = Object.keys(progress.completed).filter(k => k.startsWith("enrich:")).length;
  const runErrors = progress.currentRunErrors || [];
  const runErrorCount = runErrors.length;
  console.log(`Completed (all runs): ${completedCount}`);
  console.log(`Processed this run: ${processed}`);
  console.log(`Errors this run: ${runErrorCount}`);

  if (runErrorCount > 0) {
    const byCategory = {};
    for (const err of runErrors) {
      const cat = err.category || "OTHER";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(err);
    }

    console.log("\nError summary:");
    for (const [category, errs] of Object.entries(byCategory)) {
      const labels = {
        AUTH: "Auth error — check ANTHROPIC_API_KEY",
        RATE_LIMIT: "Rate limited — wait and retry",
        OVERLOADED: "API overloaded — wait and retry",
        SERVER: "Server error — transient, retry later",
        NETWORK: "Network error — check connectivity",
        OTHER: "Other error",
      };
      console.log(`\n  ${labels[category] || category} (${errs.length}):`);
      for (const err of errs.slice(0, 10)) {
        console.log(`    ${err.step}: ${err.error.slice(0, 120)}`);
      }
      if (errs.length > 10) {
        console.log(`    ... and ${errs.length - 10} more`);
      }
    }
  }

  // Write log
  const log = {
    finishedAt: new Date().toISOString(),
    completedSteps: completedCount,
    processed,
    errors: runErrorCount,
    dryRun: DRY_RUN,
    errorDetails: runErrors,
  };
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  console.log(`\nLog: ${LOG_FILE}`);
  console.log(`Progress: ${PROGRESS_FILE}`);

  if (runErrorCount > 0) {
    console.log(`\nTo retry failed counties, just re-run the script.`);
  }
}

main().catch((err) => {
  const category = classifyError(err);
  if (category === "AUTH") {
    console.error(`\nFATAL: Authentication failed — your ANTHROPIC_API_KEY is invalid or expired.`);
    console.error(`Update the key and re-run. Previously completed steps are preserved.`);
  } else {
    console.error("Fatal error:", err);
  }
  process.exit(1);
});
