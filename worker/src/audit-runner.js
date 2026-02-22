// audit-runner.js — Automated third-party AI audit runner
// Calls OpenAI, Gemini, and xAI APIs to audit the methodology export

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Provider configurations
// ---------------------------------------------------------------------------

const PROVIDERS = {
  chatgpt: {
    name: "chatgpt",
    displayName: "ChatGPT (OpenAI)",
    model: "gpt-4o",
    endpoint: "https://api.openai.com/v1/chat/completions",
    envKey: "OPENAI_API_KEY",
    buildHeaders(env) {
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      };
    },
    buildBody(prompt) {
      return {
        model: "gpt-4o",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      };
    },
    extractText(data) {
      return data.choices?.[0]?.message?.content || null;
    },
    extractUsage(data) {
      const u = data.usage;
      if (!u) return null;
      return { promptTokens: u.prompt_tokens, completionTokens: u.completion_tokens, totalTokens: u.total_tokens };
    },
  },

  gemini: {
    name: "gemini",
    displayName: "Gemini (Google)",
    model: "gemini-2.0-flash",
    envKey: "GEMINI_API_KEY",
    buildEndpoint(env) {
      return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    },
    buildHeaders() {
      return { "Content-Type": "application/json" };
    },
    buildBody(prompt) {
      return {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192 },
      };
    },
    extractText(data) {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    },
    extractUsage(data) {
      const u = data.usageMetadata;
      if (!u) return null;
      return { promptTokens: u.promptTokenCount, completionTokens: u.candidatesTokenCount, totalTokens: u.totalTokenCount };
    },
  },

  grok: {
    name: "grok",
    displayName: "Grok (xAI)",
    model: "grok-3",
    endpoint: "https://api.x.ai/v1/chat/completions",
    envKey: "GROK_API_KEY",
    buildHeaders(env) {
      return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROK_API_KEY}`,
      };
    },
    buildBody(prompt) {
      return {
        model: "grok-3",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      };
    },
    extractText(data) {
      return data.choices?.[0]?.message?.content || null;
    },
    extractUsage(data) {
      const u = data.usage;
      if (!u) return null;
      return { promptTokens: u.prompt_tokens, completionTokens: u.completion_tokens, totalTokens: u.total_tokens };
    },
  },
};

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

function buildAuditPrompt(exportJson) {
  const methodologyText = typeof exportJson === "string" ? exportJson : JSON.stringify(exportJson, null, 2);

  return `You are an independent auditor reviewing an AI-powered voting guide application called "Texas Votes" (txvotes.app). This app generates personalized voting recommendations for Texas elections using Claude (by Anthropic).

Your job is to evaluate the app's methodology, prompts, and data practices for fairness, bias, and transparency. Be rigorous and honest — identify real problems, not just surface-level concerns. The app's credibility depends on genuine independent review.

Below is a complete export of the app's AI prompts, data pipelines, safeguards, and methodology. Review it thoroughly and produce a structured audit report.

=== METHODOLOGY EXPORT ===

${methodologyText}

=== END EXPORT ===

Please evaluate the following five dimensions and provide:
- A score from 1 (poor) to 10 (excellent) for each dimension
- Specific findings (both strengths and weaknesses)
- Actionable recommendations for improvement

## DIMENSION 1: Partisan Bias
Evaluate whether the prompts, data structures, and methodology favor one political party or ideology over another.

## DIMENSION 2: Factual Accuracy Safeguards
Evaluate whether the system has adequate protections against hallucination, fabrication, and factual errors.

## DIMENSION 3: Fairness of Framing
Evaluate whether the way questions are asked, options are presented, and recommendations are framed is genuinely neutral.

## DIMENSION 4: Balance of Pros/Cons
Evaluate whether candidate strengths and weaknesses are presented with equal depth and fairness.

## DIMENSION 5: Transparency of Methodology
Evaluate whether the app is genuinely transparent about how it works and what its limitations are.

## OUTPUT FORMAT
Please structure your response with: Overall Assessment, Scores table (1-10 per dimension), Detailed Findings per dimension (Strengths, Weaknesses, Recommendations), Critical Issues, and Conclusion.

## STRUCTURED SCORES (REQUIRED)
After your full report, you MUST include a JSON block with your scores in exactly this format:
\`\`\`json
{"overallScore": 7.5, "dimensions": {"partisanBias": 8, "factualAccuracy": 7, "fairnessOfFraming": 8, "balanceOfProsCons": 7, "transparency": 9}, "topStrength": "one sentence", "topWeakness": "one sentence"}
\`\`\``;
}

// ---------------------------------------------------------------------------
// Score parsing — 3-tier extraction
// ---------------------------------------------------------------------------

const DIMENSION_KEYS = ["partisanBias", "factualAccuracy", "fairnessOfFraming", "balanceOfProsCons", "transparency"];

