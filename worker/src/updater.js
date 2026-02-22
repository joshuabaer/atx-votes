// Daily election data updater — uses Claude with web_search to refresh candidate data.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const PARTIES = ["republican", "democrat"];
const BALLOT_KEYS = {
  republican: "ballot:statewide:republican_primary_2026",
  democrat: "ballot:statewide:democrat_primary_2026",
};
// Legacy keys — checked as fallback during migration period
const LEGACY_BALLOT_KEYS = {
  republican: "ballot:republican_primary_2026",
  democrat: "ballot:democrat_primary_2026",
};

/**
 * Orchestrates the daily update: loads current data from KV, researches each
 * race, validates, merges, and stores the result.
 *
 * @param {object} env - Cloudflare Worker env bindings
 * @param {object} [options] - { parties?: string[], dryRun?: boolean }
 * @returns {{ updated: string[], errors: string[] }}
 */
export async function runDailyUpdate(env, options = {}) {
  const parties = options.parties || PARTIES;
  const dryRun = options.dryRun || false;
  const log = [];
  const errors = [];
  const updated = [];

  for (const party of parties) {
    const key = BALLOT_KEYS[party];
    let raw = await env.ELECTION_DATA.get(key);
    // Fall back to legacy key during migration
    if (!raw && LEGACY_BALLOT_KEYS[party]) {
      raw = await env.ELECTION_DATA.get(LEGACY_BALLOT_KEYS[party]);
    }
    if (!raw) {
      errors.push(`${party}: no existing ballot in KV`);
      continue;
    }

    let ballot;
    try {
      ballot = JSON.parse(raw);
    } catch {
      errors.push(`${party}: failed to parse existing ballot JSON`);
      continue;
    }

    const original = JSON.parse(raw); // deep copy for validation
    let anyChange = false;

    for (let i = 0; i < ballot.races.length; i++) {
      const race = ballot.races[i];
      // Delay between API calls to avoid 429 rate limits
      if (i > 0) await sleep(5000);
      try {
        const updates = await researchRace(race, party, env);
        if (!updates) {
          log.push(`${party}/${race.office}: no updates found`);
          continue;
        }

        const merged = mergeRaceUpdates(race, updates);
        const originalRace = original.races.find(
          (r) => r.office === race.office && r.district === race.district
        );

        const validationError = validateRaceUpdate(originalRace, merged);
        if (validationError) {
          errors.push(
            `${party}/${race.office}: validation failed — ${validationError}`
          );
          continue;
        }

        // Apply merged data back
        Object.assign(race, merged);
        anyChange = true;
        log.push(`${party}/${race.office}: updated`);
      } catch (err) {
        errors.push(`${party}/${race.office}: ${err.message}`);
      }
    }

    if (anyChange && !dryRun) {
      // Update version and store
      const now = new Date().toISOString();
      await env.ELECTION_DATA.put(key, JSON.stringify(ballot));

      // Update manifest
      const manifestRaw = await env.ELECTION_DATA.get("manifest");
      const manifest = manifestRaw ? JSON.parse(manifestRaw) : {};
      manifest[party] = {
        updatedAt: now,
        version: (manifest[party]?.version || 0) + 1,
      };
      await env.ELECTION_DATA.put("manifest", JSON.stringify(manifest));

      updated.push(party);
    }
  }

  // Write update log
  const today = new Date().toISOString().slice(0, 10);
  const logEntry = { timestamp: new Date().toISOString(), log, errors, updated };
  if (!dryRun) {
    await env.ELECTION_DATA.put(
      `update_log:${today}`,
      JSON.stringify(logEntry, null, 2)
    );
  }

  return { updated, errors, log };
}

/**
 * Calls Claude with web_search to find latest updates for a single race.
 * Returns an object with updatedFields per candidate, or null if no updates.
 */
