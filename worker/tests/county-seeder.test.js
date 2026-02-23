import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TOP_COUNTIES,
  seedCountyInfo,
  seedCountyBallot,
  seedPrecinctMap,
  seedFullCounty,
} from "../src/county-seeder.js";

// ---------------------------------------------------------------------------
// TOP_COUNTIES data integrity
// ---------------------------------------------------------------------------
describe("TOP_COUNTIES", () => {
  it("contains exactly 30 counties", () => {
    expect(TOP_COUNTIES).toHaveLength(30);
  });

  it("every entry has fips and name", () => {
    for (const county of TOP_COUNTIES) {
      expect(county.fips).toBeDefined();
      expect(county.name).toBeDefined();
      expect(typeof county.fips).toBe("string");
      expect(typeof county.name).toBe("string");
    }
  });

  it("all FIPS codes start with 48 (Texas)", () => {
    for (const county of TOP_COUNTIES) {
      expect(county.fips.startsWith("48")).toBe(true);
    }
  });

  it("all FIPS codes are 5 digits", () => {
    for (const county of TOP_COUNTIES) {
      expect(county.fips).toMatch(/^\d{5}$/);
    }
  });

  it("has no duplicate FIPS codes", () => {
    const fipsCodes = TOP_COUNTIES.map((c) => c.fips);
    expect(new Set(fipsCodes).size).toBe(fipsCodes.length);
  });

  it("has no duplicate county names", () => {
    const names = TOP_COUNTIES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("includes the top 5 by population: Harris, Dallas, Tarrant, Bexar, Travis", () => {
    const names = TOP_COUNTIES.map((c) => c.name);
    expect(names).toContain("Harris");
    expect(names).toContain("Dallas");
    expect(names).toContain("Tarrant");
    expect(names).toContain("Bexar");
    expect(names).toContain("Travis");
  });

  it("Harris is first (most populous)", () => {
    expect(TOP_COUNTIES[0].name).toBe("Harris");
    expect(TOP_COUNTIES[0].fips).toBe("48201");
  });

  it("Travis FIPS is 48453", () => {
    const travis = TOP_COUNTIES.find((c) => c.name === "Travis");
    expect(travis.fips).toBe("48453");
  });
});

// ---------------------------------------------------------------------------
// seedCountyInfo
// ---------------------------------------------------------------------------
describe("seedCountyInfo", () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = {
      ELECTION_DATA: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };
  });

  it("stores result in KV with correct key", async () => {
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
                    countyFips: "48453",
                    countyName: "Travis",
                    voteCenters: true,
                    electionsWebsite: "https://countyclerk.traviscountytx.gov",
                    electionsPhone: "512-238-8683",
                    earlyVoting: { periods: [], note: null },
                    electionDay: { hours: "7:00 AM - 7:00 PM", locationUrl: null },
                    phoneInBooth: null,
                    resources: [],
                  }),
                },
              ],
            }),
        })
      )
    );

    const result = await seedCountyInfo("48453", "Travis", mockEnv);
    expect(result.success).toBe(true);
    expect(result.countyFips).toBe("48453");
    expect(result.countyName).toBe("Travis");
    expect(mockEnv.ELECTION_DATA.put).toHaveBeenCalledWith(
      "county_info:48453",
      expect.any(String)
    );
  });

  it("returns error when Claude returns no response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [],
            }),
        })
      )
    );

    const result = await seedCountyInfo("48453", "Travis", mockEnv);
    expect(result.error).toBe("No response from Claude");
    expect(mockEnv.ELECTION_DATA.put).not.toHaveBeenCalled();
  });

  it("throws on API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        })
      )
    );

    await expect(seedCountyInfo("48453", "Travis", mockEnv)).rejects.toThrow(
      "Claude API returned 500"
    );
  });

  it("calls the Anthropic API with correct headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [{ type: "text", text: '{"countyFips":"48453"}' }],
            }),
        })
      )
    );

    await seedCountyInfo("48453", "Travis", mockEnv);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-api-key": "test-key",
          "anthropic-version": "2023-06-01",
        }),
      })
    );
  });

  it("extracts JSON from markdown fences", async () => {
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
                  text: '```json\n{"countyFips":"48453","countyName":"Travis","voteCenters":true}\n```',
                },
              ],
            }),
        })
      )
    );

    const result = await seedCountyInfo("48453", "Travis", mockEnv);
    expect(result.success).toBe(true);
    // Verify the stored data was parsed correctly
    const storedCall = mockEnv.ELECTION_DATA.put.mock.calls[0];
    const storedData = JSON.parse(storedCall[1]);
    expect(storedData.countyFips).toBe("48453");
    expect(storedData.voteCenters).toBe(true);
  });

  it("extracts JSON when surrounded by prose", async () => {
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
                  text: 'Here is the data:\n{"countyFips":"48201","countyName":"Harris"}\nThat is it.',
                },
              ],
            }),
        })
      )
    );

    const result = await seedCountyInfo("48201", "Harris", mockEnv);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// seedCountyBallot
