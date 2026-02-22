#!/usr/bin/env node
//
// seed_candidate_tones.js — Generate tone variants for all candidates in statewide
// and county ballots. Produces cowboy, chef, formal, casual, etc. versions of
// candidate summaries, pros, and cons.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... node /tmp/seed_candidate_tones.js
//
// Options:
//   --dry-run         Print what would be written, don't touch KV
//   --party=republican Process only one party
//   --tone=7          Generate only one tone (1, 3, 4, 6, 7)
//   --county=48453    Process county ballot instead of statewide
//   --all-counties    Process all county ballots found in KV
//   --statewide-only  Process only statewide ballots (skip counties)
//
// Requires: Node 18+, wrangler CLI available in PATH
//
// Progress is saved to /tmp/seed_tones_progress.json after every successful step.
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
const RATE_LIMIT_DELAY_MS = 2000;
const MAX_RETRIES = 3;

const WORKER_DIR = path.join(
  process.env.HOME,
  "Library/Mobile Documents/com~apple~CloudDocs/Xcode/ATXVotes/worker"
);
const PROGRESS_FILE = "/tmp/seed_tones_progress.json";
const LOG_FILE = "/tmp/seed_tones_log.json";

// Tone definitions — must match pwa-guide.js READING_LEVEL_INSTRUCTIONS
const TONE_LABELS = {
  1: "high school / simplest — use simple everyday language, avoid jargon",
  3: "standard / news level (this is the default, no rewrite needed)",
  4: "detailed / political — use precise political terminology, assume the reader follows politics",
  6: "Swedish Chef from the Muppets — use Muppet-Swedish gibberish (bork bork bork!), 'zee' and 'de' everywhere, end sentences with 'Bork!' or 'Hurdy gurdy!'",
  7: "Texas cowboy — use Texas ranch metaphors, say 'y'all', 'reckon', 'fixin' to', 'partner', compare things to cattle ranching and rodeos",
};
const VALID_TONES = [1, 4, 6, 7]; // tone 3 is the original/default, stored as-is
const ALL_TONES = [1, 3, 4, 6, 7];
const PARTIES = ["republican", "democrat"];

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const STATEWIDE_ONLY = args.includes("--statewide-only");
const ALL_COUNTIES = args.includes("--all-counties");

const partyArg = args.find((a) => a.startsWith("--party="));
const FILTER_PARTY = partyArg ? partyArg.split("=")[1] : null;

const toneArg = args.find((a) => a.startsWith("--tone="));
const FILTER_TONE = toneArg ? parseInt(toneArg.split("=")[1], 10) : null;

const countyArg = args.find((a) => a.startsWith("--county="));
const FILTER_COUNTY = countyArg ? countyArg.split("=")[1] : null;

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

async function callClaude(prompt) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (response.status === 429) {
      const wait = (attempt + 1) * 10000;
      console.log(`    Rate limited (429), waiting ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }

    if (response.status === 529) {
      const wait = (attempt + 1) * 5000;
      console.log(`    Overloaded (529), waiting ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Claude API returned ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data.content && data.content[0] && data.content[0].text;
    if (!text) throw new Error("No text in API response");

    // Parse JSON
    let cleaned = text.trim();
    const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) cleaned = fence[1].trim();
    else {
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

  throw new Error("Claude API failed after all retries");
}

// ─── KV Read/Write via Wrangler ──────────────────────────────────────────────

function readFromKV(key) {
  try {
    const output = execFileSync(
      "npx",
      ["wrangler", "kv", "key", "get", "--namespace-id=1b02b19492f243c8b503d99d0ff11761", "--remote", key],
      { cwd: WORKER_DIR, stdio: ["pipe", "pipe", "pipe"], timeout: 30000 }
    );
    return output.toString("utf8");
  } catch (err) {
    // Key not found returns non-zero exit
    return null;
  }
}

function writeToKV(key, value) {
  if (DRY_RUN) {
    const preview = JSON.stringify(value).slice(0, 200);
    console.log(`    [DRY RUN] Would write KV key: ${key}`);
    console.log(`    [DRY RUN] Value preview: ${preview}...`);
    return;
  }

  const tmpFile = `/tmp/kv_tone_${Date.now()}.json`;
  fs.writeFileSync(tmpFile, JSON.stringify(value));

  try {
    execFileSync(
      "npx",
      ["wrangler", "kv", "key", "put", "--namespace-id=1b02b19492f243c8b503d99d0ff11761", "--remote", key, "--path", tmpFile],
      { cwd: WORKER_DIR, stdio: "pipe", timeout: 30000 }
    );
    console.log(`    Wrote KV: ${key}`);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

function listKVKeys(prefix) {
  try {
    const output = execFileSync(
      "npx",
      ["wrangler", "kv", "key", "list", "--namespace-id=1b02b19492f243c8b503d99d0ff11761", "--remote", "--prefix", prefix],
      { cwd: WORKER_DIR, stdio: ["pipe", "pipe", "pipe"], timeout: 30000 }
    );
    return JSON.parse(output.toString("utf8"));
  } catch {
    return [];
  }
}

// ─── Tone Generation ─────────────────────────────────────────────────────────

/**
 * Resolve the "original" (tone 3) text from a field that may already be a
 * tone-variant object or a plain string.
 */
function getOriginalText(value) {
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value["3"] || value[Object.keys(value).sort()[0]] || null;
  }
  return null;
}

function getOriginalArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => getOriginalText(item)).filter(Boolean);
}

