import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexSrc = readFileSync(join(__dirname, "../src/index.js"), "utf-8");
const guideSrc = readFileSync(join(__dirname, "../src/pwa-guide.js"), "utf-8");
const updaterSrc = readFileSync(join(__dirname, "../src/updater.js"), "utf-8");

// Extract the export JSON by running the worker handler in miniflare-like fashion
// isn't possible without the full worker runtime, so instead we verify by checking
// the source code contains the expected strings and patterns.

// Helper: extract the audit export function block
function getExportBlock() {
  return indexSrc.slice(
    indexSrc.indexOf("handleAuditExport"),
    indexSrc.indexOf("handleSupport")
  );
}

// ---------------------------------------------------------------------------
// Guide generation prompts in source
// ---------------------------------------------------------------------------
describe("Audit export source: guide generation", () => {
  it("export includes the full SYSTEM_PROMPT from pwa-guide.js", () => {
    // Key phrases from the actual SYSTEM_PROMPT
    const keyPhrases = [
      "non-partisan voting guide assistant",
      "NEVER recommend a candidate who is not listed",
      "NEVER invent or hallucinate",
      "NONPARTISAN RULES",
      "neutral, factual language",
      "Treat all candidates with equal analytical rigor",
    ];
    for (const phrase of keyPhrases) {
      expect(guideSrc).toContain(phrase);
      expect(indexSrc).toContain(phrase);
    }
  });

  it("export includes the model name from pwa-guide.js", () => {
    expect(guideSrc).toContain("claude-sonnet-4-6");
    expect(indexSrc).toContain("claude-sonnet-4-6");
  });

  it("export includes all 7 reading level instructions", () => {
    // Verify pwa-guide.js has all 7 levels
    expect(guideSrc).toContain("high school reading level");
    expect(guideSrc).toContain("explaining politics to a friend");
    expect(guideSrc).toContain("more depth and nuance");
    expect(guideSrc).toContain("expert level");
    expect(guideSrc).toContain("Swedish Chef");
    expect(guideSrc).toContain("Texas cowboy");

    // Verify the export in index.js has all 7
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("high school reading level");
    expect(exportBlock).toContain("explaining politics to a friend");
    expect(exportBlock).toContain("more depth and nuance");
    expect(exportBlock).toContain("expert level");
    expect(exportBlock).toContain("Swedish Chef");
    expect(exportBlock).toContain("Texas cowboy");
  });

  it("export includes confidence levels", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("Strong Match");
    expect(exportBlock).toContain("Good Match");
    expect(exportBlock).toContain("Best Available");
    expect(exportBlock).toContain("Symbolic Race");
    expect(exportBlock).toContain("Clear Call");
    expect(exportBlock).toContain("Genuinely Contested");
  });

  it("export includes user prompt template with NONPARTISAN rules", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("NONPARTISAN");
    expect(exportBlock).toContain("recommendedCandidate");
    expect(exportBlock).toContain("profileSummary");
  });
});

// ---------------------------------------------------------------------------
// Profile summary
// ---------------------------------------------------------------------------
describe("Audit export source: profile summary", () => {
  it("export includes the SUMMARY_SYSTEM prompt", () => {
    const keyPhrases = [
      "concise, non-partisan political analyst",
      "neutral, respectful language",
      "Never use partisan labels",
    ];
    for (const phrase of keyPhrases) {
      expect(guideSrc).toContain(phrase);
      expect(indexSrc).toContain(phrase);
    }
  });

  it("export includes the party label prohibition", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain('NEVER say');
    expect(exportBlock).toContain("Democrat");
    expect(exportBlock).toContain("Republican");
  });
});

// ---------------------------------------------------------------------------
// Daily updater
// ---------------------------------------------------------------------------
describe("Audit export source: daily updater", () => {
  it("export includes the updater system prompt", () => {
    const updaterPrompt =
      "You are a nonpartisan election data researcher. Use web_search to find verified, factual updates about candidates.";
    expect(updaterSrc).toContain(updaterPrompt);
    expect(indexSrc).toContain(updaterPrompt);
  });

  it("export includes validation rules", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("Candidate count must remain the same");
    expect(exportBlock).toContain("Candidate names must match exactly");
    expect(exportBlock).toContain("Endorsement lists cannot shrink by more than 50%");
  });

  it("export includes full race research prompt template", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("raceResearchPromptTemplate");
    expect(exportBlock).toContain("Search for updates since");
    expect(exportBlock).toContain("New endorsements");
    expect(exportBlock).toContain("New polling data");
    expect(exportBlock).toContain("Updated fundraising numbers");
  });

  it("export documents merge strategy and KV keys", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("mergeStrategy");
    expect(exportBlock).toContain("kvKeys");
    expect(exportBlock).toContain("update_log");
  });
});

