// Server-side guide generation for PWA
// Ported from ClaudeService.swift

const SYSTEM_PROMPT =
  "You are a non-partisan voting guide assistant for Austin, Texas elections. " +
  "Your job is to make personalized recommendations based ONLY on the voter's stated values and the candidate data provided. " +
  "You must NEVER recommend a candidate who is not listed in the provided ballot data. " +
  "You must NEVER invent or hallucinate candidate information. " +
  "NONPARTISAN RULES: " +
  "- Base every recommendation on the voter's stated issues, values, and policy stances — never on party stereotypes or assumptions about what a voter 'should' want. " +
  "- Use neutral, factual language in all reasoning. Avoid loaded terms, partisan framing, or editorial commentary. " +
  "- Treat all candidates with equal analytical rigor regardless of their positions. " +
  "- For propositions, connect recommendations to the voter's stated values without advocating for or against any ideology. " +
  "Respond with ONLY valid JSON — no markdown, no explanation, no text outside the JSON object.";

const MODELS = ["claude-sonnet-4-6", "claude-sonnet-4-20250514"];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function handlePWA_Guide(request, env) {
  try {
    const { party, profile, districts, lang } = await request.json();

    if (!party || !["republican", "democrat"].includes(party)) {
      return json({ error: "party required (republican|democrat)" }, 400);
    }
    if (!profile) {
      return json({ error: "profile required" }, 400);
    }

    // Load base ballot from KV
    const raw = await env.ELECTION_DATA.get(
      "ballot:" + party + "_primary_2026"
    );
    if (!raw) {
      return json({ error: "No ballot data available" }, 404);
    }
    var ballot = JSON.parse(raw);

    // Filter by districts
    if (districts) {
      ballot = filterBallotToDistricts(ballot, districts);
    }

    // Build prompts
    var ballotDesc = buildCondensedBallotDescription(ballot);
    var userPrompt = buildUserPrompt(profile, ballotDesc, ballot, party, lang);

    // Call Claude with model fallback
    var responseText = await callClaude(env, SYSTEM_PROMPT, userPrompt);

    // Parse and merge
    var guideResponse = parseResponse(responseText);
    var mergedBallot = mergeRecommendations(guideResponse, ballot);

    return json({
      ballot: mergedBallot,
      profileSummary: guideResponse.profileSummary,
    });
  } catch (err) {
    console.error("Guide generation error:", err);
    return json({ error: err.message || "Guide generation failed" }, 500);
  }
}

// MARK: - Profile Summary Regeneration

const SUMMARY_SYSTEM =
  "You are a concise, non-partisan political analyst. Return only plain text, no formatting. " +
  "Describe the voter's views using neutral, respectful language. Never use partisan labels, " +
  "stereotypes, or loaded terms. Focus on their actual stated values and priorities.";

export async function handlePWA_Summary(request, env) {
  try {
    const { profile, lang } = await request.json();
    if (!profile) {
      return json({ error: "profile required" }, 400);
    }

    var issues = (profile.topIssues || []).join(", ");
    var qualities = (profile.candidateQualities || []).join(", ");
    var stances = Object.keys(profile.policyViews || {})
      .map(function (k) { return k + ": " + profile.policyViews[k]; })
      .join("; ");

    var langInstruction = lang === "es"
      ? "Write your response in Spanish. "
      : "";

    var userMessage =
      langInstruction +
      "Write 2-3 sentences describing this person's politics the way they might describe it to a friend. " +
      "Be conversational, specific, and insightful \u2014 synthesize who they are as a voter, don't just list positions. " +
      'NEVER say "I\'m a Democrat" or "I\'m a Republican" or identify with a party label \u2014 focus on their actual views, values, and priorities. ' +
      "Use neutral, respectful language. Never use loaded terms, stereotypes, or partisan framing.\n\n" +
      "- Political spectrum: " + (profile.politicalSpectrum || "Moderate") + "\n" +
      "- Top issues: " + issues + "\n" +
      "- Values in candidates: " + qualities + "\n" +
      "- Policy stances: " + stances + "\n" +
      (profile.freeform ? "- Additional context: " + profile.freeform + "\n" : "") +
      "\nReturn ONLY the summary text \u2014 no JSON, no quotes, no labels.";

    var text = await callClaude(env, SUMMARY_SYSTEM, userMessage);
    return json({ summary: text.trim() });
  } catch (err) {
    console.error("Summary generation error:", err);
    return json({ error: err.message || "Summary generation failed" }, 500);
  }
}

// MARK: - District Filtering

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

// MARK: - Condensed Ballot Description