/**
 * Convert a candidate's text fields to tone 3 (storing originals as { "3": text }).
 * This is the base step before generating other tones.
 */
function convertToTone3(cand) {
  let changed = false;

  // summary
  if (typeof cand.summary === "string" && cand.summary) {
    cand.summary = { "3": cand.summary };
    changed = true;
  }

  // pros
  if (Array.isArray(cand.pros)) {
    const newPros = cand.pros.map((p) => {
      if (typeof p === "string") return { "3": p };
      return p;
    });
    if (JSON.stringify(newPros) !== JSON.stringify(cand.pros)) {
      cand.pros = newPros;
      changed = true;
    }
  }

  // cons
  if (Array.isArray(cand.cons)) {
    const newCons = cand.cons.map((c) => {
      if (typeof c === "string") return { "3": c };
      return c;
    });
    if (JSON.stringify(newCons) !== JSON.stringify(cand.cons)) {
      cand.cons = newCons;
      changed = true;
    }
  }

  return changed;
}

/**
 * Generate a tone variant for a candidate and merge it into the ballot object.
 */
async function generateCandidateTone(cand, race, tone, progress, kvKey) {
  const origSummary = getOriginalText(cand.summary);
  const origPros = getOriginalArray(cand.pros);
  const origCons = getOriginalArray(cand.cons);

  if (!origSummary && origPros.length === 0 && origCons.length === 0) {
    console.log(`    No text fields for ${cand.name}, skipping tone ${tone}`);
    return false;
  }

  const toneDesc = TONE_LABELS[tone];
  let fieldList = "";
  if (origSummary) fieldList += `summary: "${origSummary}"\n\n`;
  if (origPros.length) fieldList += `pros: ${JSON.stringify(origPros)}\n\n`;
  if (origCons.length) fieldList += `cons: ${JSON.stringify(origCons)}\n\n`;

  const prompt = `Rewrite ALL of the following candidate text fields in a ${toneDesc} tone. Keep the same factual content and meaning, just adjust the language style and complexity. Keep each item roughly the same length as the original.

Candidate: ${cand.name}
Race: ${race.office}

FIELDS TO REWRITE:
${fieldList}
Return a JSON object with: "summary" (string), "pros" (array of strings), "cons" (array of strings). Keep the same number of items in each array.

Return ONLY valid JSON, no markdown fences, no explanation.`;

  const parsed = await callClaude(prompt);
  let updated = 0;

  // Merge summary
  if (parsed.summary && origSummary) {
    if (typeof cand.summary !== "object" || Array.isArray(cand.summary)) {
      cand.summary = { "3": origSummary };
    }
    cand.summary[String(tone)] = parsed.summary;
    updated++;
  }

  // Merge pros
  if (parsed.pros && Array.isArray(parsed.pros)) {
    cand.pros = origPros.map((orig, i) => {
      const tv = typeof cand.pros[i] === "object" && !Array.isArray(cand.pros[i])
        ? { ...cand.pros[i] }
        : { "3": orig };
      tv[String(tone)] = parsed.pros[i] || orig;
      return tv;
    });
    updated++;
  }

  // Merge cons
  if (parsed.cons && Array.isArray(parsed.cons)) {
    cand.cons = origCons.map((orig, i) => {
      const tv = typeof cand.cons[i] === "object" && !Array.isArray(cand.cons[i])
        ? { ...cand.cons[i] }
        : { "3": orig };
      tv[String(tone)] = parsed.cons[i] || orig;
      return tv;
    });
    updated++;
  }

  return updated > 0;
}

// ─── Process a Single Ballot ─────────────────────────────────────────────────

