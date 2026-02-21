import { runDailyUpdate } from "./updater.js";
import { handlePWA, handlePWA_SW, handlePWA_Manifest, handlePWA_Clear } from "./pwa.js";
import { handlePWA_Guide, handlePWA_Summary } from "./pwa-guide.js";

// Travis County commissioner precinct lookup by ZIP code
// Source: Travis County Clerk precinct maps
const ZIP_TO_PRECINCT = {
  "78701": "2", "78702": "1", "78703": "2", "78704": "2", "78705": "2",
  "78712": "2", "78721": "1", "78722": "1", "78723": "1", "78724": "1",
  "78725": "1", "78726": "3", "78727": "2", "78728": "2", "78729": "3",
  "78730": "3", "78731": "2", "78732": "3", "78733": "3", "78734": "3",
  "78735": "3", "78736": "3", "78737": "3", "78738": "3", "78739": "3",
  "78741": "4", "78742": "4", "78744": "4", "78745": "4", "78746": "3",
  "78747": "4", "78748": "4", "78749": "3", "78750": "2", "78751": "2",
  "78752": "1", "78753": "1", "78754": "1", "78756": "2", "78757": "2",
  "78758": "2", "78759": "2",
};

async function handleDistricts(request, env) {
  const { street, city, state, zip } = await request.json();
  if (!street || !city || !state || !zip) {
    return jsonResponse({ error: "Missing address fields" }, 400);
  }

  const params = new URLSearchParams({
    street,
    city,
    state,
    zip,
    benchmark: "Public_AR_Current",
    vintage: "Current_Current",
    format: "json",
  });

  let censusData;
  try {
    const res = await fetch(
      `https://geocoding.geo.census.gov/geocoder/geographies/address?${params}`
    );
    censusData = await res.json();
  } catch {
    return jsonResponse({ error: "census_unavailable" }, 502);
  }

  const matches = censusData?.result?.addressMatches;
  if (!matches || matches.length === 0) {
    return jsonResponse({ error: "address_not_found" }, 404);
  }

  const geos = matches[0].geographies;

  // Extract district numbers from Census geography keys
  const congressional = findBasename(geos, "Congressional Districts");
  const stateSenate = findBasename(geos, "Legislative Districts - Upper");
  const stateHouse = findBasename(geos, "Legislative Districts - Lower");
  const precinct = ZIP_TO_PRECINCT[zip] || null;

  return jsonResponse({
    congressional: congressional ? `District ${congressional}` : null,
    stateSenate: stateSenate ? `District ${stateSenate}` : null,
    stateHouse: stateHouse ? `District ${stateHouse}` : null,
    countyCommissioner: precinct ? `Precinct ${precinct}` : null,
    schoolBoard: "District 5",
  });
}