function parseAuditScores(responseText) {
  if (!responseText || typeof responseText !== "string") {
    return { success: false, error: "No response text to parse" };
  }

  // Tier 1: Extract JSON from ```json...``` code fence
  const fenceMatch = responseText.match(/```json\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      const validated = validateScores(parsed);
      if (validated) return { success: true, scores: validated, method: "json_fence" };
    } catch { /* fall through */ }
  }

  // Tier 2: Find raw JSON object with overallScore key (handles one level of nesting)
  const rawJsonMatch = responseText.match(/\{(?:[^{}]|\{[^{}]*\})*"overallScore"\s*:\s*[\d.]+(?:[^{}]|\{[^{}]*\})*\}/);
  if (rawJsonMatch) {
    try {
      const parsed = JSON.parse(rawJsonMatch[0]);
      const validated = validateScores(parsed);
      if (validated) return { success: true, scores: validated, method: "raw_json" };
    } catch { /* fall through */ }
  }

  // Tier 3: Regex extraction from prose
  const dimensions = {};
  const dimPatterns = [
    { key: "partisanBias", patterns: [/partisan\s*bias[:\s]*(\d+(?:\.\d+)?)\s*(?:\/\s*10|out of 10)?/i] },
    { key: "factualAccuracy", patterns: [/factual\s*accuracy[^:]*[:\s]*(\d+(?:\.\d+)?)\s*(?:\/\s*10|out of 10)?/i] },
    { key: "fairnessOfFraming", patterns: [/fairness\s*of\s*framing[:\s]*(\d+(?:\.\d+)?)\s*(?:\/\s*10|out of 10)?/i] },
    { key: "balanceOfProsCons", patterns: [/balance\s*of\s*pros[^:]*[:\s]*(\d+(?:\.\d+)?)\s*(?:\/\s*10|out of 10)?/i] },
    { key: "transparency", patterns: [/transparency[^:]*[:\s]*(\d+(?:\.\d+)?)\s*(?:\/\s*10|out of 10)?/i] },
  ];

  for (const dim of dimPatterns) {
    for (const pattern of dim.patterns) {
      const match = responseText.match(pattern);
      if (match) {
        const score = parseFloat(match[1]);
        if (score >= 1 && score <= 10) {
          dimensions[dim.key] = score;
          break;
        }
      }
    }
  }

  if (Object.keys(dimensions).length >= 3) {
    const values = Object.values(dimensions);
    const overallScore = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    return {
      success: true,
      scores: { overallScore, dimensions },
      method: "regex",
    };
  }

  return { success: false, error: "Could not extract scores from response" };
}

function validateScores(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  if (typeof parsed.overallScore !== "number" || parsed.overallScore < 1 || parsed.overallScore > 10) return null;

  const dims = parsed.dimensions;
  if (!dims || typeof dims !== "object") return null;

  // Validate each dimension score
  for (const key of DIMENSION_KEYS) {
    if (key in dims) {
      const val = dims[key];
      if (typeof val !== "number" || val < 1 || val > 10) return null;
    }
  }

  return {
    overallScore: parsed.overallScore,
    dimensions: dims,
    topStrength: parsed.topStrength || null,
    topWeakness: parsed.topWeakness || null,
  };
}

// ---------------------------------------------------------------------------
// Generic provider API call with retry
// ---------------------------------------------------------------------------

async function callProvider(config, prompt, env) {
  const startMs = Date.now();
  const endpoint = config.buildEndpoint ? config.buildEndpoint(env) : config.endpoint;
  const headers = config.buildHeaders(env);
  const body = config.buildBody(prompt);

  for (let attempt = 0; attempt <= 2; attempt++) {
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch (err) {
      if (attempt < 2) {
        await sleep(3000);
        continue;
      }
      return { error: `Network error: ${err.message}`, httpStatus: 0, latencyMs: Date.now() - startMs };
    }

    if (response.status === 200) {
      const data = await response.json();
      const text = config.extractText(data);
      if (!text) {
        return { error: "No text in API response", httpStatus: 200, latencyMs: Date.now() - startMs };
      }
      return {
        text,
        usage: config.extractUsage(data),
        latencyMs: Date.now() - startMs,
      };
    }

    if (response.status === 429) {
      const wait = attempt === 0 ? 5000 : 15000;
      if (attempt < 2) {
        await sleep(wait);
        continue;
      }
      return { error: "Rate limited after retries", httpStatus: 429, latencyMs: Date.now() - startMs };
    }

    if (response.status >= 500) {
      if (attempt < 2) {
        await sleep(3000);
        continue;
      }
      const errBody = await response.text().catch(() => "");
      return { error: `Server error ${response.status}: ${errBody.slice(0, 200)}`, httpStatus: response.status, latencyMs: Date.now() - startMs };
    }

    // 4xx (not 429) — don't retry
    const errBody = await response.text().catch(() => "");
    return { error: `API error ${response.status}: ${errBody.slice(0, 200)}`, httpStatus: response.status, latencyMs: Date.now() - startMs };
  }

  return { error: "Unexpected: exhausted retries", httpStatus: 0, latencyMs: Date.now() - startMs };
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

async function runAudit(env, options = {}) {
  const { providers: requestedProviders, force = false, exportData, triggeredBy = "api" } = options;

  if (!exportData) {
    return { error: "exportData is required" };
  }

  const providerNames = requestedProviders || ["chatgpt", "gemini", "grok"];
  const prompt = buildAuditPrompt(exportData);
  const startedAt = new Date().toISOString();
  const results = {};

  for (const name of providerNames) {
    const config = PROVIDERS[name];
    if (!config) {
      results[name] = { status: "error", error: `Unknown provider: ${name}` };
      continue;
    }

    // Check API key
    if (!env[config.envKey]) {
      results[name] = { status: "error", error: `Missing secret: ${config.envKey}` };
      continue;
    }

    // Check cooldown (1 hour) unless forced
    if (!force) {
      const existing = await env.ELECTION_DATA.get(`audit:result:${name}`);
      if (existing) {
        try {
          const prev = JSON.parse(existing);
          const age = Date.now() - new Date(prev.timestamp).getTime();
          if (age < 3600000) {
            results[name] = { status: "skipped", reason: "cooldown", lastRun: prev.timestamp };
            continue;
          }
        } catch { /* proceed with audit */ }
      }
    }

    // Call the provider
    const apiResult = await callProvider(config, prompt, env);

    if (apiResult.error) {
      const errorResult = {
        status: "api_error",
        provider: name,
        displayName: config.displayName,
        model: config.model,
        error: apiResult.error,
        httpStatus: apiResult.httpStatus,
        latencyMs: apiResult.latencyMs,
        timestamp: new Date().toISOString(),
      };
      results[name] = errorResult;
      await env.ELECTION_DATA.put(`audit:result:${name}`, JSON.stringify(errorResult));
    } else {
      // Parse scores from response
      const parsed = parseAuditScores(apiResult.text);

      const successResult = {
        status: parsed.success ? "success" : "parse_failed",
        provider: name,
        displayName: config.displayName,
        model: config.model,
        scores: parsed.success ? parsed.scores : null,
        parseMethod: parsed.success ? parsed.method : null,
        parseError: parsed.success ? null : parsed.error,
        responseText: apiResult.text,
        usage: apiResult.usage,
        latencyMs: apiResult.latencyMs,
        timestamp: new Date().toISOString(),
      };
      results[name] = successResult;
      await env.ELECTION_DATA.put(`audit:result:${name}`, JSON.stringify(successResult));
    }

    // Delay between providers
    if (providerNames.indexOf(name) < providerNames.length - 1) {
      await sleep(5000);
    }
  }

  // Build summary
  const summary = {
    lastRun: startedAt,
    completedAt: new Date().toISOString(),
    triggeredBy,
    providers: {},
  };

  // Merge with existing summary (preserve results from providers not re-run)
  const existingSummaryRaw = await env.ELECTION_DATA.get("audit:summary");
  if (existingSummaryRaw) {
    try {
      const existingSummary = JSON.parse(existingSummaryRaw);
      if (existingSummary.providers) {
        Object.assign(summary.providers, existingSummary.providers);
      }
    } catch { /* start fresh */ }
  }

  for (const [name, result] of Object.entries(results)) {
    summary.providers[name] = {
      status: result.status,
      overallScore: result.scores?.overallScore || null,
      displayName: PROVIDERS[name]?.displayName || name,
      model: PROVIDERS[name]?.model || null,
      timestamp: result.timestamp || null,
      error: result.error || null,
    };
  }

  // Compute average score across successful providers
  const successfulScores = Object.values(summary.providers)
    .map((p) => p.overallScore)
    .filter((s) => typeof s === "number");
  summary.averageScore = successfulScores.length > 0
    ? Math.round((successfulScores.reduce((a, b) => a + b, 0) / successfulScores.length) * 10) / 10
    : null;

  await env.ELECTION_DATA.put("audit:summary", JSON.stringify(summary));

  // Write daily log
  const today = new Date().toISOString().slice(0, 10);
  const logEntry = {
    startedAt,
    completedAt: summary.completedAt,
    triggeredBy,
    providers: Object.fromEntries(
      Object.entries(results).map(([name, r]) => [name, {
        status: r.status,
        overallScore: r.scores?.overallScore || null,
        latencyMs: r.latencyMs || null,
        error: r.error || null,
      }])
    ),
  };
  await env.ELECTION_DATA.put(`audit:log:${today}`, JSON.stringify(logEntry, null, 2));

  return { success: true, summary, results };
}

export { PROVIDERS, buildAuditPrompt, parseAuditScores, validateScores, callProvider, runAudit, DIMENSION_KEYS };
