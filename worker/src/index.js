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
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);padding:0.5rem;line-height:1.7;-webkit-font-smoothing:antialiased}
.container,.card{background:var(--card);border-radius:var(--r);padding:1.25rem 1rem;box-shadow:0 2px 8px var(--shadow)}
.container{max-width:640px;margin:0 auto}
.card{max-width:480px;text-align:center}
@media(min-width:480px){body{padding:1rem}.container,.card{padding:2rem 1.5rem}}
@media(min-width:600px){body{padding:2rem}.container,.card{padding:3rem 2.5rem}}
h1{font-size:1.75rem;font-weight:800;color:var(--blue);margin-bottom:0.5rem;letter-spacing:-0.5px}
@media(min-width:480px){h1{font-size:2rem}}
h2{font-size:1.15rem;font-weight:700;color:var(--text);margin-top:1.5rem;margin-bottom:0.5rem}
p{font-size:1rem;color:var(--text);margin-bottom:0.75rem}
a{color:var(--blue)}
ul{padding-left:1.5rem;margin-bottom:0.75rem}
li{font-size:1rem;color:var(--text);margin-bottom:0.75rem}
.subtitle{font-size:1.05rem;color:var(--text2);margin-bottom:1.5rem;line-height:1.6}
.badge{display:inline-block;background:rgba(33,89,143,.1);color:var(--blue);font-weight:600;font-size:0.85rem;padding:0.35rem 0.75rem;border-radius:99px;margin-bottom:2rem;white-space:nowrap}
@media(min-width:480px){.badge{font-size:0.95rem;padding:0.4rem 1rem}}
.cta,.email-btn{display:inline-block;background:var(--blue);color:#fff;font-weight:700;border-radius:var(--rs);text-decoration:none;transition:opacity .15s;white-space:nowrap}
.cta{font-size:1rem;padding:0.9rem 1.75rem}
@media(min-width:480px){.cta{font-size:1.1rem;padding:1rem 2.5rem}}
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
</style>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.svg">`;

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
  const seen = new Set(); // deduplicate by slug+party

  // Load statewide ballots
  for (const party of parties) {
    let raw = await env.ELECTION_DATA.get(`ballot:statewide:${party}_primary_2026`);
    if (!raw) raw = await env.ELECTION_DATA.get(`ballot:${party}_primary_2026`);
    if (!raw) continue;

    let ballot;
    try { ballot = JSON.parse(raw); } catch { continue; }

    for (const race of (ballot.races || [])) {
      for (const candidate of (race.candidates || [])) {
        const slug = nameToSlug(candidate.name);
        seen.add(`${slug}|${party}`);
        results.push({
          candidate,
          race: race.office + (race.district ? ` — ${race.district}` : ""),
          raceOffice: race.office,
          raceDistrict: race.district || null,
          party,
          electionName: ballot.electionName || `${party} Primary 2026`,
          slug,
        });
      }
    }
  }

  // Load county ballots — scan for ballot:county:* keys
  const kvList = await env.ELECTION_DATA.list({ prefix: "ballot:county:" });
  for (const key of (kvList.keys || [])) {
    const raw = await env.ELECTION_DATA.get(key.name);
    if (!raw) continue;
    let ballot;
    try { ballot = JSON.parse(raw); } catch { continue; }
    // Extract party from key name (e.g. ballot:county:48453:democrat_primary_2026)
    const party = key.name.includes("republican") ? "republican" : "democrat";
    const countyName = ballot.countyName || "";

    for (const race of (ballot.races || [])) {
      for (const candidate of (race.candidates || [])) {
        const slug = nameToSlug(candidate.name);
        if (seen.has(`${slug}|${party}`)) continue; // skip duplicates
        seen.add(`${slug}|${party}`);
        const raceName = race.office + (race.district ? ` — ${race.district}` : "")
          + (countyName ? ` (${countyName} County)` : "");
        results.push({
          candidate,
          race: raceName,
          raceOffice: race.office,
          raceDistrict: race.district || null,
          party,
          electionName: ballot.electionName || `${party} Primary 2026`,
          slug,
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
  <meta property="og:image" content="https://txvotes.app/og-image.svg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://txvotes.app/og-image.svg">
  ${PAGE_CSS}
</head>
<body style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center">
  <div class="card">
    <svg width="80" height="90" viewBox="0 0 512 576" style="margin-bottom:12px">
      <defs><clipPath id="ls"><path d="M56 48h400c10 0 16 6 16 16v256c0 108-200 148-216 156C240 468 40 428 40 320V64c0-10 6-16 16-16Z"/></clipPath></defs>
      <g clip-path="url(#ls)"><rect x="40" y="48" width="432" height="440" fill="#21598F"/>
      <rect x="210" y="48" width="270" height="86" fill="#FFF"/>
      <rect x="210" y="134" width="270" height="86" fill="#BF2626"/>
      <rect x="210" y="220" width="270" height="86" fill="#FFF"/>
      <rect x="210" y="306" width="270" height="86" fill="#BF2626"/>
      <rect x="210" y="392" width="270" height="86" fill="#FFF"/></g>
      <path d="M125 166 L140 209 L186 210 L150 238 L163 282 L125 256 L87 282 L100 238 L64 210 L110 209Z" fill="#FFF"/>
      <path d="M56 48h400c10 0 16 6 16 16v256c0 108-200 148-216 156C240 468 40 428 40 320V64c0-10 6-16 16-16Z" fill="none" stroke="#0D2E4A" stroke-width="4" opacity="0.2"/>
    </svg>
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
      <div data-t="Nonpartisan and Open Source by design"><span>⚖️</span> <a href="/nonpartisan">Nonpartisan</a> and <a href="/open-source">Open Source</a> by design</div>
    </div>
    <p class="note" data-t="Works on any device — phone, tablet, or computer. No app download needed. No personal data collected.">Works on any device — phone, tablet, or computer. No app download needed. No personal data collected.</p>
  </div>
  <div style="text-align:center;margin-top:16px">
    <button id="lang-toggle" style="font-size:14px;color:var(--text2);background:none;border:none;cursor:pointer;font-family:inherit"></button>
  </div>
  <p class="page-footer">
    <a href="/candidates">Candidates</a> &middot;
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
      'Nonpartisan and Open Source by design':'Apartidista y c\\u00F3digo abierto por dise\\u00F1o',
      'Works on any device \\u2014 phone, tablet, or computer. No app download needed.':'Funciona en cualquier dispositivo \\u2014 tel\\u00E9fono, tableta o computadora. No necesitas descargar una app.',
      'Nonpartisan by Design':'Apartidista por Dise\\u00F1o',
      'Privacy':'Privacidad'
    };
    var lang=localStorage.getItem('tx_votes_lang')||localStorage.getItem('atx_votes_lang')||((navigator.language||'').slice(0,2)==='es'?'es':'en');
    var features={'5-minute interview learns your values':'\\u2705','Personalized ballot with recommendations':'\\uD83D\\uDCCB','Print your cheat sheet for the booth':'\\uD83D\\uDDA8\\uFE0F','Find your polling location':'\\uD83D\\uDCCD','Nonpartisan and Open Source by design':'\\u2696\\uFE0F'};
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
          if(key==='Nonpartisan and Open Source by design'){
            el.appendChild(document.createTextNode(' '));
            var a1=document.createElement('a');
            a1.href='/nonpartisan';
            a1.textContent=lang==='es'?'Apartidista':'Nonpartisan';
            el.appendChild(a1);
            el.appendChild(document.createTextNode(lang==='es'?' y ':' and '));
            var a2=document.createElement('a');
            a2.href='/open-source';
            a2.textContent=lang==='es'?'c\\u00F3digo abierto':'Open Source';
            el.appendChild(a2);
            el.appendChild(document.createTextNode(lang==='es'?' por dise\\u00F1o':' by design'));
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
    <p>All data stays on your device. We collect only anonymous page-view counts (via Cloudflare Web Analytics — no cookies, no personal data) and anonymous usage event counts (like "guide generated") to improve the app. No tracking, no ads. Your political views are never stored on our servers.</p>

    <h2>Open Source Approach</h2>
    <p>The full prompt sent to the AI and every design decision is documented. Nothing is hidden. <a href="/open-source">View the source code, architecture details, and independent AI code reviews.</a></p>

    <h2>Independent AI Audit</h2>
    <p>We've submitted our full AI prompts, data pipeline, and methodology to three independent AI systems (ChatGPT, Gemini, and Grok) for bias review. <a href="/audit">Read the full audit results and methodology export.</a></p>

    <p class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/candidates">Candidates</a> &middot; <a href="/open-source">Open Source</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

function handleAuditPage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Audit — Texas Votes</title>
  <meta name="description" content="Independent AI audit of Texas Votes' recommendation methodology. Full prompts, data sources, and bias reviews by ChatGPT, Gemini, and Grok.">
  <meta property="og:title" content="AI Audit — Texas Votes">
  <meta property="og:description" content="Independent AI audit of Texas Votes' recommendation methodology.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://txvotes.app/audit">
  ${PAGE_CSS}
  <style>
    .audit-score{display:inline-block;background:rgba(34,197,94,.15);color:#16a34a;font-weight:700;font-size:0.95rem;padding:0.3rem 0.75rem;border-radius:99px;margin-right:0.5rem}
    .audit-pending{background:rgba(234,179,8,.15);color:#b45309}
    .prompt-box{background:var(--bg);border:1px solid var(--border);border-radius:var(--rs);padding:1rem;margin:0.75rem 0 1rem;font-family:'SF Mono',Monaco,'Cascadia Code',monospace;font-size:0.82rem;line-height:1.6;white-space:pre-wrap;word-break:break-word;overflow-x:auto;max-height:300px;overflow-y:auto;color:var(--text)}
    .audit-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:1.25rem;margin-bottom:1rem}
    .audit-card h3{font-size:1.05rem;font-weight:700;margin-bottom:0.5rem;color:var(--text)}
    .export-btn{display:inline-block;background:var(--blue);color:#fff;font-weight:600;font-size:0.9rem;padding:0.6rem 1.25rem;border-radius:var(--rs);text-decoration:none;margin-top:0.5rem;transition:opacity .15s}
    .export-btn:hover{opacity:0.9}
    details{margin-bottom:0.75rem}
    details summary{cursor:pointer;font-weight:600;color:var(--blue);font-size:0.95rem;padding:0.25rem 0}
    details summary:hover{opacity:0.8}
  </style>
</head>
<body>
  <div class="container">
    <a class="back" href="/">&larr; Texas Votes</a>
    <h1 style="margin-top:1rem">AI Audit</h1>
    <p class="subtitle">Texas Votes uses AI to generate personalized voting guides. To prove our process is fair and nonpartisan, we publish our complete methodology and have submitted it to three independent AI systems for bias review.</p>

    <div style="margin-bottom:2rem">
      <a class="export-btn" href="/api/audit/export" target="_blank">Download Full Methodology Export (JSON)</a>
      <p class="note">This JSON file contains every prompt, safeguard, and data pipeline used in the app. You can paste it into any AI system to verify our claims.</p>
    </div>

    <h2>Run the Audit Yourself</h2>
    <p>Don't just take our word for it. Click a button below to copy the complete audit prompt (with our methodology export embedded) and open it in your AI of choice. Just paste and hit send.</p>
    <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin:1rem 0">
      <button class="export-btn" onclick="runAudit('https://chatgpt.com/')" style="border:none;cursor:pointer">Audit with ChatGPT</button>
      <button class="export-btn" onclick="runAudit('https://gemini.google.com/app')" style="border:none;cursor:pointer">Audit with Gemini</button>
      <button class="export-btn" onclick="runAudit('https://grok.x.ai/')" style="border:none;cursor:pointer">Audit with Grok</button>
    </div>
    <div id="audit-toast" style="display:none;background:#16a34a;color:#fff;padding:0.75rem 1.25rem;border-radius:var(--rs);font-weight:600;margin:0.75rem 0;text-align:center;font-size:0.95rem">Prompt copied! Paste it into the chat.</div>
    <script>
    function copyText(text){
      if(navigator.clipboard&&navigator.clipboard.writeText){
        return navigator.clipboard.writeText(text).catch(function(){return fallbackCopy(text)});
      }
      return fallbackCopy(text);
    }
    function fallbackCopy(text){
      var ta=document.createElement('textarea');
      ta.value=text;ta.style.position='fixed';ta.style.left='-9999px';
      document.body.appendChild(ta);ta.select();
      try{document.execCommand('copy')}catch(e){}
      document.body.removeChild(ta);
      return Promise.resolve();
    }
    async function runAudit(url){
      var t=document.getElementById('audit-toast');
      var win=window.open(url,'_blank');
      try{
        t.textContent='Loading methodology export...';t.style.display='block';t.style.background='var(--blue)';
        var r=await fetch('/api/audit/export');var json=await r.text();
        var prompt='You are an independent auditor reviewing an AI-powered voting guide application called "Texas Votes" (txvotes.app). This app generates personalized voting recommendations for Texas elections using Claude (by Anthropic).\n\nYour job is to evaluate the app\'s methodology, prompts, and data practices for fairness, bias, and transparency. Be rigorous and honest \u2014 identify real problems, not just surface-level concerns. The app\'s credibility depends on genuine independent review.\n\nBelow is a complete export of the app\'s AI prompts, data pipelines, safeguards, and methodology. Review it thoroughly and produce a structured audit report.\n\n=== METHODOLOGY EXPORT ===\n\n'+json+'\n\n=== END EXPORT ===\n\nPlease evaluate the following five dimensions and provide:\n- A score from 1 (poor) to 10 (excellent) for each dimension\n- Specific findings (both strengths and weaknesses)\n- Actionable recommendations for improvement\n\n## DIMENSION 1: Partisan Bias\nEvaluate whether the prompts, data structures, and methodology favor one political party or ideology over another.\n\n## DIMENSION 2: Factual Accuracy Safeguards\nEvaluate whether the system has adequate protections against hallucination, fabrication, and factual errors.\n\n## DIMENSION 3: Fairness of Framing\nEvaluate whether the way questions are asked, options are presented, and recommendations are framed is genuinely neutral.\n\n## DIMENSION 4: Balance of Pros/Cons\nEvaluate whether candidate strengths and weaknesses are presented with equal depth and fairness.\n\n## DIMENSION 5: Transparency of Methodology\nEvaluate whether the app is genuinely transparent about how it works and what its limitations are.\n\n## OUTPUT FORMAT\nPlease structure your response with: Overall Assessment, Scores table (1-10 per dimension), Detailed Findings per dimension (Strengths, Weaknesses, Recommendations), Critical Issues, and Conclusion.';
        await copyText(prompt);
        t.textContent='Prompt copied! Paste it into the chat.';t.style.background='#16a34a';
        setTimeout(function(){t.style.display='none'},8000);
      }catch(e){
        t.textContent='Error: '+e.message;t.style.background='#dc2626';t.style.display='block';
      }
    }
    </script>

    <h2>How We Generate Recommendations</h2>
    <p>When a voter uses Texas Votes, the process works as follows:</p>
    <ol style="padding-left:1.5rem;margin-bottom:0.75rem">
      <li style="margin-bottom:0.5rem"><strong>Interview:</strong> The voter answers questions about their top issues, political spectrum, policy stances, and what qualities they value in candidates. All questions are neutrally framed and answer options are shuffled.</li>
      <li style="margin-bottom:0.5rem"><strong>District lookup:</strong> Their address is sent to the U.S. Census Bureau Geocoder (a public government API) to determine their congressional, state house, and state senate districts. This filters the ballot to only races they can vote in.</li>
      <li style="margin-bottom:0.5rem"><strong>Guide generation:</strong> The voter's profile (issues, spectrum, stances) is sent along with the full candidate data for their ballot to Claude (by Anthropic) with strict nonpartisan instructions. The AI recommends one candidate per race and a stance on each proposition, with reasoning tied to the voter's stated values.</li>
      <li style="margin-bottom:0.5rem"><strong>Local storage:</strong> The generated guide is stored only on the voter's device. Nothing is saved on our servers.</li>
    </ol>

    <h2>Our Prompts</h2>
    <p>These are the exact AI prompts used in production. Nothing is paraphrased or summarized.</p>

    <details>
      <summary>Guide Generation System Prompt</summary>
      <div class="prompt-box">You are a non-partisan voting guide assistant for Texas elections. Your job is to make personalized recommendations based ONLY on the voter's stated values and the candidate data provided. You must NEVER recommend a candidate who is not listed in the provided ballot data. You must NEVER invent or hallucinate candidate information. VOICE: Always address the voter as "you" (second person). Never say "the voter" or use third person. For example, say "aligns with your values" not "aligns with the voter's values". NONPARTISAN RULES: - Base every recommendation on the voter's stated issues, values, and policy stances — never on party stereotypes or assumptions about what a voter 'should' want. - Use neutral, factual language in all reasoning. Avoid loaded terms, partisan framing, or editorial commentary. - Treat all candidates with equal analytical rigor regardless of their positions. - For propositions, connect recommendations to the voter's stated values without advocating for or against any ideology. Respond with ONLY valid JSON — no markdown, no explanation, no text outside the JSON object.</div>
    </details>

    <details>
      <summary>Guide Generation User Prompt (Template)</summary>
      <div class="prompt-box">Recommend ONE candidate per race and a stance on each proposition. Be concise.

NONPARTISAN: All reasoning must be factual and issue-based. Never use partisan framing, loaded terms, or assume what the voter should want based on their party. Treat every candidate and proposition with equal analytical rigor. Connect recommendations to the voter's specific stated values, not to party-line positions.

IMPORTANT: For profileSummary, write 2 sentences in first person — conversational, specific, no generic labels. NEVER say "I'm a Democrat/Republican" — focus on values and priorities.

VOTER: [Party] primary | Spectrum: [voter's spectrum]
Issues: [voter's top issues]
Values: [voter's candidate qualities]
Stances: [voter's policy views]

BALLOT:
[Full candidate data for all races on their ballot, including name, incumbency, key positions, endorsements, pros, cons]

VALID CANDIDATES (MUST only use these names):
[List of all candidate names per race]

Return ONLY this JSON:
{
  "profileSummary": "2 sentences, first person, conversational",
  "races": [{
    "office": "exact office name",
    "recommendedCandidate": "exact name from list",
    "reasoning": "1 sentence why this candidate fits the voter",
    "confidence": "Strong Match|Good Match|Best Available|Symbolic Race"
  }],
  "propositions": [{
    "number": 1,
    "recommendation": "Lean Yes|Lean No|Your Call",
    "reasoning": "1 sentence connecting to voter",
    "confidence": "Clear Call|Lean|Genuinely Contested"
  }]
}</div>
    </details>

    <details>
      <summary>Profile Summary System Prompt</summary>
      <div class="prompt-box">You are a concise, non-partisan political analyst. Return only plain text, no formatting. Describe the voter's views using neutral, respectful language. Never use partisan labels, stereotypes, or loaded terms. Focus on their actual stated values and priorities.</div>
    </details>

    <details>
      <summary>Candidate Research System Prompt (County Seeder)</summary>
      <div class="prompt-box">You are a nonpartisan election data researcher for Texas. Use web_search to find verified, factual information about elections. Return ONLY valid JSON. Never fabricate information — if you cannot verify something, use null.</div>
    </details>

    <details>
      <summary>Daily Updater System Prompt</summary>
      <div class="prompt-box">You are a nonpartisan election data researcher. Use web_search to find verified, factual updates about candidates. Return ONLY valid JSON. Never fabricate information — if you cannot verify something, use null.</div>
    </details>

    <h2>Data Sources</h2>
    <ul>
      <li><strong>Candidate filings:</strong> Texas Secretary of State official filing lists</li>
      <li><strong>Candidate profiles:</strong> Researched via Claude with web_search tool, cross-referenced against Ballotpedia, campaign websites, and local news. Each candidate gets the same fields: summary, background, key positions, endorsements, strengths (pros), and concerns (cons).</li>
      <li><strong>District boundaries:</strong> U.S. Census Bureau Geocoder API (public government data)</li>
      <li><strong>County voting info:</strong> County election office websites, verified via web search</li>
      <li><strong>Propositions:</strong> Official ballot language from the Texas Secretary of State, with background, fiscal impact, supporters, and opponents researched from nonpartisan sources</li>
    </ul>

    <h2>Bias Safeguards</h2>
    <p>Every layer of the system includes explicit nonpartisan constraints:</p>
    <ul>
      <li><strong>Prompt-level:</strong> Every AI prompt includes a NONPARTISAN instruction block prohibiting partisan framing, loaded terms, and party-line assumptions</li>
      <li><strong>Data-level:</strong> Both parties' ballots are generated with identical prompts and formatting. Every candidate gets the same structured fields (pros and cons, endorsements, key positions)</li>
      <li><strong>UI-level:</strong> Candidate order randomized on every page load. Party labels hidden from candidate cards. Interview answer options shuffled. Confidence levels prevent false certainty</li>
      <li><strong>Validation-level:</strong> The daily updater validates that candidate counts and names don't change unexpectedly, endorsement lists can't shrink by more than 50%, and no empty fields are introduced</li>
      <li><strong>Translation-level:</strong> Spanish translations use identical grammatical structures for both parties. Candidate names and data terms stay in English for accuracy</li>
      <li><strong>Output constraints:</strong> The AI must return structured JSON with specific fields. It cannot recommend candidates not in the ballot data. It cannot invent candidate information. Reasoning must cite the voter's specific stated values.</li>
    </ul>

    <h2>Sample Data Structure</h2>
    <p>Every candidate in our database has this structure (equal depth for all candidates):</p>
    <div class="prompt-box">{
  "name": "Candidate Name",
  "isIncumbent": true,
  "summary": "1-2 sentence neutral summary",
  "background": "Professional background",
  "education": "Educational background",
  "keyPositions": ["Position 1", "Position 2", "Position 3"],
  "endorsements": ["Endorser 1", "Endorser 2"],
  "pros": ["Strength 1", "Strength 2"],
  "cons": ["Concern 1", "Concern 2"],
  "polling": "Latest polling data or null",
  "fundraising": "Fundraising totals or null"
}</div>

    <h2>Independent AI Audit Reports</h2>
    <p>We submitted our complete methodology export (the same JSON available at <a href="/api/audit/export">/api/audit/export</a>) to three independent AI systems and asked each to evaluate our process for partisan bias, factual accuracy, fairness of framing, balance of analysis, and transparency.</p>

    <div class="audit-card">
      <h3>ChatGPT (OpenAI) Review</h3>
      <span class="audit-score">6 / 10</span>
      <p style="margin-top:0.5rem;font-size:0.9rem;color:var(--text2)">Solid foundation, but needs stronger evidence trails and bias testing. Highest-priority gap: no per-claim source citations.</p>
    </div>

    <div class="audit-card">
      <h3>Gemini (Google) Review</h3>
      <span class="audit-score">8.6 / 10</span>
      <p style="margin-top:0.5rem;font-size:0.9rem;color:var(--text2)">A gold-standard model for nonpartisan AI voting tools. Technically rigorous with strong data validation and exceptional transparency.</p>
    </div>

    <div class="audit-card">
      <h3>Grok (xAI) Review</h3>
      <span class="audit-score audit-pending">Pending</span>
      <p style="margin-top:0.5rem;font-size:0.9rem;color:var(--text2)">Audit submitted. Results will be published here when complete.</p>
    </div>

    <p class="note">Each AI was given the same prompt asking for a structured evaluation across five dimensions: partisan bias, factual accuracy, fairness of framing, balance of pros/cons, and transparency of methodology. The full audit prompt template is available in our <a href="https://github.com/txvotes">source repository</a>.</p>

    <h2>Why Three Different AIs?</h2>
    <p>Texas Votes uses Claude (by Anthropic) to generate recommendations. By asking three <em>competing</em> AI systems — ChatGPT, Gemini, and Grok — to review our methodology, we get genuinely independent assessments. Each has different training data, different biases, and different incentives. If all three find our process fair, that's meaningful. If any identifies bias, we'll address it and publish the fix.</p>

    <h2>Ongoing Commitment</h2>
    <p>This audit is not a one-time event. We will re-run it whenever we make significant changes to our prompts, data pipeline, or recommendation logic. The methodology export at <a href="/api/audit/export">/api/audit/export</a> always reflects the current production code.</p>

    <p class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/candidates">Candidates</a> &middot; <a href="/nonpartisan">Nonpartisan by Design</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

function handleAuditExport() {
  const exportData = {
    _meta: {
      name: "Texas Votes AI Methodology Export",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      purpose: "Complete transparency export of all AI prompts, data pipelines, and safeguards used by Texas Votes (txvotes.app) to generate personalized voting guides. This document is designed to be reviewed by independent AI systems for bias assessment.",
      website: "https://txvotes.app",
      auditPage: "https://txvotes.app/audit",
    },

    guideGeneration: {
      description: "When a voter completes the interview, their profile is sent with the full ballot data to generate personalized recommendations. Both Republican and Democratic ballots use identical prompts and formatting.",
      model: "Claude Sonnet (Anthropic) — claude-sonnet-4-6 with fallback to claude-sonnet-4-20250514",
      systemPrompt: "You are a non-partisan voting guide assistant for Texas elections. Your job is to make personalized recommendations based ONLY on the voter's stated values and the candidate data provided. You must NEVER recommend a candidate who is not listed in the provided ballot data. You must NEVER invent or hallucinate candidate information. VOICE: Always address the voter as \"you\" (second person). Never say \"the voter\" or use third person. For example, say \"aligns with your values\" not \"aligns with the voter's values\". NONPARTISAN RULES: - Base every recommendation on the voter's stated issues, values, and policy stances — never on party stereotypes or assumptions about what a voter 'should' want. - Use neutral, factual language in all reasoning. Avoid loaded terms, partisan framing, or editorial commentary. - Treat all candidates with equal analytical rigor regardless of their positions. - For propositions, connect recommendations to the voter's stated values without advocating for or against any ideology. Respond with ONLY valid JSON — no markdown, no explanation, no text outside the JSON object.",
      userPromptTemplate: "Recommend ONE candidate per race and a stance on each proposition. Be concise.\n\nNONPARTISAN: All reasoning must be factual and issue-based. Never use partisan framing, loaded terms, or assume what the voter should want based on their party. Treat every candidate and proposition with equal analytical rigor. Connect recommendations to the voter's specific stated values, not to party-line positions.\n\nIMPORTANT: For profileSummary, write 2 sentences in first person \u2014 conversational, specific, no generic labels. NEVER say \"I'm a Democrat/Republican\" \u2014 focus on values and priorities.\n\nVOTER: {Party} primary | Spectrum: {politicalSpectrum}\nIssues: {topIssues}\nValues: {candidateQualities}\nStances: {policyViews}\n\nBALLOT:\n{Full condensed ballot description with all races, candidates, positions, endorsements, pros, cons}\n\nVALID CANDIDATES (MUST only use these names):\n{List of candidate names per race}\n\nReturn ONLY this JSON:\n{\n  \"profileSummary\": \"2 sentences, first person, conversational\",\n  \"races\": [{\n    \"office\": \"exact office name\",\n    \"district\": \"district or null\",\n    \"recommendedCandidate\": \"exact name from list\",\n    \"reasoning\": \"1 sentence why this candidate fits the voter\",\n    \"strategicNotes\": null,\n    \"caveats\": null,\n    \"confidence\": \"Strong Match|Good Match|Best Available|Symbolic Race\"\n  }],\n  \"propositions\": [{\n    \"number\": 1,\n    \"recommendation\": \"Lean Yes|Lean No|Your Call\",\n    \"reasoning\": \"1 sentence connecting to voter\",\n    \"caveats\": null,\n    \"confidence\": \"Clear Call|Lean|Genuinely Contested\"\n  }]\n}",
      readingLevelInstructions: {
        "1": "TONE: Write at a high school reading level. Use simple, everyday language. Avoid jargon and political terminology. Explain concepts as if to someone voting for the first time.",
        "2": "TONE: Write casually, like explaining politics to a friend. Keep it conversational and approachable. Minimize jargon.",
        "3": "(default \u2014 no tone instruction added)",
        "4": "TONE: Write with more depth and nuance. Use precise political terminology where helpful. Assume the reader follows politics.",
        "5": "TONE: Write at an expert level, like a political science professor. Use precise terminology, reference policy frameworks and precedents, and assume deep familiarity with political concepts.",
        "6": "TONE: Write EVERYTHING as the Swedish Chef from the Muppets. Use his signature speech patterns — replace words with Muppet-Swedish gibberish (bork bork bork!), add 'zee' and 'de' everywhere, throw in onomatopoeia, and end sentences with 'Bork!' or 'Hurdy gurdy!'. The JSON field values should all be in Swedish Chef voice. Keep actual candidate names and office titles accurate.",
        "7": "TONE: Write EVERYTHING as a folksy Texas cowboy. Use Texas ranch metaphors, say 'y'all', 'reckon', 'fixin' to', 'partner', 'well I'll be', and 'dadgum'. Compare political situations to cattle ranching, rodeos, and wide open spaces. Keep actual candidate names and office titles accurate, but everything else should sound like a weathered ranch hand explaining politics over a campfire.",
      },
      confidenceLevels: {
        races: ["Strong Match", "Good Match", "Best Available", "Symbolic Race"],
        propositions: ["Clear Call", "Lean", "Genuinely Contested"],
      },
      constraints: [
        "Must only recommend candidates present in the provided ballot data",
        "Must never invent or hallucinate candidate information",
        "Reasoning must reference the voter's specific stated values",
        "Both parties receive identical prompt structure and formatting",
        "Output must be valid JSON \u2014 no markdown, no prose",
      ],
    },

    profileSummary: {
      description: "A separate AI call generates a 2-3 sentence voter profile summary. This is displayed to the voter and can be regenerated.",
      systemPrompt: "You are a concise, non-partisan political analyst. Return only plain text, no formatting. Describe the voter's views using neutral, respectful language. Never use partisan labels, stereotypes, or loaded terms. Focus on their actual stated values and priorities.",
      userPromptTemplate: "Write 2-3 sentences describing this person's politics the way they might describe it to a friend. Be conversational, specific, and insightful \u2014 synthesize who they are as a voter, don't just list positions. NEVER say \"I'm a Democrat\" or \"I'm a Republican\" or identify with a party label \u2014 focus on their actual views, values, and priorities. Use neutral, respectful language. Never use loaded terms, stereotypes, or partisan framing.\n\n- Political spectrum: {spectrum}\n- Top issues: {issues}\n- Values in candidates: {qualities}\n- Policy stances: {stances}\n\nReturn ONLY the summary text \u2014 no JSON, no quotes, no labels.",
    },

    candidateResearch: {
      description: "County-level candidate data is populated using Claude with the web_search tool. The AI researches official filings and news sources to find candidates, their positions, endorsements, and backgrounds.",
      systemPrompt: "You are a nonpartisan election data researcher for Texas. Use web_search to find verified, factual information about elections. Return ONLY valid JSON. Never fabricate information \u2014 if you cannot verify something, use null.",
      dataSources: [
        "Texas Secretary of State candidate filings",
        "County clerk election offices",
        "Ballotpedia",
        "Campaign websites",
        "Local news sources",
      ],
      candidateFields: {
        name: "Full legal name from official filings",
        isIncumbent: "Whether they currently hold the office",
        summary: "1-2 sentence neutral summary",
        background: "Professional and personal background",
        education: "Educational background",
        keyPositions: "Array of policy positions from campaign materials",
        endorsements: "Array of notable endorsements",
        pros: "Array of strengths/arguments in their favor",
        cons: "Array of concerns/arguments against",
        polling: "Latest polling data if available, or null",
        fundraising: "Fundraising totals if available, or null",
      },
      equalTreatment: "Every candidate in a race receives the same structured fields. The same prompt is used for all candidates in all races regardless of party, incumbency, or polling position.",
    },

    dailyUpdater: {
      description: "An automated daily cron job re-researches each contested race for new endorsements, polling, fundraising, and news. Updates are validated before being applied. Runs on the atxvotes-api worker; txvotes-api reads the same shared KV namespace.",
      model: "Claude Sonnet (claude-sonnet-4-20250514) with web_search tool (max 5 searches per race)",
      systemPrompt: "You are a nonpartisan election data researcher. Use web_search to find verified, factual updates about candidates. Return ONLY valid JSON. Never fabricate information \u2014 if you cannot verify something, use null.",
      raceResearchPromptTemplate: "Research the latest updates for this {party} primary race in the March 3, 2026 Texas Primary Election:\n\nRACE: {office} \u2014 {district}\n\nCURRENT DATA:\n  {candidateDescriptions}\n\nSearch for updates since February 15, 2026. Look for:\n1. New endorsements\n2. New polling data\n3. Updated fundraising numbers\n4. Significant news or position changes\n\nReturn a JSON object with this exact structure (use null for any field with no update):\n{\n  \"candidates\": [\n    {\n      \"name\": \"exact candidate name\",\n      \"polling\": \"updated polling string or null\",\n      \"fundraising\": \"updated fundraising string or null\",\n      \"endorsements\": [\"full updated list\"] or null,\n      \"keyPositions\": [\"full updated list\"] or null,\n      \"pros\": [\"full updated list\"] or null,\n      \"cons\": [\"full updated list\"] or null,\n      \"summary\": \"updated summary or null\",\n      \"background\": \"updated background or null\"\n    }\n  ]\n}\n\nIMPORTANT:\n- Return ONLY valid JSON, no markdown or explanation\n- Use null for any field where you found no new information\n- Candidate names must match exactly as provided\n- For arrays: return the FULL updated list (existing + new), not just additions\n- Only update fields where you found verifiable new information",
      validationRules: [
        "Candidate count must remain the same (no additions or removals)",
        "Candidate names must match exactly (no renaming)",
        "Endorsement lists cannot shrink by more than 50% (prevents accidental data loss)",
        "No empty strings in key fields (name, summary)",
        "Party cannot change between updates",
        "Empty arrays are rejected \u2014 prevents accidental data wipe",
      ],
      mergeStrategy: "Non-null fields from Claude's response overwrite existing values. Null fields are skipped (existing data preserved). Each race is updated independently with 5-second delays between API calls to avoid rate limits.",
      kvKeys: {
        statewide: "ballot:statewide:{party}_primary_2026",
        legacy: "ballot:{party}_primary_2026 (fallback during migration)",
        manifest: "manifest (version tracking per party)",
        updateLog: "update_log:{YYYY-MM-DD} (daily log of all changes and errors)",
      },
    },

    dataStructure: {
      sampleCandidate: {
        id: "gov-jane-doe",
        name: "Jane Doe",
        isIncumbent: false,
        summary: "Former state legislator running on education reform and fiscal responsibility.",
        background: "Served 6 years in the Texas House representing District 45.",
        education: "UT Austin, BA in Government; Harvard Kennedy School, MPA",
        keyPositions: ["Increase education funding", "Property tax reform", "Border security"],
        endorsements: ["Texas Teachers Association", "Former Governor Smith"],
        pros: ["Deep legislative experience", "Strong fundraising", "Bipartisan track record"],
        cons: ["Limited executive experience", "Some positions have shifted over time"],
        polling: "Leading with 35% in latest University of Texas poll",
        fundraising: "$2.1M raised as of Q4 2025",
      },
      sampleProposition: {
        number: 1,
        title: "Education Funding Amendment",
        description: "Amends the Texas Constitution to allocate additional funding for public schools.",
        background: "Texas ranks 43rd nationally in per-pupil spending.",
        fiscalImpact: "Estimated $2B annual increase in education spending from general revenue.",
        ifPasses: "Public school funding would increase by approximately $1,500 per student.",
        ifFails: "Current funding levels would remain unchanged.",
        supporters: ["Texas Teachers Association", "Parent advocacy groups"],
        opponents: ["Taxpayer advocacy groups", "Some fiscal conservatives"],
      },
    },

    nonpartisanSafeguards: {
      promptLevel: [
        "Every system prompt explicitly states 'non-partisan' or 'nonpartisan'",
        "Explicit prohibition on partisan framing and loaded terms",
        "Must treat all candidates with equal analytical rigor",
        "Reasoning must connect to voter's stated values, not party assumptions",
        "Profile summaries must never use party labels",
      ],
      dataLevel: [
        "Both party ballots generated with identical prompts and data structures",
        "Every candidate gets the same fields: summary, pros, cons, endorsements, positions",
        "Candidate research uses identical web_search methodology for all candidates",
        "Validation prevents asymmetric data quality between parties",
      ],
      uiLevel: [
        "Candidate order randomized on every page load",
        "Party labels hidden from candidate cards",
        "Interview answer options shuffled",
        "Six-point political spectrum (not binary left/right): Progressive, Liberal, Moderate, Conservative, Libertarian, Independent",
        "Confidence levels (Strong Match, Good Match, Best Available) prevent false certainty",
        "Disclaimer on every recommendation screen: 'Do your own research before voting'",
      ],
      translationLevel: [
        "Spanish translations use identical grammatical structures for both parties",
        "Candidate names, office titles, and data terms stay in English for accuracy",
        "Only the UI display layer is translated",
        "All translations reviewed for partisan bias",
      ],
    },

    interviewQuestions: {
      description: "The voter interview collects preferences through neutrally-framed questions. No question assumes or implies a correct answer. Answer options are shuffled on every load to prevent order bias.",
      phases: [
        {
          name: "Party Selection",
          description: "Voter selects which party primary they want to vote in. Both primaries are presented equally.",
        },
        {
          name: "Political Spectrum",
          description: "Six options presented with descriptions. Includes 'No wrong answers' reassurance.",
        },
        {
          name: "Top Issues",
          description: "Voter selects their 3-5 most important issues from a comprehensive list covering all political perspectives.",
        },
        {
          name: "Policy Deep Dives",
          description: "For each selected issue, the voter answers specific policy questions with 4 balanced answer options. Options are shuffled.",
        },
        {
          name: "Candidate Qualities",
          description: "Voter selects what qualities they value most in candidates from a list of 10 options.",
        },
        {
          name: "Free-form",
          description: "Optional open text field: 'Anything else you want the AI to know about your views?'",
        },
        {
          name: "Address Lookup",
          description: "Address used only for district resolution via Census Bureau API. Not stored on server.",
        },
        {
          name: "Guide Generation",
          description: "Profile + ballot data sent to Claude. Both party ballots generated with identical methodology.",
        },
      ],
      issues: [
        { value: "Economy & Cost of Living", icon: "💰" },
        { value: "Housing", icon: "🏠" },
        { value: "Public Safety", icon: "🛡️" },
        { value: "Education", icon: "🎓" },
        { value: "Healthcare", icon: "❤️" },
        { value: "Environment & Climate", icon: "🌿" },
        { value: "Grid & Infrastructure", icon: "⚡" },
        { value: "Tech & Innovation", icon: "💻" },
        { value: "Transportation", icon: "🚗" },
        { value: "Immigration", icon: "🌎" },
        { value: "Taxes", icon: "💵" },
        { value: "Civil Rights", icon: "⚖️" },
        { value: "Gun Policy", icon: "🎯" },
        { value: "Abortion & Reproductive Rights", icon: "⚕️" },
        { value: "Water & Land", icon: "💧" },
        { value: "Agriculture & Rural", icon: "🌾" },
        { value: "Faith & Religious Liberty", icon: "🕌" },
      ],
      politicalSpectrum: [
        { value: "Progressive", description: "Bold systemic change, social justice focused" },
        { value: "Liberal", description: "Expand rights and services, government as a force for good" },
        { value: "Moderate", description: "Pragmatic center, best ideas from both sides" },
        { value: "Conservative", description: "Limited government, traditional values, fiscal discipline" },
        { value: "Libertarian", description: "Maximum freedom, minimal government" },
        { value: "Independent / Issue-by-Issue", description: "I decide issue by issue, not by party" },
      ],
      candidateQualities: [
        "Competence & Track Record",
        "Integrity & Honesty",
        "Independence",
        "Experience",
        "Fresh Perspective",
        "Bipartisan / Works Across Aisle",
        "Strong Leadership",
        "Community Ties",
        "Faith & Values",
        "Business Experience",
      ],
      policyDeepDives: {
        "Housing": {
          question: "On housing, where do you land?",
          options: [
            { label: "Build, build, build", description: "Ease zoning, encourage density, let the market work" },
            { label: "Smart growth", description: "More housing with affordability guardrails" },
            { label: "Protect property rights", description: "Keep property taxes low, limit government land-use rules" },
            { label: "It's complicated", description: "Case by case — depends on the community" },
          ],
        },
        "Public Safety": {
          question: "On public safety, what's your approach?",
          options: [
            { label: "Fully fund police", description: "Hire more officers, strong prosecution" },
            { label: "Reform + fund", description: "Fund police but invest in alternatives too" },
            { label: "Redirect funding", description: "Move money toward prevention and social services" },
            { label: "Major overhaul needed", description: "Fundamental changes to how we approach safety" },
          ],
        },
        "Economy & Cost of Living": {
          question: "On taxes and government spending?",
          options: [
            { label: "Cut taxes & spending", description: "Government does too much, let people keep their money" },
            { label: "Redirect spending", description: "Same budget, better priorities" },
            { label: "Invest more if it works", description: "Willing to pay more for effective programs" },
            { label: "Tax the wealthy more", description: "Fund services through progressive taxation" },
          ],
        },
        "Tech & Innovation": {
          question: "On tech and AI regulation?",
          options: [
            { label: "Hands off", description: "Let innovation lead, regulate later if needed" },
            { label: "Light touch", description: "Basic guardrails but don't slow things down" },
            { label: "Proactive regulation", description: "Get ahead of problems before they happen" },
            { label: "Strong oversight", description: "Tech companies have too much unchecked power" },
          ],
        },
        "Education": {
          question: "On public education, what's your priority?",
          options: [
            { label: "School choice first", description: "Vouchers, charters, let parents decide" },
            { label: "Fix public schools", description: "More funding and support for neighborhood schools" },
            { label: "Teacher-focused", description: "Raise pay, reduce class sizes, trust educators" },
            { label: "Back to basics", description: "Focus on core academics, less politics in schools" },
          ],
        },
        "Healthcare": {
          question: "On healthcare, where do you stand?",
          options: [
            { label: "Free market", description: "Less regulation, more competition to lower costs" },
            { label: "Expand Medicaid", description: "Texas should accept federal Medicaid expansion" },
            { label: "Universal coverage", description: "Everyone deserves healthcare regardless of income" },
            { label: "Local solutions", description: "Community health centers and county programs" },
          ],
        },
        "Environment & Climate": {
          question: "On environment and climate?",
          options: [
            { label: "Don't overreact", description: "Protect energy jobs, market-driven solutions" },
            { label: "All of the above", description: "Renewables and fossil fuels, pragmatic transition" },
            { label: "Go green fast", description: "Aggressive renewable targets and climate action" },
            { label: "Local focus", description: "Clean air and water, green spaces, urban heat" },
          ],
        },
        "Grid & Infrastructure": {
          question: "On the power grid and infrastructure?",
          options: [
            { label: "Deregulate more", description: "Competition drives reliability, less ERCOT control" },
            { label: "Weatherize & invest", description: "Mandate upgrades, spend what it takes to prevent outages" },
            { label: "Connect the grid", description: "Link Texas to national grid for backup" },
            { label: "Local resilience", description: "Microgrids, batteries, community-level solutions" },
          ],
        },
        "Transportation": {
          question: "On transportation, what's the priority?",
          options: [
            { label: "Build more roads", description: "Expand highways, farm-to-market roads, reduce congestion" },
            { label: "Public transit", description: "Rail, better buses, less car dependence in metro areas" },
            { label: "Balanced approach", description: "Roads, transit, bikes, and walkability together" },
            { label: "Rural infrastructure", description: "Fix rural roads, improve connectivity between small towns" },
          ],
        },
        "Immigration": {
          question: "On immigration, what's your view?",
          options: [
            { label: "Secure the border", description: "Enforcement first, then talk about reform" },
            { label: "Enforce but reform", description: "Secure borders AND create legal pathways" },
            { label: "Welcoming approach", description: "Immigrants strengthen our communities, expand protections" },
            { label: "State should stay out", description: "Immigration is a federal issue, not a state priority" },
          ],
        },
        "Civil Rights": {
          question: "On civil rights and equality?",
          options: [
            { label: "Equal treatment", description: "Same rules for everyone, no special categories" },
            { label: "Protect what we have", description: "Maintain current protections, don't roll them back" },
            { label: "Expand protections", description: "Stronger anti-discrimination laws and enforcement" },
            { label: "Systemic change", description: "Address root causes of inequality, not just symptoms" },
          ],
        },
        "Gun Policy": {
          question: "On guns, where do you stand?",
          options: [
            { label: "Protect gun rights", description: "Second Amendment is non-negotiable, no new restrictions" },
            { label: "Rights with responsibility", description: "Support gun ownership but common-sense safety laws" },
            { label: "Stronger regulations", description: "Universal background checks, red flag laws, waiting periods" },
            { label: "Major reform needed", description: "Assault weapons ban, stricter licensing requirements" },
          ],
        },
        "Abortion & Reproductive Rights": {
          question: "On abortion and reproductive rights?",
          options: [
            { label: "Pro-life, no exceptions", description: "Protect life from conception, support current Texas ban" },
            { label: "Pro-life with exceptions", description: "Ban most abortions but allow rape, incest, life of mother" },
            { label: "Restore some access", description: "Current ban goes too far, allow early-term abortion" },
            { label: "Pro-choice", description: "Women should make their own reproductive decisions" },
          ],
        },
        "Water & Land": {
          question: "On water and land use in Texas?",
          options: [
            { label: "Property rights first", description: "Landowners should control their water and land" },
            { label: "Protect rural water", description: "Ban large-scale water exports, protect aquifers" },
            { label: "Conservation focus", description: "Stricter regulations to prevent water waste and pollution" },
            { label: "Major investment", description: "Build new reservoirs, desalination, and infrastructure" },
          ],
        },
        "Agriculture & Rural": {
          question: "On agriculture and rural Texas?",
          options: [
            { label: "Support family farms", description: "Protect small farms, limit corporate agriculture dominance" },
            { label: "Free market farming", description: "Less regulation, let farmers compete globally" },
            { label: "Rural investment", description: "Broadband, hospitals, schools — invest in rural communities" },
            { label: "Sustainable agriculture", description: "Incentivize conservation, regenerative farming practices" },
          ],
        },
        "Taxes": {
          question: "On taxes, what's your priority?",
          options: [
            { label: "Cut taxes across the board", description: "Lower property and sales taxes for everyone" },
            { label: "Reform, not raise", description: "Close loopholes, make the system fairer without raising rates" },
            { label: "Tax the wealthy more", description: "Higher-income Texans should pay a larger share" },
            { label: "No income tax, ever", description: "Protect Texas's no-income-tax status at all costs" },
          ],
        },
        "Faith & Religious Liberty": {
          question: "On faith and religious liberty?",
          options: [
            { label: "Protect religious freedom", description: "Strong legal protections for faith-based beliefs and practices" },
            { label: "Balance needed", description: "Protect religious freedom but not at the expense of others' rights" },
            { label: "Strict separation", description: "Keep religion out of government and public policy" },
            { label: "Faith guides policy", description: "Moral and religious values should shape our laws" },
          ],
        },
      },
    },

    countySeeder: {
      description: "County-level data is populated using Claude with web_search for each of Texas's top 30 counties by population (~75% of voters). Four data artifacts are generated per county: voting logistics, Republican ballot, Democratic ballot, and precinct map.",
      model: "Claude Sonnet (claude-sonnet-4-20250514) with web_search tool (max 10 searches per call)",
      systemPrompt: "You are a nonpartisan election data researcher for Texas. Use web_search to find verified, factual information about elections. Return ONLY valid JSON. Never fabricate information — if you cannot verify something, use null.",
      countyInfoPrompt: "Research the voting information for {countyName} County, Texas for the March 3, 2026 Texas Primary Election.\n\nFind:\n1. Does the county use Vote Centers (any location) or precinct-based voting?\n2. The county elections website URL\n3. The county elections office phone number\n4. Early voting dates and hours (early voting is Feb 17-27, 2026)\n5. Election Day hours (typically 7 AM - 7 PM)\n6. Election Day polling location finder URL\n7. Can voters use phones in the voting booth?\n8. Key local resources (election office website, local voter guide links)\n\nReturn ONLY this JSON:\n{\n  \"countyFips\": \"{fips}\",\n  \"countyName\": \"{countyName}\",\n  \"voteCenters\": true or false,\n  \"electionsWebsite\": \"URL\",\n  \"electionsPhone\": \"phone number\",\n  \"earlyVoting\": { \"periods\": [{ \"dates\": \"Feb 17-21\", \"hours\": \"7:00 AM - 7:00 PM\" }], \"note\": \"optional note\" },\n  \"electionDay\": { \"hours\": \"7:00 AM - 7:00 PM\", \"locationUrl\": \"URL to find locations\" },\n  \"phoneInBooth\": true or false or null if unknown,\n  \"resources\": [{ \"name\": \"Display Name\", \"url\": \"URL\" }]\n}",
      countyBallotPrompt: "Research ALL local {Party} primary races for {countyName} County, Texas in the March 3, 2026 Texas Primary Election.\n\nSearch the Texas Secretary of State candidate filings and local news sources.\n\nInclude ONLY county-level races such as:\n- County Judge\n- County Commissioner (by precinct)\n- County Clerk / District Clerk\n- County Treasurer / Sheriff / Attorney\n- Justice of the Peace / Constable (by precinct)\n- District Attorney / Tax Assessor-Collector\n- Any other county-level offices on the primary ballot\n\nFor each race, provide: Office name, district/precinct if applicable, whether contested, each candidate's name, background, key positions, endorsements, pros, cons.\n\nReturn ONLY valid JSON with the same candidate field structure as statewide races.",
      precinctMapPrompt: "Research the County Commissioner precinct boundaries for {countyName} County, Texas.\n\nI need a mapping of ZIP codes to County Commissioner precinct numbers.\n\nSearch for {countyName} County Commissioner precinct maps, GIS data, or official boundary descriptions.\n\nReturn ONLY this JSON:\n{ \"ZIP_CODE\": \"PRECINCT_NUMBER\", ... }\n\nOnly include ZIP codes primarily within {countyName} County. If mapping cannot be reliably determined, return {}.",
      dataSources: [
        "Texas Secretary of State candidate filings",
        "County clerk election offices",
        "County elections websites",
        "Ballotpedia",
        "Local news sources",
        "County GIS and precinct boundary data",
      ],
      topCounties: [
        "Harris", "Dallas", "Tarrant", "Bexar", "Travis", "Collin", "Denton", "Hidalgo", "Fort Bend", "Williamson",
        "Montgomery", "El Paso", "Nueces", "Galveston", "Brazoria", "Kaufman", "Johnson", "Parker", "Lubbock", "Cameron",
        "McLennan", "Bell", "Gregg", "Randall", "Potter", "Smith", "Victoria", "Jefferson", "Midland", "Ector",
      ],
      kvKeyStructure: {
        countyInfo: "county_info:{fips}",
        countyBallot: "ballot:county:{fips}:{party}_primary_2026",
        precinctMap: "precinct_map:{fips}",
      },
      equalTreatment: "Both party ballots for each county use identical prompt structure. The same candidate fields (summary, pros, cons, endorsements, positions) are generated for every candidate regardless of party or incumbency.",
    },

    toneVariants: {
      description: "Candidate summaries, pros, cons, and proposition text are pre-generated at multiple reading levels (tones). This allows voters to read ballot information at their preferred complexity without re-calling the AI at guide-generation time. Tone 3 is the default (standard news level). Other tones are generated by asking Claude to rewrite the original text while preserving factual accuracy.",
      model: "Claude Sonnet (claude-sonnet-4-20250514)",
      availableTones: {
        "1": { label: "Simple", description: "High school reading level. Simple, everyday language. No jargon. Written as if for a first-time voter." },
        "2": { label: "Casual", description: "Like explaining politics to a friend. Conversational and approachable. Minimal jargon." },
        "3": { label: "Standard (default)", description: "News-level writing. No tone instruction added — this is the original researched text." },
        "4": { label: "Detailed", description: "More depth and nuance. Precise political terminology. Assumes the reader follows politics." },
        "5": { label: "Expert", description: "Political science professor level. Precise terminology, policy frameworks and precedents, deep familiarity assumed." },
        "6": { label: "Swedish Chef", description: "Easter egg: Everything written as the Swedish Chef from the Muppets. Bork bork bork! Candidate names and office titles remain accurate." },
        "7": { label: "Texas Cowboy", description: "Easter egg: Folksy Texas cowboy voice. Y'all, reckon, fixin' to. Ranch metaphors and campfire wisdom. Candidate names and office titles remain accurate." },
      },
      candidateFields: ["summary", "pros", "cons"],
      propositionFields: ["description", "ifPasses", "ifFails", "background", "fiscalImpact"],
      rewritePromptTemplate: "Rewrite ALL of the following text fields in a {toneDescription} tone. Keep the same factual content and meaning, just adjust the language style and complexity.\n\nReturn a JSON object with the field names as keys and rewritten text as values.\nReturn ONLY valid JSON, no markdown fences, no explanation.",
      storageFormat: "Each field that has tone variants is stored as an object keyed by tone level: { \"1\": \"simple version\", \"3\": \"original version\", \"4\": \"detailed version\" }. Fields without variants remain plain strings. The resolveTone() function extracts the appropriate version at display time, defaulting to tone 3.",
      constraints: [
        "Tone rewrites must preserve all factual content — only language style changes",
        "Candidate names, office titles, and numerical data are never modified",
        "Each tone variant is a separate KV write to limit API costs",
        "Tone 3 is always the original researched text, never rewritten",
      ],
    },
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
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

    <p class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/candidates">Candidates</a> &middot; <a href="/nonpartisan">Nonpartisan by Design</a> &middot; <a href="/open-source">Open Source</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>
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
    <p class="updated">Last updated: February 22, 2026</p>

    <p>Texas Votes (<a href="https://txvotes.app">txvotes.app</a>) is a free voting guide website for Texas elections. Your privacy matters — here's exactly what happens with your data.</p>

    <h2>What we collect</h2>
    <p>We collect only what you provide during the interview:</p>
    <ul>
      <li><strong>Voter preferences</strong> — your top issues, political outlook, policy views, and candidate qualities</li>
      <li><strong>Street address</strong> — used once to look up your voting districts</li>
    </ul>

    <h2>How we use it</h2>
    <ul>
      <li>Your preferences are sent to our server to generate personalized ballot recommendations using AI (Claude by Anthropic)</li>
      <li>Your address is sent to the U.S. Census Bureau Geocoder API to determine your congressional, state house, and state senate districts</li>
      <li>After generating your guide, your profile and ballot are stored locally in your browser</li>
    </ul>

    <h2>What we don't do</h2>
    <ul>
      <li>We do <strong>not</strong> store your data on our servers — the API proxy processes requests and discards them</li>
      <li>We do <strong>not</strong> sell, share, or rent your personal information to anyone</li>
      <li>We use <strong>Cloudflare Web Analytics</strong> for anonymous page-view counts only — no cookies, no personal data, no tracking across sites</li>
      <li>We count anonymous usage events (like "guide generated" or "cheat sheet printed") to improve the app. These counts contain no personal information, no IP addresses, and no way to identify individual users.</li>
      <li>We do <strong>not</strong> use tracking pixels or advertising SDKs</li>
      <li>We do <strong>not</strong> collect device identifiers, IP addresses, or usage data</li>
    </ul>

    <h2>Local storage</h2>
    <p>Your voter profile and ballot are saved in your browser's local storage so they persist between visits. This data never leaves your device unless you generate a new guide. Clearing your browser data will remove it.</p>

    <h2>Third-party services</h2>
    <ul>
      <li><strong>Anthropic (Claude API)</strong> — processes your voter profile to generate recommendations. Subject to <a href="https://www.anthropic.com/privacy">Anthropic's privacy policy</a>.</li>
      <li><strong>U.S. Census Bureau Geocoder</strong> — receives your address to return district information. A public government API.</li>
      <li><strong>Cloudflare Workers</strong> — our API proxy runs on Cloudflare. Requests are processed in memory and not logged or stored.</li>
      <li><strong>Cloudflare Web Analytics</strong> — collects anonymous page-view counts. No cookies, no personal data, no cross-site tracking. Subject to <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare's privacy policy</a>.</li>
    </ul>

    <h2>Data deletion</h2>
    <p>Click "Start Over" in the Profile tab to erase all local data at any time. Since we don't store anything on our servers, there's nothing else to delete.</p>

    <h2>Children's privacy</h2>
    <p>This site is not directed at children under 13 and does not knowingly collect information from children.</p>

    <h2>Changes</h2>
    <p>If this policy changes, we'll update the date above and publish the new version at this URL.</p>

    <h2>Contact</h2>
    <p>Questions? Email <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>

    <p class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/candidates">Candidates</a> &middot; <a href="/nonpartisan">Nonpartisan by Design</a> &middot; <a href="/open-source">Open Source</a> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

function handleOpenSource() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Open Source — Texas Votes</title>
  <meta name="description" content="Texas Votes is open source. Every line of code, every AI prompt, every design decision is public. View the code, read independent AI reviews, and contribute.">
  ${PAGE_CSS}
  <style>
    .review-cards{display:grid;gap:1rem;margin:1rem 0 1.5rem}
    .review-card{border:1px solid var(--border);border-radius:var(--rs);padding:1rem 1.25rem;background:var(--card)}
    .review-card h3{font-size:1rem;font-weight:700;color:var(--text);margin-bottom:0.35rem}
    .review-card .quote{font-size:0.95rem;color:var(--text2);font-style:italic;margin-bottom:0.5rem;line-height:1.5}
    .review-card a{font-size:0.9rem}
    .tech-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.75rem;margin:1rem 0 1.5rem;list-style:none;padding:0}
    .tech-list li{background:rgba(33,89,143,.06);border-radius:var(--rs);padding:0.6rem 1rem;font-size:0.95rem}
    @media(prefers-color-scheme:dark){.tech-list li{background:rgba(102,153,217,.1)}}
  </style>
</head>
<body>
  <div class="container">
    <h1>Texas Votes is Open Source</h1>
    <p class="subtitle">This app is built transparently. Every line of code, every AI prompt, every design decision is public. We believe voting tools should be accountable to the voters who use them.</p>

    <h2>Why Open Source?</h2>
    <ul>
      <li><strong>Trust through transparency</strong> — voters can verify there's no hidden bias in the code, the AI prompts, or the data pipeline. You don't have to take our word for it.</li>
      <li><strong>Community contribution</strong> — anyone can suggest improvements, report issues, or help improve candidate data accuracy.</li>
      <li><strong>Replicability</strong> — other states and cities can fork this project and adapt it for their own elections. Democracy works better when good tools are shared.</li>
    </ul>

    <h2>The Code</h2>
    <!-- TODO: Update URL when GitHub repo is created (see todolist) -->
    <p>The full source code is available on GitHub: <a href="https://github.com/txvotes/txvotes">github.com/txvotes/txvotes</a> <span style="font-size:0.85rem;color:var(--text2)">(repo pending — coming soon)</span></p>

    <p>Texas Votes is a single-file progressive web app served directly from a Cloudflare Worker. There's no build step, no framework, no bundler. The entire app — HTML, CSS, and JavaScript — is generated server-side and delivered as one response.</p>

    <ul class="tech-list">
      <li><strong>JavaScript</strong> — vanilla JS, no frameworks</li>
      <li><strong>Cloudflare Workers</strong> — edge server</li>
      <li><strong>KV Storage</strong> — election data</li>
      <li><strong>Claude API</strong> — guide generation</li>
      <li><strong>Census Geocoder</strong> — district lookup</li>
      <li><strong>PWA</strong> — works offline, installable</li>
    </ul>

    <h2>Independent AI Code Reviews</h2>
    <p>We submitted our full codebase — including all AI prompts, the data pipeline, and our methodology — to three independent AI systems for review. Each was asked to evaluate the code for partisan bias, security issues, and overall code quality.</p>

    <div class="review-cards">
      <div class="review-card">
        <h3>ChatGPT Code Review</h3>
        <p class="quote">"Well-intentioned methodology, but needs stronger evidence trails + bias testing before treating it as a serious voting guide." — 6/10</p>
        <a href="/audit">Read the full review &rarr;</a>
      </div>
      <div class="review-card">
        <h3>Gemini Code Review</h3>
        <p class="quote">"A gold-standard model for nonpartisan AI voting tools. Technically rigorous with exceptional transparency." — 8.6/10</p>
        <a href="/audit">Read the full review &rarr;</a>
      </div>
      <div class="review-card">
        <h3>Grok Code Review</h3>
        <p class="quote">Review pending — full analysis of bias, security, and code quality.</p>
        <a href="/audit">Read the full review &rarr;</a>
      </div>
    </div>
    <p style="font-size:0.9rem;color:var(--text2)">These reviews complement our <a href="/audit">AI audit page</a>, which documents the full methodology export and bias assessment.</p>

    <h2>How to Contribute</h2>
    <ul>
      <li><strong>Report issues</strong> — found a bug or incorrect candidate data? <a href="https://github.com/txvotes/txvotes/issues">Open an issue on GitHub</a> or <a href="mailto:howdy@txvotes.app">email us</a>.</li>
      <li><strong>Submit pull requests</strong> — code improvements, accessibility fixes, and new features are welcome.</li>
      <li><strong>Help expand to other states</strong> — the architecture is designed to be forked. If you want to build a voting guide for your state, we'll help you get started.</li>
      <li><strong>Spread the word</strong> — share <a href="https://txvotes.app">txvotes.app</a> with fellow Texas voters.</li>
    </ul>
    <p>Contact us anytime: <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>

    <h2>License</h2>
    <p>Texas Votes is released under the <strong>MIT License</strong>. This means you're free to use, modify, and distribute the code for any purpose — including building your own voting guide for another state or city. The only requirement is that you include the original license notice.</p>
    <p style="font-size:0.9rem;color:var(--text2)">We chose MIT because civic tech should have the fewest possible barriers to reuse. If this code helps more people vote informed, it's doing its job.</p>

    <p class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/candidates">Candidates</a> &middot; <a href="/nonpartisan">Nonpartisan by Design</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>
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
  3: "standard / news level",
  4: "detailed / political",
  6: "Swedish Chef from the Muppets (bork bork bork!)",
  7: "Texas cowboy (y'all, reckon, fixin' to, partner)",
};
const VALID_TONES = [1, 3, 4, 6, 7];

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

  const countyFips = body.countyFips;

  if (!candidateName || !tone) {
    return jsonResponse({ error: "Required: candidate (name), tone (int), optional party, optional countyFips" }, 400);
  }

  // Support both statewide and county ballots
  let key;
  if (countyFips) {
    key = `ballot:county:${countyFips}:${party}_primary_2026`;
  } else {
    key = `ballot:statewide:${party}_primary_2026`;
    // Fallback to legacy key format
    const raw0 = await env.ELECTION_DATA.get(key);
    if (!raw0) key = `ballot:${party}_primary_2026`;
  }
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
    <p class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/candidates">Candidates</a> &middot; <a href="/nonpartisan">Nonpartisan by Design</a> &middot; <a href="/open-source">Open Source</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>
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
  const rawSummary = resolveTone(c.summary) || "";
  const summary = escapeHtml(rawSummary);
  const pros = resolveToneArray(c.pros);
  const cons = resolveToneArray(c.cons);

  // Build sections conditionally
  const sections = [];

  // Headshot — rendered inline next to name, not in sections
  const initials = c.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  const headshotImg = `<img src="/headshots/${escapeHtml(slug)}.jpg?v=2" alt="Photo of ${name}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--border);flex-shrink:0" onerror="if(this.src.indexOf('.jpg')!==-1){this.src=this.src.replace('.jpg','.png')}else{this.style.display='none';this.nextElementSibling.style.display='flex'}"><span style="display:none;width:72px;height:72px;border-radius:50%;background:var(--border);flex-shrink:0;align-items:center;justify-content:center;font-size:1.5rem;color:var(--text2)">${escapeHtml(initials)}</span>`;

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

  const ogDescription = rawSummary
    ? rawSummary.slice(0, 160) + (rawSummary.length > 160 ? "..." : "")
    : `${c.name} is running for ${entry.race} in the 2026 Texas ${partyLabel} Primary.`;

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
  <meta property="og:image" content="https://txvotes.app/headshots/${escapeHtml(entry.slug)}.jpg">
  ${PAGE_CSS}
</head>
<body>
  <div class="container">
    <a class="back" href="/candidates">&larr; Back to all candidates</a>
    <div style="display:flex;align-items:center;gap:1rem;margin-top:1rem">
      ${headshotImg}
      <div>
        <h1 style="margin:0">${name}</h1>
        <p class="subtitle" style="margin:0.25rem 0 0">${escapeHtml(entry.race)} &middot; ${escapeHtml(partyLabel)} Primary 2026</p>
      </div>
    </div>
    ${sections.join("\n    ")}
    <p style="margin-top:2rem;font-size:0.9rem;color:var(--text2)">See something wrong? <a href="mailto:howdy@txvotes.app?subject=Data correction: ${encodeURIComponent(c.name)}">Let us know</a> and we'll fix it.</p>
    <p class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/candidates">Candidates</a> &middot; <a href="/nonpartisan">Nonpartisan by Design</a> &middot; <a href="/open-source">Open Source</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>
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

  // Group by race name, then by party within each race
  const raceMap = new Map(); // raceLabel -> { republican: [], democrat: [] }
  for (const entry of allCandidates) {
    if (!raceMap.has(entry.race)) {
      raceMap.set(entry.race, { republican: [], democrat: [] });
    }
    raceMap.get(entry.race)[entry.party].push(entry);
  }

  // Build side-by-side race sections
  function renderCandidateList(candidates) {
    if (candidates.length === 0) return `<p style="color:var(--text2);font-size:0.9rem;margin:0.5rem 0">No primary candidates</p>`;
    return `<ul style="padding-left:0;margin:0.5rem 0">${candidates.map(e => {
      const isIncumbent = e.candidate.incumbent || e.candidate.isIncumbent;
      const incumbentBadge = isIncumbent ? ' <span style="font-size:0.8rem;color:var(--text2)">(incumbent)</span>' : "";
      const initials = e.candidate.name.split(' ').map(w => w[0]).join('').slice(0, 2);
      const placeholder = `<span style="display:none;width:32px;height:32px;border-radius:50%;background:var(--border);vertical-align:middle;margin-right:8px;line-height:32px;text-align:center;font-size:12px;color:var(--text2)">${escapeHtml(initials)}</span>`;
      const headshot = `<img src="/headshots/${escapeHtml(e.slug)}.jpg?v=2" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px;border:1px solid var(--border)" onerror="if(this.src.indexOf('.jpg')!==-1){this.src=this.src.replace('.jpg','.png')}else{this.style.display='none';this.nextElementSibling.style.display='inline-block'}">`;
      return `<li style="list-style:none;margin-bottom:0.5rem">${headshot}${placeholder}<a href="/candidate/${escapeHtml(e.slug)}">${escapeHtml(e.candidate.name)}</a>${incumbentBadge}</li>`;
    }).join("")}</ul>`;
  }

  let raceSections = "";
  for (const [raceName, parties] of raceMap) {
    raceSections += `
    <div style="margin-bottom:2rem;border:1px solid var(--border);border-radius:12px;overflow:hidden">
      <div style="background:var(--card);padding:0.75rem 1rem;border-bottom:1px solid var(--border)">
        <h2 style="margin:0;font-size:1.1rem">${escapeHtml(raceName)}</h2>
      </div>
      <div class="party-columns">
        <div class="party-col">
          <div style="font-weight:600;color:#c62626;margin-bottom:0.25rem;font-size:0.9rem">Republican</div>
          ${renderCandidateList(parties.republican)}
        </div>
        <div class="party-col">
          <div style="font-weight:600;color:#2563eb;margin-bottom:0.25rem;font-size:0.9rem">Democrat</div>
          ${renderCandidateList(parties.democrat)}
        </div>
      </div>
    </div>`;
  }

  if (!raceSections) {
    raceSections = `<p class="subtitle">No candidate data is available yet. Check back soon.</p>`;
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
  <style>
    .party-columns { display: grid; grid-template-columns: 1fr 1fr; }
    .party-col { padding: 0.75rem 1rem; }
    .party-col + .party-col { border-left: 1px solid var(--border); }
    @media (max-width: 479px) {
      .party-columns { grid-template-columns: 1fr; }
      .party-col + .party-col { border-left: none; border-top: 1px solid var(--border); }
    }
  </style>
</head>
<body>
  <div class="container">
    <a class="back" href="/">&larr; Texas Votes</a>
    <h1 style="margin-top:1rem">All Candidates</h1>
    <p class="subtitle">2026 Texas Primary Election — March 3, 2026</p>
    ${raceSections}
    <p class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/candidates">Candidates</a> &middot; <a href="/nonpartisan">Nonpartisan by Design</a> &middot; <a href="/open-source">Open Source</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>
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

// MARK: - Analytics Event Tracking

const VALID_EVENTS = new Set([
  "interview_start", "interview_phase", "interview_complete",
  "interview_abandon", "tone_select",
  "guide_start", "guide_complete", "guide_error",
  "i_voted", "share_app", "share_race", "share_voted",
  "cheatsheet_print", "party_switch", "lang_toggle",
  "race_view", "cheatsheet_view", "page_view",
]);

// Simple in-memory rate limiter: max 100 events per IP per minute
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    // Prune old entries periodically (keep map from growing unbounded)
    if (rateLimitMap.size > 10000) {
      for (const [key, val] of rateLimitMap) {
        if (now - val.start > RATE_LIMIT_WINDOW) rateLimitMap.delete(key);
      }
    }
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

async function handleAnalyticsEvent(request, env) {
  try {
    // Rate limit by IP
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (isRateLimited(ip)) {
      return new Response(null, { status: 429 });
    }

    const body = await request.json();
    const evt = body.event;
    const props = body.props || {};

    // Validate event name against allowlist
    if (!evt || !VALID_EVENTS.has(evt)) {
      return new Response(null, { status: 204 }); // silent drop
    }

    const today = new Date().toISOString().slice(0, 10);

    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        indexes: [today],
        blobs: [
          evt,                                        // blob1: event name
          String(props.lang || "en").slice(0, 2),     // blob2: language
          String(props.d1 || "").slice(0, 128),       // blob3: detail 1
          String(props.d2 || "").slice(0, 128),       // blob4: detail 2
          String(props.d3 || "").slice(0, 128),       // blob5: detail 3
        ],
        doubles: [
          Number(props.v) || 1,                       // double1: value/count
          Number(props.ms) || 0,                      // double2: duration ms
        ],
      });
    } else {
      console.log("[analytics]", evt, JSON.stringify(props));
    }
  } catch (e) {
    // Never fail — analytics should not break the app
  }
  return new Response(null, { status: 204 });
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
    // Return 404 for missing static assets (so onerror fallback works in browsers)
    if (url.pathname.startsWith("/headshots/") || url.pathname.startsWith("/assets/")) {
      return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    }

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
      if (url.pathname === "/audit") {
        return handleAuditPage();
      }
      if (url.pathname === "/api/audit/export") {
        return handleAuditExport();
      }
      if (url.pathname === "/open-source") {
        return handleOpenSource();
      }
      if (url.pathname === "/candidates") {
        return handleCandidatesIndex(env);
      }
      if (url.pathname.startsWith("/candidate/")) {
        const slug = url.pathname.slice("/candidate/".length).replace(/\/+$/, "");
        if (slug) return handleCandidateProfile(slug, env);
        return Response.redirect(new URL("/candidates", url.origin).toString(), 302);
      }
      if (url.pathname === "/candidate") {
        return Response.redirect(new URL("/candidates", url.origin).toString(), 302);
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
      if (url.pathname === "/app/clear" || url.pathname === "/clear") {
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

    // Analytics event endpoint (no auth — public, rate-limited)
    if (url.pathname === "/app/api/ev") {
      return handleAnalyticsEvent(request, env);
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
