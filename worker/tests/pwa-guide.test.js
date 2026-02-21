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
    expect(prompt).toContain("Healthcare, Climate");
    expect(prompt).toContain("Integrity, Experience");
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
});
