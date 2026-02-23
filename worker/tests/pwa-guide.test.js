import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  sortOrder,
  parseResponse,
  filterBallotToDistricts,
  buildUserPrompt,
  mergeRecommendations,
  buildCondensedBallotDescription,
  VALID_LLMS,
  scorePartisanBalance,
  CONFIDENCE_SCORES,
  loadCachedTranslations,
} from "../src/pwa-guide.js";

const ballot = JSON.parse(
  readFileSync(join(__dirname, "fixtures/sample-ballot.json"), "utf-8")
);

// ---------------------------------------------------------------------------
// sortOrder
// ---------------------------------------------------------------------------
describe("sortOrder", () => {
  it("ranks U.S. Senator highest (0)", () => {
    expect(sortOrder({ office: "U.S. Senator" })).toBe(0);
  });

  it("ranks U.S. Rep at 1", () => {
    expect(sortOrder({ office: "U.S. Rep District 25" })).toBe(1);
  });

  it("ranks Governor at 10", () => {
    expect(sortOrder({ office: "Governor" })).toBe(10);
  });

  it("ranks State Rep at 20", () => {
    expect(sortOrder({ office: "State Rep District 46" })).toBe(20);
  });

  it("ranks Board of Education at 40", () => {
    expect(sortOrder({ office: "Board of Education District 5" })).toBe(40);
  });

  it("returns 50 for unknown offices", () => {
    expect(sortOrder({ office: "Dog Catcher" })).toBe(50);
  });

  it("sorts races in correct priority order", () => {
    const races = [
      { office: "Board of Education District 5" },
      { office: "U.S. Senator" },
      { office: "State Rep District 46" },
      { office: "Governor" },
    ];
    const sorted = races.slice().sort((a, b) => sortOrder(a) - sortOrder(b));
    expect(sorted.map((r) => r.office)).toEqual([
      "U.S. Senator",
      "Governor",
      "State Rep District 46",
      "Board of Education District 5",
    ]);
  });
});

