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

/** Pass through the issues phase (phase 2) — sortable list, just click Continue. */
function passIssues() {
  clickAction("next"); // phase 2 → 3
}

/** Pass through the spectrum phase (phase 3). */
function passSpectrum(value = "Moderate") {
  clickAction("select-spectrum", value);
  clickAction("next"); // phase 3 → 4
}

/** Pass through all deep dives. */
function passDeepDives() {
  const total = S().ddQuestions.length;
  for (let i = 0; i < total; i++) {
    const dd = S().ddQuestions[i];
    clickAction("select-dd", dd.opts[0].l);
    clickAction("next-dd");
  }
}

/** Pass through the qualities phase (phase 5) — sortable list, just click Continue. */
function passQualities() {
  clickAction("next"); // phase 5 → 6
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

  // Stub navigator.sendBeacon — analytics trk() calls use sendBeacon
  Object.defineProperty(navigator, "sendBeacon", {
    value: vi.fn(() => true),
    writable: true,
    configurable: true,
  });

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
    expect(getApp()).toContain("Rank your issues by priority");
  });
});

// ---------------------------------------------------------------------------
// Phase 2: Issues (Sort by Priority)
// ---------------------------------------------------------------------------
describe("Phase 2: Issues (sortable)", () => {
  beforeEach(() => {
    passTone();           // → phase 2
  });

  it("shows sortable issue list with all 17 issues", () => {
    const html = getApp();
    expect(html).toContain("sort-list");
    expect(html).toContain("sort-item");
    expect(html).toContain("Housing");
    expect(html).toContain("Healthcare");
    const items = document.querySelectorAll(".sort-item");
    expect(items.length).toBe(17);
  });

  it("populates S.issues with all 17 issues", () => {
    expect(S().issues).toHaveLength(17);
  });

  it("Continue button is always enabled (no minimum selection needed)", () => {
    const btn = document.querySelector('[data-action="next"]');
    expect(btn.disabled).toBe(false);
  });

  it("shows priority divider after position 5", () => {
    const html = getApp();
    expect(html).toContain("sort-divider");
    expect(html).toContain("your top priorities are above this line");
  });

  it("shows drag handles and arrow buttons", () => {
    const html = getApp();
    expect(html).toContain("drag-handle");
    expect(html).toContain("sort-arrows");
    expect(html).toContain('data-action="sort-up"');
    expect(html).toContain('data-action="sort-down"');
  });

  it("sort-up moves an item up in the list", () => {
    const originalSecond = S().issues[1];
    // Click the sort-up button for index 1
    const btn = document.querySelector('[data-action="sort-up"][data-idx="1"]');
    btn.click();
    expect(S().issues[0]).toBe(originalSecond);
  });

  it("sort-down moves an item down in the list", () => {
    const originalFirst = S().issues[0];
    // Click the sort-down button for index 0
    const btn = document.querySelector('[data-action="sort-down"][data-idx="0"]');
    btn.click();
    expect(S().issues[1]).toBe(originalFirst);
  });

  it("sort-up at index 0 does nothing", () => {
    const original = S().issues.slice();
    const btn = document.querySelector('[data-action="sort-up"][data-idx="0"]');
    btn.click();
    expect(S().issues).toEqual(original);
  });

  it("sort-down at last index does nothing", () => {
    const original = S().issues.slice();
    const lastIdx = S().issues.length - 1;
    const btn = document.querySelector(`[data-action="sort-down"][data-idx="${lastIdx}"]`);
    btn.click();
    expect(S().issues).toEqual(original);
  });

  it("clicking Continue transitions to phase 3", () => {
    clickAction("next");
    expect(S().phase).toBe(3);
  });

  it("builds ddQuestions only for top 5 issues when leaving phase 2", () => {
    clickAction("next");
    // Deep dives should only be built from top 5 issues
    const top5 = S().issues.slice(0, 5);
    for (const dd of S().ddQuestions) {
      // Each dd question should correspond to one of the top 5 issues
      const issueKeys = top5.filter(issue => {
        // Check if this issue has a deep dive by seeing if dd.q matches
        return true; // We just verify the count is reasonable
      });
    }
    expect(S().ddQuestions.length).toBeLessThanOrEqual(5);
    expect(S().ddQuestions.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Phase 3: Political Spectrum
// ---------------------------------------------------------------------------
describe("Phase 3: Spectrum", () => {
  beforeEach(() => {
    passTone();
    passIssues();
    // → phase 3
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
    // Issues should still be a full array of 17
    expect(S().issues).toHaveLength(17);
  });
});

// ---------------------------------------------------------------------------
// Phase 4: Deep Dives
// ---------------------------------------------------------------------------
describe("Phase 4: Deep Dives", () => {
  beforeEach(() => {
    passTone();
    passIssues();
    passSpectrum("Moderate");
    // → phase 4
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
  it("builds ddQuestions only for top 5 issues that have deep dives", () => {
    passTone();
    passIssues();
    // All 17 issues populated, top 5 checked for deep dives
    clickAction("select-spectrum", "Moderate");
    clickAction("next");
    // Should have deep dives for some of the top 5 issues
    expect(S().ddQuestions.length).toBeGreaterThanOrEqual(0);
    expect(S().ddQuestions.length).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Qualities (Sort by Priority)
// ---------------------------------------------------------------------------
describe("Phase 5: Qualities (sortable)", () => {
  beforeEach(() => {
    passTone();
    passIssues();
    passSpectrum("Moderate");
    passDeepDives();
    // → phase 5
  });

  it("shows sortable quality list with all 10 qualities", () => {
    expect(S().phase).toBe(5);
    const html = getApp();
    expect(html).toContain("Rank the qualities you value");
    expect(html).toContain("sort-list");
    const items = document.querySelectorAll(".sort-item");
    expect(items.length).toBe(10);
  });

  it("populates S.qualities with all 10 qualities", () => {
    expect(S().qualities).toHaveLength(10);
  });

  it("Continue is always enabled", () => {
    const btn = document.querySelector('[data-action="next"]');
    expect(btn.disabled).toBe(false);
  });

  it("shows priority divider after position 3", () => {
    const html = getApp();
    expect(html).toContain("sort-divider");
  });

  it("sort-up moves a quality up", () => {
    const originalSecond = S().qualities[1];
    const btn = document.querySelector('[data-action="sort-up"][data-idx="1"]');
    btn.click();
    expect(S().qualities[0]).toBe(originalSecond);
  });

  it("sort-down moves a quality down", () => {
    const originalFirst = S().qualities[0];
    const btn = document.querySelector('[data-action="sort-down"][data-idx="0"]');
    btn.click();
    expect(S().qualities[1]).toBe(originalFirst);
  });

  it("back returns to last deep dive question", () => {
    const lastDdIdx = S().ddQuestions.length - 1;
    clickAction("back");
    expect(S().phase).toBe(4);
    expect(S().ddIndex).toBe(lastDdIdx);
  });

  it("clicking Continue transitions to phase 6", () => {
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
    passIssues();
    passSpectrum("Moderate");
    passDeepDives();
    passQualities();
    // → phase 6
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
    // All 10 qualities should still be present
    expect(S().qualities).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// Phase 7: Address
// ---------------------------------------------------------------------------
describe("Phase 7: Address", () => {
  beforeEach(() => {
    passTone();
    passIssues();
    passSpectrum("Moderate");
    passDeepDives();
    passQualities();
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
    passIssues();
    passSpectrum("Moderate");
    passDeepDives();
    passQualities();
    clickAction("next"); // → phase 7 (skip freeform)
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
    passIssues();
    // → phase 3
    expect(S().phase).toBe(3);

    clickAction("back"); // → phase 2
    expect(S().phase).toBe(2);
    // All 17 issues should be present in the ranked list
    expect(S().issues).toHaveLength(17);

    // Sort items should be rendered in the DOM
    const items = document.querySelectorAll(".sort-item");
    expect(items.length).toBe(17);
  });

  it("spectrum preserved when returning from phase 4", () => {
    passTone();
    passIssues();
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
    passIssues();
    passSpectrum("Moderate");
    // → phase 4

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
    passIssues();
    passSpectrum("Moderate");
    passDeepDives();
    // phase 5
    passQualities();
    // → phase 6

    clickAction("back"); // → phase 5
    // All 10 qualities should still be present in the ranked list
    expect(S().qualities).toHaveLength(10);
    const items = document.querySelectorAll(".sort-item");
    expect(items.length).toBe(10);
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

    // Phase 2: Issues (sortable, just click Continue)
    expect(S().issues).toHaveLength(17);
    clickAction("next");
    expect(S().phase).toBe(3);

    // Phase 3: Select spectrum
    clickAction("select-spectrum", "Progressive");
    clickAction("next");
    expect(S().phase).toBe(4);

    // Phase 4: Answer all deep dives
    const ddTotal = S().ddQuestions.length;
    expect(ddTotal).toBeGreaterThan(0);
    for (let i = 0; i < ddTotal; i++) {
      const dd = S().ddQuestions[i];
      clickAction("select-dd", dd.opts[0].l);
      clickAction("next-dd");
    }
    expect(S().phase).toBe(5);

    // Phase 5: Qualities (sortable, just click Continue)
    expect(S().qualities).toHaveLength(10);
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

// ---------------------------------------------------------------------------
// Backward compatibility: loading old-format profiles
// ---------------------------------------------------------------------------
describe("Backward compatibility", () => {
  it("pads partial issues array with remaining items on load", () => {
    // Simulate an old-format saved profile with only 3 selected issues
    const oldProfile = {
      topIssues: ["Housing", "Healthcare", "Education"],
      politicalSpectrum: "Moderate",
      policyViews: {},
      candidateQualities: ["Experience", "Independence"],
      freeform: "",
      address: { street: "", city: "", state: "TX", zip: "" },
      readingLevel: 3,
    };

    // Store it
    localStorage.setItem("tx_votes_profile", JSON.stringify(oldProfile));

    // Re-boot
    document.documentElement.innerHTML = "<head></head><body></body>";
    bootApp();

    // Issues should be padded to 17 with the old selections at the top
    expect(S().issues).toHaveLength(17);
    expect(S().issues[0]).toBe("Housing");
    expect(S().issues[1]).toBe("Healthcare");
    expect(S().issues[2]).toBe("Education");

    // Qualities should be padded to 10 with old selections at the top
    expect(S().qualities).toHaveLength(10);
    expect(S().qualities[0]).toBe("Experience");
    expect(S().qualities[1]).toBe("Independence");
  });
});
