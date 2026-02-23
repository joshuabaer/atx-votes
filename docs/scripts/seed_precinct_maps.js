#!/usr/bin/env node
//
// seed_precinct_maps.js — Seed ZIP-to-commissioner-precinct maps for Texas counties
//
// Calls the Anthropic API with web_search tool to research which ZIP codes
// map to which County Commissioner precincts (1-4), then writes results
// to Cloudflare KV as `precinct_map:{fips}`.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... node docs/scripts/seed_precinct_maps.js
//
// Options:
//   --check-only      List which counties need precinct maps, don't seed
//   --batch=N         Process at most N counties per run (default: all remaining)
//   --county=48201    Seed only one county (by FIPS)
//   --dry-run         Print what would be written, don't touch KV
//   --reset           Delete progress file and start fresh
//   --force           Re-seed even counties that already have precinct maps
//   --reverse         Process counties in reverse order
//
// Progress is saved to /tmp/seed_precinct_maps_progress.json after every step.
// Re-running the script will skip already-completed counties.
//
// Estimated cost: ~$0.08-0.10 per county (Claude Sonnet + up to 10 web searches)
// Estimated time: ~15-20 seconds per county
// For 20 counties: ~$2, ~6 minutes

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
      console.log("Loaded ANTHROPIC_API_KEY from worker/.dev.vars");
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
const MAX_TOKENS = 8192;
const RATE_LIMIT_DELAY_MS = 3000;
const MAX_RETRIES = 3;
const KV_NAMESPACE_ID = "1b02b19492f243c8b503d99d0ff11761";

const WORKER_DIR = path.join(
  process.env.HOME,
  "Library/Mobile Documents/com~apple~CloudDocs/Xcode/ATXVotes/worker"
);
const PROGRESS_FILE = "/tmp/seed_precinct_maps_progress.json";
const LOG_FILE = "/tmp/seed_precinct_maps_log.json";

// Top 30 Texas counties by population (covers ~75% of TX voters)
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

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const CHECK_ONLY = args.includes("--check-only");
const FORCE = args.includes("--force");
const RESET = args.includes("--reset");
const REVERSE = args.includes("--reverse");

const countyArg = args.find((a) => a.startsWith("--county="));
const FILTER_COUNTY = countyArg ? countyArg.split("=")[1] : null;

const batchArg = args.find((a) => a.startsWith("--batch="));
const BATCH_LIMIT = batchArg ? parseInt(batchArg.split("=")[1], 10) : Infinity;

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
    // Clear stale errors from previous runs
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

/**
 * List existing precinct_map keys from KV to identify which counties already have maps
 */
function listExistingPrecinctMaps() {
  try {
    const result = execFileSync(
      "npx",
      ["wrangler", "kv", "key", "list", `--namespace-id=${KV_NAMESPACE_ID}`, "--remote", "--prefix=precinct_map:"],
      { cwd: WORKER_DIR, stdio: "pipe", timeout: 30000, encoding: "utf8" }
    );
    const keys = JSON.parse(result.trim());
    // Keys are objects like { name: "precinct_map:48201", ... }
    const fipsCodes = new Set();
    for (const key of keys) {
      const name = key.name || key;
      const match = name.match(/^precinct_map:(\d+)$/);
      if (match) fipsCodes.add(match[1]);
    }
    return fipsCodes;
  } catch (err) {
    console.error(`WARNING: Could not list KV keys: ${err.message}`);
    return new Set();
  }
}

/**
 * Read a precinct map from KV (used for --check-only detail view)
 */
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

/**
 * Write precinct map to KV
 */
