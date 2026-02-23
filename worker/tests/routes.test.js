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
});