// ---------------------------------------------------------------------------
describe("seedCountyBallot", () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = {
      ELECTION_DATA: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };
  });

  it("stores ballot with correct KV key for republican", async () => {
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
                    id: "48453_republican_primary_2026",
                    party: "republican",
                    races: [
                      {
                        id: "cc-pct1",
                        office: "County Commissioner",
                        district: "Precinct 1",
                        isContested: true,
                        candidates: [
                          { id: "c1", name: "John Smith", isIncumbent: true },
                        ],
                      },
                    ],
                    propositions: [],
                  }),
                },
              ],
            }),
        })
      )
    );

    const result = await seedCountyBallot("48453", "Travis", "republican", mockEnv);
    expect(result.success).toBe(true);
    expect(result.party).toBe("republican");
    expect(result.raceCount).toBe(1);
    expect(mockEnv.ELECTION_DATA.put).toHaveBeenCalledWith(
      "ballot:county:48453:republican_primary_2026",
      expect.any(String)
    );
  });

  it("stores ballot with correct KV key for democrat", async () => {
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
                  text: JSON.stringify({ races: [], propositions: [] }),
                },
              ],
            }),
        })
      )
    );

    const result = await seedCountyBallot("48113", "Dallas", "democrat", mockEnv);
    expect(result.success).toBe(true);
    expect(result.raceCount).toBe(0);
    expect(mockEnv.ELECTION_DATA.put).toHaveBeenCalledWith(
      "ballot:county:48113:democrat_primary_2026",
      expect.any(String)
    );
  });

  it("invalidates candidates_index cache after storing", async () => {
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
                  text: JSON.stringify({ races: [], propositions: [] }),
                },
              ],
            }),
        })
      )
    );

    await seedCountyBallot("48453", "Travis", "republican", mockEnv);
    expect(mockEnv.ELECTION_DATA.delete).toHaveBeenCalledWith("candidates_index");
  });

  it("capitalizes party name in prompt", async () => {
    let capturedBody;
    vi.stubGlobal(
      "fetch",
      vi.fn((url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                { type: "text", text: '{"races":[],"propositions":[]}' },
              ],
            }),
        });
      })
    );

    await seedCountyBallot("48453", "Travis", "republican", mockEnv);
    const userMessage = capturedBody.messages[0].content;
    expect(userMessage).toContain("Republican primary races");
  });

  it("returns error when Claude returns null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [],
            }),
        })
      )
    );

    const result = await seedCountyBallot("48453", "Travis", "republican", mockEnv);
    expect(result.error).toBeDefined();
    expect(mockEnv.ELECTION_DATA.put).not.toHaveBeenCalled();
  });

  it("attaches sources from web_search_tool_result to candidates", async () => {
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
                    {
                      type: "web_search_result",
                      url: "https://example.com/county-races",
                      title: "County Races Article",
                    },
                  ],
                },
                {
                  type: "text",
                  text: JSON.stringify({
                    races: [
                      {
                        id: "r1",
                        office: "County Judge",
                        candidates: [
                          { id: "c1", name: "Jane Doe", isIncumbent: false },
                        ],
                      },
                    ],
                    propositions: [],
                  }),
                },
              ],
            }),
        })
      )
    );

    await seedCountyBallot("48453", "Travis", "republican", mockEnv);
    const storedCall = mockEnv.ELECTION_DATA.put.mock.calls.find(
      (c) => c[0] === "ballot:county:48453:republican_primary_2026"
    );
    const storedData = JSON.parse(storedCall[1]);
    const candidate = storedData.races[0].candidates[0];
    expect(candidate.sources).toBeDefined();
    expect(candidate.sources.length).toBeGreaterThan(0);
    expect(candidate.sources[0].url).toBe("https://example.com/county-races");
    expect(candidate.sourcesUpdatedAt).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// seedPrecinctMap
