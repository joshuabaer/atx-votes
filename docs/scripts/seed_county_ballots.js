#!/usr/bin/env node
//
// seed_county_ballots.js — Populate county-level ballot data for top 30 TX counties
//
// Calls the Anthropic API with web_search tool to research local races for each
// county/party combo, then writes results to Cloudflare KV via wrangler CLI.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_county_ballots.js
//
// Options:
//   --dry-run       Print what would be written, don't touch KV
//   --county=48201  Seed only one county (by FIPS)
//   --party=democrat Seed only one party (republican|democrat)
//   --skip-info     Skip county info seeding (only do ballots + precinct maps)
//   --only-info     Only seed county info (skip ballots + precinct maps)
//   --only-ballots  Only seed ballots (skip info + precinct maps)
//   --only-precincts Only seed precinct maps
//   --resume        Resume from progress file (default: true)
//
// Requires: Node 18+, wrangler CLI available in PATH
//
// Progress is saved to /tmp/seed_county_progress.json after every successful step.
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
const MAX_TOKENS = 8192;
const RATE_LIMIT_DELAY_MS = 3000;
const MAX_RETRIES = 3;

// Wrangler project directory (where wrangler.toml lives)
const WORKER_DIR = path.join(
  process.env.HOME,
  "Library/Mobile Documents/com~apple~CloudDocs/Xcode/ATXVotes/worker"
);
const PROGRESS_FILE = "/tmp/seed_county_progress.json";
const LOG_FILE = "/tmp/seed_county_log.json";

// Top 30 Texas counties by population
const TOP_COUNTIES = [
  { fips: "48201", name: "Harris" },
  { fips: "48113", name: "Dallas" },
  { fips: "48439", name: "Tarrant" },
  { fips: "48029", name: "Bexar" },
  { fips: "48453", name: "Travis" },
  { fips: "48085", name: "Collin" },
  { fips: "48121", name: "Denton" },
  { fips: "48215", name: "Hidalgo" },
  { fips: "48157", name: "Fort Bend" },
  { fips: "48491", name: "Williamson" },
  { fips: "48339", name: "Montgomery" },
  { fips: "48141", name: "El Paso" },
  { fips: "48303", name: "Nueces" },
  { fips: "48167", name: "Galveston" },
  { fips: "48039", name: "Brazoria" },
  { fips: "48257", name: "Kaufman" },
  { fips: "48251", name: "Johnson" },
  { fips: "48355", name: "Parker" },
  { fips: "48367", name: "Lubbock" },
  { fips: "48061", name: "Cameron" },
  { fips: "48309", name: "McLennan" },
  { fips: "48027", name: "Bell" },
  { fips: "48183", name: "Gregg" },
  { fips: "48381", name: "Randall" },
  { fips: "48375", name: "Potter" },
  { fips: "48423", name: "Smith" },
  { fips: "48469", name: "Victoria" },
  { fips: "48245", name: "Jefferson" },
  { fips: "48329", name: "Midland" },
  { fips: "48135", name: "Ector" },
];

const PARTIES = ["republican", "democrat"];

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SKIP_INFO = args.includes("--skip-info");
const ONLY_INFO = args.includes("--only-info");
const ONLY_BALLOTS = args.includes("--only-ballots");
const ONLY_PRECINCTS = args.includes("--only-precincts");

const countyArg = args.find((a) => a.startsWith("--county="));
const FILTER_COUNTY = countyArg ? countyArg.split("=")[1] : null;

const partyArg = args.find((a) => a.startsWith("--party="));
const FILTER_PARTY = partyArg ? partyArg.split("=")[1] : null;

// ─── Progress Tracking ───────────────────────────────────────────────────────

function loadProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
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

function markError(progress, stepKey, error) {
  progress.errors.push({
    step: stepKey,
    error: error.message || String(error),
    at: new Date().toISOString(),
  });
  saveProgress(progress);
}

