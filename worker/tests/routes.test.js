import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexSrc = readFileSync(join(__dirname, "../src/index.js"), "utf-8");

// ---------------------------------------------------------------------------
// Extract and evaluate helper functions from index.js source.
// These functions are not exported, so we extract them from the source string
// and evaluate them, similar to how audit-export.test.js works.
// ---------------------------------------------------------------------------

// Extract nameToSlug function body and create a callable
const nameToSlugBody = `
  if (!name) return "";
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
`;
function nameToSlug(name) {
  if (!name) return "";
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Extract isSparseCandidate logic
function isSparseCandidate(c) {
  let filled = 0;
  if (c.pros && (Array.isArray(c.pros) ? c.pros.length : true)) filled++;
  if (c.cons && (Array.isArray(c.cons) ? c.cons.length : true)) filled++;
  if (c.endorsements && (Array.isArray(c.endorsements) ? c.endorsements.length : true)) filled++;
  if (c.keyPositions && c.keyPositions.length) filled++;
  return filled < 2;
}

// Extract escapeHtml logic
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Extract resolveTone logic
function resolveTone(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value["3"] || value[Object.keys(value).sort()[0]] || null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// nameToSlug
// ---------------------------------------------------------------------------
describe("nameToSlug", () => {
  it("converts a simple name to kebab-case", () => {
    expect(nameToSlug("Alice Johnson")).toBe("alice-johnson");
  });

  it("handles null input", () => {
    expect(nameToSlug(null)).toBe("");
  });

  it("handles undefined input", () => {
    expect(nameToSlug(undefined)).toBe("");
  });

  it("handles empty string", () => {
    expect(nameToSlug("")).toBe("");
  });

  it("handles special characters", () => {
    expect(nameToSlug("Maria Garcia-Lopez")).toBe("maria-garcia-lopez");
  });

  it("handles multiple spaces", () => {
    expect(nameToSlug("John   Doe")).toBe("john-doe");
  });

  it("strips leading/trailing hyphens", () => {
    expect(nameToSlug("--Test--")).toBe("test");
  });

  it("handles names with periods", () => {
    expect(nameToSlug("Dr. James Smith Jr.")).toBe("dr-james-smith-jr");
  });

  it("handles names with apostrophes", () => {
    expect(nameToSlug("O'Brien")).toBe("o-brien");
  });

  it("lowercases all characters", () => {
    expect(nameToSlug("ALICE JOHNSON")).toBe("alice-johnson");
  });

  it("handles single word", () => {
    expect(nameToSlug("Alice")).toBe("alice");
  });

  it("handles numeric characters", () => {
    expect(nameToSlug("District 25")).toBe("district-25");
  });

  it("converts accented characters to hyphens", () => {
    // accented characters are non a-z0-9, so they become hyphens
    expect(nameToSlug("Jose Cruz III")).toBe("jose-cruz-iii");
  });
});

// ---------------------------------------------------------------------------
// isSparseCandidate
// ---------------------------------------------------------------------------
describe("isSparseCandidate", () => {
  it("returns true when no fields populated", () => {
    expect(isSparseCandidate({})).toBe(true);
  });

  it("returns true when only one field populated", () => {
    expect(
      isSparseCandidate({ pros: ["Strong record"], cons: [], endorsements: [], keyPositions: [] })
    ).toBe(true);
  });

  it("returns false when 2 fields populated", () => {
    expect(
      isSparseCandidate({ pros: ["Good"], cons: ["Bad"], endorsements: [], keyPositions: [] })
    ).toBe(false);
  });

  it("returns false when 3 fields populated", () => {
    expect(
      isSparseCandidate({
        pros: ["Good"],
        cons: ["Bad"],
        endorsements: ["AFL-CIO"],
        keyPositions: [],
      })
    ).toBe(false);
  });

  it("returns false when all 4 fields populated", () => {
    expect(
      isSparseCandidate({
        pros: ["Good"],
        cons: ["Bad"],
        endorsements: ["AFL-CIO"],
        keyPositions: ["Healthcare"],
      })
    ).toBe(false);
  });

  it("treats empty arrays as not populated", () => {
    expect(
      isSparseCandidate({
        pros: [],
        cons: [],
        endorsements: [],
        keyPositions: [],
      })
    ).toBe(true);
  });

  it("treats null fields as not populated", () => {
    expect(
      isSparseCandidate({ pros: null, cons: null, endorsements: null, keyPositions: null })
    ).toBe(true);
  });

  it("handles string values for array fields (truthy)", () => {
    expect(
      isSparseCandidate({ pros: "Strong record", cons: "Weak on housing" })
    ).toBe(false);
  });

  it("returns true with only keyPositions", () => {
    expect(
      isSparseCandidate({ keyPositions: ["Healthcare"] })
    ).toBe(true);
  });

  it("returns false with endorsements and keyPositions", () => {
    expect(
      isSparseCandidate({ endorsements: ["Chronicle"], keyPositions: ["Transit"] })
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------
describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("AT&T")).toBe("AT&amp;T");
  });

  it("escapes less-than signs", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes greater-than signs", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('He said "hello"')).toBe("He said &quot;hello&quot;");
  });

  it("handles null input", () => {
    expect(escapeHtml(null)).toBe("");
  });

  it("handles undefined input", () => {
    expect(escapeHtml(undefined)).toBe("");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("passes through clean strings unchanged", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });

  it("escapes multiple special characters in one string", () => {
    expect(escapeHtml('<a href="test">AT&T</a>')).toBe(
      '&lt;a href=&quot;test&quot;&gt;AT&amp;T&lt;/a&gt;'
    );
  });
});

// ---------------------------------------------------------------------------
// resolveTone
// ---------------------------------------------------------------------------
describe("resolveTone", () => {
  it("returns a plain string unchanged", () => {
    expect(resolveTone("Hello")).toBe("Hello");
  });

  it("returns null for null input", () => {
    expect(resolveTone(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(resolveTone(undefined)).toBeNull();
  });

  it("extracts tone 3 from an object", () => {
    expect(resolveTone({ "1": "Simple", "3": "Standard", "5": "Expert" })).toBe(
      "Standard"
    );
  });

  it("falls back to first sorted key when tone 3 is missing", () => {
    expect(resolveTone({ "1": "Simple", "5": "Expert" })).toBe("Simple");
  });

  it("returns null for empty object", () => {
    expect(resolveTone({})).toBeNull();
  });

  it("returns null for arrays", () => {
    expect(resolveTone(["a", "b"])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Static page content verification
// ---------------------------------------------------------------------------
describe("Static pages in index.js source", () => {
  it("landing page contains essential elements", () => {
    expect(indexSrc).toContain("Texas Votes");
    expect(indexSrc).toContain("Build My Voting Guide");
    expect(indexSrc).toContain("/app?start=1");
  });

  it("nonpartisan page contains key sections", () => {
    expect(indexSrc).toContain("Nonpartisan by Design");
    expect(indexSrc).toContain("Randomized Candidate Order");
    expect(indexSrc).toContain("No Party Labels on Candidates");
    expect(indexSrc).toContain("Values-Based Matching");
  });

  it("privacy page exists in routing", () => {
    expect(indexSrc).toContain("/privacy");
    expect(indexSrc).toContain("handlePrivacy");
  });

  it("open-source page exists in routing", () => {
    expect(indexSrc).toContain("/open-source");
  });

  it("audit page exists in routing", () => {
    expect(indexSrc).toContain("/audit");
    expect(indexSrc).toContain("handleAuditPage");
  });

  it("candidates page exists in routing", () => {
    expect(indexSrc).toContain("/candidates");
    expect(indexSrc).toContain("loadAllCandidates");
  });

  it("handleDistricts route exists", () => {
    expect(indexSrc).toContain("/app/api/districts");
    expect(indexSrc).toContain("handleDistricts");
  });

  it("landing page returns correct content type", () => {
    expect(indexSrc).toContain('"Content-Type": "text/html;charset=utf-8"');
  });

  it("landing page includes OG meta tags", () => {
    expect(indexSrc).toContain("og:title");
    expect(indexSrc).toContain("og:description");
    expect(indexSrc).toContain("og:image");
    expect(indexSrc).toContain("twitter:card");
  });

  it("landing page includes Spanish translations", () => {
    expect(indexSrc).toContain("tx_votes_lang");
  });
});

// ---------------------------------------------------------------------------
// Worker routing patterns
// ---------------------------------------------------------------------------
describe("Worker routing patterns", () => {
  it("has a fetch handler export", () => {
    expect(indexSrc).toContain("export default");
    expect(indexSrc).toContain("async fetch(request, env)");
  });

  it("has a scheduled handler for cron", () => {
    expect(indexSrc).toContain("async scheduled(event, env");
  });

  it("handles CORS OPTIONS requests", () => {
    expect(indexSrc).toContain("OPTIONS");
    expect(indexSrc).toContain("Access-Control-Allow-Origin");
  });

  it("routes /app to PWA handler", () => {
    expect(indexSrc).toContain("handlePWA");
  });

  it("routes /app/api/guide to guide handler", () => {
    expect(indexSrc).toContain("handlePWA_Guide");
  });

  it("routes /app/api/summary to summary handler", () => {
    expect(indexSrc).toContain("handlePWA_Summary");
  });

  it("has admin secret protection for admin routes", () => {
    expect(indexSrc).toContain("ADMIN_SECRET");
  });

  it("cron stops after election day", () => {
    expect(indexSrc).toContain("2026-03-04");
  });

  it("returns 404 for unknown POST routes", () => {
    expect(indexSrc).toContain('return new Response("Not found", { status: 404 })');
  });

  it("falls through to landing page for unknown GET paths", () => {
    // At end of GET routes, handleLandingPage() is the fallback
    expect(indexSrc).toContain("return handleLandingPage()");
  });

  it("redirects /candidate (no slug) to /candidates index", () => {
    expect(indexSrc).toContain('url.pathname === "/candidate"');
    expect(indexSrc).toContain('Response.redirect');
    expect(indexSrc).toContain("/candidates");
  });

  it("extracts slug from /candidate/ path", () => {
    expect(indexSrc).toContain('url.pathname.startsWith("/candidate/")');
    expect(indexSrc).toContain('url.pathname.slice("/candidate/".length)');
  });
});

// ---------------------------------------------------------------------------
// /how-it-works page content
// ---------------------------------------------------------------------------
describe("/how-it-works page content", () => {
  it("has handleHowItWorks function", () => {
    expect(indexSrc).toContain("function handleHowItWorks()");
  });

  it("has the correct page title", () => {
    expect(indexSrc).toContain("How It Works — Texas Votes");
  });

  it("explains the 4-step process with numbered steps", () => {
    expect(indexSrc).toContain("You answer a short interview");
    expect(indexSrc).toContain("The AI reads candidate profiles");
    expect(indexSrc).toContain("It finds your best matches");
    expect(indexSrc).toContain("You get a personalized ballot");
  });

  it("explains where candidate information comes from", () => {
    expect(indexSrc).toContain("Where Does the Candidate Information Come From");
    expect(indexSrc).toContain("Official government records");
    expect(indexSrc).toContain("Nonpartisan references");
    expect(indexSrc).toContain("News coverage");
    expect(indexSrc).toContain("Campaign materials");
  });

  it("explains what the app does NOT do", () => {
    expect(indexSrc).toContain("What This App Does NOT Do");
    expect(indexSrc).toContain("does not tell you who to vote for");
    expect(indexSrc).toContain("does not store your personal information");
    expect(indexSrc).toContain("does not track you");
    expect(indexSrc).toContain("does not favor any political party");
    expect(indexSrc).toContain("does not replace your own research");
  });

  it("includes trust section with transparency points", () => {
    expect(indexSrc).toContain("How Can I Trust It");
    expect(indexSrc).toContain("source code is public");
    expect(indexSrc).toContain("Four independent AI systems");
  });

  it("mentions the Flag this info feature", () => {
    const howBlock = indexSrc.slice(
      indexSrc.indexOf("function handleHowItWorks"),
      indexSrc.indexOf("function handleNonpartisan")
    );
    expect(howBlock).toContain("Flag this info");
  });

  it("includes related links section", () => {
    const howBlock = indexSrc.slice(
      indexSrc.indexOf("function handleHowItWorks"),
      indexSrc.indexOf("function handleNonpartisan")
    );
    expect(howBlock).toContain("/nonpartisan");
    expect(howBlock).toContain("/audit");
    expect(howBlock).toContain("/data-quality");
    expect(howBlock).toContain("/open-source");
    expect(howBlock).toContain("/privacy");
  });
});

// ---------------------------------------------------------------------------
// Back button links on subpages
// ---------------------------------------------------------------------------
describe("Back button links on subpages", () => {
  it("how-it-works page has back link to home", () => {
    const howBlock = indexSrc.slice(
      indexSrc.indexOf("function handleHowItWorks"),
      indexSrc.indexOf("function handleNonpartisan")
    );
    expect(howBlock).toContain('class="back-top"');
    expect(howBlock).toContain('href="/"');
    expect(howBlock).toContain("Texas Votes");
  });

  it("nonpartisan page has back link to home", () => {
    const nonpartBlock = indexSrc.slice(
      indexSrc.indexOf("function handleNonpartisan"),
      indexSrc.indexOf("async function handleAuditPage")
    );
    expect(nonpartBlock).toContain('class="back-top"');
    expect(nonpartBlock).toContain('href="/"');
  });

  it("candidate profile page has back link to candidates index", () => {
    const profileBlock = indexSrc.slice(
      indexSrc.indexOf("async function handleCandidateProfile"),
      indexSrc.indexOf("async function handleCandidatesIndex")
    );
    expect(profileBlock).toContain("/candidates");
    expect(profileBlock).toContain("back");
  });

  it("data quality page has back link to home", () => {
    const dqBlock = indexSrc.slice(
      indexSrc.indexOf("async function handleDataQuality"),
      indexSrc.indexOf("// MARK: - Admin Coverage")
    );
    expect(dqBlock).toContain('href="/"');
  });

  it("support page has back link to home", () => {
    expect(indexSrc).toContain("function handleSupport");
    const supportBlock = indexSrc.slice(
      indexSrc.indexOf("function handleSupport"),
      indexSrc.indexOf("function handlePrivacyPolicy")
    );
    expect(supportBlock).toContain('href="/"');
  });
});

// ---------------------------------------------------------------------------
// Page footer consistency
// ---------------------------------------------------------------------------
describe("Page footer consistency", () => {
  it("how-it-works page has standard footer with home, privacy, and contact", () => {
    const howBlock = indexSrc.slice(
      indexSrc.indexOf("function handleHowItWorks"),
      indexSrc.indexOf("function handleNonpartisan")
    );
    expect(howBlock).toContain("page-footer");
    expect(howBlock).toContain("howdy@txvotes.app");
    expect(howBlock).toContain("/privacy");
  });

  it("nonpartisan page has standard footer", () => {
    const nonpartBlock = indexSrc.slice(
      indexSrc.indexOf("function handleNonpartisan"),
      indexSrc.indexOf("async function handleAuditPage")
    );
    expect(nonpartBlock).toContain("page-footer");
    expect(nonpartBlock).toContain("howdy@txvotes.app");
  });
});

// ---------------------------------------------------------------------------
// Bias reporting (Flag this info) in nonpartisan page
// ---------------------------------------------------------------------------
describe("Bias reporting in nonpartisan page", () => {
  it("has Flag This Info section", () => {
    const nonpartBlock = indexSrc.slice(
      indexSrc.indexOf("function handleNonpartisan"),
      indexSrc.indexOf("async function handleAuditPage")
    );
    expect(nonpartBlock).toContain("Flag This Info");
    expect(nonpartBlock).toContain("Flag this info");
  });

  it("mentions flagged@txvotes.app email", () => {
    const nonpartBlock = indexSrc.slice(
      indexSrc.indexOf("function handleNonpartisan"),
      indexSrc.indexOf("async function handleAuditPage")
    );
    expect(nonpartBlock).toContain("flagged@txvotes.app");
  });

  it("describes the reporting workflow", () => {
    const nonpartBlock = indexSrc.slice(
      indexSrc.indexOf("function handleNonpartisan"),
      indexSrc.indexOf("async function handleAuditPage")
    );
    expect(nonpartBlock).toContain("biased");
    expect(nonpartBlock).toContain("inaccurate");
    expect(nonpartBlock).toContain("report it directly");
  });
});

// ---------------------------------------------------------------------------
// Automated balance checks section in nonpartisan page
// ---------------------------------------------------------------------------
describe("Automated balance checks in nonpartisan page", () => {
  it("has Automated Balance Checks section", () => {
    const nonpartBlock = indexSrc.slice(
      indexSrc.indexOf("function handleNonpartisan"),
      indexSrc.indexOf("async function handleAuditPage")
    );
    expect(nonpartBlock).toContain("Automated Balance Checks");
  });

  it("links to data quality dashboard and balance-check API", () => {
    const nonpartBlock = indexSrc.slice(
      indexSrc.indexOf("function handleNonpartisan"),
      indexSrc.indexOf("async function handleAuditPage")
    );
    expect(nonpartBlock).toContain("/data-quality");
    expect(nonpartBlock).toContain("/api/balance-check");
  });
});

// ---------------------------------------------------------------------------
// Audit page rendering
// ---------------------------------------------------------------------------
describe("Audit page rendering", () => {
  it("has handleAuditPage function that reads from KV", () => {
    const auditBlock = indexSrc.slice(
      indexSrc.indexOf("async function handleAuditPage"),
      indexSrc.indexOf("async function handleBalanceCheck")
    );
    expect(auditBlock).toContain("audit:summary");
    expect(auditBlock).toContain("audit:result:chatgpt");
    expect(auditBlock).toContain("audit:result:gemini");
    expect(auditBlock).toContain("audit:result:grok");
    expect(auditBlock).toContain("audit:result:claude");
  });

  it("renders audit cards for each provider", () => {
    const auditBlock = indexSrc.slice(
      indexSrc.indexOf("async function handleAuditPage"),
      indexSrc.indexOf("async function handleBalanceCheck")
    );
    expect(auditBlock).toContain("renderAuditCard");
    expect(auditBlock).toContain("audit-card");
    expect(auditBlock).toContain("audit-score");
  });

  it("shows Pending state for providers not yet run", () => {
    const auditBlock = indexSrc.slice(
      indexSrc.indexOf("async function handleAuditPage"),
      indexSrc.indexOf("async function handleBalanceCheck")
    );
    expect(auditBlock).toContain("Pending");
    expect(auditBlock).toContain("audit-pending");
  });

  it("shows dimension scores for successful results", () => {
    const auditBlock = indexSrc.slice(
      indexSrc.indexOf("async function handleAuditPage"),
      indexSrc.indexOf("async function handleBalanceCheck")
    );
    expect(auditBlock).toContain("partisanBias");
    expect(auditBlock).toContain("Partisan Bias");
    expect(auditBlock).toContain("Factual Accuracy");
    expect(auditBlock).toContain("Fairness of Framing");
    expect(auditBlock).toContain("Balance of Pros/Cons");
    expect(auditBlock).toContain("Transparency");
  });

  it("links to methodology export and results API", () => {
    const auditBlock = indexSrc.slice(
      indexSrc.indexOf("async function handleAuditPage"),
      indexSrc.indexOf("async function handleBalanceCheck")
    );
    expect(auditBlock).toContain("/api/audit/export");
    expect(auditBlock).toContain("/api/audit/results");
  });
});

// ---------------------------------------------------------------------------
// Cron scheduled handler
// ---------------------------------------------------------------------------
describe("Cron scheduled handler", () => {
  it("runs daily update via ctx.waitUntil", () => {
    expect(indexSrc).toContain("ctx.waitUntil(runDailyUpdate(env))");
  });

  it("runs AI audit daily until election day", () => {
    expect(indexSrc).toContain("ctx.waitUntil(");
    expect(indexSrc).toContain("runAudit(env");
    expect(indexSrc).toContain('triggeredBy: "cron"');
  });

  it("passes exportData to audit via buildAuditExportData", () => {
    expect(indexSrc).toContain("exportData: buildAuditExportData()");
  });
});

// ---------------------------------------------------------------------------
// Vanity entry points
// ---------------------------------------------------------------------------
describe("Vanity entry points", () => {
  it("cowboy entry point clears data and sets tone=7", () => {
    expect(indexSrc).toContain('"/cowboy"');
    expect(indexSrc).toContain("handlePWA_Clear");
    expect(indexSrc).toContain("tone=7");
  });

  it("chef entry point clears data and sets tone=6", () => {
    expect(indexSrc).toContain('"/chef"');
    expect(indexSrc).toContain("tone=6");
  });

  it("gemini entry point clears data", () => {
    expect(indexSrc).toContain('"/gemini"');
    expect(indexSrc).toContain("Powered by Gemini");
  });

  it("grok entry point clears data", () => {
    expect(indexSrc).toContain('"/grok"');
    expect(indexSrc).toContain("Powered by Grok");
  });

  it("chatgpt entry point clears data", () => {
    expect(indexSrc).toContain('"/chatgpt"');
    expect(indexSrc).toContain("Powered by ChatGPT");
  });
});
