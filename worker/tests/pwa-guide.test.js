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
