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

async function handleGuide(request, env) {
  const body = await request.text();
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body,
  });

  const responseBody = await response.text();
  return jsonResponse(JSON.parse(responseBody), response.status);
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
    <a class="cta" href="https://apps.apple.com/app/atx-votes/id0000000000">Download for iPhone</a>
    <div class="features">
      <div><span>✅</span> 5-minute interview learns your values</div>
      <div><span>📋</span> Personalized ballot with recommendations</div>
      <div><span>🖨️</span> Print your cheat sheet for the booth</div>
      <div><span>📍</span> Find your polling location</div>
    </div>
  </div>
  <p class="footer">Built in Austin, TX &middot; <a href="mailto:feedback@atxvotes.app" style="color:inherit">feedback@atxvotes.app</a></p>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Landing page for GET requests
    if (request.method === "GET") {
      return handleLandingPage();
    }

    if (request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }

    // Validate app secret
    const auth = request.headers.get("Authorization");
    if (!auth || auth !== `Bearer ${env.APP_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    switch (url.pathname) {
      case "/api/guide":
        return handleGuide(request, env);
      case "/api/districts":
        return handleDistricts(request, env);
      default:
        return new Response("Not found", { status: 404 });
    }
  },
};