// ---------------------------------------------------------------------------
// parseResponse
// ---------------------------------------------------------------------------
describe("parseResponse", () => {
  it("parses clean JSON string", () => {
    const input = '{"profileSummary": "test", "races": []}';
    expect(parseResponse(input)).toEqual({
      profileSummary: "test",
      races: [],
    });
  });

  it("strips ```json fences", () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(parseResponse(input)).toEqual({ key: "value" });
  });

  it("strips plain ``` fences", () => {
    const input = '```\n{"key": "value"}\n```';
    expect(parseResponse(input)).toEqual({ key: "value" });
  });

  it("handles leading/trailing whitespace", () => {
    const input = '  \n  {"ok": true}  \n  ';
    expect(parseResponse(input)).toEqual({ ok: true });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseResponse("not json at all")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// filterBallotToDistricts
// ---------------------------------------------------------------------------
describe("filterBallotToDistricts", () => {
  const districts = {
    congressional: "District 25",
    stateSenate: "District 14",
    stateHouse: "District 46",
    countyCommissioner: null,
    schoolBoard: "District 5",
  };

  it("always includes statewide races (no district)", () => {
    const filtered = filterBallotToDistricts(ballot, districts);
    const offices = filtered.races.map((r) => r.office);
    expect(offices).toContain("U.S. Senator");
  });

  it("includes matching district races", () => {
    const filtered = filterBallotToDistricts(ballot, districts);
    const offices = filtered.races.map((r) => r.office);
    expect(offices).toContain("State Rep");
    expect(offices).toContain("Board of Education");
  });

  it("excludes non-matching district races", () => {
    const narrowDistricts = {
      congressional: "District 25",
      stateHouse: "District 99",
    };
    const filtered = filterBallotToDistricts(ballot, narrowDistricts);
    const offices = filtered.races.map((r) => r.office);
    expect(offices).toContain("U.S. Senator"); // statewide
    expect(offices).not.toContain("State Rep"); // District 46 != 99
    expect(offices).not.toContain("Board of Education"); // District 5 not in narrowDistricts
  });

  it("preserves propositions and metadata", () => {
    const filtered = filterBallotToDistricts(ballot, districts);
    expect(filtered.id).toBe("test_primary_2026");
    expect(filtered.party).toBe("democrat");
    expect(filtered.electionName).toBe("2026 Democratic Primary");
    expect(filtered.propositions).toHaveLength(1);
    expect(filtered.propositions[0].title).toBe(
      "Austin Transit Expansion Bond"
    );
  });

  it("stores districts on the filtered result", () => {
    const filtered = filterBallotToDistricts(ballot, districts);
    expect(filtered.districts).toBe(districts);
  });
});

// ---------------------------------------------------------------------------
// buildUserPrompt
// ---------------------------------------------------------------------------
describe("buildUserPrompt", () => {
  const profile = {
    politicalSpectrum: "Progressive",
    topIssues: ["Healthcare", "Climate"],
    candidateQualities: ["Integrity", "Experience"],
    policyViews: { immigration: "Path to citizenship", guns: "Stricter laws" },
  };

  it("contains voter profile fields", () => {
    const prompt = buildUserPrompt(
      profile,
      "ballot desc",
      ballot,
      "democrat",
      "en"
    );
    expect(prompt).toContain("1. Healthcare, 2. Climate");
    expect(prompt).toContain("1. Integrity, 2. Experience");
    expect(prompt).toContain("immigration: Path to citizenship");
    expect(prompt).toContain("Progressive");
  });

  it("contains ballot description", () => {
    const prompt = buildUserPrompt(
      profile,
      "ELECTION: 2026 Democratic Primary",
      ballot,
      "democrat",
      "en"
    );
    expect(prompt).toContain("ELECTION: 2026 Democratic Primary");
  });

  it("includes valid candidate names", () => {
    const prompt = buildUserPrompt(
      profile,
      "ballot desc",
      ballot,
      "democrat",
      "en"
    );
    expect(prompt).toContain("Alice Johnson");
    expect(prompt).toContain("Bob Martinez");
  });

  it("does not include candidateTranslations schema for English", () => {
    const prompt = buildUserPrompt(
      profile,
      "ballot desc",
      ballot,
      "democrat",
      "en"
    );
    expect(prompt).not.toContain("candidateTranslations");
  });

  it("includes candidateTranslations schema for Spanish", () => {
    const prompt = buildUserPrompt(
      profile,
      "ballot desc",
      ballot,
      "democrat",
      "es"
    );
    expect(prompt).toContain("candidateTranslations");
    expect(prompt).toContain("Spanish");
  });

  it("includes freeform when present", () => {
    const profileWithFreeform = {
      ...profile,
      freeform: "I care deeply about transit",
    };
    const prompt = buildUserPrompt(
      profileWithFreeform,
      "ballot desc",
      ballot,
      "democrat",
      "en"
    );
    expect(prompt).toContain("I care deeply about transit");
  });

  it("omits freeform when absent", () => {
    const prompt = buildUserPrompt(
      profile,
      "ballot desc",
      ballot,
      "democrat",
      "en"
    );
    expect(prompt).not.toContain("Additional context:");
  });
});

// ---------------------------------------------------------------------------
// mergeRecommendations
// ---------------------------------------------------------------------------
describe("mergeRecommendations", () => {
  const guideResponse = {
    profileSummary: "Test voter summary",
    races: [
      {
        office: "U.S. Senator",
        district: null,
        recommendedCandidate: "Alice Johnson",
        reasoning: "Strong healthcare record matches voter priorities.",
        strategicNotes: null,
        caveats: null,
        confidence: "Strong Match",
      },
      {
        office: "State Rep",
        district: "District 46",
        recommendedCandidate: "Carol Davis",
        reasoning: "Housing focus aligns with voter values.",
        strategicNotes: "First-time candidate but strong grassroots.",
        caveats: "Limited legislative experience.",
        confidence: "Good Match",
      },
    ],
    propositions: [
      {
        number: 1,
        recommendation: "Lean Yes",
        reasoning: "Transit expansion matches climate and equity priorities.",
        caveats: "Property tax increase may concern some.",
        confidence: "Clear Call",
      },
    ],
  };

  it("sets isRecommended on matched candidate", () => {
    const merged = mergeRecommendations(guideResponse, ballot, "en");
    const senRace = merged.races.find((r) => r.office === "U.S. Senator");
    const alice = senRace.candidates.find((c) => c.name === "Alice Johnson");
    const bob = senRace.candidates.find((c) => c.name === "Bob Martinez");
    expect(alice.isRecommended).toBe(true);
    expect(bob.isRecommended).toBe(false);
  });

  it("builds recommendation object with reasoning and confidence", () => {
    const merged = mergeRecommendations(guideResponse, ballot, "en");
    const senRace = merged.races.find((r) => r.office === "U.S. Senator");
    expect(senRace.recommendation).toEqual({
      candidateId: "sen-1",
      candidateName: "Alice Johnson",
      reasoning: "Strong healthcare record matches voter priorities.",
      matchFactors: [],
      strategicNotes: null,
      caveats: null,
      confidence: "Strong Match",
    });
  });

  it("merges proposition recommendations", () => {
    const merged = mergeRecommendations(guideResponse, ballot, "en");
    expect(merged.propositions[0].recommendation).toBe("Lean Yes");
    expect(merged.propositions[0].reasoning).toBe(
      "Transit expansion matches climate and equity priorities."
    );
    expect(merged.propositions[0].confidence).toBe("Clear Call");
  });

  it("does not mutate original ballot", () => {
    const originalStr = JSON.stringify(ballot);
    mergeRecommendations(guideResponse, ballot, "en");
    expect(JSON.stringify(ballot)).toBe(originalStr);
  });

  it("gracefully skips unknown candidate name", () => {
    const badGuide = {
      races: [
        {
          office: "U.S. Senator",
          district: null,
          recommendedCandidate: "Nobody Real",
          reasoning: "test",
          confidence: "Good Match",
        },
      ],
      propositions: [],
    };
    const merged = mergeRecommendations(badGuide, ballot, "en");
    const senRace = merged.races.find((r) => r.office === "U.S. Senator");
    // All candidates should be false, no recommendation set
    for (const c of senRace.candidates) {
      expect(c.isRecommended).toBe(false);
    }
    expect(senRace.recommendation).toBeNull();
  });

  it("overlays candidateTranslations for Spanish", () => {
    const esGuide = {
      ...guideResponse,
      candidateTranslations: [
        {
          name: "Alice Johnson",
          summary: "Senadora experimentada enfocada en reforma de salud.",
          keyPositions: ["Salud universal", "Accion climatica"],
          pros: ["Historial legislativo fuerte"],
          cons: ["Vista como establishment"],
        },
      ],
    };
    const merged = mergeRecommendations(esGuide, ballot, "es");
    const alice = merged.races[0].candidates.find(
      (c) => c.name === "Alice Johnson"
    );
    expect(alice.summary).toBe(
      "Senadora experimentada enfocada en reforma de salud."
    );
    expect(alice.keyPositions).toEqual([
      "Salud universal",
      "Accion climatica",
    ]);
    expect(alice.pros).toEqual(["Historial legislativo fuerte"]);
    expect(alice.cons).toEqual(["Vista como establishment"]);
  });

  it("does not overlay translations for English", () => {
    const esGuide = {
      ...guideResponse,
      candidateTranslations: [
        {
          name: "Alice Johnson",
          summary: "Should not appear",
          keyPositions: ["Nope"],
          pros: ["Nope"],
          cons: ["Nope"],
        },
      ],
    };
    const merged = mergeRecommendations(esGuide, ballot, "en");
    const alice = merged.races[0].candidates.find(
      (c) => c.name === "Alice Johnson"
    );
    expect(alice.summary).toBe(
      "Experienced senator focused on healthcare reform."
    );
  });
});

// ---------------------------------------------------------------------------
// buildCondensedBallotDescription
// ---------------------------------------------------------------------------
describe("buildCondensedBallotDescription", () => {
  it("includes election name header", () => {
    const desc = buildCondensedBallotDescription(ballot);
    expect(desc).toContain("ELECTION: 2026 Democratic Primary");
  });

  it("sorts races by sortOrder priority", () => {
    const desc = buildCondensedBallotDescription(ballot);
    const senIdx = desc.indexOf("RACE: U.S. Senator");
    const repIdx = desc.indexOf("RACE: State Rep");
    const boeIdx = desc.indexOf("RACE: Board of Education");
    expect(senIdx).toBeLessThan(repIdx);
    expect(repIdx).toBeLessThan(boeIdx);
  });

  it("labels uncontested races", () => {
    const desc = buildCondensedBallotDescription(ballot);
    expect(desc).toContain("[UNCONTESTED]");
    // Board of Education is uncontested
    expect(desc).toMatch(/Board of Education.*\[UNCONTESTED\]/);
  });

  it("includes candidate details", () => {
    const desc = buildCondensedBallotDescription(ballot);
    expect(desc).toContain("Alice Johnson (incumbent)");
    expect(desc).toContain("Positions: Universal healthcare");
    expect(desc).toContain("Endorsements: Austin Chronicle");
    expect(desc).toContain("Pros: Strong legislative record");
    expect(desc).toContain("Cons: Seen as establishment");
  });

  it("includes district label for district races", () => {
    const desc = buildCondensedBallotDescription(ballot);
    expect(desc).toContain("RACE: State Rep \u2014 District 46");
  });

  it("includes proposition details", () => {
    const desc = buildCondensedBallotDescription(ballot);
    expect(desc).toContain("PROPOSITION 1: Austin Transit Expansion Bond");
    expect(desc).toContain("$500M in bonds");
    expect(desc).toContain("Supporters: AURA");
    expect(desc).toContain("Opponents: Taxpayers Union");
  });

  it("excludes withdrawn candidates from description", () => {
    const ballotWithWithdrawn = JSON.parse(JSON.stringify(ballot));
    // Mark Bob Martinez as withdrawn
    ballotWithWithdrawn.races[0].candidates[1].withdrawn = true;
    const desc = buildCondensedBallotDescription(ballotWithWithdrawn);
    // Bob should not appear
    expect(desc).not.toContain("Bob Martinez");
    // Alice should still appear
    expect(desc).toContain("Alice Johnson");
    // Senator race should now be UNCONTESTED (only 1 active candidate)
    expect(desc).toMatch(/U\.S\. Senator.*\[UNCONTESTED\]/);
  });

  it("handles ballot with no propositions", () => {
    const ballotNoProps = { ...ballot, propositions: [] };
    const desc = buildCondensedBallotDescription(ballotNoProps);
    expect(desc).toContain("ELECTION:");
    expect(desc).not.toContain("PROPOSITION");
  });

  it("handles ballot with null propositions", () => {
    const ballotNullProps = { ...ballot, propositions: null };
    const desc = buildCondensedBallotDescription(ballotNullProps);
    expect(desc).toContain("ELECTION:");
    expect(desc).not.toContain("PROPOSITION");
  });

  it("handles candidate with no endorsements or positions", () => {
    const sparseCandidate = {
      id: "test-1",
      name: "Jane Doe",
      isIncumbent: false,
      summary: "A candidate",
      keyPositions: [],
      endorsements: [],
      pros: [],
      cons: [],
    };
    const sparseRace = {
      office: "Test Office",
      district: null,
      isContested: false,
      candidates: [sparseCandidate],
    };
    const testBallot = {
      ...ballot,
      races: [sparseRace],
      propositions: [],
    };
    const desc = buildCondensedBallotDescription(testBallot);
    expect(desc).toContain("Jane Doe");
    // Should not have Positions, Endorsements, Pros, or Cons lines for this candidate
    const janeSection = desc.slice(desc.indexOf("Jane Doe"));
    expect(janeSection).not.toContain("Positions:");
    expect(janeSection).not.toContain("Endorsements:");
  });
});

// ---------------------------------------------------------------------------
// buildCondensedBallotDescription — withdrawn candidates in county merge
// ---------------------------------------------------------------------------
describe("buildCondensedBallotDescription — withdrawn handling", () => {
  it("all candidates withdrawn makes race uncontested", () => {
    const ballotAllWithdrawn = JSON.parse(JSON.stringify(ballot));
    // Withdraw all candidates except one in a contested race
    for (const c of ballotAllWithdrawn.races[0].candidates) {
      c.withdrawn = true;
    }
    const desc = buildCondensedBallotDescription(ballotAllWithdrawn);
    // Senator race should show UNCONTESTED with no candidates listed
    expect(desc).toMatch(/U\.S\. Senator.*\[UNCONTESTED\]/);
  });
});

// ---------------------------------------------------------------------------
// buildUserPrompt — additional coverage
// ---------------------------------------------------------------------------
describe("buildUserPrompt — reading level tones", () => {
  const profile = {
    politicalSpectrum: "Moderate",
    topIssues: ["Healthcare"],
    candidateQualities: ["Experience"],
    policyViews: {},
  };

  it("includes simple tone instruction for reading level 1", () => {
    const prompt = buildUserPrompt(profile, "desc", ballot, "democrat", "en", 1);
    expect(prompt).toContain("high school reading level");
  });

  it("includes casual tone instruction for reading level 2", () => {
    const prompt = buildUserPrompt(profile, "desc", ballot, "democrat", "en", 2);
    expect(prompt).toContain("explaining politics to a friend");
  });

  it("includes no tone instruction for reading level 3 (default)", () => {
    const prompt = buildUserPrompt(profile, "desc", ballot, "democrat", "en", 3);
    // Level 3 is empty string — should not contain other level markers
    expect(prompt).not.toContain("high school reading level");
    expect(prompt).not.toContain("explaining politics to a friend");
    expect(prompt).not.toContain("expert level");
  });

  it("includes detailed tone instruction for reading level 4", () => {
    const prompt = buildUserPrompt(profile, "desc", ballot, "democrat", "en", 4);
    expect(prompt).toContain("more depth and nuance");
  });

  it("includes expert tone instruction for reading level 5", () => {
    const prompt = buildUserPrompt(profile, "desc", ballot, "democrat", "en", 5);
    expect(prompt).toContain("expert level");
  });

  it("includes Swedish Chef tone for reading level 6", () => {
    const prompt = buildUserPrompt(profile, "desc", ballot, "democrat", "en", 6);
    expect(prompt).toContain("Swedish Chef");
    expect(prompt).toContain("bork");
  });

  it("includes Texas Cowboy tone for reading level 7", () => {
    const prompt = buildUserPrompt(profile, "desc", ballot, "democrat", "en", 7);
    expect(prompt).toContain("Texas cowboy");
    expect(prompt).toContain("y'all");
  });

  it("handles undefined reading level gracefully", () => {
    const prompt = buildUserPrompt(profile, "desc", ballot, "democrat", "en", undefined);
    // Should not crash, just no tone instruction
    expect(prompt).toContain("Recommend ONE candidate per race");
  });
});

describe("buildUserPrompt — withdrawn candidates", () => {
  it("excludes withdrawn candidates from valid candidates list", () => {
    const ballotWithWithdrawn = JSON.parse(JSON.stringify(ballot));
    ballotWithWithdrawn.races[0].candidates[1].withdrawn = true;
    const profile = {
      politicalSpectrum: "Progressive",
      topIssues: ["Healthcare"],
      candidateQualities: ["Experience"],
      policyViews: {},
    };
    const prompt = buildUserPrompt(profile, "desc", ballotWithWithdrawn, "democrat", "en");
    // Valid candidates list should NOT include Bob Martinez (withdrawn)
    expect(prompt).toContain("Alice Johnson");
    // Bob should not appear in the VALID CANDIDATES section
    const validSection = prompt.slice(prompt.indexOf("VALID CANDIDATES"));
    expect(validSection).not.toContain("Bob Martinez");
  });
});

describe("buildUserPrompt — edge cases", () => {
  it("handles profile with many issues (top 7 + overflow)", () => {
    const profile = {
      politicalSpectrum: "Moderate",
      topIssues: [
        "Healthcare",
        "Education",
        "Housing",
        "Economy",
        "Climate",
        "Immigration",
        "Taxes",
        "Gun Policy",
        "Transportation",
      ],
      candidateQualities: ["Experience"],
      policyViews: {},
    };
    const prompt = buildUserPrompt(profile, "desc", ballot, "democrat", "en");
    // Top 7 should be numbered
    expect(prompt).toContain("1. Healthcare");
    expect(prompt).toContain("7. Taxes");
    // Overflow should appear as "also:"
    expect(prompt).toContain("also: Gun Policy, Transportation");
  });

  it("handles empty policyViews", () => {
    const profile = {
      politicalSpectrum: "Moderate",
      topIssues: ["Healthcare"],
      candidateQualities: ["Experience"],
      policyViews: {},
    };
    const prompt = buildUserPrompt(profile, "desc", ballot, "democrat", "en");
    expect(prompt).toContain("Stances:");
  });
});

// ---------------------------------------------------------------------------
// mergeRecommendations — additional tests
// ---------------------------------------------------------------------------
describe("mergeRecommendations — withdrawn candidate handling", () => {
  it("does not recommend a withdrawn candidate", () => {
    const ballotWithWithdrawn = JSON.parse(JSON.stringify(ballot));
    ballotWithWithdrawn.races[0].candidates[0].withdrawn = true; // Alice withdrawn

    const guideResponse = {
      races: [
        {
          office: "U.S. Senator",
          district: null,
          recommendedCandidate: "Alice Johnson", // Guide recommends withdrawn candidate
          reasoning: "test",
          confidence: "Good Match",
        },
      ],
      propositions: [],
    };

    const merged = mergeRecommendations(guideResponse, ballotWithWithdrawn, "en");
    const senRace = merged.races.find((r) => r.office === "U.S. Senator");
    // Alice is withdrawn, so recommendation should be null
    expect(senRace.recommendation).toBeNull();
    for (const c of senRace.candidates) {
      expect(c.isRecommended).toBe(false);
    }
  });
});

describe("mergeRecommendations — proposition edge cases", () => {
  it("handles guide with no propositions key", () => {
    const guideResponse = {
      races: [],
    };
    const merged = mergeRecommendations(guideResponse, ballot, "en");
    // Propositions should remain unchanged from ballot
    expect(merged.propositions).toHaveLength(1);
    expect(merged.propositions[0].title).toBe("Austin Transit Expansion Bond");
    // No recommendation should be set
    expect(merged.propositions[0].recommendation).toBeUndefined();
  });

  it("handles proposition number mismatch gracefully", () => {
    const guideResponse = {
      races: [],
      propositions: [
        {
          number: 99, // doesn't match ballot's prop 1
          recommendation: "Lean Yes",
          reasoning: "test",
          confidence: "Clear Call",
        },
      ],
    };
    const merged = mergeRecommendations(guideResponse, ballot, "en");
    // Prop 1 should not get a recommendation since guide had prop 99
    expect(merged.propositions[0].recommendation).toBeUndefined();
  });

  it("sets 'Your Call' as default recommendation", () => {
    const guideResponse = {
      races: [],
      propositions: [
        {
          number: 1,
          recommendation: null,
          reasoning: "Close call",
          confidence: "Genuinely Contested",
        },
      ],
    };
    const merged = mergeRecommendations(guideResponse, ballot, "en");
    // null recommendation should default to "Your Call"
    expect(merged.propositions[0].recommendation).toBe("Your Call");
  });
});

// ---------------------------------------------------------------------------
// VALID_LLMS
// ---------------------------------------------------------------------------
describe("VALID_LLMS", () => {
  it("contains exactly 4 LLM options", () => {
    expect(VALID_LLMS).toHaveLength(4);
  });

  it("includes claude, chatgpt, gemini, and grok", () => {
    expect(VALID_LLMS).toContain("claude");
    expect(VALID_LLMS).toContain("chatgpt");
    expect(VALID_LLMS).toContain("gemini");
    expect(VALID_LLMS).toContain("grok");
  });
});

// ---------------------------------------------------------------------------
// sortOrder — additional offices
// ---------------------------------------------------------------------------
describe("sortOrder — additional offices", () => {
  it("ranks Lt. Governor at 10 (matches Governor first)", () => {
    // Note: "Lt. Governor" contains "Governor", so it matches the Governor
    // rule first and returns 10. "Lieutenant Governor" would also match Governor.
    expect(sortOrder({ office: "Lt. Governor" })).toBe(10);
  });

  it("ranks Attorney General at 12", () => {
    expect(sortOrder({ office: "Attorney General" })).toBe(12);
  });

  it("ranks Comptroller at 13", () => {
    expect(sortOrder({ office: "Comptroller of Public Accounts" })).toBe(13);
  });

  it("ranks Agriculture Commissioner at 14", () => {
    expect(sortOrder({ office: "Commissioner of Agriculture" })).toBe(14);
  });

  it("ranks Land Commissioner at 15", () => {
    expect(sortOrder({ office: "General Land Office" })).toBe(15);
  });

  it("ranks Railroad Commissioner at 16", () => {
    expect(sortOrder({ office: "Railroad Commissioner" })).toBe(16);
  });

  it("ranks Supreme Court at 30", () => {
    expect(sortOrder({ office: "Supreme Court Justice, Place 3" })).toBe(30);
  });

  it("ranks Criminal Appeals at 31", () => {
    expect(sortOrder({ office: "Court of Criminal Appeals" })).toBe(31);
  });

  it("ranks Court of Appeals at 32", () => {
    expect(sortOrder({ office: "Court of Appeals, 3rd District" })).toBe(32);
  });
});


// ---------------------------------------------------------------------------
// CONFIDENCE_SCORES
// ---------------------------------------------------------------------------
describe("CONFIDENCE_SCORES", () => {
  it("assigns highest score to Strong Match", () => {
    expect(CONFIDENCE_SCORES["Strong Match"]).toBe(4);
  });

  it("assigns lowest score to Symbolic Race", () => {
    expect(CONFIDENCE_SCORES["Symbolic Race"]).toBe(1);
  });

  it("has exactly 4 confidence levels", () => {
    expect(Object.keys(CONFIDENCE_SCORES)).toHaveLength(4);
  });

  it("scores are in descending order", () => {
    expect(CONFIDENCE_SCORES["Strong Match"]).toBeGreaterThan(CONFIDENCE_SCORES["Good Match"]);
    expect(CONFIDENCE_SCORES["Good Match"]).toBeGreaterThan(CONFIDENCE_SCORES["Best Available"]);
    expect(CONFIDENCE_SCORES["Best Available"]).toBeGreaterThan(CONFIDENCE_SCORES["Symbolic Race"]);
  });
});

// ---------------------------------------------------------------------------
// scorePartisanBalance — basic structure
// ---------------------------------------------------------------------------
describe("scorePartisanBalance — basic structure", () => {
  const guideResponse = {
    profileSummary: "Test voter summary",
    races: [
      {
        office: "U.S. Senator",
        district: null,
        recommendedCandidate: "Alice Johnson",
        reasoning: "Strong healthcare record matches voter priorities.",
        matchFactors: ["Healthcare focus", "Climate action"],
        strategicNotes: null,
        caveats: null,
        confidence: "Strong Match",
      },
      {
        office: "State Rep",
        district: "District 46",
        recommendedCandidate: "Carol Davis",
        reasoning: "Housing focus aligns with voter values.",
        matchFactors: ["Affordable housing"],
        strategicNotes: "First-time candidate.",
        caveats: "Limited experience.",
        confidence: "Good Match",
      },
    ],
    propositions: [
      {
        number: 1,
        recommendation: "Lean Yes",
        reasoning: "Transit expansion matches priorities.",
        confidence: "Clear Call",
      },
    ],
  };

  it("returns an object with all expected fields", () => {
    const score = scorePartisanBalance(guideResponse, ballot);
    expect(score).toHaveProperty("party");
    expect(score).toHaveProperty("totalRaces");
    expect(score).toHaveProperty("confidenceDistribution");
    expect(score).toHaveProperty("avgConfidence");
    expect(score).toHaveProperty("avgReasoningLength");
    expect(score).toHaveProperty("avgMatchFactors");
    expect(score).toHaveProperty("incumbentRecs");
    expect(score).toHaveProperty("challengerRecs");
    expect(score).toHaveProperty("enthusiasmPct");
    expect(score).toHaveProperty("recommendedCandidateAvgPros");
    expect(score).toHaveProperty("recommendedCandidateAvgCons");
    expect(score).toHaveProperty("nonRecommendedCandidateAvgPros");
    expect(score).toHaveProperty("nonRecommendedCandidateAvgCons");
    expect(score).toHaveProperty("flags");
    expect(score).toHaveProperty("skewNote");
  });

  it("correctly identifies ballot party", () => {
    const score = scorePartisanBalance(guideResponse, ballot);
    expect(score.party).toBe("democrat");
  });

  it("counts total races", () => {
    const score = scorePartisanBalance(guideResponse, ballot);
    expect(score.totalRaces).toBe(2);
  });

  it("tracks confidence distribution", () => {
    const score = scorePartisanBalance(guideResponse, ballot);
    expect(score.confidenceDistribution["Strong Match"]).toBe(1);
    expect(score.confidenceDistribution["Good Match"]).toBe(1);
    expect(score.confidenceDistribution["Best Available"]).toBe(0);
    expect(score.confidenceDistribution["Symbolic Race"]).toBe(0);
  });

  it("calculates average confidence score", () => {
    const score = scorePartisanBalance(guideResponse, ballot);
    // (4 + 3) / 2 = 3.5
    expect(score.avgConfidence).toBe(3.5);
  });

  it("calculates average reasoning length", () => {
    const score = scorePartisanBalance(guideResponse, ballot);
    const expectedAvg = Math.round(
      ("Strong healthcare record matches voter priorities.".length +
       "Housing focus aligns with voter values.".length) / 2
    );
    expect(score.avgReasoningLength).toBe(expectedAvg);
  });

  it("calculates average match factors", () => {
    const score = scorePartisanBalance(guideResponse, ballot);
    // (2 + 1) / 2 = 1.5
    expect(score.avgMatchFactors).toBe(1.5);
  });

  it("counts incumbent vs challenger recommendations", () => {
    const score = scorePartisanBalance(guideResponse, ballot);
    // Alice Johnson is incumbent, Carol Davis is not
    expect(score.incumbentRecs).toBe(1);
    expect(score.challengerRecs).toBe(1);
  });

  it("calculates enthusiasm percentage", () => {
    const score = scorePartisanBalance(guideResponse, ballot);
    // Both are Strong Match or Good Match = 100%
    expect(score.enthusiasmPct).toBe(100);
  });

  it("returns no flags for balanced guide with < 3 races", () => {
    const score = scorePartisanBalance(guideResponse, ballot);
    // Only 2 races, so enthusiasm flag (requires >= 3) should not trigger
    expect(score.flags).toEqual([]);
    expect(score.skewNote).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// scorePartisanBalance — empty/edge cases
// ---------------------------------------------------------------------------
describe("scorePartisanBalance — empty and edge cases", () => {
  it("handles empty guide response", () => {
    const score = scorePartisanBalance({ races: [], propositions: [] }, ballot);
    expect(score.totalRaces).toBe(0);
    expect(score.avgConfidence).toBe(0);
    expect(score.avgReasoningLength).toBe(0);
    expect(score.avgMatchFactors).toBe(0);
    expect(score.incumbentRecs).toBe(0);
    expect(score.challengerRecs).toBe(0);
    expect(score.enthusiasmPct).toBe(0);
    expect(score.flags).toEqual([]);
    expect(score.skewNote).toBeNull();
  });

  it("handles missing races key in guide response", () => {
    const score = scorePartisanBalance({}, ballot);
    expect(score.totalRaces).toBe(0);
    expect(score.flags).toEqual([]);
  });

  it("handles ballot with no party field", () => {
    const score = scorePartisanBalance({ races: [] }, { races: [] });
    expect(score.party).toBe("unknown");
  });

  it("handles guide with unknown confidence level", () => {
    const guideWithUnknown = {
      races: [
        {
          office: "U.S. Senator",
          district: null,
          recommendedCandidate: "Alice Johnson",
          reasoning: "test",
          confidence: "Super Duper Match",
        },
      ],
    };
    const score = scorePartisanBalance(guideWithUnknown, ballot);
    // Unknown confidence should not crash, defaults to score 2
    expect(score.totalRaces).toBe(1);
    expect(score.avgConfidence).toBe(2);
  });

  it("handles guide with null confidence (defaults to Good Match)", () => {
    const guideNullConf = {
      races: [
        {
          office: "U.S. Senator",
          district: null,
          recommendedCandidate: "Alice Johnson",
          reasoning: "test",
          confidence: null,
        },
      ],
    };
    const score = scorePartisanBalance(guideNullConf, ballot);
    expect(score.confidenceDistribution["Good Match"]).toBe(1);
    expect(score.avgConfidence).toBe(3);
  });

  it("handles uncontested race (skips for incumbent/challenger count)", () => {
    // Board of Education has only 1 candidate (Eve Thompson)
    const guideWithUncontested = {
      races: [
        {
          office: "Board of Education",
          district: "District 5",
          recommendedCandidate: "Eve Thompson",
          reasoning: "Only candidate.",
          confidence: "Symbolic Race",
        },
      ],
    };
    const score = scorePartisanBalance(guideWithUncontested, ballot);
    expect(score.incumbentRecs).toBe(0);
    expect(score.challengerRecs).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scorePartisanBalance — skew detection
// ---------------------------------------------------------------------------
describe("scorePartisanBalance — skew detection", () => {
  // Build a ballot with 4 contested races for testing threshold flags
  const multiBallot = {
    party: "republican",
    races: [
      {
        office: "Governor",
        district: null,
        candidates: [
          { name: "Inc A", isIncumbent: true, pros: ["Good"], cons: ["Bad"] },
          { name: "Chal A", isIncumbent: false, pros: ["Good"], cons: ["Bad"] },
        ],
      },
      {
        office: "AG",
        district: null,
        candidates: [
          { name: "Inc B", isIncumbent: true, pros: ["Good"], cons: ["Bad"] },
          { name: "Chal B", isIncumbent: false, pros: ["Good"], cons: ["Bad"] },
        ],
      },
      {
        office: "Comptroller",
        district: null,
        candidates: [
          { name: "Inc C", isIncumbent: true, pros: ["Good"], cons: ["Bad"] },
          { name: "Chal C", isIncumbent: false, pros: ["Good"], cons: ["Bad"] },
        ],
      },
      {
        office: "Land Commissioner",
        district: null,
        candidates: [
          { name: "Inc D", isIncumbent: true, pros: ["Good"], cons: ["Bad"] },
          { name: "Chal D", isIncumbent: false, pros: ["Good"], cons: ["Bad"] },
        ],
      },
    ],
  };

  it("flags strong incumbent bias when > 80% recommend incumbents", () => {
    const allIncumbentGuide = {
      races: [
        { office: "Governor", district: null, recommendedCandidate: "Inc A", reasoning: "test", confidence: "Strong Match" },
        { office: "AG", district: null, recommendedCandidate: "Inc B", reasoning: "test", confidence: "Strong Match" },
        { office: "Comptroller", district: null, recommendedCandidate: "Inc C", reasoning: "test", confidence: "Strong Match" },
        { office: "Land Commissioner", district: null, recommendedCandidate: "Inc D", reasoning: "test", confidence: "Strong Match" },
      ],
    };
    const score = scorePartisanBalance(allIncumbentGuide, multiBallot);
    expect(score.incumbentRecs).toBe(4);
    expect(score.challengerRecs).toBe(0);
    expect(score.flags.length).toBeGreaterThan(0);
    expect(score.flags.some(f => f.includes("incumbent bias"))).toBe(true);
  });

  it("flags strong challenger bias when > 80% recommend challengers", () => {
    const allChallengerGuide = {
      races: [
        { office: "Governor", district: null, recommendedCandidate: "Chal A", reasoning: "test", confidence: "Good Match" },
        { office: "AG", district: null, recommendedCandidate: "Chal B", reasoning: "test", confidence: "Good Match" },
        { office: "Comptroller", district: null, recommendedCandidate: "Chal C", reasoning: "test", confidence: "Good Match" },
        { office: "Land Commissioner", district: null, recommendedCandidate: "Chal D", reasoning: "test", confidence: "Good Match" },
      ],
    };
    const score = scorePartisanBalance(allChallengerGuide, multiBallot);
    expect(score.incumbentRecs).toBe(0);
    expect(score.challengerRecs).toBe(4);
    expect(score.flags.some(f => f.includes("challenger bias"))).toBe(true);
  });

  it("does not flag when incumbent/challenger split is balanced", () => {
    const balancedGuide = {
      races: [
        { office: "Governor", district: null, recommendedCandidate: "Inc A", reasoning: "test", confidence: "Good Match" },
        { office: "AG", district: null, recommendedCandidate: "Chal B", reasoning: "test", confidence: "Good Match" },
        { office: "Comptroller", district: null, recommendedCandidate: "Inc C", reasoning: "test", confidence: "Best Available" },
        { office: "Land Commissioner", district: null, recommendedCandidate: "Chal D", reasoning: "test", confidence: "Best Available" },
      ],
    };
    const score = scorePartisanBalance(balancedGuide, multiBallot);
    expect(score.incumbentRecs).toBe(2);
    expect(score.challengerRecs).toBe(2);
    expect(score.flags.filter(f => f.includes("bias"))).toEqual([]);
  });

  it("flags all-high-confidence when >= 3 races all Strong/Good Match", () => {
    const allHighGuide = {
      races: [
        { office: "Governor", district: null, recommendedCandidate: "Inc A", reasoning: "test", confidence: "Strong Match" },
        { office: "AG", district: null, recommendedCandidate: "Chal B", reasoning: "test", confidence: "Good Match" },
        { office: "Comptroller", district: null, recommendedCandidate: "Inc C", reasoning: "test", confidence: "Strong Match" },
      ],
    };
    const score = scorePartisanBalance(allHighGuide, multiBallot);
    expect(score.enthusiasmPct).toBe(100);
    expect(score.flags.some(f => f.includes("insufficient critical analysis"))).toBe(true);
  });

  it("does not flag enthusiasm when some races have lower confidence", () => {
    const mixedGuide = {
      races: [
        { office: "Governor", district: null, recommendedCandidate: "Inc A", reasoning: "test", confidence: "Strong Match" },
        { office: "AG", district: null, recommendedCandidate: "Chal B", reasoning: "test", confidence: "Best Available" },
        { office: "Comptroller", district: null, recommendedCandidate: "Inc C", reasoning: "test", confidence: "Good Match" },
      ],
    };
    const score = scorePartisanBalance(mixedGuide, multiBallot);
    expect(score.enthusiasmPct).toBeLessThan(100);
    expect(score.flags.filter(f => f.includes("critical analysis"))).toEqual([]);
  });

  it("generates skewNote when flags are present", () => {
    const allIncumbentGuide = {
      races: [
        { office: "Governor", district: null, recommendedCandidate: "Inc A", reasoning: "test", confidence: "Strong Match" },
        { office: "AG", district: null, recommendedCandidate: "Inc B", reasoning: "test", confidence: "Strong Match" },
        { office: "Comptroller", district: null, recommendedCandidate: "Inc C", reasoning: "test", confidence: "Strong Match" },
        { office: "Land Commissioner", district: null, recommendedCandidate: "Inc D", reasoning: "test", confidence: "Strong Match" },
      ],
    };
    const score = scorePartisanBalance(allIncumbentGuide, multiBallot);
    expect(score.skewNote).not.toBeNull();
    expect(score.skewNote).toContain("Note:");
    expect(score.skewNote).toContain("patterns worth noting");
  });

  it("returns null skewNote when no flags", () => {
    const cleanGuide = {
      races: [
        { office: "Governor", district: null, recommendedCandidate: "Inc A", reasoning: "test", confidence: "Good Match" },
        { office: "AG", district: null, recommendedCandidate: "Chal B", reasoning: "test", confidence: "Best Available" },
      ],
    };
    const score = scorePartisanBalance(cleanGuide, multiBallot);
    expect(score.skewNote).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// scorePartisanBalance — pro/con text analysis
// ---------------------------------------------------------------------------
describe("scorePartisanBalance — pro/con text analysis", () => {
  it("compares pro text between recommended and non-recommended candidates", () => {
    const asymmetricBallot = {
      party: "democrat",
      races: [
        {
          office: "Governor",
          district: null,
          candidates: [
            { name: "Favored", isIncumbent: false, pros: ["This candidate has an extraordinarily strong record on every issue imaginable"], cons: ["Minor flaw"] },
            { name: "Underdog", isIncumbent: false, pros: ["OK"], cons: ["Lots and lots of critical issues with this candidate that are deeply problematic"] },
          ],
        },
      ],
    };
    const guide = {
      races: [
        { office: "Governor", district: null, recommendedCandidate: "Favored", reasoning: "test", confidence: "Strong Match" },
      ],
    };
    const score = scorePartisanBalance(guide, asymmetricBallot);
    expect(score.recommendedCandidateAvgPros).toBeGreaterThan(score.nonRecommendedCandidateAvgPros);
  });

  it("flags when recommended candidates have >50% more pro text", () => {
    const skewedBallot = {
      party: "democrat",
      races: [
        {
          office: "Governor",
          district: null,
          candidates: [
            { name: "Favored", isIncumbent: false, pros: ["Incredibly strong record on policy, leadership, and community engagement over many years"], cons: ["X"] },
            { name: "Underdog", isIncumbent: false, pros: ["OK"], cons: ["X"] },
          ],
        },
      ],
    };
    const guide = {
      races: [
        { office: "Governor", district: null, recommendedCandidate: "Favored", reasoning: "test", confidence: "Good Match" },
      ],
    };
    const score = scorePartisanBalance(guide, skewedBallot);
    // Should flag the pros imbalance
    expect(score.flags.some(f => f.includes("more pro text"))).toBe(true);
  });

  it("does not flag when pro text is roughly equal", () => {
    const equalBallot = {
      party: "democrat",
      races: [
        {
          office: "Governor",
          district: null,
          candidates: [
            { name: "Alice", isIncumbent: false, pros: ["Strong record on healthcare policy"], cons: ["Weak on housing"] },
            { name: "Bob", isIncumbent: false, pros: ["Fresh ideas on climate action"], cons: ["No experience"] },
          ],
        },
      ],
    };
    const guide = {
      races: [
        { office: "Governor", district: null, recommendedCandidate: "Alice", reasoning: "test", confidence: "Good Match" },
      ],
    };
    const score = scorePartisanBalance(guide, equalBallot);
    expect(score.flags.filter(f => f.includes("pro text"))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// scorePartisanBalance — sample ballot fixture
// ---------------------------------------------------------------------------
describe("scorePartisanBalance — sample ballot fixture", () => {
  const sampleGuide = {
    profileSummary: "Test voter",
    races: [
      {
        office: "U.S. Senator",
        district: null,
        recommendedCandidate: "Alice Johnson",
        reasoning: "Strong healthcare record matches voter priorities.",
        matchFactors: ["Healthcare focus", "Climate action"],
        confidence: "Strong Match",
      },
      {
        office: "State Rep",
        district: "District 46",
        recommendedCandidate: "Carol Davis",
        reasoning: "Housing focus aligns with voter values.",
        matchFactors: ["Affordable housing"],
        confidence: "Good Match",
      },
      {
        office: "Board of Education",
        district: "District 5",
        recommendedCandidate: "Eve Thompson",
        reasoning: "Only candidate running.",
        matchFactors: [],
        confidence: "Symbolic Race",
      },
    ],
    propositions: [
      { number: 1, recommendation: "Lean Yes", reasoning: "Aligns with transit priorities.", confidence: "Clear Call" },
    ],
  };

  it("produces a complete score for the sample ballot", () => {
    const score = scorePartisanBalance(sampleGuide, ballot);
    expect(score.party).toBe("democrat");
    expect(score.totalRaces).toBe(3);
  });

  it("correctly tracks contested race recommendations", () => {
    const score = scorePartisanBalance(sampleGuide, ballot);
    // Senator: Alice is incumbent -> incumbentRecs++
    // State Rep: Carol is not incumbent -> challengerRecs++
    // Board of Ed: uncontested -> skipped
    expect(score.incumbentRecs).toBe(1);
    expect(score.challengerRecs).toBe(1);
  });

  it("includes Symbolic Race in confidence distribution", () => {
    const score = scorePartisanBalance(sampleGuide, ballot);
    expect(score.confidenceDistribution["Symbolic Race"]).toBe(1);
  });

  it("calculates enthusiasm below 100% when Symbolic Race is present", () => {
    const score = scorePartisanBalance(sampleGuide, ballot);
    // 2 out of 3 are Strong/Good Match = 67%
    expect(score.enthusiasmPct).toBe(67);
  });
});

// ---------------------------------------------------------------------------
// buildUserPrompt — cached translations behavior
// ---------------------------------------------------------------------------
describe("buildUserPrompt — cached translations", () => {
  const profile = {
    politicalSpectrum: "Progressive",
    topIssues: ["Healthcare", "Climate"],
    candidateQualities: ["Integrity", "Experience"],
    policyViews: { immigration: "Path to citizenship" },
  };

  const cachedTranslations = [
    {
      name: "Alice Johnson",
      summary: "Senadora experimentada.",
      keyPositions: ["Salud universal"],
      pros: ["Historial legislativo fuerte"],
      cons: ["Vista como establishment"],
    },
  ];

  it("includes candidateTranslations schema for Spanish without cache", () => {
    const prompt = buildUserPrompt(profile, "desc", ballot, "democrat", "es", 3, null);
    expect(prompt).toContain("candidateTranslations");
    expect(prompt).toContain("Spanish translation of candidate summary");
  });

  it("excludes candidateTranslations schema for Spanish with cache", () => {
    const prompt = buildUserPrompt(profile, "desc", ballot, "democrat", "es", 3, cachedTranslations);
    expect(prompt).not.toContain("candidateTranslations");
    expect(prompt).not.toContain("Spanish translation of candidate summary");
  });

  it("still includes Spanish instruction for text fields when cache present", () => {
    const prompt = buildUserPrompt(profile, "desc", ballot, "democrat", "es", 3, cachedTranslations);
    expect(prompt).toContain("Write ALL text fields in Spanish");
  });

  it("does not include candidateTranslations schema for English regardless of cache", () => {
    const prompt = buildUserPrompt(profile, "desc", ballot, "democrat", "en", 3, null);
    expect(prompt).not.toContain("candidateTranslations");
    const prompt2 = buildUserPrompt(profile, "desc", ballot, "democrat", "en", 3, cachedTranslations);
    expect(prompt2).not.toContain("candidateTranslations");
  });
});

// ---------------------------------------------------------------------------
// mergeRecommendations — cached translations
// ---------------------------------------------------------------------------
describe("mergeRecommendations — cached translations", () => {
  const guideResponse = {
    profileSummary: "Test voter summary",
    races: [
      {
        office: "U.S. Senator",
        district: null,
        recommendedCandidate: "Alice Johnson",
        reasoning: "Fuerte historial en salud.",
        confidence: "Strong Match",
      },
    ],
    propositions: [],
  };

  const cachedTranslations = [
    {
      name: "Alice Johnson",
      summary: "Senadora experimentada enfocada en reforma de salud.",
      keyPositions: ["Salud universal", "Accion climatica"],
      pros: ["Historial legislativo fuerte"],
      cons: ["Vista como establishment"],
    },
    {
      name: "Bob Martinez",
      summary: "Candidato progresista con apoyo popular.",
      keyPositions: ["Green New Deal", "Medicare para Todos"],
      pros: ["Energiza a jovenes votantes"],
      cons: ["Sin experiencia legislativa"],
    },
  ];

  it("applies cached translations when provided for Spanish", () => {
    const merged = mergeRecommendations(guideResponse, ballot, "es", cachedTranslations);
    const alice = merged.races[0].candidates.find(c => c.name === "Alice Johnson");
    expect(alice.summary).toBe("Senadora experimentada enfocada en reforma de salud.");
    expect(alice.keyPositions).toEqual(["Salud universal", "Accion climatica"]);
    expect(alice.pros).toEqual(["Historial legislativo fuerte"]);
    expect(alice.cons).toEqual(["Vista como establishment"]);
  });

  it("applies cached translations to non-recommended candidates too", () => {
    const merged = mergeRecommendations(guideResponse, ballot, "es", cachedTranslations);
    const bob = merged.races[0].candidates.find(c => c.name === "Bob Martinez");
    expect(bob.summary).toBe("Candidato progresista con apoyo popular.");
    expect(bob.pros).toEqual(["Energiza a jovenes votantes"]);
  });

  it("prefers cached translations over LLM-generated ones", () => {
    const guideWithLlmTranslations = {
      ...guideResponse,
      candidateTranslations: [
        {
          name: "Alice Johnson",
          summary: "LLM-generated translation that should be ignored",
          keyPositions: ["LLM position"],
          pros: ["LLM pro"],
          cons: ["LLM con"],
        },
      ],
    };
    const merged = mergeRecommendations(guideWithLlmTranslations, ballot, "es", cachedTranslations);
    const alice = merged.races[0].candidates.find(c => c.name === "Alice Johnson");
    // Cached version should win over LLM-generated
    expect(alice.summary).toBe("Senadora experimentada enfocada en reforma de salud.");
    expect(alice.summary).not.toBe("LLM-generated translation that should be ignored");
  });

  it("falls back to LLM translations when no cache provided", () => {
    const guideWithLlmTranslations = {
      ...guideResponse,
      candidateTranslations: [
        {
          name: "Alice Johnson",
          summary: "Traduccion del LLM.",
          keyPositions: ["Posicion LLM"],
          pros: ["Pro LLM"],
          cons: ["Con LLM"],
        },
      ],
    };
    const merged = mergeRecommendations(guideWithLlmTranslations, ballot, "es", null);
    const alice = merged.races[0].candidates.find(c => c.name === "Alice Johnson");
    expect(alice.summary).toBe("Traduccion del LLM.");
  });

  it("does not apply cached translations for English", () => {
    const merged = mergeRecommendations(guideResponse, ballot, "en", cachedTranslations);
    const alice = merged.races[0].candidates.find(c => c.name === "Alice Johnson");
    expect(alice.summary).toBe("Experienced senator focused on healthcare reform.");
  });

  it("gracefully handles cached translations for unknown candidates", () => {
    const unknownCache = [
      { name: "Nobody Real", summary: "Nadie real", keyPositions: [], pros: [], cons: [] },
    ];
    const merged = mergeRecommendations(guideResponse, ballot, "es", unknownCache);
    const alice = merged.races[0].candidates.find(c => c.name === "Alice Johnson");
    // Alice should keep original English text since cache has no entry for her
    expect(alice.summary).toBe("Experienced senator focused on healthcare reform.");
  });
});

// ---------------------------------------------------------------------------
// loadCachedTranslations — mock KV tests
// ---------------------------------------------------------------------------
describe("loadCachedTranslations", () => {
  it("returns null when no translations exist in KV", async () => {
    const mockEnv = {
      ELECTION_DATA: {
        get: async () => null,
      },
    };
    const result = await loadCachedTranslations(mockEnv, "democrat", null);
    expect(result).toBeNull();
  });

  it("loads statewide translations from KV", async () => {
    const translations = [
      { name: "Alice Johnson", summary: "Senadora experimentada.", keyPositions: [], pros: [], cons: [] },
    ];
    const mockEnv = {
      ELECTION_DATA: {
        get: async (key) => {
          if (key === "translations:es:democrat_primary_2026") {
            return JSON.stringify(translations);
          }
          return null;
        },
      },
    };
    const result = await loadCachedTranslations(mockEnv, "democrat", null);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice Johnson");
  });

  it("merges statewide and county translations", async () => {
    const statewide = [
      { name: "Alice Johnson", summary: "Senadora.", keyPositions: [], pros: [], cons: [] },
    ];
    const county = [
      { name: "Local Candidate", summary: "Candidata local.", keyPositions: [], pros: [], cons: [] },
    ];
    const mockEnv = {
      ELECTION_DATA: {
        get: async (key) => {
          if (key === "translations:es:democrat_primary_2026") return JSON.stringify(statewide);
          if (key === "translations:es:county:48453:democrat_primary_2026") return JSON.stringify(county);
          return null;
        },
      },
    };
    const result = await loadCachedTranslations(mockEnv, "democrat", "48453");
    expect(result).toHaveLength(2);
    expect(result.map(t => t.name)).toContain("Alice Johnson");
    expect(result.map(t => t.name)).toContain("Local Candidate");
  });

  it("county translations override statewide for same candidate", async () => {
    const statewide = [
      { name: "Alice Johnson", summary: "Statewide version.", keyPositions: [], pros: [], cons: [] },
    ];
    const county = [
      { name: "Alice Johnson", summary: "County-specific version.", keyPositions: [], pros: [], cons: [] },
    ];
    const mockEnv = {
      ELECTION_DATA: {
        get: async (key) => {
          if (key === "translations:es:democrat_primary_2026") return JSON.stringify(statewide);
          if (key === "translations:es:county:48453:democrat_primary_2026") return JSON.stringify(county);
          return null;
        },
      },
    };
    const result = await loadCachedTranslations(mockEnv, "democrat", "48453");
    expect(result).toHaveLength(1);
    expect(result[0].summary).toBe("County-specific version.");
  });

  it("handles malformed JSON in KV gracefully", async () => {
    const mockEnv = {
      ELECTION_DATA: {
        get: async (key) => {
          if (key === "translations:es:democrat_primary_2026") return "not valid json";
          return null;
        },
      },
    };
    const result = await loadCachedTranslations(mockEnv, "democrat", null);
    expect(result).toBeNull();
  });

  it("skips county translations if not an array", async () => {
    const statewide = [
      { name: "Alice", summary: "Alicia.", keyPositions: [], pros: [], cons: [] },
    ];
    const mockEnv = {
      ELECTION_DATA: {
        get: async (key) => {
          if (key === "translations:es:democrat_primary_2026") return JSON.stringify(statewide);
          if (key === "translations:es:county:48453:democrat_primary_2026") return JSON.stringify({ notAnArray: true });
          return null;
        },
      },
    };
    const result = await loadCachedTranslations(mockEnv, "democrat", "48453");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });
});