function writeToKV(key, value) {
  if (DRY_RUN) {
    const preview = JSON.stringify(value).slice(0, 300);
    console.log(`  [DRY RUN] Would write KV key: ${key}`);
    console.log(`  [DRY RUN] Value preview: ${preview}...`);
    return;
  }

  const tmpFile = `/tmp/kv_precinct_map_${Date.now()}.json`;
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

async function callClaudeWithSearch(prompt) {
  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system:
      "You are a nonpartisan election data researcher for Texas. " +
      "Use web_search to find verified, factual information about county commissioner precinct boundaries. " +
      "Return ONLY valid JSON. Never fabricate information — if you cannot verify something, omit it.\n\n" +
      "SOURCE PRIORITY: When evaluating web_search results, prefer sources in this order:\n" +
      "1. County government GIS/maps ({county}.tx.us, {county}county.org)\n" +
      "2. County commissioner precinct boundary maps (official PDFs/images)\n" +
      "3. Texas Secretary of State resources\n" +
      "4. Ballotpedia, Census Bureau\n" +
      "5. Established Texas news outlets\n" +
      "AVOID: blogs, social media, opinion sites, unverified sources",
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 10 }],
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
      return JSON.parse(cleaned);
    } catch {
      throw new Error(`Failed to parse response as JSON: ${cleaned.slice(0, 100)}...`);
    }
  }

  throw new Error("Claude API returned 429/529 after all retries");
}

// ─── Precinct Map Prompt ─────────────────────────────────────────────────────

function buildPrecinctMapPrompt(countyFips, countyName) {
  return `Research the County Commissioner precinct boundaries for ${countyName} County, Texas.

I need a mapping of ZIP codes to County Commissioner precinct numbers (typically 1-4).

Search for:
1. "${countyName} County Texas commissioner precinct map" — look for official GIS maps or boundary descriptions
2. "${countyName} County Texas precinct boundaries" — county government websites
3. Check if the county has an online GIS viewer or precinct finder tool

For each ZIP code that is primarily within ${countyName} County, determine which Commissioner Precinct (1, 2, 3, or 4) covers the majority of that ZIP code's area.

IMPORTANT NOTES:
- Texas counties have 4 Commissioner Precincts (numbered 1-4)
- Some ZIP codes may span multiple precincts — assign the precinct that covers the majority of the ZIP's population
- Only include ZIP codes that are primarily within ${countyName} County (not just touching the border)
- ZIP codes typically start with 7 for Texas
- Make sure to include ALL major ZIP codes in the county, not just a few

Return ONLY this JSON (no explanation, no markdown):
{
  "ZIP_CODE": "PRECINCT_NUMBER",
  ...
}

For example: {"78701": "2", "78702": "1", "78703": "4"}

If you cannot determine the mapping reliably for this county, return an empty object: {}`;
}

// ─── Seeding Logic ───────────────────────────────────────────────────────────