async function processBallot(kvKey, progress) {
  console.log(`\nProcessing ballot: ${kvKey}`);

  const raw = readFromKV(kvKey);
  if (!raw) {
    console.log(`  No data found for ${kvKey}, skipping`);
    return;
  }

  let ballot;
  try {
    ballot = JSON.parse(raw);
  } catch {
    console.log(`  Failed to parse ballot JSON for ${kvKey}, skipping`);
    return;
  }

  if (!ballot.races || ballot.races.length === 0) {
    console.log(`  No races in ${kvKey}, skipping`);
    return;
  }

  // Determine which tones to generate
  const tones = FILTER_TONE ? [FILTER_TONE] : VALID_TONES;
  let ballotModified = false;

  // First pass: convert all candidates to tone-3 format
  for (const race of ballot.races) {
    for (const cand of race.candidates) {
      if (convertToTone3(cand)) {
        ballotModified = true;
      }
    }
  }

  // Save tone-3 conversions before generating other tones
  if (ballotModified && !DRY_RUN) {
    writeToKV(kvKey, ballot);
    ballotModified = false;
  }

  // Second pass: generate each tone for each candidate
  for (const race of ballot.races) {
    for (const cand of race.candidates) {
      for (const tone of tones) {
        if (tone === 3) continue; // tone 3 is the original, already stored

        const stepKey = `tone:${kvKey}:${cand.name}:${tone}`;
        if (isCompleted(progress, stepKey)) {
          continue;
        }

        console.log(`  [${cand.name}] tone ${tone} (${TONE_LABELS[tone].split(" — ")[0]})...`);

        try {
          const changed = await generateCandidateTone(cand, race, tone, progress, kvKey);
          if (changed) ballotModified = true;
          markCompleted(progress, stepKey, { candidate: cand.name, tone });
          await sleep(RATE_LIMIT_DELAY_MS);
        } catch (err) {
          console.error(`    ERROR: ${err.message}`);
          markError(progress, stepKey, err);
          await sleep(RATE_LIMIT_DELAY_MS);
        }
      }
    }

    // Write after each race to preserve progress
    if (ballotModified) {
      writeToKV(kvKey, ballot);
      ballotModified = false;
    }
  }

  // Final write
  if (ballotModified) {
    writeToKV(kvKey, ballot);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Texas Votes Candidate Tone Generator ===");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`Worker dir: ${WORKER_DIR}`);
  console.log(`Progress file: ${PROGRESS_FILE}`);
  if (FILTER_TONE) console.log(`Filter tone: ${FILTER_TONE}`);
  if (FILTER_PARTY) console.log(`Filter party: ${FILTER_PARTY}`);
  if (FILTER_COUNTY) console.log(`Filter county: ${FILTER_COUNTY}`);
  console.log("");

  const progress = loadProgress();

  // Build list of KV keys to process
  const kvKeys = [];

  // Determine which parties
  const parties = FILTER_PARTY ? [FILTER_PARTY] : PARTIES;

  // Statewide ballots
  if (!FILTER_COUNTY) {
    for (const party of parties) {
      kvKeys.push(`ballot:statewide:${party}_primary_2026`);
    }
  }

  // County ballots
  if (!STATEWIDE_ONLY) {
    if (FILTER_COUNTY) {
      for (const party of parties) {
        kvKeys.push(`ballot:county:${FILTER_COUNTY}:${party}_primary_2026`);
      }
    } else if (ALL_COUNTIES) {
      // Discover all county ballot keys from KV
      console.log("Discovering county ballot keys from KV...");
      const keys = listKVKeys("ballot:county:");
      for (const keyObj of keys) {
        const keyName = keyObj.name || keyObj;
        if (FILTER_PARTY && !keyName.includes(FILTER_PARTY)) continue;
        kvKeys.push(keyName);
      }
      console.log(`Found ${keys.length} county ballot keys`);
    }
  }

  console.log(`\nBallots to process: ${kvKeys.length}`);
  for (const k of kvKeys) console.log(`  ${k}`);
  console.log("");

  for (const kvKey of kvKeys) {
    await processBallot(kvKey, progress);
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  console.log("\n\n=== TONE GENERATION COMPLETE ===");
  const completedCount = Object.keys(progress.completed).length;
  const errorCount = progress.errors.length;
  console.log(`Completed steps: ${completedCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errorCount > 0) {
    console.log("\nRecent errors:");
    for (const err of progress.errors.slice(-10)) {
      console.log(`  ${err.step}: ${err.error}`);
    }
  }

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