async function researchRace(race, party, env) {
  if (!race.isContested) return null;

  const candidateDescriptions = race.candidates
    .map((c) => {
      const parts = [`Name: ${c.name}`];
      if (c.isIncumbent) parts.push("(incumbent)");
      if (c.polling) parts.push(`Polling: ${c.polling}`);
      if (c.fundraising) parts.push(`Fundraising: ${c.fundraising}`);
      if (c.endorsements?.length)
        parts.push(`Endorsements: ${c.endorsements.join("; ")}`);
      if (c.keyPositions?.length)
        parts.push(`Key positions: ${c.keyPositions.join("; ")}`);
      return parts.join("\n    ");
    })
    .join("\n\n  ");

  const label = race.district
    ? `${race.office} — ${race.district}`
    : race.office;

  const userPrompt = `Research the latest updates for this ${party} primary race in the March 3, 2026 Texas Primary Election:

RACE: ${label}

CURRENT DATA:
  ${candidateDescriptions}

Search for updates since February 15, 2026. Look for:
1. New endorsements
2. New polling data
3. Updated fundraising numbers
4. Significant news or position changes

Return a JSON object with this exact structure (use null for any field with no update):
{
  "candidates": [
    {
      "name": "exact candidate name",
      "polling": "updated polling string or null",
      "fundraising": "updated fundraising string or null",
      "endorsements": ["full updated list"] or null,
      "keyPositions": ["full updated list"] or null,
      "pros": ["full updated list"] or null,
      "cons": ["full updated list"] or null,
      "summary": "updated summary or null",
      "background": "updated background or null"
    }
  ]
}

IMPORTANT:
- Return ONLY valid JSON, no markdown or explanation
- Use null for any field where you found no new information
- Candidate names must match exactly as provided
- For endorsements, keyPositions, pros, and cons: return the FULL updated list (existing + new), not just additions
- Only update fields where you found verifiable new information`;

  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system:
      "You are a nonpartisan election data researcher. Use web_search to find verified, factual updates about candidates. Return ONLY valid JSON. Never fabricate information — if you cannot verify something, use null.",
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
    messages: [{ role: "user", content: userPrompt }],
  };

  // Retry up to 3 times on 429 with exponential backoff
  let result;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const wait = (attempt + 1) * 10000; // 10s, 20s, 30s
      await sleep(wait);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Claude API returned ${response.status}`);
    }

    result = await response.json();
    break;
  }

  if (!result) {
    throw new Error("Claude API returned 429 after 3 retries");
  }

  // Extract text from response content blocks — web_search responses have
  // multiple text blocks interspersed with search results. Concatenate all
  // text blocks, then extract the JSON object.
  const textBlocks = (result.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text);
  if (textBlocks.length === 0) return null;

  const fullText = textBlocks.join("\n");

  // Try to extract JSON: look for ```json fences first, then raw { }
  let cleaned = fullText.trim();
  const fenceMatch = cleaned.match(/```json\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  } else {
    // Find the first { and last } to extract the JSON object
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Failed to parse Claude response as JSON (${cleaned.slice(0, 100)}...)`
    );
  }
}

/**
 * Merges non-null updated fields from Claude's response into the race.
 * Returns the merged race object (does not mutate original).
 */
function mergeRaceUpdates(race, updates) {
  const merged = JSON.parse(JSON.stringify(race)); // deep copy

  if (!updates?.candidates) return merged;

  for (const update of updates.candidates) {
    const candidate = merged.candidates.find((c) => c.name === update.name);
    if (!candidate) continue;

    const fields = [
      "polling",
      "fundraising",
      "endorsements",
      "keyPositions",
      "pros",
      "cons",
      "summary",
      "background",
    ];

    for (const field of fields) {
      if (update[field] !== null && update[field] !== undefined) {
        // Don't accept empty strings or empty arrays
        if (update[field] === "") continue;
        if (Array.isArray(update[field]) && update[field].length === 0)
          continue;
        candidate[field] = update[field];
      }
    }
  }

  return merged;
}

/**
 * Validates that an update doesn't break structural invariants.
 * Returns an error string, or null if valid.
 */
function validateRaceUpdate(original, updated) {
  if (!original || !updated) return "missing race data";

  // Candidate count must match
  if (original.candidates.length !== updated.candidates.length) {
    return `candidate count changed: ${original.candidates.length} → ${updated.candidates.length}`;
  }

  // Candidate names must match exactly
  const origNames = original.candidates.map((c) => c.name).sort();
  const updNames = updated.candidates.map((c) => c.name).sort();
  if (JSON.stringify(origNames) !== JSON.stringify(updNames)) {
    return `candidate names changed`;
  }

  // Endorsements cannot shrink by >50%
  for (const origCand of original.candidates) {
    const updCand = updated.candidates.find((c) => c.name === origCand.name);
    if (!updCand) return `candidate ${origCand.name} missing`;

    if (
      origCand.endorsements?.length > 0 &&
      updCand.endorsements?.length > 0
    ) {
      const ratio = updCand.endorsements.length / origCand.endorsements.length;
      if (ratio < 0.5) {
        return `${origCand.name} endorsements shrank by >50% (${origCand.endorsements.length} → ${updCand.endorsements.length})`;
      }
    }
  }

  // No empty strings in key fields
  for (const cand of updated.candidates) {
    if (cand.name === "") return "empty candidate name";
    if (cand.summary === "") return `${cand.name} has empty summary`;
  }

  return null;
}

/**
 * Validates the full ballot structure after all race updates.
 */
export function validateBallot(original, updated) {
  if (!original || !updated) return "missing ballot data";

  if (original.races.length !== updated.races.length) {
    return `race count changed: ${original.races.length} → ${updated.races.length}`;
  }

  if (original.party !== updated.party) {
    return `party changed: ${original.party} → ${updated.party}`;
  }

  return null;
}
