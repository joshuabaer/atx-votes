import { describe, it, expect } from "vitest";
import { APP_JS } from "../src/pwa.js";

// ---------------------------------------------------------------------------
// PWA UI Features — source-level verification
//
// These tests verify that key UI features exist in the PWA source code.
// They use the same approach as routes.test.js: reading the source string
// and checking for expected patterns, since the PWA is a single inline
// script served from the worker.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Strengths and Concerns display
// ---------------------------------------------------------------------------
describe("Strengths and Concerns in ballot view", () => {
  it("renders Strengths section with green checkmark", () => {
    expect(APP_JS).toContain("Strengths");
    expect(APP_JS).toContain("\\u2705");
    expect(APP_JS).toContain("c.pros");
  });

  it("renders Concerns section with warning sign", () => {
    expect(APP_JS).toContain("Concerns");
    expect(APP_JS).toContain("\\u26A0");
    expect(APP_JS).toContain("c.cons");
  });

  it("conditionally shows Strengths only when pros array has items", () => {
    expect(APP_JS).toContain("c.pros&&c.pros.length");
  });

  it("conditionally shows Concerns only when cons array has items", () => {
    expect(APP_JS).toContain("c.cons&&c.cons.length");
  });

  it("uses esc() for XSS protection on pros/cons text", () => {
    // The rendering code should escape all user-facing content
    expect(APP_JS).toContain("esc(tp(c.pros[j]))");
    expect(APP_JS).toContain("esc(tp(c.cons[j]))");
  });

  it("renders pros and cons as unordered lists", () => {
    expect(APP_JS).toContain("pros\"><h5>");
    expect(APP_JS).toContain("cons\"><h5>");
    // Both use <ul> list format
    expect(APP_JS).toContain("<ul>");
    expect(APP_JS).toContain("<li>");
  });

  it("Strengths and Concerns have Spanish translations", () => {
    expect(APP_JS).toContain("'Strengths':'Fortalezas'");
    expect(APP_JS).toContain("'Concerns':'Preocupaciones'");
  });

  it("renders strengths/concerns in compact view (race card)", () => {
    // The race card shows a compact pros/cons summary
    expect(APP_JS).toContain("var(--ok)");  // Strengths color
    expect(APP_JS).toContain("var(--bad)"); // Concerns color
  });
});

// ---------------------------------------------------------------------------
// "Flag this info" bias reporting UI
// ---------------------------------------------------------------------------
describe("Flag this info bias reporting", () => {
  it("renders Flag this info button on each candidate card", () => {
    expect(APP_JS).toContain("Flag this info");
    expect(APP_JS).toContain('data-action="report-issue"');
    expect(APP_JS).toContain("report-link");
  });

  it("Flag this info button includes candidate name and race data attributes", () => {
    expect(APP_JS).toContain('data-candidate="');
    expect(APP_JS).toContain('data-race="');
  });

  it("report-issue action triggers showReportModal", () => {
    expect(APP_JS).toContain("showReportModal");
    expect(APP_JS).toContain("report-issue");
  });

  it("report modal has 4 issue type radio buttons", () => {
    expect(APP_JS).toContain('value="incorrect"');
    expect(APP_JS).toContain('value="bias"');
    expect(APP_JS).toContain('value="missing"');
    expect(APP_JS).toContain('value="other"');
  });

  it("report modal shows issue type labels", () => {
    expect(APP_JS).toContain("Incorrect info");
    expect(APP_JS).toContain("Perceived bias");
    expect(APP_JS).toContain("Missing info");
    expect(APP_JS).toContain("Other");
  });

  it("report modal includes a textarea for details", () => {
    expect(APP_JS).toContain("report-details");
    expect(APP_JS).toContain("Describe the issue");
  });

  it("report modal has Cancel and Submit buttons", () => {
    expect(APP_JS).toContain('data-action="report-cancel"');
    expect(APP_JS).toContain('data-action="report-submit"');
    expect(APP_JS).toContain("Cancel");
    expect(APP_JS).toContain("Submit Report");
  });

  it("submit action sends email to flagged@txvotes.app", () => {
    expect(APP_JS).toContain("flagged@txvotes.app");
    expect(APP_JS).toContain("mailto:");
  });

  it("submit constructs email with candidate, race, type, and details", () => {
    expect(APP_JS).toContain("Issue Report:");
    expect(APP_JS).toContain("'Candidate: '+candidateName");
    expect(APP_JS).toContain("'Race: '+raceName");
    expect(APP_JS).toContain("'Issue Type: '");
    expect(APP_JS).toContain("'Details: '");
  });

  it("submit tracks report_submitted event", () => {
    expect(APP_JS).toContain("report_submitted");
  });

  it("submit shows thank you message", () => {
    expect(APP_JS).toContain("Thank you! Your report has been sent.");
  });

  it("cancel action removes the modal overlay", () => {
    expect(APP_JS).toContain("report-cancel");
    expect(APP_JS).toContain("d.remove()");
  });

  it("validates that an issue type is selected before submit", () => {
    expect(APP_JS).toContain("Please select an issue type");
  });

  it("Flag this info has Spanish translation", () => {
    expect(APP_JS).toContain("'Flag this info':'Reportar esta informaci");
  });
});