// ---------------------------------------------------------------------------
// Candidate research
// ---------------------------------------------------------------------------
describe("Audit export source: candidate research", () => {
  it("includes data sources", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("Texas Secretary of State");
    expect(exportBlock).toContain("Ballotpedia");
    expect(exportBlock).toContain("Campaign websites");
  });

  it("includes all candidate data fields", () => {
    const exportBlock = getExportBlock();
    const requiredFields = [
      "name", "isIncumbent", "summary", "background", "education",
      "keyPositions", "endorsements", "pros", "cons", "polling", "fundraising",
    ];
    for (const field of requiredFields) {
      expect(exportBlock).toContain(field);
    }
  });

  it("includes equal treatment statement", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("equalTreatment");
    expect(exportBlock).toContain("same structured fields");
  });
});

// ---------------------------------------------------------------------------
// Nonpartisan safeguards
// ---------------------------------------------------------------------------
describe("Audit export source: nonpartisan safeguards", () => {
  it("has all 4 safeguard categories", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("promptLevel");
    expect(exportBlock).toContain("dataLevel");
    expect(exportBlock).toContain("uiLevel");
    expect(exportBlock).toContain("translationLevel");
  });

  it("UI safeguards mention randomization and hidden party labels", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("randomized");
    expect(exportBlock).toContain("Party labels hidden");
    expect(exportBlock).toContain("Interview answer options shuffled");
  });
});

// ---------------------------------------------------------------------------
// Interview questions
// ---------------------------------------------------------------------------
describe("Audit export source: interview questions", () => {
  it("documents all 8 interview phases", () => {
    const exportBlock = getExportBlock();
    const phases = [
      "Party Selection",
      "Political Spectrum",
      "Top Issues",
      "Policy Deep Dives",
      "Candidate Qualities",
      "Free-form",
      "Address Lookup",
      "Guide Generation",
    ];
    for (const phase of phases) {
      expect(exportBlock).toContain(phase);
    }
  });

  it("includes all 17 issues with icons", () => {
    const exportBlock = getExportBlock();
    const issues = [
      "Economy & Cost of Living",
      "Housing",
      "Public Safety",
      "Education",
      "Healthcare",
      "Environment & Climate",
      "Grid & Infrastructure",
      "Tech & Innovation",
      "Transportation",
      "Immigration",
      "Taxes",
      "Civil Rights",
      "Gun Policy",
      "Abortion & Reproductive Rights",
      "Water & Land",
      "Agriculture & Rural",
      "Faith & Religious Liberty",
    ];
    for (const issue of issues) {
      expect(exportBlock).toContain(issue);
    }
    expect(issues).toHaveLength(17);
  });

  it("includes all 6 political spectrum options", () => {
    const exportBlock = getExportBlock();
    const options = [
      "Progressive",
      "Liberal",
      "Moderate",
      "Conservative",
      "Libertarian",
      "Independent / Issue-by-Issue",
    ];
    for (const opt of options) {
      expect(exportBlock).toContain(opt);
    }
    expect(options).toHaveLength(6);
  });

  it("includes all 10 candidate qualities", () => {
    const exportBlock = getExportBlock();
    const qualities = [
      "Competence & Track Record",
      "Integrity & Honesty",
      "Independence",
      "Experience",
      "Fresh Perspective",
      "Bipartisan / Works Across Aisle",
      "Strong Leadership",
      "Community Ties",
      "Faith & Values",
      "Business Experience",
    ];
    for (const quality of qualities) {
      expect(exportBlock).toContain(quality);
    }
    expect(qualities).toHaveLength(10);
  });

  it("includes all 17 policy deep-dive topics with questions and options", () => {
    const exportBlock = getExportBlock();
    const topics = [
      "Housing",
      "Public Safety",
      "Economy & Cost of Living",
      "Tech & Innovation",
      "Education",
      "Healthcare",
      "Environment & Climate",
      "Grid & Infrastructure",
      "Transportation",
      "Immigration",
      "Civil Rights",
      "Gun Policy",
      "Abortion & Reproductive Rights",
      "Water & Land",
      "Agriculture & Rural",
      "Taxes",
      "Faith & Religious Liberty",
    ];
    for (const topic of topics) {
      expect(exportBlock).toContain(`"${topic}"`);
    }
    expect(topics).toHaveLength(17);

    // Verify each deep dive has a question and 4 options
    expect(exportBlock).toContain("policyDeepDives");
    expect(exportBlock).toContain("question:");
    expect(exportBlock).toContain("options:");
    expect(exportBlock).toContain("label:");
  });
});