function findBasename(geos, partialKey) {
  for (const key of Object.keys(geos)) {
    if (key.includes(partialKey) && geos[key].length > 0) {
      return geos[key][0].BASENAME;
    }
  }
  return null;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function handleLandingPage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ATX Votes — Your Personalized Austin Voting Guide</title>
  <meta name="description" content="Build your personalized voting guide for Austin & Travis County elections in 5 minutes. Know exactly who to vote for based on your values.">
  <meta property="og:title" content="ATX Votes — Your Personalized Austin Voting Guide">
  <meta property="og:description" content="Build your personalized voting guide for Austin & Travis County elections in 5 minutes.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://atxvotes.app">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #faf8f0;
      color: #1e1e24;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 3rem 2.5rem;
      max-width: 480px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 {
      font-size: 2rem;
      font-weight: 800;
      color: #21598e;
      margin-bottom: 0.5rem;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 1.1rem;
      color: #73737f;
      margin-bottom: 1.5rem;
      line-height: 1.5;
    }
    .badge {
      display: inline-block;
      background: #21598e15;
      color: #21598e;
      font-weight: 600;
      font-size: 0.95rem;
      padding: 0.4rem 1rem;
      border-radius: 99px;
      margin-bottom: 2rem;
    }
    .cta {
      display: inline-block;
      background: #21598e;
      color: white;
      font-size: 1.1rem;
      font-weight: 700;
      padding: 1rem 2.5rem;
      border-radius: 12px;
      text-decoration: none;
      transition: opacity 0.15s;
    }
    .cta:hover { opacity: 0.9; }
    .features {
      margin-top: 2rem;
      text-align: left;
      font-size: 0.95rem;
      color: #73737f;
      line-height: 2;
    }
    .features span { margin-right: 0.5rem; }
    .footer {
      margin-top: 2rem;
      font-size: 0.85rem;
      color: #73737f80;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🗳️</div>
    <h1>ATX Votes</h1>
    <p class="subtitle">Your personalized voting guide for Austin &amp; Travis County elections.</p>
    <div class="badge">Texas Primary — March 3, 2026</div>
    <br>
    <a class="cta" href="/app">Build My Voting Guide</a>
    <div class="features">
      <div><span>✅</span> 5-minute interview learns your values</div>
      <div><span>📋</span> Personalized ballot with recommendations</div>
      <div><span>🖨️</span> Print your cheat sheet for the booth</div>
      <div><span>📍</span> Find your polling location</div>
      <div><span>⚖️</span> <a href="/nonpartisan" style="color:inherit">Nonpartisan by design</a> — fairness is in our code</div>
    </div>
    <p style="margin-top:1.5rem;font-size:0.85rem;color:#73737f">Works on any device — phone, tablet, or computer. No app download needed.</p>
  </div>
  <p class="footer">Built in Austin, TX &middot; <a href="mailto:howdy@atxvotes.app" style="color:inherit">howdy@atxvotes.app</a></p>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

function handleNonpartisan() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Nonpartisan by Design — ATX Votes</title>
  <meta name="description" content="How ATX Votes ensures fairness: randomized order, no party labels, neutral AI, privacy-first design, and more.">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #faf8f0;
      color: #1e1e24;
      padding: 2rem;
      line-height: 1.7;
    }
    .container {
      max-width: 640px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      padding: 3rem 2.5rem;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    h1 { font-size: 1.8rem; font-weight: 800; color: #21598e; margin-bottom: 0.3rem; }
    .subtitle { font-size: 1.05rem; color: #73737f; margin-bottom: 2rem; line-height: 1.6; }
    h2 { font-size: 1.15rem; font-weight: 700; color: #1e1e24; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    p { font-size: 1rem; color: #3a3a44; margin-bottom: 0.75rem; }
    a { color: #21598e; }
    .back { display: inline-block; margin-top: 1.5rem; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Nonpartisan by Design</h1>
    <p class="subtitle">ATX Votes matches candidates to your values, not your party. Every design decision is made to keep the experience fair for all voters — regardless of where you fall on the political spectrum.</p>

    <h2>Randomized Candidate Order</h2>
    <p>Candidates and answer options are shuffled every time so position on screen never creates bias.</p>

    <h2>Both Ballots Generated Equally</h2>
    <p>Republican and Democratic ballots are generated simultaneously with identical AI prompts and formatting. For undecided voters, even the loading order is randomized.</p>

    <h2>No Party Labels on Candidates</h2>
    <p>Party affiliation is intentionally hidden from candidate cards so you evaluate candidates on their positions, not partisan identity.</p>

    <h2>Values-Based Matching</h2>
    <p>Recommendations are based on your stated issues, priorities, and candidate qualities — not party registration.</p>

    <h2>Neutral Interview Questions</h2>
    <p>Every question is framed neutrally. Answer options are shuffled. The spectrum picker says "No wrong answers."</p>

    <h2>Six-Point Political Spectrum</h2>
    <p>Goes beyond left/right: Progressive, Liberal, Moderate, Conservative, Libertarian, and Independent. Moderate and Independent voters are never auto-assigned a party.</p>

    <h2>Balanced Proposition Coverage</h2>
    <p>Every proposition shows supporters AND opponents, fiscal impact, outcomes if it passes or fails, and includes a "Your Call" option for genuinely contested issues.</p>

    <h2>AI Transparency &amp; Guardrails</h2>
    <p>Every AI prompt includes an explicit NONPARTISAN instruction block requiring: factual, issue-based reasoning only; no partisan framing or loaded terms; equal analytical rigor for all candidates regardless of position; and recommendations connected to the voter's specific stated values — never to party-line assumptions. Disclaimers appear on every recommendation screen. Confidence levels (Strong Match, Good Match, Best Available) prevent false certainty.</p>

    <h2>Verified Candidate Data</h2>
    <p>All candidates are cross-referenced against official filings from the Texas Secretary of State, Travis County Clerk, and Ballotpedia. Candidate data includes positions, endorsements, strengths, and concerns — presented with equal depth for every candidate in a race.</p>

    <h2>Nonpartisan Translations</h2>
    <p>All Spanish translations are reviewed for partisan bias. Proposition titles and descriptions use identical grammatical structures for both parties. Data terms (candidate names, positions) stay in English for accuracy; only the display layer is translated.</p>

    <h2>Encouraging Independent Research</h2>
    <p>Every screen says "Do your own research before voting." The app is a starting point, not the final word.</p>

    <h2>Privacy-First Design</h2>
    <p>All data stays on your device. No analytics, no tracking, no ads. Your political views are never stored on our servers.</p>

    <h2>Open Source Approach</h2>
    <p>The full prompt sent to the AI and every design decision is documented. Nothing is hidden.</p>

    <a class="back" href="/">&larr; Back to ATX Votes</a>
    <p style="margin-top: 1rem; font-size: 0.9rem; color: #73737f;">Questions? <a href="mailto:howdy@atxvotes.app">howdy@atxvotes.app</a></p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

function handleSupport() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Support — ATX Votes</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #faf8f0;
      color: #1e1e24;
      padding: 2rem;
      line-height: 1.7;
    }
    .container {
      max-width: 640px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      padding: 3rem 2.5rem;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    h1 { font-size: 1.8rem; font-weight: 800; color: #21598e; margin-bottom: 0.3rem; }
    .subtitle { font-size: 1rem; color: #73737f; margin-bottom: 2rem; }
    h2 { font-size: 1.15rem; font-weight: 700; color: #1e1e24; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    p { font-size: 1rem; color: #3a3a44; margin-bottom: 0.75rem; }
    a { color: #21598e; }
    .email-btn {
      display: inline-block;
      background: #21598e;
      color: white;
      font-size: 1.05rem;
      font-weight: 700;
      padding: 0.8rem 2rem;
      border-radius: 12px;
      text-decoration: none;
      margin-top: 0.5rem;
    }
    .email-btn:hover { opacity: 0.9; }
    .faq { margin-top: 2rem; }
    .back { display: inline-block; margin-top: 1.5rem; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Support</h1>
    <p class="subtitle">We're here to help.</p>

    <a class="email-btn" href="mailto:howdy@atxvotes.app">Email Us</a>

    <div class="faq">
      <h2>Frequently Asked Questions</h2>

      <h2>How do I reset my voting guide?</h2>
      <p>Go to the Profile tab and tap "Start Over" at the bottom. This erases your profile and recommendations so you can retake the interview.</p>

      <h2>Are the recommendations accurate?</h2>
      <p>Recommendations are generated by AI based on real candidate data and your stated preferences. They're a starting point — we always encourage doing your own research. The app includes a disclaimer on every screen.</p>

      <h2>Where is my data stored?</h2>
      <p>Everything stays on your device (and in your iCloud account if you have iCloud enabled). We don't store your data on our servers. See our <a href="/privacy">privacy policy</a> for details.</p>

      <h2>Which elections are covered?</h2>
      <p>ATX Votes currently covers the March 3, 2026 Texas Primary Election for Austin and Travis County voters, including both Republican and Democratic primaries.</p>

      <h2>I found wrong information about a candidate.</h2>
      <p>Please <a href="mailto:howdy@atxvotes.app">email us</a> with details and we'll correct it as quickly as possible.</p>
    </div>

    <a class="back" href="/">&larr; Back to ATX Votes</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

function handlePrivacyPolicy() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Privacy Policy — ATX Votes</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #faf8f0;
      color: #1e1e24;
      padding: 2rem;
      line-height: 1.7;
    }
    .container {
      max-width: 640px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      padding: 3rem 2.5rem;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    h1 { font-size: 1.8rem; font-weight: 800; color: #21598e; margin-bottom: 0.3rem; }
    .updated { font-size: 0.9rem; color: #73737f; margin-bottom: 2rem; }
    h2 { font-size: 1.15rem; font-weight: 700; color: #1e1e24; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    p, li { font-size: 1rem; color: #3a3a44; margin-bottom: 0.75rem; }
    ul { padding-left: 1.5rem; margin-bottom: 0.75rem; }
    a { color: #21598e; }
    .back { display: inline-block; margin-top: 1.5rem; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Privacy Policy</h1>
    <p class="updated">Last updated: February 19, 2026</p>

    <p>ATX Votes ("the app") is a free voting guide for Austin and Travis County elections. Your privacy matters — here's exactly what happens with your data.</p>

    <h2>What we collect</h2>
    <p>The app collects only what you provide during the interview:</p>
    <ul>
      <li><strong>Voter preferences</strong> — your top issues, political outlook, policy views, and candidate qualities</li>
      <li><strong>Street address</strong> — used once to look up your voting districts</li>
    </ul>

    <h2>How we use it</h2>
    <ul>
      <li>Your preferences are sent to our server to generate personalized ballot recommendations using AI (Claude by Anthropic)</li>
      <li>Your address is sent to the U.S. Census Bureau Geocoder API to determine your congressional, state house, and state senate districts</li>
      <li>After generating your guide, your profile and ballot are stored locally on your device</li>
    </ul>

    <h2>What we don't do</h2>
    <ul>
      <li>We do <strong>not</strong> store your data on our servers — the API proxy processes requests and discards them</li>
      <li>We do <strong>not</strong> sell, share, or rent your personal information to anyone</li>
      <li>We do <strong>not</strong> use analytics, tracking pixels, or advertising SDKs</li>
      <li>We do <strong>not</strong> collect device identifiers, IP addresses, or usage data</li>
    </ul>

    <h2>iCloud sync</h2>
    <p>If you have iCloud enabled, the app uses Apple's iCloud Key-Value Store to sync your voter profile and ballot across your devices. This data is stored in your personal iCloud account and is not accessible to us.</p>

    <h2>Notifications</h2>
    <p>The app can send local election reminder notifications if you enable them. These are scheduled entirely on your device — no data is sent to any push notification service.</p>

    <h2>Third-party services</h2>
    <ul>
      <li><strong>Anthropic (Claude API)</strong> — processes your voter profile to generate recommendations. Subject to <a href="https://www.anthropic.com/privacy">Anthropic's privacy policy</a>.</li>
      <li><strong>U.S. Census Bureau Geocoder</strong> — receives your address to return district information. A public government API.</li>
      <li><strong>Cloudflare Workers</strong> — our API proxy runs on Cloudflare. Requests are processed in memory and not logged or stored.</li>
    </ul>

    <h2>Data deletion</h2>
    <p>Tap "Start Over" in the Profile tab to erase all local data at any time. Since we don't store anything on our servers, there's nothing else to delete.</p>

    <h2>Children's privacy</h2>
    <p>The app is not directed at children under 13 and does not knowingly collect information from children.</p>

    <h2>Changes</h2>
    <p>If this policy changes, we'll update the date above and publish the new version at this URL.</p>

    <h2>Contact</h2>
    <p>Questions? Email <a href="mailto:howdy@atxvotes.app">howdy@atxvotes.app</a></p>

    <a class="back" href="/">&larr; Back to ATX Votes</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

// MARK: - Election Data Endpoints

async function handleManifest(env) {
  const raw = await env.ELECTION_DATA.get("manifest");
  if (!raw) {
    return jsonResponse({ republican: null, democrat: null }, 200, {
      "Cache-Control": "public, max-age=300",
    });
  }
  return jsonResponse(JSON.parse(raw), 200, {
    "Cache-Control": "public, max-age=300",
  });
}

async function handleBallotFetch(request, env) {
  const url = new URL(request.url);
  const party = url.searchParams.get("party");
  if (!party || !["republican", "democrat"].includes(party)) {
    return jsonResponse({ error: "party parameter required (republican|democrat)" }, 400);
  }

  const key = `ballot:${party}_primary_2026`;
  const raw = await env.ELECTION_DATA.get(key);
  if (!raw) {
    return jsonResponse({ error: "No ballot data available" }, 404);
  }

  const etag = `"${await hashString(raw)}"`;
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304 });
  }

  return new Response(raw, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      ETag: etag,
    },
  });
}

async function handleTrigger(request, env) {
  const body = await request.json().catch(() => ({}));
  const parties = body.parties || undefined;
  const result = await runDailyUpdate(env, { parties });
  return jsonResponse(result);
}

async function hashString(str) {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // GET routes
    if (request.method === "GET") {
      if (url.pathname === "/privacy") {
        return handlePrivacyPolicy();
      }
      if (url.pathname === "/support") {
        return handleSupport();
      }
      if (url.pathname === "/nonpartisan") {
        return handleNonpartisan();
      }
      if (url.pathname === "/api/election/manifest") {
        return handleManifest(env);
      }
      // PWA routes (no auth)
      if (url.pathname === "/app/clear") {
        return handlePWA_Clear();
      }
      if (url.pathname === "/app") {
        return handlePWA();
      }
      if (url.pathname === "/app/sw.js") {
        return handlePWA_SW();
      }
      if (url.pathname === "/app/manifest.json") {
        return handlePWA_Manifest();
      }
      if (url.pathname === "/app/api/manifest") {
        return handleManifest(env);
      }
      if (url.pathname === "/app/api/ballot") {
        return handleBallotFetch(request, env);
      }
      return handleLandingPage();
    }

    // CORS preflight for PWA API routes
    if (request.method === "OPTIONS" && url.pathname.startsWith("/app/api/")) {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }

    // PWA POST routes (no auth — server-side guide gen protects secrets)
    if (url.pathname === "/app/api/guide") {
      return handlePWA_Guide(request, env);
    }
    if (url.pathname === "/app/api/summary") {
      return handlePWA_Summary(request, env);
    }
    if (url.pathname === "/app/api/districts") {
      return handleDistricts(request, env);
    }

    // POST: /api/election/trigger uses ADMIN_SECRET
    if (url.pathname === "/api/election/trigger") {
      const auth = request.headers.get("Authorization");
      if (!auth || auth !== `Bearer ${env.ADMIN_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      return handleTrigger(request, env);
    }

    return new Response("Not found", { status: 404 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runDailyUpdate(env));
  },
};
