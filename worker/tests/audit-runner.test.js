import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PROVIDERS,
  buildAuditPrompt,
  parseAuditScores,
  validateScores,
  callProvider,
  runAudit,
  DIMENSION_KEYS,
} from "../src/audit-runner.js";

// ---------------------------------------------------------------------------
// Score parsing tests (~12 tests)
// ---------------------------------------------------------------------------
describe("parseAuditScores", () => {
  it("extracts scores from a JSON code fence", () => {
    const text = `Here is my analysis...
\`\`\`json
{"overallScore": 7.5, "dimensions": {"partisanBias": 8, "factualAccuracy": 7, "fairnessOfFraming": 8, "balanceOfProsCons": 7, "transparency": 9}, "topStrength": "Great transparency", "topWeakness": "Missing citations"}
\`\`\`
Thank you.`;
    const result = parseAuditScores(text);
    expect(result.success).toBe(true);
    expect(result.scores.overallScore).toBe(7.5);
    expect(result.scores.dimensions.partisanBias).toBe(8);
    expect(result.scores.dimensions.transparency).toBe(9);
    expect(result.scores.topStrength).toBe("Great transparency");
    expect(result.scores.topWeakness).toBe("Missing citations");
    expect(result.method).toBe("json_fence");
  });

  it("extracts scores from raw JSON without fences", () => {
    const text = `My report concludes with these scores:
{"overallScore": 8.2, "dimensions": {"partisanBias": 9, "factualAccuracy": 8, "fairnessOfFraming": 7, "balanceOfProsCons": 8, "transparency": 9}}
End of report.`;
    const result = parseAuditScores(text);
    expect(result.success).toBe(true);
    expect(result.scores.overallScore).toBe(8.2);
    expect(result.method).toBe("raw_json");
  });

  it("falls back to regex extraction from prose", () => {
    const text = `
## Scores

- Partisan Bias: 8/10
- Factual Accuracy: 7/10
- Fairness of Framing: 8.5/10
- Balance of Pros/Cons: 7/10
- Transparency: 9/10
`;
    const result = parseAuditScores(text);
    expect(result.success).toBe(true);
    expect(result.scores.dimensions.partisanBias).toBe(8);
    expect(result.scores.dimensions.factualAccuracy).toBe(7);
    expect(result.scores.dimensions.fairnessOfFraming).toBe(8.5);
    expect(result.scores.dimensions.transparency).toBe(9);
    expect(result.method).toBe("regex");
    // Average should be computed
    expect(result.scores.overallScore).toBeCloseTo(7.9, 1);
  });

  it("handles scores with 'out of 10' format", () => {
    const text = `
Partisan Bias: 8 out of 10
Factual Accuracy: 7 out of 10
Fairness of Framing: 6 out of 10
`;
    const result = parseAuditScores(text);
    expect(result.success).toBe(true);
    expect(result.scores.dimensions.partisanBias).toBe(8);
    expect(result.scores.dimensions.factualAccuracy).toBe(7);
    expect(result.scores.dimensions.fairnessOfFraming).toBe(6);
    expect(result.method).toBe("regex");
  });

  it("returns failure for empty text", () => {
    expect(parseAuditScores("").success).toBe(false);
    expect(parseAuditScores(null).success).toBe(false);
    expect(parseAuditScores(undefined).success).toBe(false);
  });

  it("returns failure when fewer than 3 dimensions found by regex", () => {
    const text = "Partisan Bias: 8/10. That's all I have.";
    const result = parseAuditScores(text);
    expect(result.success).toBe(false);
  });

  it("rejects scores outside 1-10 range in JSON", () => {
    const text = '```json\n{"overallScore": 15, "dimensions": {"partisanBias": 8}}\n```';
    const result = parseAuditScores(text);
    // Should fall through to tier 2/3 since overallScore > 10
    expect(result.scores?.overallScore).not.toBe(15);
  });

  it("rejects scores outside 1-10 range in regex", () => {
    const text = `
Partisan Bias: 15/10
Factual Accuracy: 0/10
Fairness of Framing: -5/10
`;
    const result = parseAuditScores(text);
    expect(result.success).toBe(false);
  });

  it("prefers JSON fence over raw JSON when both exist", () => {
    const text = `
{"overallScore": 5, "dimensions": {"partisanBias": 5}}
\`\`\`json
{"overallScore": 8, "dimensions": {"partisanBias": 8, "factualAccuracy": 7, "fairnessOfFraming": 8, "balanceOfProsCons": 7, "transparency": 9}, "topStrength": "Good", "topWeakness": "Bad"}
\`\`\``;
    const result = parseAuditScores(text);
    expect(result.success).toBe(true);
    expect(result.scores.overallScore).toBe(8);
    expect(result.method).toBe("json_fence");
  });

  it("handles multiline JSON in code fence", () => {
    const text = `Report done.
\`\`\`json
{
  "overallScore": 7.0,
  "dimensions": {
    "partisanBias": 8,
    "factualAccuracy": 6,
    "fairnessOfFraming": 7,
    "balanceOfProsCons": 7,
    "transparency": 8
  },
  "topStrength": "Transparent approach",
  "topWeakness": "Needs citations"
}
\`\`\``;
    const result = parseAuditScores(text);
    expect(result.success).toBe(true);
    expect(result.scores.overallScore).toBe(7.0);
    expect(result.scores.dimensions.factualAccuracy).toBe(6);
  });

  it("handles text with no extractable scores at all", () => {
    const text = "This is a great app with no obvious issues. I recommend continued monitoring.";
    const result = parseAuditScores(text);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// validateScores tests
// ---------------------------------------------------------------------------
describe("validateScores", () => {
  it("returns validated scores for valid input", () => {
    const input = {
      overallScore: 7.5,
      dimensions: { partisanBias: 8, factualAccuracy: 7 },
      topStrength: "Good",
      topWeakness: "Bad",
    };
    const result = validateScores(input);
    expect(result).not.toBeNull();
    expect(result.overallScore).toBe(7.5);
    expect(result.topStrength).toBe("Good");
  });

  it("returns null for missing overallScore", () => {
    expect(validateScores({ dimensions: {} })).toBeNull();
  });

  it("returns null for overallScore out of range", () => {
    expect(validateScores({ overallScore: 0, dimensions: {} })).toBeNull();
    expect(validateScores({ overallScore: 11, dimensions: {} })).toBeNull();
  });

  it("returns null for missing dimensions object", () => {
    expect(validateScores({ overallScore: 7 })).toBeNull();
  });

  it("returns null for non-numeric dimension score", () => {
    expect(validateScores({
      overallScore: 7,
      dimensions: { partisanBias: "high" },
    })).toBeNull();
  });

  it("returns null for dimension score out of range", () => {
    expect(validateScores({
      overallScore: 7,
      dimensions: { partisanBias: 11 },
    })).toBeNull();
  });

  it("sets topStrength and topWeakness to null when missing", () => {
    const result = validateScores({
      overallScore: 7,
      dimensions: { partisanBias: 8 },
    });
    expect(result.topStrength).toBeNull();
    expect(result.topWeakness).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Provider config tests (~6 tests)
// ---------------------------------------------------------------------------
describe("PROVIDERS", () => {
  it("has three providers: chatgpt, gemini, grok", () => {
    expect(Object.keys(PROVIDERS)).toEqual(["chatgpt", "gemini", "grok"]);
  });

  it("chatgpt builds correct OpenAI request", () => {
    const config = PROVIDERS.chatgpt;
    const env = { OPENAI_API_KEY: "sk-test" };
    const headers = config.buildHeaders(env);
    expect(headers.Authorization).toBe("Bearer sk-test");
    expect(headers["Content-Type"]).toBe("application/json");

    const body = config.buildBody("test prompt");
    expect(body.model).toBe("gpt-4o");
    expect(body.messages[0].content).toBe("test prompt");
    expect(body.max_tokens).toBe(8192);
  });

  it("gemini builds correct Google AI request", () => {
    const config = PROVIDERS.gemini;
    const env = { GEMINI_API_KEY: "gem-test" };
    const endpoint = config.buildEndpoint(env);
    expect(endpoint).toContain("generativelanguage.googleapis.com");
    expect(endpoint).toContain("key=gem-test");

    const headers = config.buildHeaders(env);
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Authorization).toBeUndefined();

    const body = config.buildBody("test prompt");
    expect(body.contents[0].parts[0].text).toBe("test prompt");
  });

  it("grok builds correct xAI request", () => {
    const config = PROVIDERS.grok;
    const env = { GROK_API_KEY: "xai-test" };
    const headers = config.buildHeaders(env);
    expect(headers.Authorization).toBe("Bearer xai-test");

    const body = config.buildBody("test prompt");
    expect(body.model).toBe("grok-3");
    expect(body.messages[0].content).toBe("test prompt");
  });

  it("chatgpt extracts text from OpenAI response format", () => {
    const data = { choices: [{ message: { content: "Report text here" } }] };
    expect(PROVIDERS.chatgpt.extractText(data)).toBe("Report text here");
  });

  it("gemini extracts text from Google response format", () => {
    const data = { candidates: [{ content: { parts: [{ text: "Gemini report" }] } }] };
    expect(PROVIDERS.gemini.extractText(data)).toBe("Gemini report");
  });

  it("returns null for empty/malformed responses", () => {
    expect(PROVIDERS.chatgpt.extractText({})).toBeNull();
    expect(PROVIDERS.gemini.extractText({})).toBeNull();
    expect(PROVIDERS.grok.extractText({})).toBeNull();
  });

  it("extracts usage from OpenAI format", () => {
    const data = { usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 } };
    const usage = PROVIDERS.chatgpt.extractUsage(data);
    expect(usage.promptTokens).toBe(100);
    expect(usage.completionTokens).toBe(200);
    expect(usage.totalTokens).toBe(300);
  });

  it("extracts usage from Gemini format", () => {
    const data = { usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 150, totalTokenCount: 200 } };
    const usage = PROVIDERS.gemini.extractUsage(data);
    expect(usage.promptTokens).toBe(50);
    expect(usage.completionTokens).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// Prompt construction tests (~4 tests)
// ---------------------------------------------------------------------------
describe("buildAuditPrompt", () => {
  it("includes the methodology export", () => {
    const exportData = { _meta: { name: "Test" }, guideGeneration: {} };
    const prompt = buildAuditPrompt(exportData);
    expect(prompt).toContain("=== METHODOLOGY EXPORT ===");
    expect(prompt).toContain("=== END EXPORT ===");
    expect(prompt).toContain('"_meta"');
    expect(prompt).toContain('"guideGeneration"');
  });

  it("includes all five audit dimensions", () => {
    const prompt = buildAuditPrompt({ test: true });
    expect(prompt).toContain("DIMENSION 1: Partisan Bias");
    expect(prompt).toContain("DIMENSION 2: Factual Accuracy Safeguards");
    expect(prompt).toContain("DIMENSION 3: Fairness of Framing");
    expect(prompt).toContain("DIMENSION 4: Balance of Pros/Cons");
    expect(prompt).toContain("DIMENSION 5: Transparency of Methodology");
  });

  it("includes structured JSON output instruction", () => {
    const prompt = buildAuditPrompt({ test: true });
    expect(prompt).toContain("STRUCTURED SCORES (REQUIRED)");
    expect(prompt).toContain("overallScore");
    expect(prompt).toContain("partisanBias");
    expect(prompt).toContain("topStrength");
    expect(prompt).toContain("topWeakness");
  });

  it("accepts string input directly", () => {
    const prompt = buildAuditPrompt('{"raw": "json string"}');
    expect(prompt).toContain('{"raw": "json string"}');
  });
});

// ---------------------------------------------------------------------------
// callProvider tests (~5 tests)
// ---------------------------------------------------------------------------
describe("callProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns text and usage on successful 200 response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: "Audit report" } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await callProvider(PROVIDERS.chatgpt, "test", { OPENAI_API_KEY: "sk-test" });
    expect(result.text).toBe("Audit report");
    expect(result.usage.totalTokens).toBe(30);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
  });

  it("retries on 429 and returns error after exhausting retries", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 429,
      headers: new Headers(),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await callProvider(PROVIDERS.chatgpt, "test", { OPENAI_API_KEY: "sk-test" });
    expect(result.error).toContain("Rate limited");
    expect(result.httpStatus).toBe(429);
    expect(mockFetch).toHaveBeenCalledTimes(3); // 0, 1, 2
  }, 60000);

  it("returns error on 4xx (non-429) without retrying", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await callProvider(PROVIDERS.chatgpt, "test", { OPENAI_API_KEY: "sk-test" });
    expect(result.error).toContain("API error 401");
    expect(result.httpStatus).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns error when extractText returns null", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({}), // No choices/content
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await callProvider(PROVIDERS.chatgpt, "test", { OPENAI_API_KEY: "sk-test" });
    expect(result.error).toContain("No text");
  });

  it("handles network errors with retry", async () => {
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error("Connection refused"))
      .mockRejectedValueOnce(new Error("Connection refused"))
      .mockRejectedValueOnce(new Error("Connection refused"));
    vi.stubGlobal("fetch", mockFetch);

    const result = await callProvider(PROVIDERS.chatgpt, "test", { OPENAI_API_KEY: "sk-test" });
    expect(result.error).toContain("Network error");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  }, 30000);
});

// ---------------------------------------------------------------------------
// runAudit orchestrator tests (~5 tests)
// ---------------------------------------------------------------------------
describe("runAudit", () => {
  let mockEnv;
  let kvStore;

  beforeEach(() => {
    vi.restoreAllMocks();
    kvStore = {};
    mockEnv = {
      OPENAI_API_KEY: "sk-test",
      GEMINI_API_KEY: "gem-test",
      GROK_API_KEY: "xai-test",
      ADMIN_SECRET: "secret",
      ELECTION_DATA: {
        get: vi.fn((key) => Promise.resolve(kvStore[key] || null)),
        put: vi.fn((key, value) => {
          kvStore[key] = value;
          return Promise.resolve();
        }),
      },
    };
  });

  it("returns error when exportData is missing", async () => {
    const result = await runAudit(mockEnv, {});
    expect(result.error).toBe("exportData is required");
  });

  it("reports missing API key as error", async () => {
    delete mockEnv.OPENAI_API_KEY;
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: '```json\n{"overallScore":8,"dimensions":{"partisanBias":8}}\n```' } }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await runAudit(mockEnv, {
      providers: ["chatgpt"],
      exportData: { test: true },
    });
    expect(result.results.chatgpt.status).toBe("error");
    expect(result.results.chatgpt.error).toContain("OPENAI_API_KEY");
  });

  it("skips provider within cooldown period", async () => {
    kvStore["audit:result:chatgpt"] = JSON.stringify({
      timestamp: new Date().toISOString(), // just now
      status: "success",
    });

    const result = await runAudit(mockEnv, {
      providers: ["chatgpt"],
      exportData: { test: true },
    });
    expect(result.results.chatgpt.status).toBe("skipped");
    expect(result.results.chatgpt.reason).toBe("cooldown");
  });

  it("force flag bypasses cooldown", async () => {
    kvStore["audit:result:chatgpt"] = JSON.stringify({
      timestamp: new Date().toISOString(),
      status: "success",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: '```json\n{"overallScore":8,"dimensions":{"partisanBias":8,"factualAccuracy":7,"fairnessOfFraming":8,"balanceOfProsCons":7,"transparency":9},"topStrength":"Good","topWeakness":"Bad"}\n```' } }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await runAudit(mockEnv, {
      providers: ["chatgpt"],
      force: true,
      exportData: { test: true },
    });
    expect(result.results.chatgpt.status).toBe("success");
    expect(mockFetch).toHaveBeenCalled();
  });

  it("stores results in KV with correct keys", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: '```json\n{"overallScore":7.5,"dimensions":{"partisanBias":8,"factualAccuracy":7,"fairnessOfFraming":8,"balanceOfProsCons":7,"transparency":9},"topStrength":"Good","topWeakness":"Bad"}\n```' } }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await runAudit(mockEnv, {
      providers: ["chatgpt"],
      force: true,
      exportData: { test: true },
    });

    // Check KV writes
    const putCalls = mockEnv.ELECTION_DATA.put.mock.calls;
    const keys = putCalls.map((c) => c[0]);
    expect(keys).toContain("audit:result:chatgpt");
    expect(keys).toContain("audit:summary");
    expect(keys.some((k) => k.startsWith("audit:log:"))).toBe(true);

    // Verify result content
    const storedResult = JSON.parse(kvStore["audit:result:chatgpt"]);
    expect(storedResult.status).toBe("success");
    expect(storedResult.scores.overallScore).toBe(7.5);
    expect(storedResult.provider).toBe("chatgpt");

    // Verify summary
    const storedSummary = JSON.parse(kvStore["audit:summary"]);
    expect(storedSummary.providers.chatgpt.overallScore).toBe(7.5);
    expect(storedSummary.providers.chatgpt.status).toBe("success");
  });

  it("merges with existing summary (preserves other providers)", async () => {
    kvStore["audit:summary"] = JSON.stringify({
      providers: {
        gemini: { status: "success", overallScore: 8.6, displayName: "Gemini (Google)" },
      },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({
        choices: [{ message: { content: '```json\n{"overallScore":7,"dimensions":{"partisanBias":7},"topStrength":"OK","topWeakness":"OK"}\n```' } }],
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await runAudit(mockEnv, {
      providers: ["chatgpt"],
      force: true,
      exportData: { test: true },
    });

    const storedSummary = JSON.parse(kvStore["audit:summary"]);
    expect(storedSummary.providers.chatgpt.overallScore).toBe(7);
    expect(storedSummary.providers.gemini.overallScore).toBe(8.6); // Preserved
  });

  it("handles unknown provider name gracefully", async () => {
    const result = await runAudit(mockEnv, {
      providers: ["notreal"],
      exportData: { test: true },
    });
    expect(result.results.notreal.status).toBe("error");
    expect(result.results.notreal.error).toContain("Unknown provider");
  });
});

// ---------------------------------------------------------------------------
// DIMENSION_KEYS constant
// ---------------------------------------------------------------------------
describe("DIMENSION_KEYS", () => {
  it("has exactly 5 dimension keys", () => {
    expect(DIMENSION_KEYS).toHaveLength(5);
    expect(DIMENSION_KEYS).toContain("partisanBias");
    expect(DIMENSION_KEYS).toContain("factualAccuracy");
    expect(DIMENSION_KEYS).toContain("fairnessOfFraming");
    expect(DIMENSION_KEYS).toContain("balanceOfProsCons");
    expect(DIMENSION_KEYS).toContain("transparency");
  });
});