// ---------------------------------------------------------------------------
// Candidate card rendering
// ---------------------------------------------------------------------------
describe("Candidate card rendering in ballot view", () => {
  it("renders candidate name as heading", () => {
    expect(APP_JS).toContain("c.name");
  });

  it("renders candidate summary with escaping", () => {
    expect(APP_JS).toContain("esc(tp(c.summary))");
  });

  it("conditionally renders Key Positions as chips", () => {
    expect(APP_JS).toContain("c.keyPositions&&c.keyPositions.length");
    expect(APP_JS).toContain("Key Positions");
    expect(APP_JS).toContain("pos-chip");
  });

  it("conditionally renders Endorsements list", () => {
    expect(APP_JS).toContain("c.endorsements&&c.endorsements.length");
    expect(APP_JS).toContain("Endorsements");
  });

  it("handles both string and object endorsement formats", () => {
    // String endorsements: typeof en==='string'
    expect(APP_JS).toContain("typeof en==='string'");
    // Object endorsements with type label
    expect(APP_JS).toContain("en.type");
    expect(APP_JS).toContain("en.name");
  });

  it("conditionally renders Fundraising section", () => {
    expect(APP_JS).toContain("c.fundraising");
    expect(APP_JS).toContain("Fundraising");
  });

  it("conditionally renders Polling section", () => {
    expect(APP_JS).toContain("c.polling");
    expect(APP_JS).toContain("Polling");
  });

  it("has expand/collapse toggle button", () => {
    expect(APP_JS).toContain("toggle-expand");
    expect(APP_JS).toContain("Show Details");
    expect(APP_JS).toContain("Show Less");
  });

  it("renders Sources section with expand/collapse", () => {
    expect(APP_JS).toContain("c.sources&&c.sources.length");
    expect(APP_JS).toContain("Sources");
    // Sources show count
    expect(APP_JS).toContain("c.sources.length");
  });

  it("source links open in new tab", () => {
    expect(APP_JS).toContain('target="_blank"');
    expect(APP_JS).toContain('rel="noopener noreferrer"');
  });

  it("source links show access date when available", () => {
    expect(APP_JS).toContain("src.accessDate");
  });
});

// ---------------------------------------------------------------------------
// Phase 0 redirect behavior (source patterns)
// ---------------------------------------------------------------------------
describe("Phase 0 redirect behavior in PWA source", () => {
  it("initial phase is set to 0", () => {
    // The state initialization sets phase to 0
    expect(APP_JS).toContain("phase:0");
  });

  it("phase 0 redirects to landing page", () => {
    // Phase 0 render triggers redirect to /
    expect(APP_JS).toContain("location.href='/'");
  });

  it("?start=1 param auto-advances past phase 0", () => {
    expect(APP_JS).toContain("start=1");
    // When start=1, the app skips phase 0
    expect(APP_JS).toContain("S.phase=1");
  });

  it("?tone= param sets reading level and advances to phase 2", () => {
    expect(APP_JS).toContain("tone=");
    expect(APP_JS).toContain("S.readingLevel=parseInt");
    expect(APP_JS).toContain("S.phase=2");
  });

  it("hash routing resets to #/ when guide is not complete", () => {
    expect(APP_JS).toContain("!S.guideComplete&&location.hash&&location.hash!=='#/'");
    expect(APP_JS).toContain("location.hash='#/'");
  });
});

