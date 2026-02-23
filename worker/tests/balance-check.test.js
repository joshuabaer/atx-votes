import { describe, it, expect } from "vitest";
import {
  resolveTone,
  resolveToneArray,
  analyzeCandidate,
  checkCandidateBalance,
  checkRaceBalance,
  checkBallotBalance,
  formatBalanceSummary,
} from "../src/balance-check.js";

// ---------------------------------------------------------------------------
// resolveTone
// ---------------------------------------------------------------------------
describe("resolveTone", () => {
  it("returns null for null input", () => {
    expect(resolveTone(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(resolveTone(undefined)).toBeNull();
  });

  it("returns plain strings unchanged", () => {
    expect(resolveTone("Strong record")).toBe("Strong record");
  });

  it("extracts tone 3 from tone-variant object", () => {
    const toneObj = { "1": "Simple", "3": "Standard", "5": "Expert" };
    expect(resolveTone(toneObj)).toBe("Standard");
  });

  it("falls back to first sorted key when tone 3 is missing", () => {
    const toneObj = { "1": "Simple", "5": "Expert" };
    expect(resolveTone(toneObj)).toBe("Simple");
  });

  it("returns null for empty object", () => {
    expect(resolveTone({})).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveToneArray
// ---------------------------------------------------------------------------
describe("resolveToneArray", () => {
  it("returns empty array for non-array input", () => {
    expect(resolveToneArray(null)).toEqual([]);
    expect(resolveToneArray(undefined)).toEqual([]);
    expect(resolveToneArray("string")).toEqual([]);
  });

  it("passes through plain string arrays", () => {
    expect(resolveToneArray(["A", "B"])).toEqual(["A", "B"]);
  });

  it("resolves tone-variant objects in array", () => {
    const arr = [
      { "1": "Simple A", "3": "Standard A" },
      { "1": "Simple B", "3": "Standard B" },
    ];
    expect(resolveToneArray(arr)).toEqual(["Standard A", "Standard B"]);
  });

  it("filters out null and undefined entries", () => {
    expect(resolveToneArray(["A", null, "B", undefined])).toEqual(["A", "B"]);
  });

  it("handles empty array", () => {
    expect(resolveToneArray([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// analyzeCandidate
// ---------------------------------------------------------------------------
describe("analyzeCandidate", () => {
  it("counts pros and cons correctly", () => {
    const candidate = {
      name: "Alice",
      pros: ["Strong record", "Bipartisan"],
      cons: ["Slow on housing"],
    };
    const result = analyzeCandidate(candidate);
    expect(result.name).toBe("Alice");
    expect(result.prosCount).toBe(2);
    expect(result.consCount).toBe(1);
  });

  it("calculates text lengths", () => {
    const candidate = {
      name: "Bob",
      pros: ["Good"],  // 4 chars
      cons: ["Bad"],   // 3 chars
    };
    const result = analyzeCandidate(candidate);
    expect(result.prosLength).toBe(4);
    expect(result.consLength).toBe(3);
  });

  it("calculates average lengths", () => {
    const candidate = {
      name: "Carol",
      pros: ["Short", "A bit longer text"],  // 5 + 18 = 23, avg ~12
      cons: ["Medium length"],                // 13, avg 13
    };
    const result = analyzeCandidate(candidate);
    // "Short" = 5, "A bit longer text" = 18, total = 23, avg = round(23/2) = 12
    // But actual: "A bit longer text".length = 18, so 5+18=23, round(23/2)=12
    // Let's just check against actual computed values
    const expectedProsTotal = "Short".length + "A bit longer text".length;
    expect(result.prosAvgLength).toBe(Math.round(expectedProsTotal / 2));
    expect(result.consAvgLength).toBe("Medium length".length);
  });

  it("handles missing pros and cons", () => {
    const candidate = { name: "Dan" };
    const result = analyzeCandidate(candidate);
    expect(result.prosCount).toBe(0);
    expect(result.consCount).toBe(0);
    expect(result.prosLength).toBe(0);
    expect(result.consLength).toBe(0);
    expect(result.prosAvgLength).toBe(0);
    expect(result.consAvgLength).toBe(0);
  });

  it("handles empty arrays", () => {
    const candidate = { name: "Eve", pros: [], cons: [] };
    const result = analyzeCandidate(candidate);
    expect(result.prosCount).toBe(0);
    expect(result.consCount).toBe(0);
  });

  it("handles tone-variant pros and cons", () => {
    const candidate = {
      name: "Frank",
      pros: [
        { "1": "Simple pro", "3": "Standard pro" },
        { "1": "Simple pro 2", "3": "Standard pro 2" },
      ],
      cons: [
        { "1": "Simple con", "3": "Standard con" },
      ],
    };
    const result = analyzeCandidate(candidate);
    expect(result.prosCount).toBe(2);
    expect(result.consCount).toBe(1);
    // Should use tone 3 versions
    expect(result.prosLength).toBe("Standard pro".length + "Standard pro 2".length);
    expect(result.consLength).toBe("Standard con".length);
  });
});

// ---------------------------------------------------------------------------
// checkCandidateBalance
// ---------------------------------------------------------------------------
describe("checkCandidateBalance", () => {
  it("returns no flags for balanced candidate", () => {
    const analysis = {
      name: "Alice",
      prosCount: 2,
      consCount: 2,
      prosLength: 50,
      consLength: 48,
      prosAvgLength: 25,
      consAvgLength: 24,
    };
    const flags = checkCandidateBalance(analysis);
    expect(flags).toHaveLength(0);
  });

  it("flags missing pros as critical", () => {
    const analysis = {
      name: "Bob",
      prosCount: 0,
      consCount: 2,
      prosLength: 0,
      consLength: 40,
      prosAvgLength: 0,
      consAvgLength: 20,
    };
    const flags = checkCandidateBalance(analysis);
    expect(flags).toHaveLength(1);
    expect(flags[0].type).toBe("missing_pros");
    expect(flags[0].severity).toBe("critical");
    expect(flags[0].candidate).toBe("Bob");
  });

  it("flags missing cons as critical", () => {
    const analysis = {
      name: "Carol",
      prosCount: 3,
      consCount: 0,
      prosLength: 60,
      consLength: 0,
      prosAvgLength: 20,
      consAvgLength: 0,
    };
    const flags = checkCandidateBalance(analysis);
    expect(flags).toHaveLength(1);
    expect(flags[0].type).toBe("missing_cons");
    expect(flags[0].severity).toBe("critical");
  });

  it("flags both missing as warning (not critical)", () => {
    const analysis = {
      name: "Dan",
      prosCount: 0,
      consCount: 0,
      prosLength: 0,
      consLength: 0,
      prosAvgLength: 0,
      consAvgLength: 0,
    };
    const flags = checkCandidateBalance(analysis);
    expect(flags).toHaveLength(1);
    expect(flags[0].type).toBe("missing_both");
    expect(flags[0].severity).toBe("warning");
  });

  it("flags count imbalance when ratio exceeds 2:1", () => {
    const analysis = {
      name: "Eve",
      prosCount: 5,
      consCount: 1,
      prosLength: 100,
      consLength: 20,
      prosAvgLength: 20,
      consAvgLength: 20,
    };
    const flags = checkCandidateBalance(analysis);
    const countFlag = flags.find(f => f.type === "count_imbalance");
    expect(countFlag).toBeDefined();
    expect(countFlag.severity).toBe("warning");
    expect(countFlag.detail).toContain("5.0:1");
  });

  it("does not flag count imbalance at exactly 2:1", () => {
    const analysis = {
      name: "Frank",
      prosCount: 2,
      consCount: 1,
      prosLength: 40,
      consLength: 20,
      prosAvgLength: 20,
      consAvgLength: 20,
    };
    const flags = checkCandidateBalance(analysis);
    const countFlag = flags.find(f => f.type === "count_imbalance");
    expect(countFlag).toBeUndefined();
  });

  it("flags length imbalance when ratio exceeds 2x", () => {
    const analysis = {
      name: "Grace",
      prosCount: 2,
      consCount: 2,
      prosLength: 200,
      consLength: 50,
      prosAvgLength: 100,
      consAvgLength: 25,
    };
    const flags = checkCandidateBalance(analysis);
    const lengthFlag = flags.find(f => f.type === "length_imbalance");
    expect(lengthFlag).toBeDefined();
    expect(lengthFlag.severity).toBe("info");
    expect(lengthFlag.detail).toContain("pros");
  });

  it("identifies cons as the longer side when appropriate", () => {
    const analysis = {
      name: "Hank",
      prosCount: 1,
      consCount: 1,
      prosLength: 10,
      consLength: 50,
      prosAvgLength: 10,
      consAvgLength: 50,
    };
    const flags = checkCandidateBalance(analysis);
    const lengthFlag = flags.find(f => f.type === "length_imbalance");
    expect(lengthFlag).toBeDefined();
    expect(lengthFlag.detail).toContain("cons");
  });

  it("does not flag length imbalance at exactly 2x", () => {
    const analysis = {
      name: "Iris",
      prosCount: 2,
      consCount: 2,
      prosLength: 100,
      consLength: 50,
      prosAvgLength: 50,
      consAvgLength: 25,
    };
    const flags = checkCandidateBalance(analysis);
    const lengthFlag = flags.find(f => f.type === "length_imbalance");
    expect(lengthFlag).toBeUndefined();
  });

  it("can return multiple flags for severely imbalanced candidate", () => {
    const analysis = {
      name: "Jack",
      prosCount: 6,
      consCount: 1,
      prosLength: 300,
      consLength: 15,
      prosAvgLength: 50,
      consAvgLength: 15,
    };
    const flags = checkCandidateBalance(analysis);
    expect(flags.length).toBeGreaterThanOrEqual(2);
    const types = flags.map(f => f.type);
    expect(types).toContain("count_imbalance");
    expect(types).toContain("length_imbalance");
  });
});

// ---------------------------------------------------------------------------
// checkRaceBalance
// ---------------------------------------------------------------------------
describe("checkRaceBalance", () => {
  it("returns no flags for a balanced race", () => {
    const race = {
      office: "Governor",
      candidates: [
        { name: "Alice", pros: ["Strong record", "Bipartisan"], cons: ["Slow on housing", "Establishment"] },
        { name: "Bob", pros: ["Fresh ideas", "Grassroots support"], cons: ["No experience", "Thin endorsements"] },
      ],
    };
    const { raceFlags } = checkRaceBalance(race);
    expect(raceFlags).toHaveLength(0);
  });

  it("flags cross-candidate detail imbalance when one candidate has much more text", () => {
    const race = {
      office: "Senator",
      candidates: [
        {
          name: "Alice",
          pros: ["A very detailed and comprehensive analysis of this candidate's strong legislative record spanning decades"],
          cons: ["An equally detailed critique of their slow response to housing crisis and establishment ties"],
        },
        {
          name: "Bob",
          pros: ["OK"],
          cons: ["Meh"],
        },
      ],
    };
    const { raceFlags } = checkRaceBalance(race);
    const detailFlag = raceFlags.find(f => f.type === "cross_candidate_detail");
    expect(detailFlag).toBeDefined();
    expect(detailFlag.severity).toBe("warning");
    expect(detailFlag.detail).toContain("Alice");
    expect(detailFlag.detail).toContain("Bob");
  });

  it("flags candidate with no pros/cons when others have them", () => {
    const race = {
      office: "AG",
      candidates: [
        { name: "Alice", pros: ["Good"], cons: ["Bad"] },
        { name: "Bob", pros: [], cons: [] },
      ],
    };
    const { raceFlags } = checkRaceBalance(race);
    const missingFlag = raceFlags.find(f => f.type === "cross_candidate_missing");
    expect(missingFlag).toBeDefined();
    expect(missingFlag.severity).toBe("critical");
    expect(missingFlag.detail).toContain("Bob");
  });

  it("skips withdrawn candidates", () => {
    const race = {
      office: "Governor",
      candidates: [
        { name: "Alice", pros: ["Good"], cons: ["Bad"] },
        { name: "Bob", pros: [], cons: [], withdrawn: true },
      ],
    };
    const { raceFlags, candidateAnalyses } = checkRaceBalance(race);
    // Only Alice should be analyzed (Bob is withdrawn)
    expect(candidateAnalyses).toHaveLength(1);
    expect(candidateAnalyses[0].name).toBe("Alice");
    // No cross-candidate flags since there's effectively only one candidate
    const crossFlags = raceFlags.filter(f => f.type.startsWith("cross_"));
    expect(crossFlags).toHaveLength(0);
  });

  it("handles single-candidate (uncontested) race", () => {
    const race = {
      office: "Board of Education",
      candidates: [
        { name: "Eve", pros: ["Expert"], cons: ["Unopposed"] },
      ],
    };
    const { raceFlags } = checkRaceBalance(race);
    expect(raceFlags).toHaveLength(0);
  });

  it("handles race with no candidates", () => {
    const race = { office: "Empty", candidates: [] };
    const { raceFlags, candidateAnalyses } = checkRaceBalance(race);
    expect(raceFlags).toHaveLength(0);
    expect(candidateAnalyses).toHaveLength(0);
  });

  it("flags pros count spread across candidates", () => {
    const race = {
      office: "Governor",
      candidates: [
        { name: "Alice", pros: ["A", "B", "C", "D", "E"], cons: ["X"] },
        { name: "Bob", pros: ["A"], cons: ["X"] },
      ],
    };
    const { raceFlags } = checkRaceBalance(race);
    const prosCountFlag = raceFlags.find(f => f.type === "cross_candidate_pros_count");
    expect(prosCountFlag).toBeDefined();
    expect(prosCountFlag.detail).toContain("1");
    expect(prosCountFlag.detail).toContain("5");
  });

  it("flags cons count spread across candidates", () => {
    const race = {
      office: "Governor",
      candidates: [
        { name: "Alice", pros: ["A"], cons: ["X", "Y", "Z", "W", "V"] },
        { name: "Bob", pros: ["A"], cons: ["X"] },
      ],
    };
    const { raceFlags } = checkRaceBalance(race);
    const consCountFlag = raceFlags.find(f => f.type === "cross_candidate_cons_count");
    expect(consCountFlag).toBeDefined();
  });

  it("does not flag minor count spread (2 vs 1)", () => {
    const race = {
      office: "Governor",
      candidates: [
        { name: "Alice", pros: ["A", "B"], cons: ["X"] },
        { name: "Bob", pros: ["A"], cons: ["X"] },
      ],
    };
    const { raceFlags } = checkRaceBalance(race);
    // 2 vs 1 is 2:1 ratio but difference is only 1, below the threshold of 2
    const prosCountFlag = raceFlags.find(f => f.type === "cross_candidate_pros_count");
    expect(prosCountFlag).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// checkBallotBalance
// ---------------------------------------------------------------------------
describe("checkBallotBalance", () => {
  it("returns perfect score for well-balanced ballot", () => {
    const ballot = {
      races: [
        {
          office: "Governor",
          candidates: [
            { name: "Alice", pros: ["Strong record", "Bipartisan"], cons: ["Slow on housing", "Establishment"] },
            { name: "Bob", pros: ["Fresh ideas", "Grassroots"], cons: ["No experience", "Thin support"] },
          ],
        },
      ],
    };
    const report = checkBallotBalance(ballot);
    expect(report.summary.score).toBe(100);
    expect(report.summary.totalFlags).toBe(0);
    expect(report.summary.totalRaces).toBe(1);
    expect(report.summary.totalCandidates).toBe(2);
  });

  it("handles null ballot gracefully", () => {
    const report = checkBallotBalance(null);
    expect(report.summary.score).toBe(100);
    expect(report.summary.totalRaces).toBe(0);
    expect(report.summary.totalCandidates).toBe(0);
    expect(report.races).toHaveLength(0);
  });

  it("handles ballot with no races", () => {
    const report = checkBallotBalance({ races: [] });
    expect(report.summary.score).toBe(100);
    expect(report.races).toHaveLength(0);
  });

  it("handles ballot with no races key", () => {
    const report = checkBallotBalance({});
    expect(report.summary.score).toBe(100);
  });

  it("deducts points for critical flags", () => {
    const ballot = {
      races: [
        {
          office: "Governor",
          candidates: [
            { name: "Alice", pros: ["Strong record"], cons: [] }, // missing cons = critical
            { name: "Bob", pros: ["Fresh ideas"], cons: ["No experience"] },
          ],
        },
      ],
    };
    const report = checkBallotBalance(ballot);
    expect(report.summary.criticalCount).toBeGreaterThan(0);
    expect(report.summary.score).toBeLessThan(100);
  });

  it("deducts more points for multiple flags", () => {
    const ballot = {
      races: [
        {
          office: "Governor",
          candidates: [
            { name: "Alice", pros: ["Strong record"], cons: [] },
            { name: "Bob", pros: [], cons: ["No experience"] },
          ],
        },
      ],
    };
    const report = checkBallotBalance(ballot);
    expect(report.summary.criticalCount).toBeGreaterThanOrEqual(2);
    expect(report.summary.score).toBeLessThanOrEqual(80);
  });

  it("excludes withdrawn candidates from count", () => {
    const ballot = {
      races: [
        {
          office: "Governor",
          candidates: [
            { name: "Alice", pros: ["Good"], cons: ["Bad"] },
            { name: "Bob", pros: ["Good"], cons: ["Bad"], withdrawn: true },
          ],
        },
      ],
    };
    const report = checkBallotBalance(ballot);
    expect(report.summary.totalCandidates).toBe(1);
  });

  it("includes race labels with district info", () => {
    const ballot = {
      races: [
        {
          office: "State Rep",
          district: "District 46",
          candidates: [
            { name: "Carol", pros: ["Good"], cons: ["Bad"] },
          ],
        },
      ],
    };
    const report = checkBallotBalance(ballot);
    expect(report.races[0].label).toBe("State Rep — District 46");
  });

  it("aggregates flags from multiple races correctly", () => {
    const ballot = {
      races: [
        {
          office: "Governor",
          candidates: [
            { name: "Alice", pros: ["A"], cons: [] }, // missing cons
            { name: "Bob", pros: ["B"], cons: ["C"] },
          ],
        },
        {
          office: "AG",
          candidates: [
            { name: "Carol", pros: [], cons: ["D"] }, // missing pros
            { name: "Dan", pros: ["E"], cons: ["F"] },
          ],
        },
      ],
    };
    const report = checkBallotBalance(ballot);
    expect(report.summary.totalRaces).toBe(2);
    expect(report.summary.totalCandidates).toBe(4);
    expect(report.summary.criticalCount).toBeGreaterThanOrEqual(2);
  });

  it("score never goes below 0", () => {
    const ballot = {
      races: Array.from({ length: 5 }, (_, i) => ({
        office: `Race ${i}`,
        candidates: [
          { name: `Alice ${i}`, pros: [], cons: [] },
          { name: `Bob ${i}`, pros: ["A", "B", "C", "D", "E"], cons: [] },
        ],
      })),
    };
    const report = checkBallotBalance(ballot);
    expect(report.summary.score).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// checkBallotBalance — using sample ballot fixture
// ---------------------------------------------------------------------------
describe("checkBallotBalance — sample ballot fixture", () => {
  // The sample ballot has well-structured pros/cons for most candidates
  const { readFileSync } = require("fs");
  const { join } = require("path");
  const ballot = JSON.parse(
    readFileSync(join(__dirname, "fixtures/sample-ballot.json"), "utf-8")
  );

  it("produces a report for the sample ballot", () => {
    const report = checkBallotBalance(ballot);
    expect(report.summary.totalRaces).toBe(3);
    expect(report.summary.totalCandidates).toBe(5);
    expect(report.races).toHaveLength(3);
  });

  it("analyzes all active candidates", () => {
    const report = checkBallotBalance(ballot);
    const allCandidates = report.races.flatMap(r => r.candidates);
    expect(allCandidates).toHaveLength(5);
    // All candidates in the sample have pros and cons
    for (const c of allCandidates) {
      expect(c.prosCount).toBeGreaterThan(0);
      expect(c.consCount).toBeGreaterThan(0);
    }
  });

  it("sample ballot is reasonably well balanced", () => {
    const report = checkBallotBalance(ballot);
    // The sample ballot should score fairly well
    expect(report.summary.score).toBeGreaterThanOrEqual(80);
  });
});

// ---------------------------------------------------------------------------
// formatBalanceSummary
// ---------------------------------------------------------------------------
describe("formatBalanceSummary", () => {
  it("formats a clean report with no flags", () => {
    const report = {
      summary: { totalRaces: 2, totalCandidates: 4, totalFlags: 0, score: 100, criticalCount: 0, warningCount: 0, infoCount: 0 },
      races: [],
    };
    const summary = formatBalanceSummary(report);
    expect(summary).toContain("Balance Score: 100/100");
    expect(summary).toContain("Races: 2");
    expect(summary).toContain("Candidates: 4");
    expect(summary).toContain("Flags: 0");
  });

  it("includes flag details when flags exist", () => {
    const report = {
      summary: { totalRaces: 1, totalCandidates: 2, totalFlags: 1, score: 90, criticalCount: 1, warningCount: 0, infoCount: 0 },
      races: [
        {
          label: "Governor",
          flagCount: 1,
          raceFlags: [],
          candidates: [
            {
              name: "Alice",
              flags: [{ type: "missing_cons", candidate: "Alice", detail: "Has 2 pros but no cons", severity: "critical" }],
            },
          ],
        },
      ],
    };
    const summary = formatBalanceSummary(report);
    expect(summary).toContain("Governor:");
    expect(summary).toContain("[CRITICAL]");
    expect(summary).toContain("Alice");
    expect(summary).toContain("no cons");
  });

  it("includes race-level flags", () => {
    const report = {
      summary: { totalRaces: 1, totalCandidates: 2, totalFlags: 1, score: 95, criticalCount: 0, warningCount: 1, infoCount: 0 },
      races: [
        {
          label: "Senator",
          flagCount: 1,
          raceFlags: [{ type: "cross_candidate_detail", detail: "Alice has 200 chars vs Bob with 20 chars", severity: "warning" }],
          candidates: [],
        },
      ],
    };
    const summary = formatBalanceSummary(report);
    expect(summary).toContain("Senator:");
    expect(summary).toContain("[WARNING]");
    expect(summary).toContain("Alice has 200 chars");
  });

  it("skips races with no flags", () => {
    const report = {
      summary: { totalRaces: 2, totalCandidates: 4, totalFlags: 1, score: 95, criticalCount: 0, warningCount: 1, infoCount: 0 },
      races: [
        { label: "Governor", flagCount: 0, raceFlags: [], candidates: [] },
        {
          label: "Senator",
          flagCount: 1,
          raceFlags: [{ type: "cross_candidate_detail", detail: "Imbalance detected", severity: "warning" }],
          candidates: [],
        },
      ],
    };
    const summary = formatBalanceSummary(report);
    expect(summary).not.toContain("Governor:");
    expect(summary).toContain("Senator:");
  });
});
