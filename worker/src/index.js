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

// Polymarket event slug → ballot race office mapping
const POLYMARKET_EVENTS = [
  { slug: "texas-republican-senate-primary-winner", office: "U.S. Senator", party: "republican" },
  { slug: "texas-democratic-senate-primary-winner", office: "U.S. Senator", party: "democrat" },
  { slug: "texas-governor-republican-primary-winner", office: "Governor", party: "republican" },
  { slug: "texas-governor-democratic-primary-winner", office: "Governor", party: "democrat" },
];

async function handlePolymarket(env) {
  // Check KV cache first (1-hour TTL)
  const cached = await env.ELECTION_DATA.get("polymarket:odds");
  if (cached) {
    return new Response(cached, {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
    });
  }

  const odds = {};
  await Promise.all(POLYMARKET_EVENTS.map(async ({ slug, office, party }) => {
    try {
      const res = await fetch(`https://gamma-api.polymarket.com/events?slug=${slug}`);
      const events = await res.json();
      if (!events.length) return;
      const key = `${office}|${party}`;
      odds[key] = {};
      for (const m of events[0].markets) {
        if (!m.active || !m.outcomePrices || !m.groupItemTitle) continue;
        const prices = JSON.parse(m.outcomePrices);
        const pct = Math.round(parseFloat(prices[0]) * 100);
        if (pct >= 1) odds[key][m.groupItemTitle] = pct;
      }
    } catch { /* skip failed fetch */ }
  }));

  const body = JSON.stringify({ odds, updated: new Date().toISOString() });
  await env.ELECTION_DATA.put("polymarket:odds", body, { expirationTtl: 3600 });
  return new Response(body, {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
  });
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

    <p class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/nonpartisan">Nonpartisan by Design</a> &middot; <a href="/privacy">Privacy</a></p>
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
      if (url.pathname === "/app/api/county-info") {
        return handleCountyInfo(request, env);
      }
      if (url.pathname === "/app/api/polymarket") {
        return handlePolymarket(env);
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

    return new Response("Not found", { status: 404 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runDailyUpdate(env));
  },
};