// ---------------------------------------------------------------------------
// PWA state persistence patterns
// ---------------------------------------------------------------------------
describe("PWA state persistence", () => {
  it("uses tx_votes_ prefix for localStorage keys", () => {
    expect(APP_JS).toContain("tx_votes_profile");
    expect(APP_JS).toContain("tx_votes_ballot_republican");
    expect(APP_JS).toContain("tx_votes_ballot_democrat");
  });

  it("migrates from atx_votes_ prefix", () => {
    expect(APP_JS).toContain("atx_votes_");
    expect(APP_JS).toContain("tx_votes_");
  });

  it("saves profile and ballot data to localStorage", () => {
    expect(APP_JS).toContain("localStorage.setItem");
    expect(APP_JS).toContain("tx_votes_profile");
  });

  it("loads profile and ballot data from localStorage", () => {
    expect(APP_JS).toContain("localStorage.getItem");
    expect(APP_JS).toContain("tx_votes_profile");
  });
});

// ---------------------------------------------------------------------------
// Share race feature
// ---------------------------------------------------------------------------
describe("Share race feature", () => {
  it("has share-race button on each race", () => {
    expect(APP_JS).toContain('data-action="share-race"');
    expect(APP_JS).toContain("Share this race");
  });

  it("tracks share_race analytics event", () => {
    expect(APP_JS).toContain("share_race");
  });

  it("uses navigator.share when available, falls back to clipboard", () => {
    expect(APP_JS).toContain("navigator.share");
    expect(APP_JS).toContain("navigator.clipboard");
  });
});

// ---------------------------------------------------------------------------
// Guide reprocessing
// ---------------------------------------------------------------------------
describe("Guide reprocessing", () => {
  it("has reprocess-guide button when guide is complete", () => {
    expect(APP_JS).toContain('data-action="reprocess-guide"');
    expect(APP_JS).toContain("Reprocess Guide");
  });

  it("reprocess action resets and rebuilds guide", () => {
    expect(APP_JS).toContain("reprocessGuide");
    expect(APP_JS).toContain("S.guideComplete=false");
    expect(APP_JS).toContain("S.phase=8");
  });
});

// ---------------------------------------------------------------------------
// "I Voted" feature
// ---------------------------------------------------------------------------
describe("I Voted feature", () => {
  it("has mark-voted action", () => {
    expect(APP_JS).toContain('data-action="mark-voted"');
  });

  it("tracks i_voted analytics event", () => {
    expect(APP_JS).toContain("i_voted");
  });

  it("launches confetti on voting", () => {
    expect(APP_JS).toContain("launchConfetti");
  });

  it("has unvote action to toggle back", () => {
    expect(APP_JS).toContain('data-action="unvote"');
  });
});

// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------
describe("Tab navigation in PWA", () => {
  it("has ballot, profile, and info tabs", () => {
    expect(APP_JS).toContain("#/ballot");
    expect(APP_JS).toContain("#/profile");
    expect(APP_JS).toContain("#/info");
  });

  it("renders tab bar with tabBar function", () => {
    expect(APP_JS).toContain("tabBar");
  });

  it("renders top navigation with topNav function", () => {
    expect(APP_JS).toContain("topNav");
  });
});

// ---------------------------------------------------------------------------
// Disclaimer display
// ---------------------------------------------------------------------------
describe("Disclaimer display", () => {
  it("shows disclaimer that can be dismissed", () => {
    expect(APP_JS).toContain("disclaimerDismissed");
    expect(APP_JS).toContain('data-action="dismiss-disclaimer"');
  });

  it("disclaimer mentions AI-generated recommendations", () => {
    expect(APP_JS).toContain("AI-generated");
  });

  it("encourages doing own research", () => {
    expect(APP_JS).toContain("do your own research");
  });
});
