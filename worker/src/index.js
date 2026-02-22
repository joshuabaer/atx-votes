import { runDailyUpdate } from "./updater.js";
import { handlePWA, handlePWA_SW, handlePWA_Manifest, handlePWA_Clear } from "./pwa.js";
import { handlePWA_Guide, handlePWA_Summary } from "./pwa-guide.js";
import { seedFullCounty, seedCountyInfo, seedCountyBallot, seedPrecinctMap } from "./county-seeder.js";

// Shared CSS for static pages — matches app design tokens from pwa.js
const PAGE_CSS = `<meta name="theme-color" content="rgb(33,89,143)" media="(prefers-color-scheme:light)"><meta name="theme-color" content="rgb(28,28,31)" media="(prefers-color-scheme:dark)">
<style>
:root{--blue:rgb(33,89,143);--bg:#faf8f0;--card:#fff;--text:rgb(31,31,36);--text2:rgb(115,115,128);--border:rgba(128,128,128,.15);--shadow:rgba(0,0,0,.06);--r:16px;--rs:10px}
@media(prefers-color-scheme:dark){:root{--blue:rgb(102,153,217);--bg:rgb(28,28,31);--card:rgb(43,43,46);--text:rgb(237,237,240);--text2:rgb(153,153,166);--border:rgba(255,255,255,.15);--shadow:rgba(0,0,0,.3)}}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);padding:2rem;line-height:1.7;-webkit-font-smoothing:antialiased}
.container,.card{background:var(--card);border-radius:var(--r);padding:3rem 2.5rem;box-shadow:0 2px 8px var(--shadow)}
.container{max-width:640px;margin:0 auto}
.card{max-width:480px;text-align:center}
h1{font-size:2rem;font-weight:800;color:var(--blue);margin-bottom:0.5rem;letter-spacing:-0.5px}
h2{font-size:1.15rem;font-weight:700;color:var(--text);margin-top:1.5rem;margin-bottom:0.5rem}
p{font-size:1rem;color:var(--text);margin-bottom:0.75rem}
a{color:var(--blue)}
ul{padding-left:1.5rem;margin-bottom:0.75rem}
li{font-size:1rem;color:var(--text);margin-bottom:0.75rem}
.subtitle{font-size:1.05rem;color:var(--text2);margin-bottom:1.5rem;line-height:1.6}
.badge{display:inline-block;background:rgba(33,89,143,.1);color:var(--blue);font-weight:600;font-size:0.95rem;padding:0.4rem 1rem;border-radius:99px;margin-bottom:2rem}
.cta,.email-btn{display:inline-block;background:var(--blue);color:#fff;font-weight:700;border-radius:var(--rs);text-decoration:none;transition:opacity .15s}
.cta{font-size:1.1rem;padding:1rem 2.5rem}
.email-btn{font-size:1.05rem;padding:0.8rem 2rem;margin-top:0.5rem}
.cta:hover,.email-btn:hover{opacity:0.9}
.icon{font-size:4rem;margin-bottom:1rem}
.features{margin-top:2rem;text-align:left;font-size:0.95rem;color:var(--text2);line-height:2}
.features span{margin-right:0.5rem}
.features a{color:var(--text2)}
.note{margin-top:1.5rem;font-size:0.85rem;color:var(--text2)}
.updated{font-size:0.9rem;color:var(--text2);margin-bottom:2rem}
.faq{margin-top:2rem}
.back{display:inline-block;margin-top:1.5rem;font-size:0.95rem}
.page-footer{margin-top:2rem;font-size:0.85rem;color:var(--text2);text-align:center}
.page-footer a{color:var(--text2);text-decoration:none}
</style>`;

// MARK: - Candidate Profile Helpers

function nameToSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Load all candidates from statewide ballot data across both parties.
 * Returns array of { candidate, race, party, slug } objects.
 */
async function loadAllCandidates(env) {
  const parties = ["republican", "democrat"];
  const results = [];

  for (const party of parties) {
    let raw = await env.ELECTION_DATA.get(`ballot:statewide:${party}_primary_2026`);
    if (!raw) raw = await env.ELECTION_DATA.get(`ballot:${party}_primary_2026`);
    if (!raw) continue;

    let ballot;
    try { ballot = JSON.parse(raw); } catch { continue; }

    for (const race of (ballot.races || [])) {
      for (const candidate of (race.candidates || [])) {
        results.push({
          candidate,
          race: race.office + (race.district ? ` — ${race.district}` : ""),
          raceOffice: race.office,
          raceDistrict: race.district || null,
          party,
          electionName: ballot.electionName || `${party} Primary 2026`,
          slug: nameToSlug(candidate.name),
        });
      }
    }
  }

  return results;
}

/**
 * Extract plain text from a field that may be a tone-variant object.
 * Defaults to tone 3, falls back to first available key.
 */
function resolveTone(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value["3"] || value[Object.keys(value).sort()[0]] || null;
  }
  return null;
}

/**
 * Resolve an array where each element may be a tone-variant object.
 */
function resolveToneArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => resolveTone(item)).filter(Boolean);
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}


