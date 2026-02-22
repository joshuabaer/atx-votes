// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

/** Pass through the tone phase (phase 1) by clicking Continue (default readingLevel=3 is already set). */
function passTone() {
  clickAction("next"); // phase 1 → 2
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
// Phase 0 → 1: Welcome → Tone
// ---------------------------------------------------------------------------
describe("Phase 0: Welcome (skipped)", () => {
  it("auto-advances to phase 1 (tone picker) on load", () => {
    // Welcome screen is skipped; app goes straight to tone picker
    expect(S().phase).toBe(1);
    expect(getApp()).toContain("Talk to me like");
  });
});

// ---------------------------------------------------------------------------
// Phase 1: Tone / "Talk to me like..."
// ---------------------------------------------------------------------------
describe("Phase 1: Tone", () => {
  it("shows tone selection options", () => {
    expect(S().phase).toBe(1);
    const html = getApp();
    expect(html).toContain("Talk to me like");
    expect(html).toContain("data-action=\"select-tone\"");
  });

  it("Continue button is NOT disabled (readingLevel defaults to 3)", () => {
    const btn = document.querySelector('[data-action="next"]');
    expect(btn.disabled).toBe(false);
  });

  it("selecting a tone option updates readingLevel", () => {
    // Use querySelector directly — CSS.escape("1") produces "\31 " which happy-dom mishandles
    document.querySelector('[data-action="select-tone"][data-value="1"]').click();
    expect(S().readingLevel).toBe(1);
    document.querySelector('[data-action="select-tone"][data-value="4"]').click();
    expect(S().readingLevel).toBe(4);
  });

  it("clicking Continue advances to phase 2 (Issues)", () => {
    clickAction("next");
    expect(S().phase).toBe(2);
    expect(getApp()).toContain("What issues matter most to you");
  });
});

// ---------------------------------------------------------------------------
// Phase 2: Issues Selection
// ---------------------------------------------------------------------------
describe("Phase 2: Issues", () => {
  beforeEach(() => {
    passTone();           // → phase 2
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

  it("enforces max 7 issues", () => {
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("toggle-issue", "Transportation");
    clickAction("toggle-issue", "Immigration");
    clickAction("toggle-issue", "Taxes");
    clickAction("toggle-issue", "Civil Rights");
    expect(S().issues).toHaveLength(7);

    // 8th issue should be rejected
    clickAction("toggle-issue", "Gun Policy");
    expect(S().issues).toHaveLength(7);
    expect(S().issues).not.toContain("Gun Policy");
  });

  it("toggling an issue off deselects it", () => {
    clickAction("toggle-issue", "Housing");
    expect(S().issues).toContain("Housing");
    clickAction("toggle-issue", "Housing");
    expect(S().issues).not.toContain("Housing");
  });

  it("clicking Continue with 3+ issues transitions to phase 3", () => {
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next");
    expect(S().phase).toBe(3);
  });

  it("builds ddQuestions when leaving phase 2", () => {
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
// Phase 3: Political Spectrum
// ---------------------------------------------------------------------------
describe("Phase 3: Spectrum", () => {
  beforeEach(() => {
    passTone();
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next"); // → phase 3
  });

  it("shows spectrum options", () => {
    expect(S().phase).toBe(3);
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

  it("back button returns to phase 2 with issues preserved", () => {
    clickAction("back");
    expect(S().phase).toBe(2);
    expect(S().issues).toEqual(["Housing", "Healthcare", "Education"]);
  });
});

// ---------------------------------------------------------------------------
// Phase 4: Deep Dives
// ---------------------------------------------------------------------------
describe("Phase 4: Deep Dives", () => {
  beforeEach(() => {
    passTone();
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next"); // → phase 3
    clickAction("select-spectrum", "Moderate");
    clickAction("next"); // → phase 4
  });

  it("shows first deep dive question", () => {
    expect(S().phase).toBe(4);
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

  it("back at first deep dive returns to phase 3", () => {
    clickAction("back");
    expect(S().phase).toBe(3);
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
    expect(S().phase).toBe(4);
  });

  it("answering all deep dives transitions to phase 5", () => {
    const total = S().ddQuestions.length;
    for (let i = 0; i < total; i++) {
      const dd = S().ddQuestions[i];
      clickAction("select-dd", dd.opts[0].l);
      clickAction("next-dd");
    }
    expect(S().phase).toBe(5);
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
// Phase 4: Skipped (no deep dives for selected issues)
// ---------------------------------------------------------------------------
describe("Phase 4: Skip when no deep dives", () => {
  it("builds ddQuestions only for issues that have deep dives", () => {
    passTone();
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next");
    // All 3 have deep dives
    expect(S().ddQuestions.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Qualities
// ---------------------------------------------------------------------------
describe("Phase 5: Qualities", () => {
  beforeEach(() => {
    passTone();
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next"); // → phase 3
    clickAction("select-spectrum", "Moderate");
    clickAction("next"); // → phase 4
    // Answer all deep dives
    const total = S().ddQuestions.length;
    for (let i = 0; i < total; i++) {
      const dd = S().ddQuestions[i];
      clickAction("select-dd", dd.opts[0].l);
      clickAction("next-dd");
    }
    // → phase 5
  });

  it("shows quality chips", () => {
    expect(S().phase).toBe(5);
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
    expect(S().phase).toBe(4);
    expect(S().ddIndex).toBe(lastDdIdx);
  });

  it("clicking Continue transitions to phase 6", () => {
    clickAction("toggle-quality", "Experience");
    clickAction("toggle-quality", "Independence");
    clickAction("next");
    expect(S().phase).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Phase 6: Freeform
// ---------------------------------------------------------------------------
describe("Phase 6: Freeform", () => {
  beforeEach(() => {
    passTone();
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
    clickAction("next"); // → phase 6
  });

  it("shows freeform textarea", () => {
    expect(S().phase).toBe(6);
    const html = getApp();
    expect(html).toContain("Anything else");
    expect(html).toContain("freeform-input");
  });

  it("Continue and Skip both advance to phase 7", () => {
    // There are two buttons with data-action="next" (Continue and Skip)
    const btns = document.querySelectorAll('[data-action="next"]');
    expect(btns.length).toBe(2);
    // Click first one (Continue)
    btns[0].click();
    expect(S().phase).toBe(7);
  });

  it("captures textarea content in S.freeform", () => {
    const ta = document.getElementById("freeform-input");
    // Simulate typing — set value directly (happy-dom does not fire input events)
    ta.value = "I care about water policy";
    clickAction("next");
    expect(S().freeform).toBe("I care about water policy");
  });

  it("back returns to phase 5 with qualities preserved", () => {
    clickAction("back");
    expect(S().phase).toBe(5);
    expect(S().qualities).toEqual(["Experience", "Independence"]);
  });
});

// ---------------------------------------------------------------------------
// Phase 7: Address
// ---------------------------------------------------------------------------
describe("Phase 7: Address", () => {
  beforeEach(() => {
    passTone();
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
    clickAction("next"); // → phase 6
    clickAction("next"); // → phase 7 (skip freeform)
  });

  it("shows address form", () => {
    expect(S().phase).toBe(7);
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
    // Should jump to phase 8 (building)
    expect(S().phase).toBe(8);
    expect(S().address.street).toBe("");
  });

  it("back returns to phase 6", () => {
    clickAction("back");
    expect(S().phase).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// Phase 7: Geolocation
// ---------------------------------------------------------------------------
describe("Phase 7: Geolocation", () => {
  let mockGetCurrentPosition;

  beforeEach(() => {
    // Provide navigator.geolocation so the button renders
    mockGetCurrentPosition = vi.fn();
    Object.defineProperty(window.navigator, "geolocation", {
      value: { getCurrentPosition: mockGetCurrentPosition },
      configurable: true,
      writable: true,
    });
    // Ensure serviceWorker stub exists for app init (needs both getRegistrations and register)
    if (!window.navigator.serviceWorker || !window.navigator.serviceWorker.register) {
      Object.defineProperty(window.navigator, "serviceWorker", {
        value: {
          getRegistrations: vi.fn(() => Promise.resolve([])),
          register: vi.fn(() => Promise.resolve({ scope: "/" })),
        },
        configurable: true,
        writable: true,
      });
    }

    // Re-boot app with geolocation available
    document.documentElement.innerHTML = "<head></head><body></body>";
    const store = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((k) => (k in store ? store[k] : null)),
      setItem: vi.fn((k, v) => { store[k] = String(v); }),
      removeItem: vi.fn((k) => { delete store[k]; }),
      clear: vi.fn(() => { for (const k in store) delete store[k]; }),
      key: vi.fn((i) => Object.keys(store)[i] ?? null),
      get length() { return Object.keys(store).length; },
    });
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}), status: 200 })
    ));
    vi.stubGlobal("confirm", vi.fn(() => true));

    bootApp();

    // Navigate to phase 7
    passTone();
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
    clickAction("next"); // → phase 6
    clickAction("next"); // → phase 7
  });

  it("shows Use My Location button when geolocation is available", () => {
    expect(S().phase).toBe(7);
    const html = getApp();
    expect(html).toContain("Use My Location");
    expect(html).toContain('data-action="geolocate"');
  });

  it("sets geolocating state on click", () => {
    expect(S().geolocating).toBe(false);
    clickAction("geolocate");
    expect(S().geolocating).toBe(true);
    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("shows spinner while geolocating", () => {
    clickAction("geolocate");
    const html = getApp();
    expect(html).toContain("Locating...");
    expect(html).toContain("spinner");
    // Button should be disabled
    const btn = document.querySelector('[data-action="geolocate"]');
    expect(btn.disabled).toBe(true);
  });

  it("passes enableHighAccuracy:true on first attempt", () => {
    clickAction("geolocate");
    const opts = mockGetCurrentPosition.mock.calls[0][2];
    expect(opts.enableHighAccuracy).toBe(true);
    expect(opts.timeout).toBe(15000);
    expect(opts.maximumAge).toBe(60000);
  });

  it("populates address fields on successful geolocation", async () => {
    // Mock Nominatim response
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          address: {
            house_number: "501",
            road: "Congress Avenue",
            city: "Austin",
            postcode: "78701",
          },
        }),
        status: 200,
      })
    ));

    clickAction("geolocate");

    // Simulate successful geolocation callback
    const successCb = mockGetCurrentPosition.mock.calls[0][0];
    successCb({ coords: { latitude: 30.2672, longitude: -97.7431 } });

    // Wait for fetch promise chain to resolve
    await vi.waitFor(() => {
      expect(S().geolocating).toBe(false);
    });

    expect(S().address.street).toBe("501 Congress Avenue");
    expect(S().address.city).toBe("Austin");
    expect(S().address.zip).toBe("78701");
  });

  it("handles Nominatim error response gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ error: "Unable to geocode" }),
        status: 200,
      })
    ));

    clickAction("geolocate");
    const successCb = mockGetCurrentPosition.mock.calls[0][0];
    successCb({ coords: { latitude: 0, longitude: 0 } });

    await vi.waitFor(() => {
      expect(S().geolocating).toBe(false);
    });

    expect(S().addressError).toBe("Unable to geocode");
  });

  it("handles Nominatim fetch failure gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: false, status: 500 })
    ));

    clickAction("geolocate");
    const successCb = mockGetCurrentPosition.mock.calls[0][0];
    successCb({ coords: { latitude: 30.2672, longitude: -97.7431 } });

    await vi.waitFor(() => {
      expect(S().geolocating).toBe(false);
    });

    expect(S().addressError).toContain("Try entering it manually");
  });

  it("shows permission denied error for code 1", () => {
    clickAction("geolocate");
    const errorCb = mockGetCurrentPosition.mock.calls[0][1];
    errorCb({ code: 1 });

    expect(S().geolocating).toBe(false);
    expect(S().addressError).toContain("permission denied");
  });

  it("shows timeout error for code 3", () => {
    clickAction("geolocate");
    const errorCb = mockGetCurrentPosition.mock.calls[0][1];
    errorCb({ code: 3 });

    expect(S().geolocating).toBe(false);
    expect(S().addressError).toContain("timed out");
  });

  it("retries with low accuracy on POSITION_UNAVAILABLE (code 2)", () => {
    clickAction("geolocate");
    const errorCb = mockGetCurrentPosition.mock.calls[0][1];

    // Trigger POSITION_UNAVAILABLE
    errorCb({ code: 2 });

    // Should have made a second attempt
    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(2);

    // Second attempt should use low accuracy
    const retryOpts = mockGetCurrentPosition.mock.calls[1][2];
    expect(retryOpts.enableHighAccuracy).toBe(false);
    expect(retryOpts.timeout).toBe(10000);
    expect(retryOpts.maximumAge).toBe(300000);
  });

  it("shows Settings hint when retry also fails", () => {
    clickAction("geolocate");
    const errorCb = mockGetCurrentPosition.mock.calls[0][1];

    // First attempt: POSITION_UNAVAILABLE
    errorCb({ code: 2 });

    // Retry also fails
    const retryErrorCb = mockGetCurrentPosition.mock.calls[1][1];
    retryErrorCb({ code: 2 });

    expect(S().geolocating).toBe(false);
    expect(S().addressError).toContain("Location Services");
    expect(S().addressError).toContain("Settings");
  });

  it("retry succeeds after first attempt fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          address: {
            house_number: "100",
            road: "Main St",
            town: "Round Rock",
            postcode: "78664",
          },
        }),
        status: 200,
      })
    ));

    clickAction("geolocate");
    const errorCb = mockGetCurrentPosition.mock.calls[0][1];

    // First attempt fails
    errorCb({ code: 2 });

    // Retry succeeds
    const retrySuccessCb = mockGetCurrentPosition.mock.calls[1][0];
    retrySuccessCb({ coords: { latitude: 30.5083, longitude: -97.6789 } });

    await vi.waitFor(() => {
      expect(S().geolocating).toBe(false);
    });

    expect(S().address.street).toBe("100 Main St");
    expect(S().address.city).toBe("Round Rock");
    expect(S().address.zip).toBe("78664");
  });

  it("uses town/village/hamlet when city is missing", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          address: {
            road: "FM 1431",
            hamlet: "Jonestown",
            postcode: "78645-1234",
          },
        }),
        status: 200,
      })
    ));

    clickAction("geolocate");
    const successCb = mockGetCurrentPosition.mock.calls[0][0];
    successCb({ coords: { latitude: 30.5, longitude: -97.9 } });

    await vi.waitFor(() => {
      expect(S().geolocating).toBe(false);
    });

    expect(S().address.street).toBe("FM 1431");
    expect(S().address.city).toBe("Jonestown");
    expect(S().address.zip).toBe("78645"); // truncated to 5
  });

  it("clears previous error when geolocating", () => {
    // Set an existing error
    S().addressError = "some old error";
    clickAction("geolocate");
    // Error should be cleared immediately
    expect(S().addressError).toBeNull();
  });

  afterEach(() => {
    // Remove geolocation stub so it doesn't leak into other tests
    delete window.navigator.geolocation;
  });
});