// ─── Anthropic API ───────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callClaudeWithSearch(prompt, maxUses = 10) {
  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system:
      "You are a nonpartisan election data researcher for Texas. " +
      "Use web_search to find verified, factual information about elections. " +
      "Return ONLY valid JSON. Never fabricate information — if you cannot verify something, use null.",
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
      throw new Error(`Claude API returned ${response.status}: ${text.slice(0, 200)}`);
    }

    const result = await response.json();
    const textBlocks = (result.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text);
    if (textBlocks.length === 0) return null;

    const fullText = textBlocks.join("\n");
    let cleaned = fullText.trim();

    // Extract JSON from response
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

// ─── KV Write via Wrangler ───────────────────────────────────────────────────

function writeToKV(key, value) {
  if (DRY_RUN) {
    const preview = JSON.stringify(value).slice(0, 200);
    console.log(`  [DRY RUN] Would write KV key: ${key}`);
    console.log(`  [DRY RUN] Value preview: ${preview}...`);
    return;
  }

  // Write value to a temp file, then use wrangler kv key put with --path
  const tmpFile = `/tmp/kv_value_${Date.now()}.json`;
  fs.writeFileSync(tmpFile, JSON.stringify(value));

  try {
    execFileSync(
      "npx",
      ["wrangler", "kv", "key", "put", "--namespace-id=1b02b19492f243c8b503d99d0ff11761", "--remote", key, "--path", tmpFile],
      { cwd: WORKER_DIR, stdio: "pipe", timeout: 30000 }
    );
    console.log(`  Wrote KV: ${key}`);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

// ─── Prompts (mirrored from county-seeder.js) ───────────────────────────────

function buildCountyInfoPrompt(countyFips, countyName) {
  return `Research the voting information for ${countyName} County, Texas for the March 3, 2026 Texas Primary Election.

Find:
1. Does the county use Vote Centers (any location) or precinct-based voting?
2. The county elections website URL
3. The county elections office phone number
4. Early voting dates and hours (early voting is Feb 17-27, 2026)
5. Election Day hours (typically 7 AM - 7 PM)
6. Election Day polling location finder URL
7. Can voters use phones in the voting booth?
8. Key local resources (election office website, local voter guide links)

Return ONLY this JSON:
{
  "countyFips": "${countyFips}",
  "countyName": "${countyName}",
  "voteCenters": true or false,
  "electionsWebsite": "URL",
  "electionsPhone": "phone number",
  "earlyVoting": {
    "periods": [
      { "dates": "Feb 17-21", "hours": "7:00 AM - 7:00 PM" }
    ],
    "note": "optional note"
  },
  "electionDay": {
    "hours": "7:00 AM - 7:00 PM",
    "locationUrl": "URL to find locations"
  },
  "phoneInBooth": true or false or null if unknown,
  "resources": [
    { "name": "Display Name", "url": "URL" }
  ]
}

IMPORTANT: Return ONLY valid JSON. Use null for any field you cannot verify.`;
}

function buildCountyBallotPrompt(countyFips, countyName, party) {
  const partyLabel = party.charAt(0).toUpperCase() + party.slice(1);
  return `Research ALL local ${partyLabel} primary races for ${countyName} County, Texas in the March 3, 2026 Texas Primary Election.

Search the Texas Secretary of State candidate filings and local news sources.

Include ONLY county-level races such as:
- County Judge
- County Commissioner (by precinct)
- County Clerk
- District Clerk
- County Treasurer
- Justice of the Peace (by precinct)
- Constable (by precinct)
- County Sheriff
- District Attorney
- County Attorney
- Tax Assessor-Collector
- Any other county-level offices on the ${partyLabel} primary ballot

For each race, provide:
- Office name
- District/precinct if applicable
- Whether it's contested (2+ candidates)
- Each candidate's name, background, key positions, endorsements, pros, cons

Return ONLY this JSON:
{
  "id": "${countyFips}_${party}_primary_2026",
  "party": "${party}",
  "electionDate": "2026-03-03",
  "electionName": "2026 ${partyLabel} Primary - ${countyName} County",
  "countyName": "${countyName}",
  "races": [
    {
      "id": "unique-id",
      "office": "County Commissioner",
      "district": "Precinct 1",
      "isContested": true,
      "isKeyRace": false,
      "candidates": [
        {
          "id": "cand-id",
          "name": "Full Name",
          "isIncumbent": false,
          "summary": "1-2 sentence summary",
          "background": "Brief background",
          "keyPositions": ["Position 1", "Position 2"],
          "endorsements": ["Endorsement 1"],
          "pros": ["Strength 1"],
          "cons": ["Concern 1"]
        }
      ]
    }
  ],
  "propositions": []
}

IMPORTANT:
- Return ONLY valid JSON
- Only include races that are actually on the ${partyLabel} primary ballot
- Use exact candidate names from official filings
- If you cannot find any local races for this county/party, return {"races": [], "propositions": []}`;
}

function buildPrecinctMapPrompt(countyFips, countyName) {
  return `Research the County Commissioner precinct boundaries for ${countyName} County, Texas.

I need a mapping of ZIP codes to County Commissioner precinct numbers.

Search for ${countyName} County Commissioner precinct maps, GIS data, or official boundary descriptions.

Return ONLY this JSON:
{
  "ZIP_CODE": "PRECINCT_NUMBER",
  ...
}

For example: {"78701": "2", "78702": "1"}

IMPORTANT:
- Return ONLY valid JSON
- Only include ZIP codes that are primarily within ${countyName} County
- If you cannot determine the mapping reliably, return {}`;
}

// ─── Seeding Steps ───────────────────────────────────────────────────────────

async function seedCountyInfo(county, progress) {
  const stepKey = `info:${county.fips}`;
  if (isCompleted(progress, stepKey)) {
    console.log(`  [SKIP] County info for ${county.name} already done`);
    return;
  }

  console.log(`  Researching county info for ${county.name}...`);
  try {
    const result = await callClaudeWithSearch(
      buildCountyInfoPrompt(county.fips, county.name)
    );
    if (!result) {
      throw new Error("No response from Claude");
    }

    const key = `county_info:${county.fips}`;
    writeToKV(key, result);
    markCompleted(progress, stepKey, { county: county.name });
    console.log(`  County info for ${county.name}: done`);
  } catch (err) {
    console.error(`  ERROR county info ${county.name}: ${err.message}`);
    markError(progress, stepKey, err);
  }
}

async function seedCountyBallot(county, party, progress) {
  const stepKey = `ballot:${county.fips}:${party}`;
  if (isCompleted(progress, stepKey)) {
    console.log(`  [SKIP] ${party} ballot for ${county.name} already done`);
    return;
  }

  console.log(`  Researching ${party} ballot for ${county.name}...`);
  try {
    const result = await callClaudeWithSearch(
      buildCountyBallotPrompt(county.fips, county.name, party)
    );
    if (!result) {
      throw new Error("No response from Claude");
    }

    // Ensure countyName is set
    if (!result.countyName) result.countyName = county.name;

    const key = `ballot:county:${county.fips}:${party}_primary_2026`;
    writeToKV(key, result);

    const raceCount = (result.races || []).length;
    const candCount = (result.races || []).reduce(
      (s, r) => s + (r.candidates || []).length, 0
    );
    markCompleted(progress, stepKey, {
      county: county.name,
      party,
      races: raceCount,
      candidates: candCount,
    });
    console.log(`  ${party} ballot for ${county.name}: ${raceCount} races, ${candCount} candidates`);
  } catch (err) {
    console.error(`  ERROR ${party} ballot ${county.name}: ${err.message}`);
    markError(progress, stepKey, err);
  }
}

async function seedPrecinctMap(county, progress) {
  const stepKey = `precinct:${county.fips}`;
  if (isCompleted(progress, stepKey)) {
    console.log(`  [SKIP] Precinct map for ${county.name} already done`);
    return;
  }

  console.log(`  Researching precinct map for ${county.name}...`);
  try {
    const result = await callClaudeWithSearch(
      buildPrecinctMapPrompt(county.fips, county.name),
      5 // fewer search uses needed
    );
    if (!result || Object.keys(result).length === 0) {
      console.log(`  Precinct map for ${county.name}: no data found (not an error)`);
      markCompleted(progress, stepKey, { county: county.name, zips: 0 });
      return;
    }

    const key = `precinct_map:${county.fips}`;
    writeToKV(key, result);
    const zipCount = Object.keys(result).length;
    markCompleted(progress, stepKey, { county: county.name, zips: zipCount });
    console.log(`  Precinct map for ${county.name}: ${zipCount} ZIP codes`);
  } catch (err) {
    console.error(`  ERROR precinct map ${county.name}: ${err.message}`);
    markError(progress, stepKey, err);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Texas County Ballot Seeder ===");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`Worker dir: ${WORKER_DIR}`);
  console.log(`Progress file: ${PROGRESS_FILE}`);
  console.log("");

  const progress = loadProgress();

  // Determine which counties to process
  let counties = TOP_COUNTIES;
  if (FILTER_COUNTY) {
    counties = TOP_COUNTIES.filter((c) => c.fips === FILTER_COUNTY);
    if (counties.length === 0) {
      console.error(`County FIPS ${FILTER_COUNTY} not in TOP_COUNTIES list`);
      process.exit(1);
    }
  }

  // Determine which parties to process
  let parties = PARTIES;
  if (FILTER_PARTY) {
    if (!PARTIES.includes(FILTER_PARTY)) {
      console.error(`Invalid party: ${FILTER_PARTY}`);
      process.exit(1);
    }
    parties = [FILTER_PARTY];
  }

  // Calculate step count for time estimate
  let stepsPerCounty = 0;
  if (ONLY_INFO) stepsPerCounty = 1;
  else if (ONLY_BALLOTS) stepsPerCounty = parties.length;
  else if (ONLY_PRECINCTS) stepsPerCounty = 1;
  else stepsPerCounty = (SKIP_INFO ? 0 : 1) + parties.length + 1;
  const totalSteps = counties.length * stepsPerCounty;

  console.log(`Counties: ${counties.length}, Parties: ${parties.join(", ")}`);
  console.log(`Estimated API calls: ~${totalSteps}`);
  console.log(`Estimated time: ~${Math.ceil(totalSteps * (RATE_LIMIT_DELAY_MS + 15000) / 60000)} minutes`);
  console.log("");

  let stepNum = 0;

  for (const county of counties) {
    console.log(`\n--- ${county.name} County (${county.fips}) ---`);

    // Step 1: County info
    if (!ONLY_BALLOTS && !ONLY_PRECINCTS && !SKIP_INFO) {
      stepNum++;
      console.log(`[${stepNum}/${totalSteps}] County info...`);
      await seedCountyInfo(county, progress);
      await sleep(RATE_LIMIT_DELAY_MS);
    }

    if (ONLY_INFO) continue;

    // Step 2: Ballots for each party
    if (!ONLY_INFO && !ONLY_PRECINCTS) {
      for (const party of parties) {
        stepNum++;
        console.log(`[${stepNum}/${totalSteps}] ${party} ballot...`);
        await seedCountyBallot(county, party, progress);
        await sleep(RATE_LIMIT_DELAY_MS);
      }
    }

    // Step 3: Precinct map
    if (!ONLY_INFO && !ONLY_BALLOTS) {
      stepNum++;
      console.log(`[${stepNum}/${totalSteps}] Precinct map...`);
      await seedPrecinctMap(county, progress);
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  console.log("\n\n=== SEEDING COMPLETE ===");
  const completedCount = Object.keys(progress.completed).length;
  const errorCount = progress.errors.length;
  console.log(`Completed steps: ${completedCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errorCount > 0) {
    console.log("\nErrors encountered:");
    for (const err of progress.errors.slice(-20)) {
      console.log(`  ${err.step}: ${err.error}`);
    }
  }

  // Write log
  const log = {
    finishedAt: new Date().toISOString(),
    completedSteps: completedCount,
    errors: errorCount,
    dryRun: DRY_RUN,
    errorDetails: progress.errors,
  };
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  console.log(`\nFull log: ${LOG_FILE}`);
  console.log(`Progress: ${PROGRESS_FILE}`);

  if (errorCount > 0) {
    console.log(`\nTo retry failed steps, just re-run the script.`);
    console.log(`To start fresh, delete ${PROGRESS_FILE} first.`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