async function handleDistricts(request, env) {
  const { street, city, state, zip } = await request.json();
  if (!street || !state || !zip) {
    return jsonResponse({ error: "Missing address fields" }, 400);
  }

  const params = new URLSearchParams({
    street,
    city: city || "",
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

  // Extract county FIPS and name from Census "Counties" geography
  const countyGeo = findGeo(geos, "Counties");
  const countyFips = countyGeo ? countyGeo.GEOID : null;
  const countyName = countyGeo ? countyGeo.NAME : null;

  // Extract school district from Census "Unified School Districts" geography
  const schoolGeo = findGeo(geos, "Unified School Districts");
  const schoolBoard = schoolGeo ? schoolGeo.NAME : null;

  // Look up commissioner precinct from KV (per-county ZIP mapping)
  let precinct = null;
  if (countyFips) {
    try {
      const raw = await env.ELECTION_DATA.get(`precinct_map:${countyFips}`);
      if (raw) {
        const map = JSON.parse(raw);
        precinct = map[zip] || null;
      }
    } catch { /* no precinct map for this county yet */ }
  }

  return jsonResponse({
    congressional: congressional ? `District ${congressional}` : null,
    stateSenate: stateSenate ? `District ${stateSenate}` : null,
    stateHouse: stateHouse ? `District ${stateHouse}` : null,
    countyCommissioner: precinct ? `Precinct ${precinct}` : null,
    schoolBoard,
    countyFips,
    countyName,
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

function findGeo(geos, partialKey) {
  for (const key of Object.keys(geos)) {
    if (key.includes(partialKey) && geos[key].length > 0) {
      return geos[key][0];
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
  <title>Texas Votes — Your Personalized Texas Voting Guide</title>
  <meta name="description" content="Build your personalized voting guide for Texas elections in 5 minutes. Know exactly who to vote for based on your values.">
  <meta property="og:title" content="Texas Votes — Your Personalized Texas Voting Guide">
  <meta property="og:description" content="Build your personalized voting guide for Texas elections in 5 minutes.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://txvotes.app">
  ${PAGE_CSS}
</head>
<body style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center">
  <div class="card">
    <div class="icon">🗳️</div>
    <h1>Texas Votes</h1>
    <p class="subtitle" data-t="Your personalized voting guide for Texas elections.">Your personalized voting guide for Texas elections.</p>
    <div class="badge" data-t="Texas Primary — March 3, 2026">Texas Primary — March 3, 2026</div>
    <br>
    <a class="cta" href="/app?start=1" data-t="Build My Voting Guide">Build My Voting Guide</a>
    <div class="features">
      <div data-t="5-minute interview learns your values"><span>✅</span> 5-minute interview learns your values</div>
      <div data-t="Personalized ballot with recommendations"><span>📋</span> Personalized ballot with recommendations</div>
      <div data-t="Print your cheat sheet for the booth"><span>🖨️</span> Print your cheat sheet for the booth</div>
      <div data-t="Find your polling location"><span>📍</span> Find your polling location</div>
      <div data-t="Nonpartisan by design"><span>⚖️</span> <a href="/nonpartisan">Nonpartisan by design</a> — fairness is in our code</div>
    </div>
    <p class="note" data-t="Works on any device — phone, tablet, or computer. No app download needed.">Works on any device — phone, tablet, or computer. No app download needed.</p>
  </div>
  <div style="text-align:center;margin-top:16px">
    <button id="lang-toggle" style="font-size:14px;color:var(--text2);background:none;border:none;cursor:pointer;font-family:inherit"></button>
  </div>
  <p class="page-footer">
    <a href="/nonpartisan" data-t="Nonpartisan by Design">Nonpartisan by Design</a> &middot;
    <a href="/privacy" data-t="Privacy">Privacy</a> &middot;
    <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a>
  </p>
  <script>
  (function(){
    var TR={
      'Your personalized voting guide for Texas elections.':'Tu gu\\u00EDa personalizada de votaci\\u00F3n para las elecciones de Texas.',
      'Your personalized voting guide for Texas elections.':'Tu gu\\u00EDa personalizada de votaci\\u00F3n para las elecciones de Texas.',
      'Texas Primary \\u2014 March 3, 2026':'Primaria de Texas \\u2014 3 de marzo, 2026',
      'Build My Voting Guide':'Crear mi gu\\u00EDa de votaci\\u00F3n',
      '5-minute interview learns your values':'Entrevista r\\u00E1pida sobre tus valores',
      'Personalized ballot with recommendations':'Boleta personalizada con recomendaciones',
      'Print your cheat sheet for the booth':'Imprime tu gu\\u00EDa r\\u00E1pida para la casilla',
      'Find your polling location':'Encuentra tu lugar de votaci\\u00F3n',
      'Nonpartisan by design':'Apartidista por dise\\u00F1o',
      'Works on any device \\u2014 phone, tablet, or computer. No app download needed.':'Funciona en cualquier dispositivo \\u2014 tel\\u00E9fono, tableta o computadora. No necesitas descargar una app.',
      'Nonpartisan by Design':'Apartidista por Dise\\u00F1o',
      'Privacy':'Privacidad'
    };
    var lang=localStorage.getItem('tx_votes_lang')||localStorage.getItem('atx_votes_lang')||((navigator.language||'').slice(0,2)==='es'?'es':'en');
    var features={'5-minute interview learns your values':'\\u2705','Personalized ballot with recommendations':'\\uD83D\\uDCCB','Print your cheat sheet for the booth':'\\uD83D\\uDDA8\\uFE0F','Find your polling location':'\\uD83D\\uDCCD','Nonpartisan by design':'\\u2696\\uFE0F'};
    function apply(){
      document.documentElement.lang=lang;
      document.querySelectorAll('[data-t]').forEach(function(el){
        var key=el.getAttribute('data-t');
        var text=lang==='es'?(TR[key]||key):key;
        var ico=features[key];
        if(ico){
          while(el.firstChild)el.removeChild(el.firstChild);
          var span=document.createElement('span');
          span.textContent=ico;
          el.appendChild(span);
          if(key==='Nonpartisan by design'){
            el.appendChild(document.createTextNode(' '));
            var a=document.createElement('a');
            a.href='/nonpartisan';
            a.textContent=text;
            el.appendChild(a);
            el.appendChild(document.createTextNode(lang==='es'?' \\u2014 la imparcialidad est\\u00E1 en nuestro c\\u00F3digo':' \\u2014 fairness is in our code'));
          }else{
            el.appendChild(document.createTextNode(' '+text));
          }
        }else{
          var a=el.querySelector('a');
          if(a){a.textContent=text}
          else{el.textContent=text}
        }
      });
      document.getElementById('lang-toggle').textContent=lang==='es'?'Switch to English':'Cambiar a Espa\\u00F1ol';
    }
    document.getElementById('lang-toggle').addEventListener('click',function(){
      lang=lang==='es'?'en':'es';
      localStorage.setItem('tx_votes_lang',lang);
      apply();
    });
    apply();
  })();
  </script>
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
  <title>Nonpartisan by Design — Texas Votes</title>
  <meta name="description" content="How Texas Votes ensures fairness: randomized order, no party labels, neutral AI, privacy-first design, and more.">
  ${PAGE_CSS}
</head>
<body>
  <div class="container">
    <h1>Nonpartisan by Design</h1>
    <p class="subtitle">Texas Votes matches candidates to your values, not your party. Every design decision is made to keep the experience fair for all voters — regardless of where you fall on the political spectrum.</p>

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
    <p>All candidates are cross-referenced against official filings from the Texas Secretary of State, county clerks, and Ballotpedia. Candidate data includes positions, endorsements, strengths, and concerns — presented with equal depth for every candidate in a race.</p>

    <h2>Nonpartisan Translations</h2>
    <p>All Spanish translations are reviewed for partisan bias. Proposition titles and descriptions use identical grammatical structures for both parties. Data terms (candidate names, positions) stay in English for accuracy; only the display layer is translated.</p>

    <h2>Encouraging Independent Research</h2>
    <p>Every screen says "Do your own research before voting." The app is a starting point, not the final word.</p>

    <h2>Privacy-First Design</h2>
    <p>All data stays on your device. We collect only anonymous page-view counts (via Cloudflare Web Analytics — no cookies, no personal data). No tracking, no ads. Your political views are never stored on our servers.</p>

    <h2>Open Source Approach</h2>
    <p>The full prompt sent to the AI and every design decision is documented. Nothing is hidden.</p>

    <p class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>
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
  <title>Support — Texas Votes</title>
  ${PAGE_CSS}
</head>
<body>
  <div class="container">
    <h1>Support</h1>
    <p class="subtitle">We're here to help.</p>

    <a class="email-btn" href="mailto:howdy@txvotes.app">Email Us</a>

    <div class="faq">
      <h2>Frequently Asked Questions</h2>

      <h2>How do I reset my voting guide?</h2>
      <p>Go to the Profile tab and tap "Start Over" at the bottom. This erases your profile and recommendations so you can retake the interview.</p>

      <h2>Are the recommendations accurate?</h2>
      <p>Recommendations are generated by AI based on real candidate data and your stated preferences. They're a starting point — we always encourage doing your own research. The app includes a disclaimer on every screen.</p>

      <h2>Where is my data stored?</h2>
      <p>Everything stays on your device (and in your iCloud account if you have iCloud enabled). We don't store your data on our servers. See our <a href="/privacy">privacy policy</a> for details.</p>

      <h2>Which elections are covered?</h2>
      <p>Texas Votes covers the March 3, 2026 Texas Primary Election for all Texas voters, including both Republican and Democratic primaries.</p>

      <h2>I found wrong information about a candidate.</h2>
      <p>Please <a href="mailto:howdy@txvotes.app">email us</a> with details and we'll correct it as quickly as possible.</p>
    </div>

    <p class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/nonpartisan">Nonpartisan by Design</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>
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
  <title>Privacy Policy — Texas Votes</title>
  ${PAGE_CSS}
</head>
<body>
  <div class="container">
    <h1>Privacy Policy</h1>
    <p class="updated">Last updated: February 21, 2026</p>

    <p>Texas Votes ("the app") is a free voting guide for Texas elections. Your privacy matters — here's exactly what happens with your data.</p>

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
      <li>We use <strong>Cloudflare Web Analytics</strong> for anonymous page-view counts only — no cookies, no personal data, no tracking across sites</li>
      <li>We do <strong>not</strong> use tracking pixels or advertising SDKs</li>
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
      <li><strong>Cloudflare Web Analytics</strong> — collects anonymous page-view counts. No cookies, no personal data, no cross-site tracking. Subject to <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare's privacy policy</a>.</li>
    </ul>

    <h2>Data deletion</h2>
    <p>Tap "Start Over" in the Profile tab to erase all local data at any time. Since we don't store anything on our servers, there's nothing else to delete.</p>

    <h2>Children's privacy</h2>
    <p>The app is not directed at children under 13 and does not knowingly collect information from children.</p>

    <h2>Changes</h2>
    <p>If this policy changes, we'll update the date above and publish the new version at this URL.</p>

    <h2>Contact</h2>
    <p>Questions? Email <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>

    <p class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/nonpartisan">Nonpartisan by Design</a> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>
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
  const county = url.searchParams.get("county");
  if (!party || !["republican", "democrat"].includes(party)) {
    return jsonResponse({ error: "party parameter required (republican|democrat)" }, 400);
  }

  // Load statewide ballot (new key structure), fall back to legacy key
  let raw = await env.ELECTION_DATA.get(`ballot:statewide:${party}_primary_2026`);
  if (!raw) {
    raw = await env.ELECTION_DATA.get(`ballot:${party}_primary_2026`);
  }
  if (!raw) {
    return jsonResponse({ error: "No ballot data available" }, 404);
  }

  // If county FIPS provided, merge county-specific races
  if (county) {
    const countyRaw = await env.ELECTION_DATA.get(`ballot:county:${county}:${party}_primary_2026`);
    if (countyRaw) {
      try {
        const statewide = JSON.parse(raw);
        const countyBallot = JSON.parse(countyRaw);
        statewide.races = statewide.races.concat(countyBallot.races || []);
        if (countyBallot.propositions) {
          statewide.propositions = (statewide.propositions || []).concat(countyBallot.propositions);
        }
        raw = JSON.stringify(statewide);
      } catch { /* use statewide-only if merge fails */ }
    }
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

async function handleCountyInfo(request, env) {
  const url = new URL(request.url);
  const fips = url.searchParams.get("fips");
  if (!fips) {
    return jsonResponse({ error: "fips parameter required" }, 400);
  }

  const raw = await env.ELECTION_DATA.get(`county_info:${fips}`);
  if (!raw) {
    return jsonResponse({ error: "No county info available", countyFips: fips }, 404);
  }

  return new Response(raw, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function handleTrigger(request, env) {
  const body = await request.json().catch(() => ({}));
  const parties = body.parties || undefined;
  const result = await runDailyUpdate(env, { parties });
  return jsonResponse(result);
}

const TONE_LABELS = {
  1: "high school / simplest",
  2: "casual / friendly",
  3: "standard / news level",
  4: "detailed / political",
  5: "expert / professor",
  6: "Swedish Chef from the Muppets (bork bork bork!)",
  7: "Texas cowboy (y'all, reckon, fixin' to, partner)",
};

/**
 * Generate tone versions for a single proposition.
 * Accepts: { party, prop (number), tone (single int) }
 * Generates all fields for that prop+tone in one Claude call.
 */
async function handleGenerateTones(request, env) {
  const body = await request.json().catch(() => ({}));
  const party = body.party || "republican";
  const propNumber = body.prop;
  const tone = body.tone;

  if (!propNumber || !tone) {
    return jsonResponse({ error: "Required: party, prop (number), tone (int)" }, 400);
  }

  const key = `ballot:statewide:${party}_primary_2026`;
  const raw = await env.ELECTION_DATA.get(key);
  if (!raw) return jsonResponse({ error: "no ballot data" }, 404);

  const ballot = JSON.parse(raw);
  if (!ballot.propositions?.length) return jsonResponse({ error: "no propositions" }, 404);

  const prop = ballot.propositions.find(p => p.number === propNumber);
  if (!prop) return jsonResponse({ error: `prop ${propNumber} not found` }, 404);

  const fields = ["description", "ifPasses", "ifFails", "background", "fiscalImpact"];

  // Collect original text for each field
  const originals = {};
  for (const field of fields) {
    const val = prop[field];
    const text = typeof val === "string" ? val : (val && val["3"]) || null;
    if (text) originals[field] = text;
  }

  if (Object.keys(originals).length === 0) {
    return jsonResponse({ error: "no text fields to process" });
  }

  // For tone 3, just store originals as-is
  if (tone === 3) {
    for (const [field, text] of Object.entries(originals)) {
      const toneVersions = typeof prop[field] === "object" && !Array.isArray(prop[field]) ? { ...prop[field] } : {};
      toneVersions["3"] = text;
      prop[field] = toneVersions;
    }
    await env.ELECTION_DATA.put(key, JSON.stringify(ballot));
    return jsonResponse({ success: true, party, prop: propNumber, tone, fields: Object.keys(originals) });
  }

  // Generate all fields in one Claude call
  const toneDesc = TONE_LABELS[tone] || "standard";
  const fieldList = Object.entries(originals)
    .map(([f, t]) => `${f}: "${t}"`)
    .join("\n\n");

  const prompt = `Rewrite ALL of the following proposition text fields in a ${toneDesc} tone. Keep the same factual content and meaning, just adjust the language style and complexity.

Proposition ${propNumber}: ${prop.title}

FIELDS TO REWRITE:
${fieldList}

Return a JSON object with the field names as keys and rewritten text as values. Example format:
{"description": "rewritten...", "ifPasses": "rewritten...", "ifFails": "rewritten..."}

Return ONLY valid JSON, no markdown fences, no explanation.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    return jsonResponse({ error: `Claude API error ${res.status}` }, 502);
  }

  const data = await res.json();
  const responseText = data.content[0].text.trim();

  // Parse JSON from response
  let parsed;
  try {
    let cleaned = responseText;
    const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) cleaned = fence[1].trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return jsonResponse({ error: "Failed to parse Claude response", raw: responseText.slice(0, 200) }, 500);
  }

  // Merge generated text into prop fields
  let updated = 0;
  for (const [field, text] of Object.entries(parsed)) {
    if (!fields.includes(field) || !text) continue;
    const toneVersions = typeof prop[field] === "object" && !Array.isArray(prop[field]) ? { ...prop[field] } : {};
    if (!toneVersions["3"]) toneVersions["3"] = originals[field] || prop[field];
    toneVersions[String(tone)] = text;
    prop[field] = toneVersions;
    updated++;
  }

  await env.ELECTION_DATA.put(key, JSON.stringify(ballot));
  return jsonResponse({ success: true, party, prop: propNumber, tone, fieldsUpdated: updated });
}

async function handleGenerateCandidateTones(request, env) {
  const body = await request.json().catch(() => ({}));
  const party = body.party || "republican";
  const candidateName = body.candidate;
  const tone = body.tone;

  if (!candidateName || !tone) {
    return jsonResponse({ error: "Required: candidate (name), tone (int), optional party" }, 400);
  }

  const key = `ballot:statewide:${party}_primary_2026`;
  const raw = await env.ELECTION_DATA.get(key);
  if (!raw) return jsonResponse({ error: "no ballot data" }, 404);

  const ballot = JSON.parse(raw);
  if (!ballot.races?.length) return jsonResponse({ error: "no races" }, 404);

  // Find candidate across all races
  let cand = null, raceIdx = -1, candIdx = -1;
  for (let ri = 0; ri < ballot.races.length; ri++) {
    for (let ci = 0; ci < ballot.races[ri].candidates.length; ci++) {
      if (ballot.races[ri].candidates[ci].name === candidateName) {
        cand = ballot.races[ri].candidates[ci];
        raceIdx = ri;
        candIdx = ci;
        break;
      }
    }
    if (cand) break;
  }
  if (!cand) return jsonResponse({ error: `candidate "${candidateName}" not found` }, 404);

  // Collect original text: summary (string), pros (array), cons (array)
  const origSummary = typeof cand.summary === "string" ? cand.summary : (cand.summary?.["3"] || null);
  const origPros = (cand.pros || []).map(p => typeof p === "string" ? p : (p?.["3"] || ""));
  const origCons = (cand.cons || []).map(c => typeof c === "string" ? c : (c?.["3"] || ""));

  if (!origSummary && origPros.length === 0 && origCons.length === 0) {
    return jsonResponse({ error: "no text fields to process" });
  }

  // For tone 3, store originals as tone-keyed objects
  if (tone === 3) {
    if (origSummary) {
      const sv = typeof cand.summary === "object" && !Array.isArray(cand.summary) ? { ...cand.summary } : {};
      sv["3"] = origSummary;
      cand.summary = sv;
    }
    cand.pros = origPros.map((text, i) => {
      const tv = typeof cand.pros[i] === "object" && !Array.isArray(cand.pros[i]) ? { ...cand.pros[i] } : {};
      tv["3"] = text;
      return tv;
    });
    cand.cons = origCons.map((text, i) => {
      const tv = typeof cand.cons[i] === "object" && !Array.isArray(cand.cons[i]) ? { ...cand.cons[i] } : {};
      tv["3"] = text;
      return tv;
    });
    await env.ELECTION_DATA.put(key, JSON.stringify(ballot));
    return jsonResponse({ success: true, party, candidate: candidateName, tone, note: "stored originals" });
  }

  // Build prompt with all text fields
  const toneDesc = TONE_LABELS[tone] || "standard";
  let fieldList = "";
  if (origSummary) fieldList += `summary: "${origSummary}"\n\n`;
  if (origPros.length) fieldList += `pros: ${JSON.stringify(origPros)}\n\n`;
  if (origCons.length) fieldList += `cons: ${JSON.stringify(origCons)}\n\n`;

  const prompt = `Rewrite ALL of the following candidate text fields in a ${toneDesc} tone. Keep the same factual content and meaning, just adjust the language style and complexity. Keep each item roughly the same length as the original.

Candidate: ${candidateName}
Race: ${ballot.races[raceIdx].office}

FIELDS TO REWRITE:
${fieldList}
Return a JSON object with: "summary" (string), "pros" (array of strings), "cons" (array of strings). Keep the same number of items in each array.

Return ONLY valid JSON, no markdown fences, no explanation.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    return jsonResponse({ error: `Claude API error ${res.status}` }, 502);
  }

  const data = await res.json();
  const responseText = data.content[0].text.trim();

  let parsed;
  try {
    let cleaned = responseText;
    const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) cleaned = fence[1].trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return jsonResponse({ error: "Failed to parse Claude response", raw: responseText.slice(0, 300) }, 500);
  }

  // Merge into candidate data
  let updated = 0;
  if (parsed.summary && origSummary) {
    const sv = typeof cand.summary === "object" && !Array.isArray(cand.summary) ? { ...cand.summary } : {};
    if (!sv["3"]) sv["3"] = origSummary;
    sv[String(tone)] = parsed.summary;
    cand.summary = sv;
    updated++;
  }
  if (parsed.pros && Array.isArray(parsed.pros)) {
    cand.pros = origPros.map((orig, i) => {
      const tv = typeof cand.pros[i] === "object" && !Array.isArray(cand.pros[i]) ? { ...cand.pros[i] } : {};
      if (!tv["3"]) tv["3"] = orig;
      tv[String(tone)] = parsed.pros[i] || orig;
      return tv;
    });
    updated++;
  }
  if (parsed.cons && Array.isArray(parsed.cons)) {
    cand.cons = origCons.map((orig, i) => {
      const tv = typeof cand.cons[i] === "object" && !Array.isArray(cand.cons[i]) ? { ...cand.cons[i] } : {};
      if (!tv["3"]) tv["3"] = orig;
      tv[String(tone)] = parsed.cons[i] || orig;
      return tv;
    });
    updated++;
  }

  await env.ELECTION_DATA.put(key, JSON.stringify(ballot));
  return jsonResponse({ success: true, party, candidate: candidateName, tone, fieldsUpdated: updated });
}

// MARK: - Candidate Profile & Index Pages

async function handleCandidateProfile(slug, env) {
  const allCandidates = await loadAllCandidates(env);
  const entry = allCandidates.find(e => e.slug === slug);

  if (!entry) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Candidate Not Found — Texas Votes</title>
  ${PAGE_CSS}
</head>
<body>
  <div class="container">
    <h1>Candidate Not Found</h1>
    <p class="subtitle">We couldn't find a candidate matching "${escapeHtml(slug)}". The candidate may not be in our database yet, or the URL may be incorrect.</p>
    <a class="back" href="/candidates">&larr; Browse all candidates</a>
    <p class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/nonpartisan">Nonpartisan by Design</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>
  </div>
</body>
</html>`;
    return new Response(html, {
      status: 404,
      headers: { "Content-Type": "text/html;charset=utf-8" },
    });
  }

  const c = entry.candidate;
  const name = escapeHtml(c.name);
  const partyLabel = entry.party.charAt(0).toUpperCase() + entry.party.slice(1);
  const summary = escapeHtml(resolveTone(c.summary));
  const pros = resolveToneArray(c.pros);
  const cons = resolveToneArray(c.cons);

  // Build sections conditionally
  const sections = [];

  // Headshot
  if (c.headshot) {
    sections.push(`<div style="text-align:center;margin-bottom:1.5rem"><img src="${escapeHtml(c.headshot)}" alt="Photo of ${name}" style="width:160px;height:160px;border-radius:50%;object-fit:cover;border:3px solid var(--border)"></div>`);
  }

  // Meta badges
  const badges = [];
  if (c.incumbent || c.isIncumbent) badges.push("Incumbent");
  badges.push(partyLabel);
  if (c.age) badges.push(`Age ${escapeHtml(String(c.age))}`);
  if (badges.length) {
    sections.push(`<div style="margin-bottom:1.5rem">${badges.map(b => `<span class="badge" style="margin-right:0.5rem;margin-bottom:0.5rem">${escapeHtml(b)}</span>`).join("")}</div>`);
  }

  // Summary
  if (summary) {
    sections.push(`<h2>About</h2><p>${summary}</p>`);
  }

  // Education
  if (c.education) {
    sections.push(`<h2>Education</h2><p>${escapeHtml(c.education)}</p>`);
  }

  // Experience
  if (c.experience) {
    const exp = Array.isArray(c.experience) ? c.experience : [c.experience];
    sections.push(`<h2>Experience</h2><ul>${exp.map(e => `<li>${escapeHtml(String(e))}</li>`).join("")}</ul>`);
  }

  // Key Positions
  if (c.keyPositions && c.keyPositions.length) {
    sections.push(`<h2>Key Positions</h2><ul>${c.keyPositions.map(p => `<li>${escapeHtml(String(p))}</li>`).join("")}</ul>`);
  }

  // Strengths (pros)
  if (pros.length) {
    sections.push(`<h2>Strengths</h2><ul>${pros.map(p => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`);
  }

  // Concerns (cons)
  if (cons.length) {
    sections.push(`<h2>Concerns</h2><ul>${cons.map(p => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`);
  }

  // Endorsements
  if (c.endorsements) {
    const endorsements = Array.isArray(c.endorsements) ? c.endorsements : [c.endorsements];
    if (endorsements.length && endorsements[0]) {
      sections.push(`<h2>Endorsements</h2><ul>${endorsements.map(e => `<li>${escapeHtml(String(e))}</li>`).join("")}</ul>`);
    }
  }

  // Polling
  if (c.polling) {
    const polling = typeof c.polling === "string" ? c.polling : JSON.stringify(c.polling);
    sections.push(`<h2>Polling</h2><p>${escapeHtml(polling)}</p>`);
  }

  // Fundraising
  if (c.fundraising) {
    const fundraising = typeof c.fundraising === "string" ? c.fundraising : JSON.stringify(c.fundraising);
    sections.push(`<h2>Fundraising</h2><p>${escapeHtml(fundraising)}</p>`);
  }

  const ogDescription = summary
    ? summary.slice(0, 160) + (summary.length > 160 ? "..." : "")
    : `${name} is running for ${escapeHtml(entry.race)} in the 2026 Texas ${partyLabel} Primary.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${name} — ${escapeHtml(entry.race)} — Texas Votes</title>
  <meta name="description" content="${escapeHtml(ogDescription)}">
  <meta property="og:title" content="${name} — ${escapeHtml(entry.race)} — Texas Votes">
  <meta property="og:description" content="${escapeHtml(ogDescription)}">
  <meta property="og:type" content="profile">
  <meta property="og:url" content="https://txvotes.app/candidate/${escapeHtml(entry.slug)}">
  ${c.headshot ? `<meta property="og:image" content="${escapeHtml(c.headshot)}">` : ""}
  ${PAGE_CSS}
</head>
<body>
  <div class="container">
    <a class="back" href="/candidates">&larr; Back to all candidates</a>
    <h1 style="margin-top:1rem">${name}</h1>
    <p class="subtitle">${escapeHtml(entry.race)} &middot; ${escapeHtml(partyLabel)} Primary 2026</p>
    ${sections.join("\n    ")}
    <p style="margin-top:2rem;font-size:0.9rem;color:var(--text2)">See something wrong? <a href="mailto:howdy@txvotes.app?subject=Data correction: ${encodeURIComponent(c.name)}">Let us know</a> and we'll fix it.</p>
    <p class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/nonpartisan">Nonpartisan by Design</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

async function handleCandidatesIndex(env) {
  const allCandidates = await loadAllCandidates(env);

  // Group by race (using raceOffice + district as key), preserving party
  const raceMap = new Map();
  for (const entry of allCandidates) {
    const raceKey = `${entry.party}|${entry.race}`;
    if (!raceMap.has(raceKey)) {
      raceMap.set(raceKey, {
        race: entry.race,
        party: entry.party,
        candidates: [],
      });
    }
    raceMap.get(raceKey).candidates.push(entry);
  }

  // Group races by party
  const parties = ["republican", "democrat"];
  let partySections = "";

  for (const party of parties) {
    const partyLabel = party.charAt(0).toUpperCase() + party.slice(1);
    const partyRaces = [...raceMap.values()].filter(r => r.party === party);
    if (partyRaces.length === 0) continue;

    let raceCards = "";
    for (const race of partyRaces) {
      const candidateLinks = race.candidates.map(e => {
        const isIncumbent = e.candidate.incumbent || e.candidate.isIncumbent;
        const incumbentBadge = isIncumbent ? ' <span style="font-size:0.8rem;color:var(--text2)">(incumbent)</span>' : "";
        const headshot = e.candidate.headshot
          ? `<img src="${escapeHtml(e.candidate.headshot)}" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px;border:1px solid var(--border)">`
          : `<span style="display:inline-block;width:32px;height:32px;border-radius:50%;background:var(--border);vertical-align:middle;margin-right:8px"></span>`;
        return `<li style="list-style:none;margin-bottom:0.5rem">${headshot}<a href="/candidate/${escapeHtml(e.slug)}">${escapeHtml(e.candidate.name)}</a>${incumbentBadge}</li>`;
      }).join("");
      raceCards += `<div style="margin-bottom:1.5rem"><h2 style="margin-top:0.5rem">${escapeHtml(race.race)}</h2><ul style="padding-left:0">${candidateLinks}</ul></div>`;
    }

    partySections += `<div style="margin-bottom:2rem"><div class="badge">${escapeHtml(partyLabel)} Primary</div>${raceCards}</div>`;
  }

  if (!partySections) {
    partySections = `<p class="subtitle">No candidate data is available yet. Check back soon.</p>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>All Candidates — Texas Votes</title>
  <meta name="description" content="Browse all candidates in the 2026 Texas Primary Election. View detailed profiles, positions, and endorsements.">
  <meta property="og:title" content="All Candidates — Texas Votes">
  <meta property="og:description" content="Browse all candidates in the 2026 Texas Primary Election.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://txvotes.app/candidates">
  ${PAGE_CSS}
</head>
<body>
  <div class="container">
    <a class="back" href="/">&larr; Texas Votes</a>
    <h1 style="margin-top:1rem">All Candidates</h1>
    <p class="subtitle">2026 Texas Primary Election — March 3, 2026</p>
    ${partySections}
    <p class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/nonpartisan">Nonpartisan by Design</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

// MARK: - Admin Coverage Dashboard

// All 254 Texas county FIPS codes (48001 to 48507, odd numbers only)
const TX_FIPS = [];
for (let i = 1; i <= 507; i += 2) TX_FIPS.push(`48${String(i).padStart(3, "0")}`);

async function handleAdminCoverage(env) {
  const parties = ["republican", "democrat"];
  const ballots = {};

  // Load statewide ballots
  for (const party of parties) {
    let raw = await env.ELECTION_DATA.get(`ballot:statewide:${party}_primary_2026`);
    if (!raw) raw = await env.ELECTION_DATA.get(`ballot:${party}_primary_2026`);
    ballots[party] = raw ? JSON.parse(raw) : null;
  }

  // --- Section 1: Statewide Ballot Summary ---
  let summaryRows = "";
  for (const party of parties) {
    const b = ballots[party];
    if (!b) {
      summaryRows += `<tr><td>${party}</td><td colspan="3" style="color:var(--text2)">No data</td></tr>`;
      continue;
    }
    const raceCount = (b.races || []).length;
    const candidateCount = (b.races || []).reduce((s, r) => s + (r.candidates || []).length, 0);
    const propCount = (b.propositions || []).length;
    summaryRows += `<tr><td style="text-transform:capitalize;font-weight:600">${party}</td><td>${raceCount}</td><td>${candidateCount}</td><td>${propCount}</td></tr>`;
  }

  // --- Section 2: Candidate Data Completeness ---
  const candFields = ["summary", "background", "keyPositions", "endorsements", "pros", "cons", "fundraising", "polling", "headshot"];
  let candRows = "";
  for (const party of parties) {
    const b = ballots[party];
    if (!b) continue;
    for (const race of (b.races || [])) {
      for (const c of (race.candidates || [])) {
        let cells = `<td style="text-transform:capitalize">${party}</td><td>${race.office}</td><td>${c.name}</td>`;
        for (const f of candFields) {
          const val = c[f];
          const has = val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0);
          cells += `<td class="${has ? "cov-yes" : "cov-no"}">${has ? "Y" : "-"}</td>`;
        }
        candRows += `<tr>${cells}</tr>`;
      }
    }
  }

  // --- Section 3: Tone Variant Coverage ---
  let toneRows = "";
  for (const party of parties) {
    const b = ballots[party];
    if (!b) continue;
    for (const race of (b.races || [])) {
      for (const c of (race.candidates || [])) {
        const summaryType = typeof c.summary === "object" && !Array.isArray(c.summary) ? "tones" : "plain";
        const prosType = Array.isArray(c.pros) && c.pros.length > 0 && typeof c.pros[0] === "object" && !Array.isArray(c.pros[0]) ? "tones" : "plain";
        const consType = Array.isArray(c.cons) && c.cons.length > 0 && typeof c.cons[0] === "object" && !Array.isArray(c.cons[0]) ? "tones" : "plain";

        const toneCell = (type, keys) => {
          if (type === "tones") return `<td class="cov-yes">Tones ${keys || ""}</td>`;
          return `<td class="cov-no">Plain</td>`;
        };

        const summaryKeys = summaryType === "tones" ? Object.keys(c.summary).sort().join(",") : "";
        const prosKeys = prosType === "tones" ? Object.keys(c.pros[0]).sort().join(",") : "";
        const consKeys = consType === "tones" ? Object.keys(c.cons[0]).sort().join(",") : "";

        toneRows += `<tr><td style="text-transform:capitalize">${party}</td><td>${c.name}</td>${toneCell(summaryType, summaryKeys)}${toneCell(prosType, prosKeys)}${toneCell(consType, consKeys)}</tr>`;
      }
    }
  }

  // --- Section 4: Proposition Tone Coverage ---
  const propFields = ["description", "ifPasses", "ifFails", "background", "fiscalImpact"];
  let propRows = "";
  for (const party of parties) {
    const b = ballots[party];
    if (!b) continue;
    for (const p of (b.propositions || [])) {
      let cells = `<td style="text-transform:capitalize">${party}</td><td>Prop ${p.number}: ${p.title || ""}</td>`;
      for (const f of propFields) {
        const val = p[f];
        if (val === undefined || val === null) {
          cells += `<td class="cov-no">Missing</td>`;
        } else if (typeof val === "object" && !Array.isArray(val)) {
          const keys = Object.keys(val).sort();
          const hasFull = keys.length === 7;
          cells += `<td class="${hasFull ? "cov-yes" : "cov-partial"}">Tones ${keys.join(",")}</td>`;
        } else {
          cells += `<td class="cov-partial">Plain</td>`;
        }
      }
      propRows += `<tr>${cells}</tr>`;
    }
  }

  // --- Section 5 & 6: County Info & Ballot Coverage ---
  // Batch KV reads in groups of 50 for performance
  const BATCH = 50;
  const countyInfoResults = {};
  const countyBallotResults = {};

  for (let i = 0; i < TX_FIPS.length; i += BATCH) {
    const batch = TX_FIPS.slice(i, i + BATCH);
    const reads = batch.flatMap(fips => [
      env.ELECTION_DATA.get(`county_info:${fips}`).then(v => ({ type: "info", fips, has: !!v })),
      env.ELECTION_DATA.get(`ballot:county:${fips}:republican_primary_2026`).then(v => ({ type: "rep", fips, has: !!v })),
      env.ELECTION_DATA.get(`ballot:county:${fips}:democrat_primary_2026`).then(v => ({ type: "dem", fips, has: !!v })),
    ]);
    const results = await Promise.all(reads);
    for (const r of results) {
      if (r.type === "info") countyInfoResults[r.fips] = r.has;
      else if (r.type === "rep") {
        if (!countyBallotResults[r.fips]) countyBallotResults[r.fips] = {};
        countyBallotResults[r.fips].republican = r.has;
      } else {
        if (!countyBallotResults[r.fips]) countyBallotResults[r.fips] = {};
        countyBallotResults[r.fips].democrat = r.has;
      }
    }
  }

  const infoPresent = Object.values(countyInfoResults).filter(Boolean).length;
  const infoMissing = TX_FIPS.length - infoPresent;
  const repPresent = Object.values(countyBallotResults).filter(v => v.republican).length;
  const demPresent = Object.values(countyBallotResults).filter(v => v.democrat).length;

  // Build county detail rows (only show counties with at least some data, or first 20 missing)
  let countyDetailRows = "";
  const missingInfoFips = TX_FIPS.filter(f => !countyInfoResults[f]);
  const presentInfoFips = TX_FIPS.filter(f => countyInfoResults[f]);
  const allCountyFips = [...presentInfoFips, ...missingInfoFips];
  for (const fips of allCountyFips) {
    const hasInfo = countyInfoResults[fips];
    const hasRep = countyBallotResults[fips]?.republican || false;
    const hasDem = countyBallotResults[fips]?.democrat || false;
    countyDetailRows += `<tr><td>${fips}</td><td class="${hasInfo ? "cov-yes" : "cov-no"}">${hasInfo ? "Y" : "-"}</td><td class="${hasRep ? "cov-yes" : "cov-no"}">${hasRep ? "Y" : "-"}</td><td class="${hasDem ? "cov-yes" : "cov-no"}">${hasDem ? "Y" : "-"}</td></tr>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Data Coverage — Texas Votes Admin</title>
  ${PAGE_CSS}
  <style>
    .container{max-width:1100px}
    table{width:100%;border-collapse:collapse;margin-bottom:2rem;font-size:0.9rem}
    th,td{padding:6px 10px;border:1px solid var(--border);text-align:left}
    th{background:var(--blue);color:#fff;font-weight:600;font-size:0.85rem;position:sticky;top:0}
    .cov-yes{background:rgba(34,197,94,.15);color:#16a34a;text-align:center;font-weight:600}
    .cov-no{background:rgba(239,68,68,.12);color:#dc2626;text-align:center}
    .cov-partial{background:rgba(234,179,8,.15);color:#b45309;text-align:center}
    .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:2rem}
    .stat-card{background:var(--card);border:1px solid var(--border);border-radius:var(--rs);padding:1rem;text-align:center}
    .stat-card .num{font-size:2rem;font-weight:800;color:var(--blue)}
    .stat-card .label{font-size:0.85rem;color:var(--text2)}
    .scroll-table{max-height:500px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--rs);margin-bottom:2rem}
    .scroll-table table{margin-bottom:0}
  </style>
</head>
<body>
  <div class="container">
    <h1>Data Coverage Dashboard</h1>
    <p class="subtitle">Texas Votes election data completeness at a glance.</p>

    <h2>Statewide Ballot Summary</h2>
    <table>
      <tr><th>Party</th><th>Races</th><th>Candidates</th><th>Propositions</th></tr>
      ${summaryRows}
    </table>

    <h2>County Coverage Summary</h2>
    <div class="stat-grid">
      <div class="stat-card"><div class="num">${infoPresent}</div><div class="label">Counties with Info</div></div>
      <div class="stat-card"><div class="num">${infoMissing}</div><div class="label">Counties Missing Info</div></div>
      <div class="stat-card"><div class="num">${repPresent}</div><div class="label">Republican Ballots</div></div>
      <div class="stat-card"><div class="num">${demPresent}</div><div class="label">Democrat Ballots</div></div>
    </div>

    <h2>Candidate Data Completeness</h2>
    <div class="scroll-table">
    <table>
      <tr><th>Party</th><th>Race</th><th>Candidate</th>${candFields.map(f => `<th>${f}</th>`).join("")}</tr>
      ${candRows}
    </table>
    </div>

    <h2>Tone Variant Coverage (Candidates)</h2>
    <div class="scroll-table">
    <table>
      <tr><th>Party</th><th>Candidate</th><th>Summary</th><th>Pros</th><th>Cons</th></tr>
      ${toneRows}
    </table>
    </div>

    <h2>Proposition Tone Coverage</h2>
    <div class="scroll-table">
    <table>
      <tr><th>Party</th><th>Proposition</th>${propFields.map(f => `<th>${f}</th>`).join("")}</tr>
      ${propRows}
    </table>
    </div>

    <h2>County Detail (All 254 Counties)</h2>
    <div class="scroll-table">
    <table>
      <tr><th>FIPS</th><th>County Info</th><th>GOP Ballot</th><th>Dem Ballot</th></tr>
      ${countyDetailRows}
    </table>
    </div>

    <p class="page-footer"><a href="/">Texas Votes</a></p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

async function hashString(str) {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

// Inject Cloudflare Web Analytics beacon into HTML responses
function injectBeacon(response, token) {
  if (!token) return response;
  const ct = response.headers.get("Content-Type") || "";
  if (!ct.includes("text/html")) return response;

  return new HTMLRewriter()
    .on("body", {
      element(el) {
        el.append(
          `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${token}"}'></script>`,
          { html: true }
        );
      },
    })
    .transform(response);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Redirect atxvotes.app → txvotes.app
    if (url.hostname === "atxvotes.app" || url.hostname === "www.atxvotes.app" || url.hostname === "api.atxvotes.app") {
      const dest = new URL(url.pathname + url.search + url.hash, "https://txvotes.app");
      return Response.redirect(dest.toString(), 301);
    }

    const response = await this.handleRequest(request, env, url);
    return injectBeacon(response, env.CF_BEACON_TOKEN);
  },

  async handleRequest(request, env, url) {
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
      if (url.pathname === "/candidates") {
        return handleCandidatesIndex(env);
      }
      if (url.pathname.startsWith("/candidate/")) {
        const slug = url.pathname.slice("/candidate/".length).replace(/\/+$/, "");
        if (slug) return handleCandidateProfile(slug, env);
      }
      if (url.pathname === "/api/election/manifest") {
        return handleManifest(env);
      }
      // Vanity tone entry points — clear data and start fresh with tone preset
      if (url.pathname === "/cowboy") {
        return handlePWA_Clear("/app?tone=7", "Texas Votes (Cowboy)");
      }
      if (url.pathname === "/chef") {
        return handlePWA_Clear("/app?tone=6", "Texas Votes (Swedish Chef)");
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
      if (url.pathname === "/app/api/county-info") {
        return handleCountyInfo(request, env);
      }
      if (url.pathname === "/app/api/polymarket") {
        return new Response(JSON.stringify({ odds: {} }), { headers: { "Content-Type": "application/json" } });
      }
      // Admin coverage dashboard (GET with Bearer auth)
      if (url.pathname === "/admin/coverage") {
        const auth = request.headers.get("Authorization");
        if (!auth || auth !== `Bearer ${env.ADMIN_SECRET}`) {
          return new Response("Unauthorized", { status: 401 });
        }
        return handleAdminCoverage(env);
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

    // POST: /api/election/seed-county — populate county-specific data
    if (url.pathname === "/api/election/seed-county") {
      const auth = request.headers.get("Authorization");
      if (!auth || auth !== `Bearer ${env.ADMIN_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      const body = await request.json().catch(() => ({}));
      if (!body.countyFips || !body.countyName) {
        return jsonResponse({ error: "countyFips and countyName required" }, 400);
      }
      const result = await seedFullCounty(body.countyFips, body.countyName, env);
      return jsonResponse(result);
    }

    // POST: /api/election/generate-tones — pre-generate proposition text at all 7 tone levels
    if (url.pathname === "/api/election/generate-tones") {
      const auth = request.headers.get("Authorization");
      if (!auth || auth !== `Bearer ${env.ADMIN_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      return handleGenerateTones(request, env);
    }

    // POST: /api/election/generate-candidate-tones — pre-generate candidate text at all tone levels
    if (url.pathname === "/api/election/generate-candidate-tones") {
      const auth = request.headers.get("Authorization");
      if (!auth || auth !== `Bearer ${env.ADMIN_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      return handleGenerateCandidateTones(request, env);
    }

    return new Response("Not found", { status: 404 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runDailyUpdate(env));
  },
};
