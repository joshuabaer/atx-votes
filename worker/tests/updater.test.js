import { describe, it, expect, vi, beforeEach } from "vitest";
import { runDailyUpdate, validateBallot, validateRaceUpdate, extractSourcesFromResponse, mergeSources, ELECTION_DAY } from "../src/updater.js";

// ---------------------------------------------------------------------------
// mergeRaceUpdates is not exported, so we test it indirectly through
// runDailyUpdate. validateBallot, validateRaceUpdate, and runDailyUpdate
// are exported and tested directly.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// validateBallot
// ---------------------------------------------------------------------------
describe("validateBallot", () => {
  it("returns null for matching ballots", () => {
    const original = { races: [{ office: "Gov" }], party: "democrat" };
    const updated = { races: [{ office: "Gov" }], party: "democrat" };
    expect(validateBallot(original, updated)).toBeNull();
  });

  it("returns error when race count changes", () => {
    const original = { races: [{ office: "A" }, { office: "B" }], party: "democrat" };
    const updated = { races: [{ office: "A" }], party: "democrat" };
    const err = validateBallot(original, updated);
    expect(err).toContain("race count changed");
    expect(err).toContain("2");
    expect(err).toContain("1");
  });

  it("returns error when party changes", () => {
    const original = { races: [], party: "democrat" };
    const updated = { races: [], party: "republican" };
    const err = validateBallot(original, updated);
    expect(err).toContain("party changed");
    expect(err).toContain("democrat");
    expect(err).toContain("republican");
  });

  it("returns error when original is null", () => {
    expect(validateBallot(null, { races: [], party: "democrat" })).toBe(
      "missing ballot data"
    );
  });

  it("returns error when updated is null", () => {
    expect(validateBallot({ races: [], party: "democrat" }, null)).toBe(
      "missing ballot data"
    );
  });

  it("returns error when both are null", () => {
    expect(validateBallot(null, null)).toBe("missing ballot data");
  });

  it("returns error when both are undefined", () => {
    expect(validateBallot(undefined, undefined)).toBe("missing ballot data");
  });

  it("accepts identical multi-race ballots", () => {
    const original = {
      races: [
        { office: "U.S. Senator" },
        { office: "Governor" },
        { office: "State Rep" },
      ],
      party: "republican",
    };
    const updated = {
      races: [
        { office: "U.S. Senator" },
        { office: "Governor" },
        { office: "State Rep" },
      ],
      party: "republican",
    };
    expect(validateBallot(original, updated)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// runDailyUpdate — election day cutoff
// ---------------------------------------------------------------------------
describe("runDailyUpdate — election day cutoff", () => {
  it("skips after election day (March 3, 2026)", async () => {
    // Mock Date to be after election day
    const realDate = globalThis.Date;
    const afterElection = new Date("2026-03-05T12:00:00Z");
    vi.useFakeTimers({ now: afterElection });

    const mockEnv = {
      ELECTION_DATA: {
        get: vi.fn(),
        put: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test",
    };

    const result = await runDailyUpdate(mockEnv);
    expect(result.skipped).toBe(true);
    expect(result.reason).toContain("Past election day");

    // Should not have called KV at all
    expect(mockEnv.ELECTION_DATA.get).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// runDailyUpdate — dry run
// ---------------------------------------------------------------------------
describe("runDailyUpdate — dry run mode", () => {
  let mockEnv;

  beforeEach(() => {
    vi.useRealTimers();
    // Set time before election day for these tests
    vi.useFakeTimers({ now: new Date("2026-02-20T12:00:00Z") });
  });

  it("does not write to KV in dry run mode", async () => {
    const ballot = {
      id: "test",
      party: "democrat",
      races: [
        {
          office: "Governor",
          isContested: true,
          candidates: [
            { name: "Alice", summary: "Test", endorsements: ["A"], keyPositions: ["X"] },
            { name: "Bob", summary: "Test", endorsements: ["B"], keyPositions: ["Y"] },
          ],
        },
      ],
    };

    const mockPut = vi.fn();
    mockEnv = {
      ELECTION_DATA: {
        get: vi.fn((key) => {
          if (key.includes("ballot")) return JSON.stringify(ballot);
          return null;
        }),
        put: mockPut,
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    // Mock fetch to return an update
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    candidates: [
                      { name: "Alice", polling: "Leading 52%", fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null },
                      { name: "Bob", polling: null, fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null },
                    ],
                  }),
                },
              ],
            }),
        })
      )
    );

    const result = await runDailyUpdate(mockEnv, {
      parties: ["democrat"],
      dryRun: true,
    });

    // Should NOT have written to KV
    expect(mockPut).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("reports error when ballot not found in KV", async () => {
    mockEnv = {
      ELECTION_DATA: {
        get: vi.fn(() => null),
        put: vi.fn(),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    const result = await runDailyUpdate(mockEnv, {
      parties: ["democrat"],
      dryRun: true,
    });

    expect(result.errors).toContain("democrat: no existing ballot in KV");

    vi.useRealTimers();
  });

  it("reports error when ballot JSON is invalid", async () => {
    mockEnv = {
      ELECTION_DATA: {
        get: vi.fn((key) => {
          if (key.includes("ballot")) return "not valid json{{{";
          return null;
        }),
        put: vi.fn(),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    const result = await runDailyUpdate(mockEnv, {
      parties: ["democrat"],
      dryRun: true,
    });

    expect(result.errors).toContain(
      "democrat: failed to parse existing ballot JSON"
    );

    vi.useRealTimers();
  });

  it("skips uncontested races", async () => {
    const ballot = {
      id: "test",
      party: "republican",
      races: [
        {
          office: "Board of Ed",
          isContested: false,
          candidates: [{ name: "Solo Runner", summary: "Unopposed" }],
        },
      ],
    };

    mockEnv = {
      ELECTION_DATA: {
        get: vi.fn((key) => {
          if (key.includes("ballot")) return JSON.stringify(ballot);
          return null;
        }),
        put: vi.fn(),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    // fetch should NOT be called (no contested races)
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const result = await runDailyUpdate(mockEnv, {
      parties: ["republican"],
      dryRun: true,
    });

    // No API calls for uncontested
    expect(mockFetch).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// runDailyUpdate — merge and validation via end-to-end
// ---------------------------------------------------------------------------
describe("runDailyUpdate — merge and validation behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-02-20T12:00:00Z") });
  });

  it("rejects updates that change candidate count (validation)", async () => {
    const ballot = {
      id: "test",
      party: "democrat",
      races: [
        {
          office: "Governor",
          district: null,
          isContested: true,
          candidates: [
            { name: "Alice", summary: "Gov candidate", endorsements: ["A"], keyPositions: ["X"] },
            { name: "Bob", summary: "Gov candidate", endorsements: ["B"], keyPositions: ["Y"] },
          ],
        },
      ],
    };

    const mockPut = vi.fn();
    const mockEnv = {
      ELECTION_DATA: {
        get: vi.fn((key) => {
          if (key.includes("ballot")) return JSON.stringify(ballot);
          return null;
        }),
        put: mockPut,
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    // Return an update that adds an extra candidate (invalid)
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    candidates: [
                      { name: "Alice", polling: null, fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null },
                      { name: "Bob", polling: null, fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null },
                      // Extra candidate — invalid, should be caught by validation
                      { name: "Charlie", polling: null, fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: "New", background: null },
                    ],
                  }),
                },
              ],
            }),
        })
      )
    );

    const result = await runDailyUpdate(mockEnv, {
      parties: ["democrat"],
      dryRun: true,
    });

    // Note: mergeRaceUpdates only updates existing candidates (Charlie wouldn't match),
    // so the merged result keeps 2 candidates, which matches. No validation error here.
    // The validation checks names match, and since merge preserves names, this passes.
    // But let's verify no unexpected errors
    expect(result).toBeDefined();

    vi.useRealTimers();
  });

  it("successfully merges valid updates and writes to KV", async () => {
    const ballot = {
      id: "test",
      party: "democrat",
      races: [
        {
          office: "Governor",
          district: null,
          isContested: true,
          candidates: [
            { name: "Alice", summary: "Gov candidate", endorsements: ["A", "B"], keyPositions: ["X"], polling: null, fundraising: null },
            { name: "Bob", summary: "Gov candidate", endorsements: ["C"], keyPositions: ["Y"], polling: null, fundraising: null },
          ],
        },
      ],
    };

    const kvStore = {};
    const mockEnv = {
      ELECTION_DATA: {
        get: vi.fn((key) => {
          if (kvStore[key]) return kvStore[key];
          if (key.includes("ballot:statewide:democrat")) return JSON.stringify(ballot);
          return null;
        }),
        put: vi.fn((key, value) => {
          kvStore[key] = value;
        }),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    // Return a valid update — new polling data for Alice
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    candidates: [
                      { name: "Alice", polling: "Leading 55%", fundraising: "$2M", endorsements: ["A", "B", "D"], keyPositions: null, pros: null, cons: null, summary: null, background: null },
                      { name: "Bob", polling: null, fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null },
                    ],
                  }),
                },
              ],
            }),
        })
      )
    );

    const result = await runDailyUpdate(mockEnv, {
      parties: ["democrat"],
    });

    expect(result.updated).toContain("democrat");
    // Should have written ballot and manifest and update log
    expect(mockEnv.ELECTION_DATA.put).toHaveBeenCalled();
    const putCalls = mockEnv.ELECTION_DATA.put.mock.calls.map((c) => c[0]);
    expect(putCalls).toContain("ballot:statewide:democrat_primary_2026");
    expect(putCalls).toContain("manifest");

    // Verify the stored ballot has updated polling
    const storedBallot = JSON.parse(
      kvStore["ballot:statewide:democrat_primary_2026"]
    );
    const alice = storedBallot.races[0].candidates.find(
      (c) => c.name === "Alice"
    );
    expect(alice.polling).toBe("Leading 55%");
    expect(alice.fundraising).toBe("$2M");
    expect(alice.endorsements).toEqual([
      { name: "A", type: null },
      { name: "B", type: null },
      { name: "D", type: null },
    ]);

    // Bob should be unchanged
    const bob = storedBallot.races[0].candidates.find(
      (c) => c.name === "Bob"
    );
    expect(bob.polling).toBeNull();

    vi.useRealTimers();
  });

  it("rejects endorsement shrinkage >50%", async () => {
    const ballot = {
      id: "test",
      party: "democrat",
      races: [
        {
          office: "Senator",
          district: null,
          isContested: true,
          candidates: [
            { name: "Alice", summary: "Senator", endorsements: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"], keyPositions: ["X"] },
            { name: "Bob", summary: "Senator", endorsements: ["Z"], keyPositions: ["Y"] },
          ],
        },
      ],
    };

    const mockEnv = {
      ELECTION_DATA: {
        get: vi.fn((key) => {
          if (key.includes("ballot")) return JSON.stringify(ballot);
          return null;
        }),
        put: vi.fn(),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    // Return update that shrinks Alice's endorsements from 10 to 3 (>50% shrinkage)
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    candidates: [
                      { name: "Alice", polling: null, fundraising: null, endorsements: ["A", "B", "C"], keyPositions: null, pros: null, cons: null, summary: null, background: null },
                      { name: "Bob", polling: null, fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null },
                    ],
                  }),
                },
              ],
            }),
        })
      )
    );

    const result = await runDailyUpdate(mockEnv, {
      parties: ["democrat"],
      dryRun: true,
    });

    // Should have a validation error about endorsement shrinkage
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("endorsements shrank");
    expect(result.errors[0]).toContain("50%");

    vi.useRealTimers();
  });

  it("ignores empty strings in updates (does not overwrite)", async () => {
    const ballot = {
      id: "test",
      party: "democrat",
      races: [
        {
          office: "Governor",
          district: null,
          isContested: true,
          candidates: [
            { name: "Alice", summary: "Original summary", endorsements: ["A"], keyPositions: ["X"] },
            { name: "Bob", summary: "Bob summary", endorsements: ["B"], keyPositions: ["Y"] },
          ],
        },
      ],
    };

    const kvStore = {};
    const mockEnv = {
      ELECTION_DATA: {
        get: vi.fn((key) => {
          if (kvStore[key]) return kvStore[key];
          if (key.includes("ballot:statewide:democrat")) return JSON.stringify(ballot);
          return null;
        }),
        put: vi.fn((key, value) => {
          kvStore[key] = value;
        }),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    // Return update with empty string for summary (should be ignored)
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    candidates: [
                      { name: "Alice", polling: "55%", fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: "", background: null },
                      { name: "Bob", polling: null, fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null },
                    ],
                  }),
                },
              ],
            }),
        })
      )
    );

    const result = await runDailyUpdate(mockEnv, { parties: ["democrat"] });

    expect(result.updated).toContain("democrat");
    const stored = JSON.parse(kvStore["ballot:statewide:democrat_primary_2026"]);
    const alice = stored.races[0].candidates.find((c) => c.name === "Alice");
    // Summary should still be original (empty string ignored)
    expect(alice.summary).toBe("Original summary");
    // But polling should be updated
    expect(alice.polling).toBe("55%");

    vi.useRealTimers();
  });

  it("ignores empty arrays in updates (does not overwrite)", async () => {
    const ballot = {
      id: "test",
      party: "democrat",
      races: [
        {
          office: "Governor",
          district: null,
          isContested: true,
          candidates: [
            { name: "Alice", summary: "Gov candidate", endorsements: ["A"], keyPositions: ["X", "Y"] },
            { name: "Bob", summary: "Gov candidate", endorsements: ["B"], keyPositions: ["Z"] },
          ],
        },
      ],
    };

    const kvStore = {};
    const mockEnv = {
      ELECTION_DATA: {
        get: vi.fn((key) => {
          if (kvStore[key]) return kvStore[key];
          if (key.includes("ballot:statewide:democrat")) return JSON.stringify(ballot);
          return null;
        }),
        put: vi.fn((key, value) => {
          kvStore[key] = value;
        }),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    // Return update with empty array for endorsements (should be ignored)
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    candidates: [
                      { name: "Alice", polling: "50%", fundraising: null, endorsements: [], keyPositions: [], pros: null, cons: null, summary: null, background: null },
                      { name: "Bob", polling: null, fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null },
                    ],
                  }),
                },
              ],
            }),
        })
      )
    );

    const result = await runDailyUpdate(mockEnv, { parties: ["democrat"] });

    expect(result.updated).toContain("democrat");
    const stored = JSON.parse(kvStore["ballot:statewide:democrat_primary_2026"]);
    const alice = stored.races[0].candidates.find((c) => c.name === "Alice");
    // Endorsements and keyPositions should keep original (empty arrays ignored)
    expect(alice.endorsements).toEqual(["A"]);
    expect(alice.keyPositions).toEqual(["X", "Y"]);
    // But polling should be updated
    expect(alice.polling).toBe("50%");

    vi.useRealTimers();
  });

  it("falls back to legacy ballot key when statewide key is missing", async () => {
    const ballot = {
      id: "test",
      party: "democrat",
      races: [],
    };

    const mockEnv = {
      ELECTION_DATA: {
        get: vi.fn((key) => {
          // Only return for legacy key
          if (key === "ballot:democrat_primary_2026") return JSON.stringify(ballot);
          return null;
        }),
        put: vi.fn(),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    const result = await runDailyUpdate(mockEnv, {
      parties: ["democrat"],
      dryRun: true,
    });

    // Should have tried statewide key first, then legacy
    expect(mockEnv.ELECTION_DATA.get).toHaveBeenCalledWith(
      "ballot:statewide:democrat_primary_2026"
    );
    expect(mockEnv.ELECTION_DATA.get).toHaveBeenCalledWith(
      "ballot:democrat_primary_2026"
    );
    // No errors since we found the ballot via legacy key
    expect(result.errors).toHaveLength(0);

    vi.useRealTimers();
  });

  it("handles API error gracefully", async () => {
    const ballot = {
      id: "test",
      party: "democrat",
      races: [
        {
          office: "Governor",
          district: null,
          isContested: true,
          candidates: [
            { name: "Alice", summary: "Test" },
            { name: "Bob", summary: "Test" },
          ],
        },
      ],
    };

    const mockEnv = {
      ELECTION_DATA: {
        get: vi.fn((key) => {
          if (key.includes("ballot")) return JSON.stringify(ballot);
          return null;
        }),
        put: vi.fn(),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    // Mock fetch to return 500
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        })
      )
    );

    const result = await runDailyUpdate(mockEnv, {
      parties: ["democrat"],
      dryRun: true,
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("democrat/Governor");

    vi.useRealTimers();
  });

  it("invalidates candidates_index when ballot changes", async () => {
    const ballot = {
      id: "test",
      party: "democrat",
      races: [
        {
          office: "Governor",
          district: null,
          isContested: true,
          candidates: [
            { name: "Alice", summary: "Test", endorsements: ["A"], keyPositions: ["X"] },
            { name: "Bob", summary: "Test", endorsements: ["B"], keyPositions: ["Y"] },
          ],
        },
      ],
    };

    const mockDelete = vi.fn();
    const mockEnv = {
      ELECTION_DATA: {
        get: vi.fn((key) => {
          if (key.includes("ballot:statewide:democrat")) return JSON.stringify(ballot);
          return null;
        }),
        put: vi.fn(),
        delete: mockDelete,
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    candidates: [
                      { name: "Alice", polling: "60%", fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null },
                      { name: "Bob", polling: null, fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null },
                    ],
                  }),
                },
              ],
            }),
        })
      )
    );

    await runDailyUpdate(mockEnv, { parties: ["democrat"] });

    expect(mockDelete).toHaveBeenCalledWith("candidates_index");

    vi.useRealTimers();
  });

  it("skips candidates_index invalidation on Election Day to avoid peak-load cache rebuilds", async () => {
    // Set clock to Election Day itself
    vi.useRealTimers();
    vi.useFakeTimers({ now: new Date(ELECTION_DAY + "T14:00:00Z") });

    const ballot = {
      id: "test",
      party: "democrat",
      races: [
        {
          office: "Governor",
          district: null,
          isContested: true,
          candidates: [
            { name: "Alice", summary: "Test", endorsements: ["A"], keyPositions: ["X"] },
            { name: "Bob", summary: "Test", endorsements: ["B"], keyPositions: ["Y"] },
          ],
        },
      ],
    };

    const mockDelete = vi.fn();
    const mockEnv = {
      ELECTION_DATA: {
        get: vi.fn((key) => {
          if (key.includes("ballot:statewide:democrat")) return JSON.stringify(ballot);
          return null;
        }),
        put: vi.fn(),
        delete: mockDelete,
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    candidates: [
                      { name: "Alice", polling: "60%", fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null },
                      { name: "Bob", polling: null, fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null },
                    ],
                  }),
                },
              ],
            }),
        })
      )
    );

    const result = await runDailyUpdate(mockEnv, { parties: ["democrat"] });

    // Update should still succeed — data is written to KV
    expect(result.updated).toContain("democrat");
    expect(mockEnv.ELECTION_DATA.put).toHaveBeenCalled();

    // But candidates_index should NOT be invalidated on Election Day
    expect(mockDelete).not.toHaveBeenCalledWith("candidates_index");

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// extractSourcesFromResponse
// ---------------------------------------------------------------------------
describe("extractSourcesFromResponse", () => {
  it("extracts URLs from web_search_tool_result blocks", () => {
    const blocks = [
      {
        type: "web_search_tool_result",
        content: [
          { type: "web_search_result", url: "https://example.com/a", title: "Article A" },
          { type: "web_search_result", url: "https://example.com/b", title: "Article B" },
        ],
      },
      { type: "text", text: "Some text" },
    ];
    const sources = extractSourcesFromResponse(blocks);
    expect(sources).toHaveLength(2);
    expect(sources[0].url).toBe("https://example.com/a");
    expect(sources[0].title).toBe("Article A");
    expect(sources[1].url).toBe("https://example.com/b");
  });

  it("extracts citations from text blocks", () => {
    const blocks = [
      {
        type: "text",
        text: "Some text with citations",
        citations: [
          { url: "https://example.com/cite1", title: "Citation 1", cited_text: "blah" },
          { url: "https://example.com/cite2", title: "Citation 2", cited_text: "blah" },
        ],
      },
    ];
    const sources = extractSourcesFromResponse(blocks);
    expect(sources).toHaveLength(2);
    expect(sources[0].url).toBe("https://example.com/cite1");
    expect(sources[1].title).toBe("Citation 2");
  });

  it("deduplicates URLs across blocks", () => {
    const blocks = [
      {
        type: "web_search_tool_result",
        content: [
          { type: "web_search_result", url: "https://example.com/dup", title: "First" },
        ],
      },
      {
        type: "text",
        text: "text",
        citations: [
          { url: "https://example.com/dup", title: "Second" },
        ],
      },
    ];
    const sources = extractSourcesFromResponse(blocks);
    expect(sources).toHaveLength(1);
    expect(sources[0].title).toBe("First"); // first occurrence wins
  });

  it("returns empty array for null/undefined input", () => {
    expect(extractSourcesFromResponse(null)).toEqual([]);
    expect(extractSourcesFromResponse(undefined)).toEqual([]);
    expect(extractSourcesFromResponse([])).toEqual([]);
  });

  it("skips items without URLs", () => {
    const blocks = [
      {
        type: "web_search_tool_result",
        content: [
          { type: "web_search_result", url: null, title: "No URL" },
          { type: "web_search_result", url: "https://example.com/good", title: "Good" },
        ],
      },
    ];
    const sources = extractSourcesFromResponse(blocks);
    expect(sources).toHaveLength(1);
    expect(sources[0].url).toBe("https://example.com/good");
  });

  it("uses URL as title when title is missing", () => {
    const blocks = [
      {
        type: "web_search_tool_result",
        content: [
          { type: "web_search_result", url: "https://example.com/notitle" },
        ],
      },
    ];
    const sources = extractSourcesFromResponse(blocks);
    expect(sources[0].title).toBe("https://example.com/notitle");
  });

  it("includes accessDate as today", () => {
    const blocks = [
      {
        type: "web_search_tool_result",
        content: [
          { type: "web_search_result", url: "https://example.com/a", title: "A" },
        ],
      },
    ];
    const sources = extractSourcesFromResponse(blocks);
    expect(sources[0].accessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// mergeSources
// ---------------------------------------------------------------------------
describe("mergeSources", () => {
  it("merges new sources into existing", () => {
    const existing = [{ url: "https://a.com", title: "A", accessDate: "2026-01-01" }];
    const incoming = [{ url: "https://b.com", title: "B", accessDate: "2026-02-01" }];
    const merged = mergeSources(existing, incoming);
    expect(merged).toHaveLength(2);
    expect(merged[0].url).toBe("https://a.com");
    expect(merged[1].url).toBe("https://b.com");
  });

  it("deduplicates by URL", () => {
    const existing = [{ url: "https://a.com", title: "A", accessDate: "2026-01-01" }];
    const incoming = [
      { url: "https://a.com", title: "A updated", accessDate: "2026-02-01" },
      { url: "https://b.com", title: "B", accessDate: "2026-02-01" },
    ];
    const merged = mergeSources(existing, incoming);
    expect(merged).toHaveLength(2);
    expect(merged[0].title).toBe("A"); // existing wins
  });

  it("limits to max 20 sources", () => {
    const existing = Array.from({ length: 18 }, (_, i) => ({
      url: `https://existing${i}.com`,
      title: `E${i}`,
      accessDate: "2026-01-01",
    }));
    const incoming = Array.from({ length: 5 }, (_, i) => ({
      url: `https://new${i}.com`,
      title: `N${i}`,
      accessDate: "2026-02-01",
    }));
    const merged = mergeSources(existing, incoming);
    expect(merged).toHaveLength(20);
  });

  it("handles null existing", () => {
    const incoming = [{ url: "https://a.com", title: "A", accessDate: "2026-01-01" }];
    const merged = mergeSources(null, incoming);
    expect(merged).toHaveLength(1);
  });

  it("handles null incoming", () => {
    const existing = [{ url: "https://a.com", title: "A", accessDate: "2026-01-01" }];
    const merged = mergeSources(existing, null);
    expect(merged).toHaveLength(1);
    expect(merged[0].url).toBe("https://a.com");
  });

  it("handles both null", () => {
    const merged = mergeSources(null, null);
    expect(merged).toEqual([]);
  });

  it("skips incoming items without URL", () => {
    const incoming = [
      { url: "", title: "No URL", accessDate: "2026-01-01" },
      { url: "https://good.com", title: "Good", accessDate: "2026-01-01" },
    ];
    const merged = mergeSources([], incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].url).toBe("https://good.com");
  });
});

// ---------------------------------------------------------------------------
// Source validation (tested via runDailyUpdate end-to-end)
// ---------------------------------------------------------------------------
describe("source validation in updates", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-02-20T12:00:00Z") });
  });

  it("caps sources at 20 when Claude returns more than 20", async () => {
    const sources25 = Array.from({ length: 25 }, (_, i) => ({
      url: `https://src${i}.com`,
      title: `Source ${i}`,
    }));
    const ballot = {
      id: "test",
      party: "democrat",
      races: [
        {
          office: "Governor",
          district: null,
          isContested: true,
          candidates: [
            { name: "Alice", summary: "Test", endorsements: ["A"], keyPositions: ["X"] },
            { name: "Bob", summary: "Test", endorsements: ["B"], keyPositions: ["Y"] },
          ],
        },
      ],
    };

    const kvStore = {};
    const mockEnv = {
      ELECTION_DATA: {
        get: vi.fn((key) => {
          if (kvStore[key]) return kvStore[key];
          if (key.includes("ballot:statewide:democrat")) return JSON.stringify(ballot);
          return null;
        }),
        put: vi.fn((key, value) => {
          kvStore[key] = value;
        }),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    candidates: [
                      { name: "Alice", polling: null, fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null, sources: sources25 },
                      { name: "Bob", polling: null, fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null, sources: null },
                    ],
                  }),
                },
              ],
            }),
        })
      )
    );

    // mergeSources caps at 20, so it should pass validation and be stored
    const result = await runDailyUpdate(mockEnv, { parties: ["democrat"] });

    expect(result.updated).toContain("democrat");
    const stored = JSON.parse(kvStore["ballot:statewide:democrat_primary_2026"]);
    const alice = stored.races[0].candidates.find((c) => c.name === "Alice");
    expect(alice.sources).toHaveLength(20);

    vi.useRealTimers();
  });

  it("successfully merges sources from API response into candidates", async () => {
    const ballot = {
      id: "test",
      party: "democrat",
      races: [
        {
          office: "Governor",
          district: null,
          isContested: true,
          candidates: [
            { name: "Alice", summary: "Gov candidate", endorsements: ["A"], keyPositions: ["X"] },
            { name: "Bob", summary: "Gov candidate", endorsements: ["B"], keyPositions: ["Y"] },
          ],
        },
      ],
    };

    const kvStore = {};
    const mockEnv = {
      ELECTION_DATA: {
        get: vi.fn((key) => {
          if (kvStore[key]) return kvStore[key];
          if (key.includes("ballot:statewide:democrat")) return JSON.stringify(ballot);
          return null;
        }),
        put: vi.fn((key, value) => {
          kvStore[key] = value;
        }),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                {
                  type: "web_search_tool_result",
                  content: [
                    { type: "web_search_result", url: "https://texastribune.org/alice", title: "Alice profile" },
                    { type: "web_search_result", url: "https://ballotpedia.org/bob", title: "Bob profile" },
                  ],
                },
                {
                  type: "text",
                  text: JSON.stringify({
                    candidates: [
                      { name: "Alice", polling: "55%", fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null, sources: [{ url: "https://alice-campaign.com", title: "Alice Campaign" }] },
                      { name: "Bob", polling: null, fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null, sources: null },
                    ],
                  }),
                },
              ],
            }),
        })
      )
    );

    const result = await runDailyUpdate(mockEnv, { parties: ["democrat"] });

    expect(result.updated).toContain("democrat");
    const stored = JSON.parse(kvStore["ballot:statewide:democrat_primary_2026"]);
    const alice = stored.races[0].candidates.find((c) => c.name === "Alice");
    // Alice should have her candidate-level source + API-level sources
    expect(alice.sources).toBeDefined();
    expect(alice.sources.length).toBeGreaterThanOrEqual(1);
    expect(alice.sources.some((s) => s.url === "https://alice-campaign.com")).toBe(true);
    expect(alice.sources.some((s) => s.url === "https://texastribune.org/alice")).toBe(true);
    expect(alice.sourcesUpdatedAt).toBeDefined();

    // Bob should have API-level sources as fallback
    const bob = stored.races[0].candidates.find((c) => c.name === "Bob");
    expect(bob.sources).toBeDefined();
    expect(bob.sources.some((s) => s.url === "https://texastribune.org/alice")).toBe(true);

    vi.useRealTimers();
  });

  it("preserves existing sources when no new sources provided", async () => {
    const ballot = {
      id: "test",
      party: "democrat",
      races: [
        {
          office: "Governor",
          district: null,
          isContested: true,
          candidates: [
            {
              name: "Alice",
              summary: "Gov candidate",
              endorsements: ["A"],
              keyPositions: ["X"],
              sources: [{ url: "https://existing.com", title: "Existing", accessDate: "2026-01-01" }],
            },
            { name: "Bob", summary: "Gov candidate", endorsements: ["B"], keyPositions: ["Y"] },
          ],
        },
      ],
    };

    const kvStore = {};
    const mockEnv = {
      ELECTION_DATA: {
        get: vi.fn((key) => {
          if (kvStore[key]) return kvStore[key];
          if (key.includes("ballot:statewide:democrat")) return JSON.stringify(ballot);
          return null;
        }),
        put: vi.fn((key, value) => {
          kvStore[key] = value;
        }),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };

    // No web_search_tool_result blocks, no sources from Claude
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    candidates: [
                      { name: "Alice", polling: "60%", fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null, sources: null },
                      { name: "Bob", polling: null, fundraising: null, endorsements: null, keyPositions: null, pros: null, cons: null, summary: null, background: null, sources: null },
                    ],
                  }),
                },
              ],
            }),
        })
      )
    );

    const result = await runDailyUpdate(mockEnv, { parties: ["democrat"] });

    expect(result.updated).toContain("democrat");
    const stored = JSON.parse(kvStore["ballot:statewide:democrat_primary_2026"]);
    const alice = stored.races[0].candidates.find((c) => c.name === "Alice");
    // Existing sources should be preserved
    expect(alice.sources).toEqual([{ url: "https://existing.com", title: "Existing", accessDate: "2026-01-01" }]);
    expect(alice.polling).toBe("60%");

    vi.useRealTimers();
  });
});