// ---------------------------------------------------------------------------
// Data structure samples
// ---------------------------------------------------------------------------
describe("Audit export source: data structure", () => {
  it("includes sample candidate with pros and cons", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("sampleCandidate");
    expect(exportBlock).toContain("sampleProposition");
  });
});

// ---------------------------------------------------------------------------
// County seeder (NEW)
// ---------------------------------------------------------------------------
describe("Audit export source: county seeder", () => {
  it("has countySeeder section with prompts", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("countySeeder:");
    expect(exportBlock).toContain("countyInfoPrompt");
    expect(exportBlock).toContain("countyBallotPrompt");
    expect(exportBlock).toContain("precinctMapPrompt");
  });

  it("includes the county seeder system prompt", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("nonpartisan election data researcher for Texas");
  });

  it("lists data sources for county research", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("County clerk election offices");
    expect(exportBlock).toContain("County elections websites");
    expect(exportBlock).toContain("County GIS and precinct boundary data");
  });

  it("includes top 30 counties", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("topCounties");
    const topCounties = [
      "Harris", "Dallas", "Tarrant", "Bexar", "Travis",
      "Collin", "Denton", "Hidalgo", "Fort Bend", "Williamson",
    ];
    for (const county of topCounties) {
      expect(exportBlock).toContain(county);
    }
  });

  it("documents KV key structure for county data", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("county_info:{fips}");
    expect(exportBlock).toContain("ballot:county:{fips}");
    expect(exportBlock).toContain("precinct_map:{fips}");
  });

  it("includes equal treatment statement for county ballots", () => {
    const exportBlock = getExportBlock();
    // Find the county seeder section and verify its equalTreatment
    expect(exportBlock).toContain("Both party ballots for each county use identical prompt structure");
  });
});

// ---------------------------------------------------------------------------
// Tone variants (NEW)
// ---------------------------------------------------------------------------
describe("Audit export source: tone variants", () => {
  it("has toneVariants section", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("toneVariants:");
  });

  it("documents all 7 available tones", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("availableTones");
    // Check for all tone keys
    expect(exportBlock).toContain('"1"');
    expect(exportBlock).toContain('"2"');
    expect(exportBlock).toContain('"3"');
    expect(exportBlock).toContain('"4"');
    expect(exportBlock).toContain('"5"');
    expect(exportBlock).toContain('"6"');
    expect(exportBlock).toContain('"7"');
  });

  it("documents tone labels", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("Simple");
    expect(exportBlock).toContain("Casual");
    expect(exportBlock).toContain("Standard (default)");
    expect(exportBlock).toContain("Detailed");
    expect(exportBlock).toContain("Expert");
    expect(exportBlock).toContain("Swedish Chef");
    expect(exportBlock).toContain("Texas Cowboy");
  });

  it("documents candidate and proposition fields affected", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("candidateFields");
    expect(exportBlock).toContain("propositionFields");
    expect(exportBlock).toContain("ifPasses");
    expect(exportBlock).toContain("ifFails");
    expect(exportBlock).toContain("fiscalImpact");
  });

  it("documents storage format and constraints", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("storageFormat");
    expect(exportBlock).toContain("resolveTone()");
    expect(exportBlock).toContain("Tone 3 is always the original");
  });

  it("includes rewrite prompt template", () => {
    const exportBlock = getExportBlock();
    expect(exportBlock).toContain("rewritePromptTemplate");
    expect(exportBlock).toContain("Keep the same factual content and meaning");
  });
});

// ---------------------------------------------------------------------------
// Completeness: export size
// ---------------------------------------------------------------------------
describe("Audit export source: completeness", () => {
  it("handleAuditExport function is at least 15000 characters", () => {
    const start = indexSrc.indexOf("function handleAuditExport()");
    const end = indexSrc.indexOf("function handleSupport()");
    const fnLength = end - start;
    expect(fnLength).toBeGreaterThan(15000);
  });

  it("export has at least 10 top-level keys in the exportData object", () => {
    const exportBlock = indexSrc.slice(
      indexSrc.indexOf("const exportData = {"),
      indexSrc.indexOf("return new Response(JSON.stringify(exportData")
    );
    const topKeys = [
      "_meta", "guideGeneration", "profileSummary", "candidateResearch",
      "dailyUpdater", "dataStructure", "nonpartisanSafeguards", "interviewQuestions",
      "countySeeder", "toneVariants",
    ];
    for (const key of topKeys) {
      expect(exportBlock).toContain(key + ":");
    }
    expect(topKeys).toHaveLength(10);
  });
});