function sortOrder(race) {
  var o = race.office;
  if (o.includes("U.S. Senator")) return 0;
  if (o.includes("U.S. Rep")) return 1;
  if (o.includes("Governor")) return 10;
  if (o.includes("Lt. Governor") || o.includes("Lieutenant")) return 11;
  if (o.includes("Attorney General")) return 12;
  if (o.includes("Comptroller")) return 13;
  if (o.includes("Agriculture")) return 14;
  if (o.includes("Land")) return 15;
  if (o.includes("Railroad")) return 16;
  if (o.includes("State Rep")) return 20;
  if (o.includes("Supreme Court")) return 30;
  if (o.includes("Criminal Appeals")) return 31;
  if (o.includes("Court of Appeals")) return 32;
  if (o.includes("Board of Education")) return 40;
  return 50;
}

function buildCondensedBallotDescription(ballot) {
  var lines = ["ELECTION: " + ballot.electionName, ""];

  var sortedRaces = ballot.races.slice().sort(function (a, b) {
    return sortOrder(a) - sortOrder(b);
  });

  for (var i = 0; i < sortedRaces.length; i++) {
    var race = sortedRaces[i];
    var label = race.district
      ? race.office + " \u2014 " + race.district
      : race.office;
    var contested = race.isContested ? "" : " [UNCONTESTED]";
    lines.push("RACE: " + label + contested);

    for (var j = 0; j < race.candidates.length; j++) {
      var c = race.candidates[j];
      var inc = c.isIncumbent ? " (incumbent)" : "";
      lines.push("  - " + c.name + inc);
      lines.push("    Positions: " + c.keyPositions.join("; "));
      if (c.endorsements && c.endorsements.length) {
        lines.push("    Endorsements: " + c.endorsements.join("; "));
      }
      if (c.pros && c.pros.length) {
        lines.push("    Pros: " + c.pros.join("; "));
      }
      if (c.cons && c.cons.length) {
        lines.push("    Cons: " + c.cons.join("; "));
      }
    }
    lines.push("");
  }

  if (ballot.propositions && ballot.propositions.length) {
    for (var k = 0; k < ballot.propositions.length; k++) {
      var prop = ballot.propositions[k];
      lines.push("PROPOSITION " + prop.number + ": " + prop.title);
      lines.push("  " + prop.description);
      if (prop.background) lines.push("  Background: " + prop.background);
      if (prop.fiscalImpact)
        lines.push("  Fiscal impact: " + prop.fiscalImpact);
      if (prop.supporters && prop.supporters.length) {
        lines.push("  Supporters: " + prop.supporters.join("; "));
      }
      if (prop.opponents && prop.opponents.length) {
        lines.push("  Opponents: " + prop.opponents.join("; "));
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

// MARK: - User Prompt

function buildUserPrompt(profile, ballotDesc, ballot, party, lang) {
  var raceLines = ballot.races.map(function (r) {
    var names = r.candidates.map(function (c) {
      return c.name;
    });
    return r.office + ": " + names.join(", ");
  });

  var partyLabel = party.charAt(0).toUpperCase() + party.slice(1);
  var issues = (profile.topIssues || []).join(", ");
  var qualities = (profile.candidateQualities || []).join(", ");
  var stances = Object.keys(profile.policyViews || {})
    .map(function (k) {
      return k + ": " + profile.policyViews[k];
    })
    .join("; ");

  return (
    "Recommend ONE candidate per race and a stance on each proposition. Be concise.\n\n" +
    "NONPARTISAN: All reasoning must be factual and issue-based. Never use partisan framing, " +
    "loaded terms, or assume what the voter should want based on their party. Treat every candidate " +
    "and proposition with equal analytical rigor. Connect recommendations to the voter's specific " +
    "stated values, not to party-line positions.\n\n" +
    "IMPORTANT: For profileSummary, write 2 sentences in first person \u2014 conversational, specific, no generic labels. " +
    'NEVER say "I\'m a Democrat/Republican" \u2014 focus on values and priorities.' +
    (lang === "es" ? " Write the profileSummary in Spanish." : "") +
    "\n\n" +
    "VOTER: " +
    partyLabel +
    " primary | Spectrum: " +
    (profile.politicalSpectrum || "Moderate") +
    "\n" +
    "Issues: " +
    issues +
    "\n" +
    "Values: " +
    qualities +
    "\n" +
    "Stances: " +
    stances +
    "\n" +
    (profile.freeform ? "Additional context: " + profile.freeform + "\n" : "") +
    "\n" +
    "BALLOT:\n" +
    ballotDesc +
    "\n\n" +
    "VALID CANDIDATES (MUST only use these names):\n" +
    raceLines.join("\n") +
    "\n\n" +
    "Return ONLY this JSON:\n" +
    "{\n" +
    '  "profileSummary": "2 sentences, first person, conversational",\n' +
    '  "races": [\n' +
    "    {\n" +
    '      "office": "exact office name",\n' +
    '      "district": "district or null",\n' +
    '      "recommendedCandidate": "exact name from list",\n' +
    '      "reasoning": "1 sentence why this candidate fits the voter",\n' +
    '      "strategicNotes": null,\n' +
    '      "caveats": null,\n' +
    '      "confidence": "Strong Match|Good Match|Best Available|Symbolic Race"\n' +
    "    }\n" +
    "  ],\n" +
    '  "propositions": [\n' +
    "    {\n" +
    '      "number": 1,\n' +
    '      "recommendation": "Lean Yes|Lean No|Your Call",\n' +
    '      "reasoning": "1 sentence connecting to voter",\n' +
    '      "caveats": null,\n' +
    '      "confidence": "Clear Call|Lean|Genuinely Contested"\n' +
    "    }\n" +
    "  ]\n" +
    "}"
  );
}

// MARK: - Claude API Call

async function callClaude(env, system, userMessage) {
  for (var i = 0; i < MODELS.length; i++) {
    var model = MODELS[i];
    for (var attempt = 0; attempt <= 1; attempt++) {
      var res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 4096,
          system: system,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (res.status === 200) {
        var data = await res.json();
        var text = data.content && data.content[0] && data.content[0].text;
        if (!text) throw new Error("No text in API response");
        return text;
      }

      if (res.status === 529) {
        if (attempt === 0) {
          await new Promise(function (r) {
            setTimeout(r, 2000);
          });
          continue;
        }
        // Second 529 — try next model
        if (i < MODELS.length - 1) break;
        throw new Error("All models overloaded");
      }

      // Other error — try next model
      var body = await res.text();
      if (i < MODELS.length - 1) break;
      throw new Error("API error " + res.status + ": " + body.slice(0, 200));
    }
  }
  throw new Error("All models failed");
}

// MARK: - Parse Response

function parseResponse(text) {
  var cleaned = text.trim();
  if (cleaned.indexOf("```json") === 0) cleaned = cleaned.slice(7);
  else if (cleaned.indexOf("```") === 0) cleaned = cleaned.slice(3);
  if (cleaned.slice(-3) === "```") cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();
  return JSON.parse(cleaned);
}

// MARK: - Merge Recommendations

function mergeRecommendations(guideResponse, ballot) {
  // Deep clone
  var merged = JSON.parse(JSON.stringify(ballot));

  // Merge race recommendations
  for (var ri = 0; ri < merged.races.length; ri++) {
    var race = merged.races[ri];
    var rec = null;
    var guideRaces = guideResponse.races || [];
    for (var g = 0; g < guideRaces.length; g++) {
      if (
        guideRaces[g].office === race.office &&
        guideRaces[g].district === race.district
      ) {
        rec = guideRaces[g];
        break;
      }
    }
    if (!rec) continue;

    // Clear existing recommendations
    for (var ci = 0; ci < race.candidates.length; ci++) {
      merged.races[ri].candidates[ci].isRecommended = false;
    }
    merged.races[ri].recommendation = null;

    // Find and set recommended candidate
    var candIdx = -1;
    for (var k = 0; k < race.candidates.length; k++) {
      if (race.candidates[k].name === rec.recommendedCandidate) {
        candIdx = k;
        break;
      }
    }
    if (candIdx !== -1) {
      merged.races[ri].candidates[candIdx].isRecommended = true;
      merged.races[ri].recommendation = {
        candidateId: race.candidates[candIdx].id,
        candidateName: rec.recommendedCandidate,
        reasoning: rec.reasoning,
        strategicNotes: rec.strategicNotes || null,
        caveats: rec.caveats || null,
        confidence: rec.confidence || "Good Match",
      };
    }
  }

  // Merge proposition recommendations
  var props = merged.propositions || [];
  for (var pi = 0; pi < props.length; pi++) {
    var prop = props[pi];
    var prec = null;
    var guideProps = guideResponse.propositions || [];
    for (var p = 0; p < guideProps.length; p++) {
      if (guideProps[p].number === prop.number) {
        prec = guideProps[p];
        break;
      }
    }
    if (!prec) continue;
    merged.propositions[pi].recommendation =
      prec.recommendation || "Your Call";
    merged.propositions[pi].reasoning = prec.reasoning;
    merged.propositions[pi].caveats = prec.caveats || null;
    if (prec.confidence) merged.propositions[pi].confidence = prec.confidence;
  }

  return merged;
}