async function seedPrecinctMap(fips, countyName, progress) {
  const stepKey = `precinct_map:${fips}`;
  if (!FORCE && isCompleted(progress, stepKey)) {
    console.log(`  [SKIP] ${countyName} County (${fips}) already completed in progress`);
    return;
  }

  console.log(`  Researching ${countyName} County (${fips}) precinct boundaries...`);
  try {
    const result = await callClaudeWithSearch(buildPrecinctMapPrompt(fips, countyName));

    if (!result || Object.keys(result).length === 0) {
      throw new Error("Could not determine precinct map (empty result)");
    }

    // Validate the result: all values should be precinct numbers 1-4
    const zipCount = Object.keys(result).length;
    let invalidCount = 0;
    for (const [zip, precinct] of Object.entries(result)) {
      if (!/^\d{5}$/.test(zip)) {
        console.log(`  WARNING: Invalid ZIP code "${zip}" — removing`);
        delete result[zip];
        invalidCount++;
        continue;
      }
      if (!/^[1-4]$/.test(String(precinct))) {
        console.log(`  WARNING: Invalid precinct "${precinct}" for ZIP ${zip} — removing`);
        delete result[zip];
        invalidCount++;
      }
    }

    const validZipCount = Object.keys(result).length;
    if (validZipCount === 0) {
      throw new Error("No valid ZIP-to-precinct mappings found after validation");
    }

    // Show summary
    const precinctCounts = {};
    for (const precinct of Object.values(result)) {
      precinctCounts[precinct] = (precinctCounts[precinct] || 0) + 1;
    }
    console.log(`  Found ${validZipCount} ZIP codes across precincts: ${JSON.stringify(precinctCounts)}`);
    if (invalidCount > 0) {
      console.log(`  Removed ${invalidCount} invalid entries`);
    }

    // Write to KV
    const key = `precinct_map:${fips}`;
    writeToKV(key, result);
    markCompleted(progress, stepKey, {
      county: countyName,
      zipCount: validZipCount,
      precinctCounts,
    });
    console.log(`  ${countyName} County: done (${validZipCount} ZIPs)`);
  } catch (err) {
    const category = classifyError(err);
    console.error(`  ERROR [${category}] ${countyName} County: ${err.message}`);
    markError(progress, stepKey, err);
    if (category === "AUTH") throw err; // Fatal — stop immediately
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Texas County Precinct Map Seeder ===");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : CHECK_ONLY ? "CHECK ONLY" : "LIVE"}`);
  console.log(`Worker dir: ${WORKER_DIR}`);
  console.log("");

  // Handle --reset flag
  if (RESET) {
    resetProgress();
  }

  const progress = loadProgress();
  progress.currentRunErrors = [];

  // Check which counties already have precinct maps in KV
  console.log("Checking existing precinct maps in KV...");
  const existingMaps = listExistingPrecinctMaps();
  console.log(`Found ${existingMaps.size} existing precinct maps in KV`);
  console.log("");

  // Determine which counties need seeding
  const needSeeding = [];
  const alreadyHave = [];

  for (const county of TOP_COUNTIES) {
    // Filter to single county if specified
    if (FILTER_COUNTY && county.fips !== FILTER_COUNTY) continue;

    if (!FORCE && (existingMaps.has(county.fips) || isCompleted(progress, `precinct_map:${county.fips}`))) {
      alreadyHave.push(county);
    } else {
      needSeeding.push(county);
    }
  }

  // Assessment
  console.log("=== Assessment ===");
  console.log(`Top 30 counties total: ${TOP_COUNTIES.length}`);
  console.log(`Already have precinct map: ${alreadyHave.length}`);
  console.log(`Need precinct map: ${needSeeding.length}`);
  console.log("");

  if (alreadyHave.length > 0) {
    console.log("Counties with existing precinct maps:");
    for (const c of alreadyHave) {
      console.log(`  ${c.fips} ${c.name}`);
    }
    console.log("");
  }

  if (needSeeding.length === 0) {
    console.log("All target counties already have precinct maps! Nothing to do.");
    return;
  }

  console.log("Counties needing precinct maps:");
  for (const c of needSeeding) {
    console.log(`  ${c.fips} ${c.name}`);
  }
  console.log("");

  if (CHECK_ONLY) {
    console.log("=== CHECK ONLY MODE — not seeding ===");

    // Show details for existing maps
    if (alreadyHave.length > 0) {
      console.log("\nExisting precinct map details:");
      for (const c of alreadyHave) {
        const data = readFromKV(`precinct_map:${c.fips}`);
        if (data) {
          const zipCount = Object.keys(data).length;
          const precinctCounts = {};
          for (const p of Object.values(data)) {
            precinctCounts[p] = (precinctCounts[p] || 0) + 1;
          }
          console.log(`  ${c.fips} ${c.name}: ${zipCount} ZIPs — precincts: ${JSON.stringify(precinctCounts)}`);
        } else {
          console.log(`  ${c.fips} ${c.name}: (key exists but could not read)`);
        }
      }
    }
    return;
  }

  // Apply batch limit and ordering
  let counties = [...needSeeding];
  if (REVERSE) {
    counties.reverse();
    console.log("Running in REVERSE order");
  }
  if (BATCH_LIMIT < counties.length) {
    counties = counties.slice(0, BATCH_LIMIT);
    console.log(`Batch limited to ${BATCH_LIMIT} counties`);
  }

  // Estimate time and cost
  const estimatedMinutes = Math.ceil(counties.length * (RATE_LIMIT_DELAY_MS + 18000) / 60000);
  const estimatedCost = (counties.length * 0.10).toFixed(2);
  console.log(`Estimated: ~${estimatedMinutes} minutes, ~$${estimatedCost} API cost`);
  console.log(`KV writes: ${counties.length} (well within 1M/month limit)`);
  console.log("");

  // Seed each county
  let processed = 0;
  for (const county of counties) {
    processed++;
    console.log(`\n[${processed}/${counties.length}] ${county.name} County (${county.fips})`);

    await seedPrecinctMap(county.fips, county.name, progress);
    if (processed < counties.length) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log("\n\n=== SEEDING COMPLETE ===");
  const completedCount = Object.keys(progress.completed).filter((k) => k.startsWith("precinct_map:")).length;
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

  // Write log file
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
