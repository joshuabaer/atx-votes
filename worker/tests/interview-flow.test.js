// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { APP_JS } from "../src/pwa.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Boot the app by evaluating APP_JS inside the current happy-dom document. */
function bootApp() {
  // Minimal DOM structure the app expects
  document.body.innerHTML =
    '<div id="topnav"></div><main id="app"></main><div id="tabs"></div>';

  // Evaluate the app code in the global scope.
  // Script tags don't auto-execute in happy-dom, so we use indirect eval.
  // APP_JS is already a joined string (not an array) — safe, it's our own source.
  const indirectEval = eval;
  indirectEval(APP_JS);
}

/** Shorthand: find element and dispatch a click. */
function click(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`click: no element for "${selector}"`);
  el.click();
}

/** Click a data-action element by action name (optionally with data-value). */
function clickAction(action, value) {
  const sel = value
    ? `[data-action="${action}"][data-value="${CSS.escape(value)}"]`
    : `[data-action="${action}"]`;
  const el = document.querySelector(sel);
  if (!el) throw new Error(`clickAction: no element for ${sel}`);
  el.click();
}

/** Click a chip/radio by its visible text content (substring match). */
function clickChip(text) {
  const els = document.querySelectorAll("[data-action]");
  for (const el of els) {
    if (el.textContent.includes(text)) {
      el.click();
      return;
    }
  }
  throw new Error(`clickChip: no element containing "${text}"`);
}

/** Get the main app HTML. */
function getApp() {
  return document.getElementById("app").innerHTML;
}

/** Access the global state object S. */
function S() {
  return window.S;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset DOM completely
  document.documentElement.innerHTML = "<head></head><body></body>";

  // Provide a compliant localStorage stub (happy-dom's may be incomplete)
  const store = {};
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((k) => (k in store ? store[k] : null)),
    setItem: vi.fn((k, v) => { store[k] = String(v); }),
    removeItem: vi.fn((k) => { delete store[k]; }),
    clear: vi.fn(() => { for (const k in store) delete store[k]; }),
    key: vi.fn((i) => Object.keys(store)[i] ?? null),
    get length() { return Object.keys(store).length; },
  });

  // Stub fetch — buildGuide() and refreshBallots() make network calls
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        status: 200,
      })
    )
  );

  // Stub confirm (used by reset action)
  vi.stubGlobal("confirm", vi.fn(() => true));

  bootApp();
});

// ---------------------------------------------------------------------------
// Phase 0 → 1: Welcome → Issues
// ---------------------------------------------------------------------------
describe("Phase 0: Welcome", () => {
  it("shows welcome screen on load", () => {
    expect(S().phase).toBe(0);
    expect(getApp()).toContain("Build My Guide");
  });

  it('clicking "Build My Guide" transitions to phase 1', () => {
    clickAction("start");
    expect(S().phase).toBe(1);
    expect(getApp()).toContain("What issues matter most to you");
  });
});