// ---------------------------------------------------------------------------
describe("seedPrecinctMap", () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = {
      ELECTION_DATA: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };
  });

  it("stores precinct map with correct KV key", async () => {
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
                    "78701": "2",
                    "78702": "1",
                    "78703": "4",
                  }),
                },
              ],
            }),
        })
      )
    );

    const result = await seedPrecinctMap("48453", "Travis", mockEnv);
    expect(result.success).toBe(true);
    expect(result.zipCount).toBe(3);
    expect(mockEnv.ELECTION_DATA.put).toHaveBeenCalledWith(
      "precinct_map:48453",
      expect.any(String)
    );
  });

  it("returns error when Claude returns empty object", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [{ type: "text", text: "{}" }],
            }),
        })
      )
    );

    const result = await seedPrecinctMap("48453", "Travis", mockEnv);
    expect(result.error).toBeDefined();
    expect(mockEnv.ELECTION_DATA.put).not.toHaveBeenCalled();
  });

  it("returns error when Claude returns null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [],
            }),
        })
      )
    );

    const result = await seedPrecinctMap("48453", "Travis", mockEnv);
    expect(result.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// seedFullCounty
// ---------------------------------------------------------------------------
describe("seedFullCounty", () => {
  let mockEnv;

  beforeEach(() => {
    vi.useFakeTimers();
    mockEnv = {
      ELECTION_DATA: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };
    // Stub fetch to return valid responses for all steps
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
                    countyFips: "48453",
                    countyName: "Travis",
                    voteCenters: true,
                    races: [],
                    propositions: [],
                    "78701": "1",
                  }),
                },
              ],
            }),
        })
      )
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to advance all pending timers until the promise resolves
  async function runWithTimers(promise) {
    let resolved = false;
    let result;
    let error;
    promise.then(r => { result = r; resolved = true; }).catch(e => { error = e; resolved = true; });
    while (!resolved) {
      await vi.advanceTimersByTimeAsync(5000);
    }
    if (error) throw error;
    return result;
  }

  it("returns results for all 4 steps", async () => {
    const result = await runWithTimers(seedFullCounty("48453", "Travis", mockEnv));
    expect(result.countyFips).toBe("48453");
    expect(result.countyName).toBe("Travis");
    expect(result.steps).toBeDefined();
    expect(result.steps.countyInfo).toBeDefined();
    expect(result.steps.republican).toBeDefined();
    expect(result.steps.democrat).toBeDefined();
    expect(result.steps.precinctMap).toBeDefined();
  });

  it("catches errors in individual steps without failing entirely", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        callCount++;
        // Fail the first call (county info), succeed the rest
        if (callCount === 1) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    races: [],
                    propositions: [],
                    "78701": "1",
                  }),
                },
              ],
            }),
        });
      })
    );

    const result = await runWithTimers(seedFullCounty("48453", "Travis", mockEnv));
    // First step should have an error
    expect(result.steps.countyInfo.error).toBeDefined();
    // Other steps should succeed
    expect(result.steps.republican.success).toBe(true);
  });

  it("retries on 429 rate limiting", async () => {
    let attempts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        attempts++;
        if (attempts <= 1) {
          return Promise.resolve({ ok: false, status: 429 });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    countyFips: "48453",
                    countyName: "Travis",
                    voteCenters: true,
                    races: [],
                    propositions: [],
                    "78701": "1",
                  }),
                },
              ],
            }),
        });
      })
    );

    const result = await runWithTimers(seedFullCounty("48453", "Travis", mockEnv));
    // Should have retried after 429 and eventually succeeded
    expect(attempts).toBeGreaterThan(1);
  });

  it("throws after 3 consecutive 429 retries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ ok: false, status: 429 })
      )
    );

    const result = await runWithTimers(seedFullCounty("48453", "Travis", mockEnv));
    // County info should have error about 429 retries
    expect(result.steps.countyInfo.error).toContain("429");
  });
});

// ---------------------------------------------------------------------------
// Claude response parsing edge cases (tested via seedCountyInfo)
// ---------------------------------------------------------------------------
describe("Claude response parsing", () => {
  let mockEnv;

  beforeEach(() => {
    mockEnv = {
      ELECTION_DATA: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      },
      ANTHROPIC_API_KEY: "test-key",
    };
  });

  it("throws on invalid JSON response", async () => {
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
                  text: "This is not valid JSON at all {broken",
                },
              ],
            }),
        })
      )
    );

    await expect(seedCountyInfo("48453", "Travis", mockEnv)).rejects.toThrow(
      "Failed to parse response as JSON"
    );
  });

  it("uses web_search tool in the API call", async () => {
    let capturedBody;
    vi.stubGlobal(
      "fetch",
      vi.fn((url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                { type: "text", text: '{"countyFips":"48453"}' },
              ],
            }),
        });
      })
    );

    await seedCountyInfo("48453", "Travis", mockEnv);
    expect(capturedBody.tools).toBeDefined();
    expect(capturedBody.tools).toHaveLength(1);
    expect(capturedBody.tools[0].type).toBe("web_search_20250305");
    expect(capturedBody.tools[0].max_uses).toBe(10);
  });

  it("uses Claude Sonnet model", async () => {
    let capturedBody;
    vi.stubGlobal(
      "fetch",
      vi.fn((url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                { type: "text", text: '{"countyFips":"48453"}' },
              ],
            }),
        });
      })
    );

    await seedCountyInfo("48453", "Travis", mockEnv);
    expect(capturedBody.model).toBe("claude-sonnet-4-20250514");
  });

  it("includes county name in the prompt", async () => {
    let capturedBody;
    vi.stubGlobal(
      "fetch",
      vi.fn((url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              content: [
                { type: "text", text: '{"countyFips":"48201"}' },
              ],
            }),
        });
      })
    );

    await seedCountyInfo("48201", "Harris", mockEnv);
    const userPrompt = capturedBody.messages[0].content;
    expect(userPrompt).toContain("Harris County, Texas");
    expect(userPrompt).toContain("March 3, 2026");
  });
});
