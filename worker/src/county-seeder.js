// County data seeder — populates county-specific ballot data and voting info
// Uses Claude + web_search to research county races from TX SOS filings
//
// Run via: POST /api/election/seed-county with ADMIN_SECRET auth
// Body: { countyFips: "48453", countyName: "Travis", party: "republican" }

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Top 30 Texas counties by population (covers ~75% of TX voters)
export const TOP_COUNTIES = [
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

/**
 * Seeds county-specific voting info (hours, locations, phone, etc.)
 * @param {string} countyFips - FIPS code
 * @param {string} countyName - County name
 * @param {object} env - Cloudflare env bindings
 */
export async function seedCountyInfo(countyFips, countyName, env) {
  const prompt = `Research the voting information for ${countyName} County, Texas for the March 3, 2026 Texas Primary Election.

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

  const result = await callClaudeWithSearch(env, prompt);
  if (!result) return { error: "No response from Claude" };

  const key = `county_info:${countyFips}`;
  await env.ELECTION_DATA.put(key, JSON.stringify(result));
  return { success: true, countyFips, countyName };
}

/**
 * Seeds county-specific local races for a given party
 * @param {string} countyFips
 * @param {string} countyName
 * @param {string} party - "republican" or "democrat"
 * @param {object} env
 */
export async function seedCountyBallot(countyFips, countyName, party, env) {
  const partyLabel = party.charAt(0).toUpperCase() + party.slice(1);

  const prompt = `Research ALL local ${partyLabel} primary races for ${countyName} County, Texas in the March 3, 2026 Texas Primary Election.

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

  const result = await callClaudeWithSearch(env, prompt);
  if (!result) return { error: "No response from Claude" };

  const key = `ballot:county:${countyFips}:${party}_primary_2026`;
  await env.ELECTION_DATA.put(key, JSON.stringify(result));
  return { success: true, countyFips, countyName, party, raceCount: (result.races || []).length };
}

/**
 * Seeds precinct map (ZIP → commissioner precinct) for a county
 */
export async function seedPrecinctMap(countyFips, countyName, env) {
  const prompt = `Research the County Commissioner precinct boundaries for ${countyName} County, Texas.

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

  const result = await callClaudeWithSearch(env, prompt);
  if (!result || Object.keys(result).length === 0) {
    return { error: "Could not determine precinct map" };
  }

  const key = `precinct_map:${countyFips}`;
  await env.ELECTION_DATA.put(key, JSON.stringify(result));
  return { success: true, countyFips, countyName, zipCount: Object.keys(result).length };
}

/**
 * Calls Claude with web_search tool to research election data
 */
async function callClaudeWithSearch(env, userPrompt) {
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system:
      "You are a nonpartisan election data researcher for Texas. " +
      "Use web_search to find verified, factual information about elections. " +
      "Return ONLY valid JSON. Never fabricate information — if you cannot verify something, use null.",
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 10 }],
    messages: [{ role: "user", content: userPrompt }],
  };

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
      await sleep((attempt + 1) * 10000);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Claude API returned ${response.status}`);
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
      throw new Error(`Failed to parse response as JSON`);
    }
  }

  throw new Error("Claude API returned 429 after 3 retries");
}

/**
 * Batch seed: run county info + both party ballots for a single county
 */
export async function seedFullCounty(countyFips, countyName, env) {
  const results = { countyFips, countyName, steps: {} };

  // Step 1: County voting info
  try {
    results.steps.countyInfo = await seedCountyInfo(countyFips, countyName, env);
  } catch (err) {
    results.steps.countyInfo = { error: err.message };
  }
  await sleep(3000);

  // Step 2: Republican local races
  try {
    results.steps.republican = await seedCountyBallot(countyFips, countyName, "republican", env);
  } catch (err) {
    results.steps.republican = { error: err.message };
  }
  await sleep(3000);

  // Step 3: Democrat local races
  try {
    results.steps.democrat = await seedCountyBallot(countyFips, countyName, "democrat", env);
  } catch (err) {
    results.steps.democrat = { error: err.message };
  }
  await sleep(3000);

  // Step 4: Precinct map
  try {
    results.steps.precinctMap = await seedPrecinctMap(countyFips, countyName, env);
  } catch (err) {
    results.steps.precinctMap = { error: err.message };
  }

  return results;
}