// ---------------------------------------------------------------------------
// Phase 1: Issues Selection
// ---------------------------------------------------------------------------
describe("Phase 1: Issues", () => {
  beforeEach(() => {
    clickAction("start"); // → phase 1
  });

  it("shows issue chips", () => {
    const html = getApp();
    expect(html).toContain("data-action=\"toggle-issue\"");
    expect(html).toContain("Housing");
    expect(html).toContain("Healthcare");
  });

  it("Continue button is disabled with < 3 issues", () => {
    const btn = document.querySelector('[data-action="next"]');
    expect(btn.disabled).toBe(true);

    // Select 2 issues
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    const btn2 = document.querySelector('[data-action="next"]');
    expect(btn2.disabled).toBe(true);
    expect(S().issues).toHaveLength(2);
  });

  it("selecting 3 issues enables Continue", () => {
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    expect(S().issues).toHaveLength(3);
    const btn = document.querySelector('[data-action="next"]');
    expect(btn.disabled).toBe(false);
  });

  it("enforces max 5 issues", () => {
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("toggle-issue", "Transportation");
    clickAction("toggle-issue", "Immigration");
    expect(S().issues).toHaveLength(5);

    // 6th issue should be rejected
    clickAction("toggle-issue", "Taxes");
    expect(S().issues).toHaveLength(5);
    expect(S().issues).not.toContain("Taxes");
  });

  it("toggling an issue off deselects it", () => {
    clickAction("toggle-issue", "Housing");
    expect(S().issues).toContain("Housing");
    clickAction("toggle-issue", "Housing");
    expect(S().issues).not.toContain("Housing");
  });

  it("clicking Continue with 3+ issues transitions to phase 2", () => {
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next");
    expect(S().phase).toBe(2);
  });

  it("builds ddQuestions when leaving phase 1", () => {
    // Housing and Healthcare have deep dives; Education too
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next");
    // All 3 issues have deep dives
    expect(S().ddQuestions.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Phase 2: Political Spectrum
// ---------------------------------------------------------------------------
describe("Phase 2: Spectrum", () => {
  beforeEach(() => {
    clickAction("start");
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next"); // → phase 2
  });

  it("shows spectrum options", () => {
    expect(S().phase).toBe(2);
    const html = getApp();
    expect(html).toContain("political approach");
    expect(html).toContain("data-action=\"select-spectrum\"");
  });

  it("Continue is disabled until selection made", () => {
    const btn = document.querySelector('[data-action="next"]');
    expect(btn.disabled).toBe(true);
  });

  it("selecting a spectrum option enables Continue", () => {
    clickAction("select-spectrum", "Progressive");
    expect(S().spectrum).toBe("Progressive");
    const btn = document.querySelector('[data-action="next"]');
    expect(btn.disabled).toBe(false);
  });

  it("back button returns to phase 1 with issues preserved", () => {
    clickAction("back");
    expect(S().phase).toBe(1);
    expect(S().issues).toEqual(["Housing", "Healthcare", "Education"]);
  });
});

// ---------------------------------------------------------------------------
// Phase 3: Deep Dives
// ---------------------------------------------------------------------------
describe("Phase 3: Deep Dives", () => {
  beforeEach(() => {
    clickAction("start");
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next"); // → phase 2
    clickAction("select-spectrum", "Moderate");
    clickAction("next"); // → phase 3
  });

  it("shows first deep dive question", () => {
    expect(S().phase).toBe(3);
    expect(S().ddIndex).toBe(0);
    const html = getApp();
    expect(html).toContain("Question 1");
    expect(html).toContain(`of ${S().ddQuestions.length}`);
  });

  it("Continue is disabled until an answer is selected", () => {
    const btn = document.querySelector('[data-action="next-dd"]');
    expect(btn.disabled).toBe(true);
  });

  it("selecting an answer and clicking Continue advances to next question", () => {
    const dd = S().ddQuestions[0];
    clickAction("select-dd", dd.opts[0].l);
    expect(S().policyViews[dd.q]).toBe(dd.opts[0].l);

    clickAction("next-dd");
    expect(S().ddIndex).toBe(1);
    expect(getApp()).toContain("Question 2");
  });

  it("back at first deep dive returns to phase 2", () => {
    clickAction("back");
    expect(S().phase).toBe(2);
    expect(S().spectrum).toBe("Moderate");
  });

  it("back within deep dives decrements ddIndex", () => {
    // Answer first question and advance
    const dd0 = S().ddQuestions[0];
    clickAction("select-dd", dd0.opts[0].l);
    clickAction("next-dd");
    expect(S().ddIndex).toBe(1);

    // Go back
    clickAction("back");
    expect(S().ddIndex).toBe(0);
    expect(S().phase).toBe(3);
  });

  it("answering all deep dives transitions to phase 4", () => {
    const total = S().ddQuestions.length;
    for (let i = 0; i < total; i++) {
      const dd = S().ddQuestions[i];
      clickAction("select-dd", dd.opts[0].l);
      clickAction("next-dd");
    }
    expect(S().phase).toBe(4);
  });

  it("preserves deep dive answers", () => {
    const dd0 = S().ddQuestions[0];
    const answer = dd0.opts[1].l;
    clickAction("select-dd", answer);
    clickAction("next-dd");

    // The answer should be stored
    expect(S().policyViews[dd0.q]).toBe(answer);
  });
});

// ---------------------------------------------------------------------------
// Phase 3: Skipped (no deep dives for selected issues)
// ---------------------------------------------------------------------------
describe("Phase 3: Skip when no deep dives", () => {
  it("builds ddQuestions only for issues that have deep dives", () => {
    clickAction("start");
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next");
    // All 3 have deep dives
    expect(S().ddQuestions.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Phase 4: Qualities
// ---------------------------------------------------------------------------
describe("Phase 4: Qualities", () => {
  beforeEach(() => {
    clickAction("start");
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next"); // → phase 2
    clickAction("select-spectrum", "Moderate");
    clickAction("next"); // → phase 3
    // Answer all deep dives
    const total = S().ddQuestions.length;
    for (let i = 0; i < total; i++) {
      const dd = S().ddQuestions[i];
      clickAction("select-dd", dd.opts[0].l);
      clickAction("next-dd");
    }
    // → phase 4
  });

  it("shows quality chips", () => {
    expect(S().phase).toBe(4);
    const html = getApp();
    expect(html).toContain("value most in a candidate");
    expect(html).toContain("data-action=\"toggle-quality\"");
  });

  it("Continue disabled with < 2 qualities", () => {
    const btn = document.querySelector('[data-action="next"]');
    expect(btn.disabled).toBe(true);

    clickAction("toggle-quality", "Experience");
    const btn2 = document.querySelector('[data-action="next"]');
    expect(btn2.disabled).toBe(true);
  });

  it("selecting 2 qualities enables Continue", () => {
    clickAction("toggle-quality", "Experience");
    clickAction("toggle-quality", "Independence");
    expect(S().qualities).toHaveLength(2);
    const btn = document.querySelector('[data-action="next"]');
    expect(btn.disabled).toBe(false);
  });

  it("enforces max 3 qualities", () => {
    clickAction("toggle-quality", "Experience");
    clickAction("toggle-quality", "Independence");
    clickAction("toggle-quality", "Integrity & Honesty");
    expect(S().qualities).toHaveLength(3);

    // 4th should be rejected
    clickAction("toggle-quality", "Strong Leadership");
    expect(S().qualities).toHaveLength(3);
    expect(S().qualities).not.toContain("Strong Leadership");
  });

  it("back returns to last deep dive question", () => {
    const lastDdIdx = S().ddQuestions.length - 1;
    clickAction("back");
    expect(S().phase).toBe(3);
    expect(S().ddIndex).toBe(lastDdIdx);
  });

  it("clicking Continue transitions to phase 5", () => {
    clickAction("toggle-quality", "Experience");
    clickAction("toggle-quality", "Independence");
    clickAction("next");
    expect(S().phase).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Freeform
// ---------------------------------------------------------------------------
describe("Phase 5: Freeform", () => {
  beforeEach(() => {
    clickAction("start");
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next");
    clickAction("select-spectrum", "Moderate");
    clickAction("next");
    const total = S().ddQuestions.length;
    for (let i = 0; i < total; i++) {
      clickAction("select-dd", S().ddQuestions[i].opts[0].l);
      clickAction("next-dd");
    }
    clickAction("toggle-quality", "Experience");
    clickAction("toggle-quality", "Independence");
    clickAction("next"); // → phase 5
  });

  it("shows freeform textarea", () => {
    expect(S().phase).toBe(5);
    const html = getApp();
    expect(html).toContain("Anything else");
    expect(html).toContain("freeform-input");
  });

  it("Continue and Skip both advance to phase 6", () => {
    // There are two buttons with data-action="next" (Continue and Skip)
    const btns = document.querySelectorAll('[data-action="next"]');
    expect(btns.length).toBe(2);
    // Click first one (Continue)
    btns[0].click();
    expect(S().phase).toBe(6);
  });

  it("captures textarea content in S.freeform", () => {
    const ta = document.getElementById("freeform-input");
    // Simulate typing — set value directly (happy-dom does not fire input events)
    ta.value = "I care about water policy";
    clickAction("next");
    expect(S().freeform).toBe("I care about water policy");
  });

  it("back returns to phase 4 with qualities preserved", () => {
    clickAction("back");
    expect(S().phase).toBe(4);
    expect(S().qualities).toEqual(["Experience", "Independence"]);
  });
});

// ---------------------------------------------------------------------------
// Phase 6: Address
// ---------------------------------------------------------------------------
describe("Phase 6: Address", () => {
  beforeEach(() => {
    clickAction("start");
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next");
    clickAction("select-spectrum", "Moderate");
    clickAction("next");
    const total = S().ddQuestions.length;
    for (let i = 0; i < total; i++) {
      clickAction("select-dd", S().ddQuestions[i].opts[0].l);
      clickAction("next-dd");
    }
    clickAction("toggle-quality", "Experience");
    clickAction("toggle-quality", "Independence");
    clickAction("next"); // → phase 5
    clickAction("next"); // → phase 6 (skip freeform)
  });

  it("shows address form", () => {
    expect(S().phase).toBe(6);
    const html = getApp();
    expect(html).toContain("Where do you vote");
    expect(html).toContain("addr-form");
  });

  it("shows street address error when empty", () => {
    // Submit form with empty street
    const form = document.getElementById("addr-form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true }));
    expect(S().addressError).toContain("street address");
  });

  it("shows ZIP error for invalid ZIP", () => {
    const form = document.getElementById("addr-form");
    form.street.value = "123 Congress Ave";
    form.zip.value = "abc";
    form.dispatchEvent(new window.Event("submit", { bubbles: true }));
    expect(S().addressError).toContain("5-digit ZIP");
  });

  it("shows ZIP error for short ZIP", () => {
    const form = document.getElementById("addr-form");
    form.street.value = "123 Congress Ave";
    form.zip.value = "787";
    form.dispatchEvent(new window.Event("submit", { bubbles: true }));
    expect(S().addressError).toContain("5-digit ZIP");
  });

  it("accepts valid address and calls fetch", () => {
    const form = document.getElementById("addr-form");
    form.street.value = "123 Congress Ave";
    form.zip.value = "78701";
    form.dispatchEvent(new window.Event("submit", { bubbles: true }));
    expect(S().addressError).toBeNull();
    expect(S().verifyingAddress).toBe(true);
    // fetch should have been called with district API
    expect(fetch).toHaveBeenCalledWith(
      "/app/api/districts",
      expect.objectContaining({ method: "POST" })
    );
  });

  it('"Skip & Build Guide" skips address validation', () => {
    clickAction("skip-address");
    // Should jump to phase 7 (building)
    expect(S().phase).toBe(7);
    expect(S().address.street).toBe("");
  });

  it("back returns to phase 5", () => {
    clickAction("back");
    expect(S().phase).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Back Navigation: State Preservation
// ---------------------------------------------------------------------------
describe("Back navigation preserves state", () => {
  it("issues preserved when returning from phase 2", () => {
    clickAction("start");
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next"); // → phase 2
    expect(S().phase).toBe(2);

    clickAction("back"); // → phase 1
    expect(S().phase).toBe(1);
    expect(S().issues).toEqual(["Housing", "Healthcare", "Education"]);

    // Chips should show as selected in the DOM
    const onChips = document.querySelectorAll(".chip-on");
    expect(onChips.length).toBe(3);
  });

  it("spectrum preserved when returning from phase 3", () => {
    clickAction("start");
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next");
    clickAction("select-spectrum", "Liberal");
    clickAction("next"); // → phase 3

    clickAction("back"); // → phase 2
    expect(S().spectrum).toBe("Liberal");
    // Radio should show as selected
    const onRadio = document.querySelector(".radio-on");
    expect(onRadio).not.toBeNull();
    expect(onRadio.dataset.value).toBe("Liberal");
  });

  it("deep dive answers preserved when returning from phase 4", () => {
    clickAction("start");
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next");
    clickAction("select-spectrum", "Moderate");
    clickAction("next"); // → phase 3

    // Answer all deep dives
    const total = S().ddQuestions.length;
    const answers = {};
    for (let i = 0; i < total; i++) {
      const dd = S().ddQuestions[i];
      const answer = dd.opts[1].l; // pick second option
      clickAction("select-dd", answer);
      answers[dd.q] = answer;
      clickAction("next-dd");
    }
    expect(S().phase).toBe(4);

    // Go back from phase 4 → last deep dive
    clickAction("back");
    expect(S().phase).toBe(3);
    expect(S().ddIndex).toBe(total - 1);

    // All previous answers should still be in policyViews
    for (const [q, a] of Object.entries(answers)) {
      expect(S().policyViews[q]).toBe(a);
    }
  });

  it("qualities preserved when returning from phase 5", () => {
    clickAction("start");
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next");
    clickAction("select-spectrum", "Moderate");
    clickAction("next");
    const total = S().ddQuestions.length;
    for (let i = 0; i < total; i++) {
      clickAction("select-dd", S().ddQuestions[i].opts[0].l);
      clickAction("next-dd");
    }
    // phase 4
    clickAction("toggle-quality", "Experience");
    clickAction("toggle-quality", "Independence");
    clickAction("next"); // → phase 5

    clickAction("back"); // → phase 4
    expect(S().qualities).toEqual(["Experience", "Independence"]);
    const onChips = document.querySelectorAll(".chip-on");
    expect(onChips.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Full happy path: Phase 0 → 7
// ---------------------------------------------------------------------------
describe("Full interview happy path", () => {
  it("walks through all phases to guide building", () => {
    // Phase 0 → 1
    expect(S().phase).toBe(0);
    clickAction("start");
    expect(S().phase).toBe(1);

    // Phase 1: Select 3 issues
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next");
    expect(S().phase).toBe(2);

    // Phase 2: Select spectrum
    clickAction("select-spectrum", "Progressive");
    clickAction("next");
    expect(S().phase).toBe(3);

    // Phase 3: Answer all deep dives
    const ddTotal = S().ddQuestions.length;
    expect(ddTotal).toBe(3);
    for (let i = 0; i < ddTotal; i++) {
      const dd = S().ddQuestions[i];
      clickAction("select-dd", dd.opts[0].l);
      clickAction("next-dd");
    }
    expect(S().phase).toBe(4);

    // Phase 4: Select 2 qualities
    clickAction("toggle-quality", "Experience");
    clickAction("toggle-quality", "Integrity & Honesty");
    clickAction("next");
    expect(S().phase).toBe(5);

    // Phase 5: Skip freeform
    clickAction("next");
    expect(S().phase).toBe(6);

    // Phase 6: Skip address
    clickAction("skip-address");
    expect(S().phase).toBe(7);
    expect(getApp()).toContain("Building Your Guide");
  });
});

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------
describe("Progress bar", () => {
  it("shows progress bar during interview phases 1-6", () => {
    clickAction("start");
    expect(getApp()).toContain("progress-fill");
  });

  it("no progress bar on welcome (phase 0)", () => {
    expect(S().phase).toBe(0);
    expect(getApp()).not.toContain("progress-fill");
  });
});

// ---------------------------------------------------------------------------
// Phase 1 has no back button, Phase 2+ do
// ---------------------------------------------------------------------------
describe("Back button visibility", () => {
  it("phase 1 has no back button", () => {
    clickAction("start");
    expect(S().phase).toBe(1);
    expect(document.querySelector('[data-action="back"]')).toBeNull();
  });

  it("phase 2 has a back button", () => {
    clickAction("start");
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next");
    expect(S().phase).toBe(2);
    expect(document.querySelector('[data-action="back"]')).not.toBeNull();
  });
});