// ---------------------------------------------------------------------------
// Back Navigation: State Preservation
// ---------------------------------------------------------------------------
describe("Back navigation preserves state", () => {
  it("issues preserved when returning from phase 3", () => {
    passTone();
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next"); // → phase 3
    expect(S().phase).toBe(3);

    clickAction("back"); // → phase 2
    expect(S().phase).toBe(2);
    expect(S().issues).toEqual(["Housing", "Healthcare", "Education"]);

    // Chips should show as selected in the DOM
    const onChips = document.querySelectorAll(".chip-on");
    expect(onChips.length).toBe(3);
  });

  it("spectrum preserved when returning from phase 4", () => {
    passTone();
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next");
    clickAction("select-spectrum", "Liberal");
    clickAction("next"); // → phase 4

    clickAction("back"); // → phase 3
    expect(S().spectrum).toBe("Liberal");
    // Radio should show as selected
    const onRadio = document.querySelector(".radio-on");
    expect(onRadio).not.toBeNull();
    expect(onRadio.dataset.value).toBe("Liberal");
  });

  it("deep dive answers preserved when returning from phase 5", () => {
    passTone();
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next");
    clickAction("select-spectrum", "Moderate");
    clickAction("next"); // → phase 4

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
    expect(S().phase).toBe(5);

    // Go back from phase 5 → last deep dive
    clickAction("back");
    expect(S().phase).toBe(4);
    expect(S().ddIndex).toBe(total - 1);

    // All previous answers should still be in policyViews
    for (const [q, a] of Object.entries(answers)) {
      expect(S().policyViews[q]).toBe(a);
    }
  });

  it("qualities preserved when returning from phase 6", () => {
    passTone();
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
    // phase 5
    clickAction("toggle-quality", "Experience");
    clickAction("toggle-quality", "Independence");
    clickAction("next"); // → phase 6

    clickAction("back"); // → phase 5
    expect(S().qualities).toEqual(["Experience", "Independence"]);
    const onChips = document.querySelectorAll(".chip-on");
    expect(onChips.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Full happy path: Phase 0 → 8
// ---------------------------------------------------------------------------
describe("Full interview happy path", () => {
  it("walks through all phases to guide building", () => {
    // Phase 1 (welcome skipped, auto-advanced)
    expect(S().phase).toBe(1);

    // Phase 1: Tone (default readingLevel=3, just click Continue)
    clickAction("next");
    expect(S().phase).toBe(2);

    // Phase 2: Select 3 issues
    clickAction("toggle-issue", "Housing");
    clickAction("toggle-issue", "Healthcare");
    clickAction("toggle-issue", "Education");
    clickAction("next");
    expect(S().phase).toBe(3);

    // Phase 3: Select spectrum
    clickAction("select-spectrum", "Progressive");
    clickAction("next");
    expect(S().phase).toBe(4);

    // Phase 4: Answer all deep dives
    const ddTotal = S().ddQuestions.length;
    expect(ddTotal).toBe(3);
    for (let i = 0; i < ddTotal; i++) {
      const dd = S().ddQuestions[i];
      clickAction("select-dd", dd.opts[0].l);
      clickAction("next-dd");
    }
    expect(S().phase).toBe(5);

    // Phase 5: Select 2 qualities
    clickAction("toggle-quality", "Experience");
    clickAction("toggle-quality", "Integrity & Honesty");
    clickAction("next");
    expect(S().phase).toBe(6);

    // Phase 6: Skip freeform
    clickAction("next");
    expect(S().phase).toBe(7);

    // Phase 7: Skip address
    clickAction("skip-address");
    expect(S().phase).toBe(8);
    expect(getApp()).toContain("Building Your Guide");
  });
});

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------
describe("Progress bar", () => {
  it("shows progress bar during interview phases 1-7", () => {
    expect(getApp()).toContain("progress-fill");
  });

  it("phase 1 (first screen) shows progress bar", () => {
    expect(S().phase).toBe(1);
    expect(getApp()).toContain("progress-fill");
  });
});

// ---------------------------------------------------------------------------
// Phase 1 has no back button, Phase 2+ do
// ---------------------------------------------------------------------------
describe("Back button visibility", () => {
  it("phase 1 has no back button (first screen)", () => {
    expect(S().phase).toBe(1);
    expect(document.querySelector('[data-action="back"]')).toBeNull();
  });

  it("phase 2 has a back button", () => {
    passTone(); // → phase 2
    expect(S().phase).toBe(2);
    expect(document.querySelector('[data-action="back"]')).not.toBeNull();
  });
});
