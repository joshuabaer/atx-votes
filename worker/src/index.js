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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
