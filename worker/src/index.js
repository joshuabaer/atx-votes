import { runDailyUpdate } from "./updater.js";
import { handlePWA, handlePWA_SW, handlePWA_Manifest, handlePWA_Clear } from "./pwa.js";
import { handlePWA_Guide, handlePWA_Summary } from "./pwa-guide.js";
import { seedFullCounty, seedCountyInfo, seedCountyBallot, seedPrecinctMap } from "./county-seeder.js";
import { runAudit } from "./audit-runner.js";
import { checkBallotBalance, formatBalanceSummary } from "./balance-check.js";

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
.back-top{display:inline-block;margin-bottom:0.5rem;font-size:0.9rem;color:var(--text2);text-decoration:none}
.back-top:hover{color:var(--link)}
.page-footer{margin-top:2rem;font-size:0.85rem;color:var(--text2);text-align:center;line-height:2}
.page-footer a{color:var(--text2);text-decoration:none}
.related-links{list-style:none;padding:0;margin:0}
.related-links li{margin-bottom:0.75rem}
.related-links a{font-weight:600;font-size:0.95rem}
.cta-banner{text-align:center;margin:0.75rem 0 1rem;padding:0.75rem 1rem;background:rgba(33,89,143,.04);border-radius:var(--r)}
@media(prefers-color-scheme:dark){.cta-banner{background:rgba(102,153,217,.06)}}
.cta-banner a.cta-btn{background:var(--blue);color:#fff;font-weight:600;padding:0.6rem 1.25rem;border-radius:var(--rs);text-decoration:none;display:inline-block;font-size:0.95rem;transition:opacity .15s}
.cta-banner a.cta-btn:hover{opacity:0.9}
.cta-banner .cta-sub{font-size:0.8rem;color:var(--text2);margin-top:0.35rem}
</style>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.svg">`;

/**
 * Generates the shared <head> content for a static page, including meta tags,
 * Open Graph tags, Twitter Card tags, favicon links, and PAGE_CSS.
 *
 * @param {Object} opts - Page-specific overrides
 * @param {string} opts.title - Page title (also used for og:title and twitter:title)
 * @param {string} opts.description - Meta description (also used for og:description and twitter:description)
 * @param {string} [opts.url] - Canonical URL (og:url). Defaults to "https://txvotes.app/"
 * @param {string} [opts.image] - OG image URL. Defaults to "https://txvotes.app/og-image.svg"
 * @param {string} [opts.type] - og:type. Defaults to "website"
 * @param {string} [opts.extraHead] - Additional HTML to include in <head> (e.g., extra <style> blocks)
 * @returns {string} Complete <head> inner HTML
 */
function pageHead({ title, description, url, image, type, extraHead } = {}) {
  const t = title || "Texas Votes — Your Personalized Voting Guide";
  const d = description || "Get a personalized, nonpartisan voting guide for Texas elections in 5 minutes.";
  const u = url || "https://txvotes.app/";
  const img = image || "https://txvotes.app/og-image.svg";
  const ogType = type || "website";
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t}</title>
  <meta name="description" content="${d}">
  <meta property="og:title" content="${t}">
  <meta property="og:description" content="${d}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:url" content="${u}">
  <meta property="og:site_name" content="Texas Votes">
  <meta property="og:image" content="${img}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${t}">
  <meta name="twitter:description" content="${d}">
  <meta name="twitter:image" content="${img}">
  ${PAGE_CSS}${extraHead ? "\n  " + extraHead : ""}`;
}

// Shared i18n script for static pages — detects language, applies data-t translations, adds toggle button.
// Each page passes its own TR dictionary merged with PAGE_TR_COMMON via pageI18n(pageTR).
const PAGE_TR_COMMON = {
  // Back link
  'Texas Votes': 'Texas Votes',
  // Footer
  'How It Works': 'C\u00F3mo Funciona',
  'Privacy': 'Privacidad',
  'Built in Texas': 'Hecho en Texas',
  // CTA banner
  'Build My Voting Guide': 'Crear mi gu\u00EDa de votaci\u00F3n',
  '5-minute personalized ballot': 'Boleta personalizada en 5 minutos',
  // Related section
  'Related': 'Relacionado',
  // Common page names used in Related links
  'Nonpartisan by Design': 'Apartidista por Dise\u00F1o',
  'AI Bias Audit': 'Auditor\u00EDa de Sesgo de IA',
  'Data Quality Dashboard': 'Panel de Calidad de Datos',
  'Open Source': 'C\u00F3digo Abierto',
  'Privacy Policy': 'Pol\u00EDtica de Privacidad',
  'All Candidates': 'Todos los Candidatos',
  'Sample Ballot': 'Boleta de Ejemplo',
  'Candidate Profiles': 'Perfiles de Candidatos',
  'Methodology Export': 'Exportaci\u00F3n de Metodolog\u00EDa',
  // Common related link descriptions
  'Plain-language explanation for non-technical users': 'Explicaci\u00F3n en lenguaje sencillo para usuarios no t\u00E9cnicos',
  'Plain-language explanation of the app and AI': 'Explicaci\u00F3n en lenguaje sencillo de la app y la IA',
  'How we keep the app fair for all voters': 'C\u00F3mo mantenemos la app justa para todos los votantes',
  'How we ensure fairness for all voters': 'C\u00F3mo aseguramos la equidad para todos los votantes',
  'Independent review by four AI systems': 'Revisi\u00F3n independiente por cuatro sistemas de IA',
  'Independent review of our AI by four different systems': 'Revisi\u00F3n independiente de nuestra IA por cuatro sistemas diferentes',
  'Live metrics on ballot coverage and candidate completeness': 'M\u00E9tricas en vivo sobre cobertura de boletas y datos de candidatos',
  'Live metrics on how complete our data is': 'M\u00E9tricas en vivo sobre qu\u00E9 tan completos son nuestros datos',
  'Source code, architecture, and independent code reviews': 'C\u00F3digo fuente, arquitectura y revisiones independientes de c\u00F3digo',
  'Browse every candidate with detailed profiles': 'Explora todos los candidatos con perfiles detallados',
  'See what a personalized ballot looks like': 'Mira c\u00F3mo se ve una boleta personalizada',
  'Full transparency of all AI prompts and data pipelines': 'Transparencia total de todos los prompts de IA y pipelines de datos',
};

/**
 * Returns the closing <script> block for a static page's i18n support.
 * @param {Object} pageTR — page-specific translations (merged with PAGE_TR_COMMON at runtime)
 */
function pageI18n(pageTR) {
  const merged = Object.assign({}, PAGE_TR_COMMON, pageTR);
  const trJson = JSON.stringify(merged);
  return `
  <div style="text-align:center;margin-top:8px;margin-bottom:8px">
    <button id="lang-toggle" style="font-size:14px;color:var(--text2);background:none;border:none;cursor:pointer;font-family:inherit"></button>
  </div>
  <script>
  (function(){
    var TR=${trJson};
    var lang=localStorage.getItem('tx_votes_lang')||localStorage.getItem('atx_votes_lang')||((navigator.language||'').slice(0,2)==='es'?'es':'en');
    function apply(){
      document.documentElement.lang=lang;
      document.querySelectorAll('[data-t]').forEach(function(el){
        var key=el.getAttribute('data-t');
        var text=lang==='es'?(TR[key]||key):key;
        var a=el.querySelector('a');
        if(a&&!el.querySelector('a+a')){a.textContent=text}
        else if(!a){el.textContent=text}
        else{
          // Multiple links: translate text nodes only
          el.childNodes.forEach(function(n){if(n.nodeType===3){var k=n.textContent.trim();if(TR[k])n.textContent=n.textContent.replace(k,TR[k])}});
          el.querySelectorAll('a').forEach(function(a2){var k2=a2.textContent.trim();if(TR[k2])a2.textContent=TR[k2]});
        }
      });
      var btn=document.getElementById('lang-toggle');
      if(btn)btn.textContent=lang==='es'?'Switch to English':'Cambiar a Espa\\u00F1ol';
    }
    var btn=document.getElementById('lang-toggle');
    if(btn)btn.addEventListener('click',function(){
      lang=lang==='es'?'en':'es';
      localStorage.setItem('tx_votes_lang',lang);
      apply();
    });
    apply();
  })();
  <\/script>`;
}

// MARK: - Candidate Profile Helpers

/**
 * Normalizes an endorsement entry to { name, type } format.
 * Handles both legacy string format and new structured object format.
 */
function normalizeEndorsement(e) {
  if (typeof e === "string") return { name: e, type: null };
  return { name: e.name || String(e), type: e.type || null };
}

function nameToSlug(name) {
  if (!name) return "";
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Returns true if a candidate has sparse data (fewer than 2 of:
 * pros, cons, endorsements, keyPositions populated).
 */
function isSparseCandidate(c) {
  let filled = 0;
  if (c.pros && (Array.isArray(c.pros) ? c.pros.length : true)) filled++;
  if (c.cons && (Array.isArray(c.cons) ? c.cons.length : true)) filled++;
  if (c.endorsements && (Array.isArray(c.endorsements) ? c.endorsements.length : true)) filled++;
  if (c.keyPositions && c.keyPositions.length) filled++;
  return filled < 2;
}

/**
 * Load all candidates from statewide ballot data across both parties.
 * Returns array of { candidate, race, party, slug } objects.
 *
 * Performance: tries a pre-built candidates_index cache first (1 KV read).
 * On cache miss, reads all ballots in parallel, builds the index, and
 * writes it back to KV for subsequent requests.
 */
async function loadAllCandidates(env) {
  // 1. Try the pre-built cache (single KV read)
  const cached = await env.ELECTION_DATA.get("candidates_index");
  if (cached) {
    try { return JSON.parse(cached); } catch { /* fall through to rebuild */ }
  }

  // 2. Cache miss — build from individual ballot keys (parallel reads)
  const results = [];
  const seen = new Set(); // deduplicate by slug+party

  // Load statewide ballots — both parties in parallel
  const parties = ["republican", "democrat"];
  const statewideRaws = await Promise.all(parties.map(async (party) => {
    let raw = await env.ELECTION_DATA.get(`ballot:statewide:${party}_primary_2026`);
    if (!raw) raw = await env.ELECTION_DATA.get(`ballot:${party}_primary_2026`);
    return { party, raw };
  }));

  for (const { party, raw } of statewideRaws) {
    if (!raw) continue;
    let ballot;
    try { ballot = JSON.parse(raw); } catch { continue; }

    for (const race of (ballot.races || [])) {
      for (const candidate of (race.candidates || [])) {
        if (!candidate.name) continue;
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
          countyName: null,
        });
      }
    }
  }

  // Load county ballots — list keys, then read ALL values in parallel
  const kvList = await env.ELECTION_DATA.list({ prefix: "ballot:county:" });
  const countyRaws = await Promise.all(
    (kvList.keys || []).map(async (key) => {
      const raw = await env.ELECTION_DATA.get(key.name);
      return { keyName: key.name, raw };
    })
  );

  for (const { keyName, raw } of countyRaws) {
    if (!raw) continue;
    let ballot;
    try { ballot = JSON.parse(raw); } catch { continue; }
    const party = keyName.includes("republican") ? "republican" : "democrat";
    const countyName = ballot.countyName || "";

    for (const race of (ballot.races || [])) {
      for (const candidate of (race.candidates || [])) {
        if (!candidate.name) continue;
        const slug = nameToSlug(candidate.name);
        if (seen.has(`${slug}|${party}`)) continue;
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
          countyName: countyName || null,
        });
      }
    }
  }

  // 3. Write the cache back to KV (don't let cache write failure block response)
  try {
    await env.ELECTION_DATA.put("candidates_index", JSON.stringify(results), { expirationTtl: 3600 });
  } catch { /* non-fatal — cache write failure doesn't affect correctness */ }

  return results;
}

/**
 * Invalidate the candidates_index cache.
 * Call this after any ballot KV write so the next loadAllCandidates() rebuilds.
 */
async function invalidateCandidatesIndex(env) {
  try {
    await env.ELECTION_DATA.delete("candidates_index");
  } catch { /* non-fatal */ }
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
  ${pageHead({
    title: "Texas Votes — Your Personalized Texas Voting Guide",
    description: "Build your personalized voting guide for Texas elections in 5 minutes. Know exactly who to vote for based on your values.",
    url: "https://txvotes.app/",
  })}
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
    <div style="margin-top:12px" data-t="See a Sample Ballot"><a href="/sample" style="font-size:0.95rem;color:var(--text2)">See a Sample Ballot</a></div>
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
  <div class="page-footer">
    <a href="/" data-t="Texas Votes">Texas Votes</a> &middot;
    <a href="/how-it-works" data-t="How It Works">How It Works</a> &middot;
    <a href="/privacy" data-t="Privacy">Privacy</a>
    <br>
    <span style="color:var(--red)">&starf;</span> Built in Texas &middot;
    <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a>
  </div>
  <script>
  (function(){
    var TR={
      'Your personalized voting guide for Texas elections.':'Tu gu\\u00EDa personalizada de votaci\\u00F3n para las elecciones de Texas.',
      'Texas Primary \\u2014 March 3, 2026':'Primaria de Texas \\u2014 3 de marzo, 2026',
      'Build My Voting Guide':'Crear mi gu\\u00EDa de votaci\\u00F3n',
      '5-minute interview learns your values':'Entrevista r\\u00E1pida sobre tus valores',
      'Personalized ballot with recommendations':'Boleta personalizada con recomendaciones',
      'Print your cheat sheet for the booth':'Imprime tu gu\\u00EDa r\\u00E1pida para la casilla',
      'Find your polling location':'Encuentra tu lugar de votaci\\u00F3n',
      'Nonpartisan and Open Source by design':'Apartidista y c\\u00F3digo abierto por dise\\u00F1o',
      'Works on any device \\u2014 phone, tablet, or computer. No app download needed. No personal data collected.':'Funciona en cualquier dispositivo \\u2014 tel\\u00E9fono, tableta o computadora. No necesitas descargar una app. No se recopilan datos personales.',
      'How It Works':'C\\u00F3mo Funciona',
      'Nonpartisan by Design':'Apartidista por Dise\\u00F1o',
      'AI Audit':'Auditor\\u00EDa de IA',
      'Data Quality':'Calidad de Datos',
      'Open Source':'C\\u00F3digo Abierto',
      'Privacy':'Privacidad',
      'All Candidates':'Todos los Candidatos',
      'See a Sample Ballot':'Ver una boleta de ejemplo'
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

function handleSampleBallot() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sample Ballot — Texas Votes</title>
  <meta name="description" content="See what a personalized Texas Votes ballot looks like with realistic race cards, candidate recommendations, and party switching.">
  <meta property="og:title" content="Sample Ballot — Texas Votes">
  <meta property="og:description" content="See what a personalized Texas Votes ballot looks like with realistic race cards, candidate recommendations, and party switching.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://txvotes.app/sample">
  <meta property="og:site_name" content="Texas Votes">
  <meta property="og:image" content="https://txvotes.app/og-image.svg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Sample Ballot — Texas Votes">
  <meta name="twitter:description" content="See what a personalized Texas Votes ballot looks like with realistic race cards, candidate recommendations, and party switching.">
  <meta name="twitter:image" content="https://txvotes.app/og-image.svg">
  <meta name="theme-color" content="rgb(33,89,143)" media="(prefers-color-scheme:light)">
  <meta name="theme-color" content="rgb(28,28,31)" media="(prefers-color-scheme:dark)">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.svg">
  <style>
    /* ---- Design tokens (mirrors pwa.js) ---- */
    :root{
      --blue:rgb(33,89,143);--red:rgb(191,38,38);--gold:rgb(217,166,33);
      --bg:#faf8f0;--card:#fff;
      --text:rgb(31,31,36);--text2:rgb(115,115,128);
      --ok:rgb(51,166,82);--warn:rgb(230,140,26);--bad:rgb(209,51,51);
      --rep:rgb(217,38,38);--dem:rgb(38,77,191);
      --border:rgba(128,128,128,.15);--border2:rgba(128,128,128,.25);
      --fill3:rgba(128,128,128,.08);--shadow:rgba(0,0,0,.06);
      --r:16px;--rs:10px;--pm:16px
    }
    @media(prefers-color-scheme:dark){:root{
      --blue:rgb(102,153,217);--red:rgb(235,88,88);--gold:rgb(242,191,64);
      --bg:rgb(28,28,31);--card:rgb(43,43,46);
      --text:rgb(237,237,240);--text2:rgb(153,153,166);
      --ok:rgb(77,199,107);--warn:rgb(255,166,51);--bad:rgb(255,89,89);
      --rep:rgb(255,77,77);--dem:rgb(89,128,242);
      --border:rgba(255,255,255,.15);--border2:rgba(255,255,255,.2);
      --fill3:rgba(255,255,255,.08);--shadow:rgba(0,0,0,.3)
    }}

    /* ---- Base ---- */
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;border-top:3px solid var(--red)}

    /* ---- Sample banner / watermark ---- */
    .sample-banner{background:var(--blue);color:#fff;text-align:center;padding:10px 16px;font-weight:700;font-size:0.95rem;letter-spacing:0.5px;position:sticky;top:0;z-index:100}
    .sample-watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:6rem;font-weight:900;color:rgba(128,128,128,.07);pointer-events:none;z-index:0;white-space:nowrap;letter-spacing:8px}

    /* ---- Layout ---- */
    .ballot-container{max-width:480px;margin:0 auto;padding:var(--pm);position:relative;z-index:1}
    @media(min-width:600px){.ballot-container{max-width:680px}}

    /* ---- Card (matches PWA .card) ---- */
    .card{background:var(--card);border-radius:var(--r);padding:var(--pm);box-shadow:0 2px 8px var(--shadow);margin-bottom:12px;overflow:hidden;word-break:break-word}

    /* ---- Party switcher (matches PWA .party-row / .party-btn) ---- */
    .party-row{display:flex;gap:10px;margin-bottom:16px}
    .party-btn{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:6px;padding:12px 8px;border-radius:var(--rs);font-size:16px;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;font-family:inherit;background:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box}
    .party-rep{color:var(--rep);border-color:rgba(217,38,38,.3)}
    .party-rep.on{background:var(--rep);color:#fff;border-color:var(--rep)}
    .party-dem{color:var(--dem);border-color:rgba(38,77,191,.3)}
    .party-dem.on{background:var(--dem);color:#fff;border-color:var(--dem)}

    /* ---- Section headers (matches PWA .section-head) ---- */
    .section-head{font-size:18px;font-weight:800;margin:24px 0 12px;display:flex;align-items:center;gap:8px}
    .section-head::before{content:'\\2605';color:var(--red);font-size:14px}

    /* ---- Badges (matches PWA) ---- */
    .badge{display:inline-block;font-size:14px;font-weight:600;padding:3px 10px;border-radius:99px;white-space:nowrap}
    .badge-ok{color:var(--ok);background:rgba(51,166,82,.12)}
    .badge-warn{color:var(--warn);background:rgba(230,140,26,.12)}
    .badge-bad{color:var(--bad);background:rgba(209,51,51,.12)}
    .badge-blue{color:var(--blue);background:rgba(33,89,143,.12)}
    @media(prefers-color-scheme:dark){.badge-ok{background:rgba(77,199,107,.15)}.badge-warn{background:rgba(255,166,51,.15)}.badge-bad{background:rgba(255,89,89,.15)}.badge-blue{background:rgba(102,153,217,.15)}}

    /* ---- Disclaimer (matches PWA) ---- */
    .disclaimer{display:flex;gap:10px;align-items:flex-start;padding:12px;background:rgba(230,140,26,.08);border:1px solid rgba(230,140,26,.3);border-radius:var(--rs);margin-bottom:16px;font-size:13px;line-height:1.5;color:var(--text2)}
    .disclaimer b{color:var(--text);font-size:15px;display:block;margin-bottom:2px}

    /* ---- Race card (matches PWA .card for race summary) ---- */
    .race-card{cursor:default}
    .race-office{flex:1;min-width:0;font-size:14px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .star{color:var(--gold);font-size:12px;margin-right:4px}
    .race-rec-name{font-size:17px;font-weight:700;margin-top:4px}
    .race-rec-reason{font-size:13px;color:var(--text2);margin-top:2px;line-height:1.4}
    .race-cand-count{font-size:13px;color:var(--text2);margin-top:4px}

    /* ---- Candidate avatars row ---- */
    .avatar-row{display:flex;gap:4px;margin-top:6px}
    .avatar-circle{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0}
    .avatar-circle.rec{border:2px solid var(--blue)}

    /* ---- Candidate detail card (matches PWA .cand-card) ---- */
    .cand-card{border:1.5px solid var(--border);border-radius:var(--rs);padding:14px;margin-bottom:10px}
    .cand-card.recommended{border-color:var(--ok)}
    .cand-avatar{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden}
    .cand-name{font-size:17px;font-weight:700}
    .cand-tags{display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;margin-top:2px}
    .cand-summary{font-size:14px;color:var(--text2);line-height:1.5;margin-top:8px}
    .cand-details{margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}
    .cand-section{margin-bottom:10px}
    .cand-section h5{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
    .cand-section.pros{background:rgba(51,166,82,.06);border:1px solid rgba(51,166,82,.2);border-radius:var(--rs);padding:10px 12px;margin-bottom:10px}
    .cand-section.pros h5{color:var(--ok)}
    .cand-section.cons{background:rgba(230,140,26,.06);border:1px solid rgba(230,140,26,.2);border-radius:var(--rs);padding:10px 12px;margin-bottom:10px}
    .cand-section.cons h5{color:var(--warn)}
    @media(prefers-color-scheme:dark){.cand-section.pros{background:rgba(77,199,107,.08)}.cand-section.cons{background:rgba(255,166,51,.08)}}
    .cand-section li{font-size:14px;line-height:1.5;margin-left:16px;margin-bottom:2px}

    /* ---- Positions chips (matches PWA) ---- */
    .pos-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
    .pos-chip{font-size:13px;padding:4px 10px;border-radius:12px;background:rgba(33,89,143,.08);color:var(--blue)}
    @media(prefers-color-scheme:dark){.pos-chip{background:rgba(102,153,217,.12)}}

    /* ---- Expand toggle (matches PWA) ---- */
    .expand-toggle{font-size:14px;color:var(--blue);cursor:pointer;background:none;border:none;padding:8px 0;font-weight:600;font-family:inherit}

    /* ---- Recommendation box (matches PWA .rec-box) ---- */
    .rec-box{padding:14px;border-radius:var(--rs);border:1.5px solid var(--ok);background:rgba(51,166,82,.06);margin-bottom:16px}
    @media(prefers-color-scheme:dark){.rec-box{background:rgba(77,199,107,.08)}}
    .rec-box h4{font-size:17px;margin-bottom:4px}
    .rec-box p{font-size:14px;color:var(--text2);line-height:1.5}

    /* ---- Proposition (matches PWA) ---- */
    .prop-header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;min-width:0}
    .prop-title{font-size:16px;font-weight:700;min-width:0;flex:1}
    .prop-desc{font-size:14px;color:var(--text2);line-height:1.5;margin-top:6px}
    .prop-outcome{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:var(--rs);margin-bottom:6px;font-size:13px;line-height:1.5}
    .prop-outcome.pass{background:rgba(51,166,82,.06);border:1px solid rgba(51,166,82,.2)}
    .prop-outcome.fail{background:rgba(209,51,51,.06);border:1px solid rgba(209,51,51,.2)}
    @media(prefers-color-scheme:dark){.prop-outcome.pass{background:rgba(77,199,107,.08)}.prop-outcome.fail{background:rgba(255,89,89,.08)}}
    .prop-reasoning{display:flex;gap:8px;align-items:flex-start;padding:10px;border-radius:var(--rs);background:rgba(33,89,143,.04);margin-top:8px;font-size:13px;line-height:1.5;font-style:italic;color:var(--text2)}
    @media(prefers-color-scheme:dark){.prop-reasoning{background:rgba(102,153,217,.06)}}

    /* ---- Share CTA (matches PWA) ---- */
    .share-cta{background:linear-gradient(135deg,rgba(33,89,143,.08),rgba(191,38,38,.08));border:2px dashed var(--border2);border-radius:var(--r);padding:20px;text-align:center;margin-bottom:16px}
    .share-cta-title{font-size:18px;font-weight:800;margin-bottom:6px}
    .share-cta-body{font-size:14px;color:var(--text2);line-height:1.5;margin-bottom:14px}

    /* ---- CTA button ---- */
    .btn{display:block;width:100%;padding:14px;border:none;border-radius:var(--rs);font-size:17px;font-weight:700;cursor:pointer;text-align:center;transition:opacity .15s;font-family:inherit;text-decoration:none;box-sizing:border-box}
    .btn:active{opacity:.85}
    .btn-primary{background:var(--blue);color:#fff}
    .btn-inline{display:inline-block;width:auto;padding:12px 28px;font-size:16px}

    /* ---- Back link ---- */
    .back-top{display:inline-block;margin-bottom:0.5rem;font-size:0.9rem;color:var(--text2);text-decoration:none}
    .back-top:hover{color:var(--blue)}

    /* ---- Footer ---- */
    .page-footer{margin-top:16px;font-size:13px;color:var(--text2);text-align:center;line-height:2}
    .page-footer a{color:var(--text2);text-decoration:none}

    /* ---- Party-specific content toggling ---- */
    [data-party="democrat"]{display:none}
    body.party-dem [data-party="republican"]{display:none}
    body.party-dem [data-party="democrat"]{display:block}

    /* ---- CTA Banner ---- */
    .cta-banner{text-align:center;margin:12px 0 16px;padding:0.75rem 1rem;background:rgba(33,89,143,.04);border-radius:var(--r)}
    @media(prefers-color-scheme:dark){.cta-banner{background:rgba(102,153,217,.06)}}
    .cta-banner a.cta-btn{background:var(--blue);color:#fff;font-weight:600;padding:0.6rem 1.25rem;border-radius:var(--rs);text-decoration:none;display:inline-block;font-size:0.95rem;transition:opacity .15s}
    .cta-banner a.cta-btn:hover{opacity:0.9}
    .cta-banner .cta-sub{font-size:0.8rem;color:var(--text2);margin-top:0.35rem}
  </style>
</head>
<body>
  <div class="sample-banner" data-t="SAMPLE BALLOT — Fictional candidates and recommendations for demonstration">SAMPLE BALLOT &mdash; Fictional candidates &amp; recommendations for demonstration</div>
  <div class="sample-watermark">SAMPLE</div>

  <div class="ballot-container">
    <a href="/" class="back-top">&larr; Texas Votes</a>

    <!-- Party switcher -->
    <div class="party-row">
      <button class="party-btn party-rep on" id="btn-rep" onclick="setParty('republican')" data-t="Republican">&#x1F418; Republican</button>
      <button class="party-btn party-dem" id="btn-dem" onclick="setParty('democrat')" data-t="Democrat">&#x1FACF; Democrat</button>
    </div>

    <!-- Election info header -->
    <div class="card" style="text-align:center">
      <div style="font-size:18px;font-weight:800"><span style="color:var(--red)">&starf;</span> Texas <span id="party-label">Republican</span> Primary</div>
      <div style="font-size:14px;color:var(--text2);margin-top:2px">Tuesday, March 3, 2026</div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px">
        <span class="badge badge-blue">CD-21</span>
        <span class="badge badge-blue">SD-14</span>
        <span class="badge badge-blue">HD-46</span>
      </div>
    </div>

    <!-- Disclaimer -->
    <div class="disclaimer">
      <span style="font-size:20px">&#x26A0;&#xFE0F;</span>
      <div>
        <b>Sample Ballot &mdash; Not Real Recommendations</b>
        This page shows fictional candidates and AI-generated recommendations to demonstrate what your personalized ballot looks like. All names, positions, and match scores are examples only.
      </div>
    </div>

    <div class="cta-banner"><a class="cta-btn" href="/app?start=1" data-t="Build My Voting Guide">Build My Voting Guide &rarr;</a><p class="cta-sub" data-t="5-minute personalized ballot">5-minute personalized ballot</p></div>

    <!-- ==================== REPUBLICAN BALLOT ==================== -->
    <div data-party="republican">

      <div class="section-head">Key Races</div>

      <!-- R1: Governor -->
      <div class="card race-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <div class="race-office"><span class="star">&#x2B50;</span> Governor</div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span class="badge badge-ok">Strong Match</span>
            <span style="color:var(--text2);font-size:18px">&rsaquo;</span>
          </div>
        </div>
        <div class="race-rec-name">Marcus Sullivan</div>
        <div class="race-rec-reason">Fiscally conservative with strong property tax reform plan. Aligns with your emphasis on limited government and individual liberty.</div>
        <div class="race-cand-count">3 candidates</div>
        <div class="avatar-row">
          <div class="avatar-circle rec" style="background:#4A90D9">M</div>
          <div class="avatar-circle" style="background:#D95B43">R</div>
          <div class="avatar-circle" style="background:#5B8C5A">T</div>
        </div>
      </div>

      <!-- R1 detail: expanded race view -->
      <div class="rec-box">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h4>&#x2705; Marcus Sullivan</h4>
          <span class="badge badge-ok">Strong Match</span>
        </div>
        <p>Sullivan's property tax reform plan directly addresses your top issue. His business background and city council tenure demonstrate fiscal restraint, while his education stance preserves local control.</p>
      </div>

      <div class="cand-card recommended">
        <div style="display:flex;gap:12px;align-items:center">
          <div class="cand-avatar" style="background:#4A90D9">M</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div class="cand-name">Marcus Sullivan</div>
              <div class="cand-tags">
                <span class="badge badge-ok">Recommended</span>
              </div>
            </div>
          </div>
        </div>
        <div class="cand-summary">Former city council member and business owner. Strong advocate for property tax relief, school choice, and border security. Endorsed by multiple law enforcement organizations.</div>
        <div class="cand-details">
          <div class="cand-section">
            <h5>Key Positions</h5>
            <div class="pos-chips">
              <span class="pos-chip">Property Tax Reform</span>
              <span class="pos-chip">School Choice</span>
              <span class="pos-chip">Border Security</span>
              <span class="pos-chip">Energy Independence</span>
            </div>
          </div>
          <div class="cand-section">
            <h5>Endorsements</h5>
            <ul>
              <li>Texas Farm Bureau <span style="font-size:12px;color:var(--text2)">(business group)</span></li>
              <li>Travis County Sheriff&rsquo;s Association <span style="font-size:12px;color:var(--text2)">(professional association)</span></li>
              <li>Rep. Dan Harmon <span style="font-size:12px;color:var(--text2)">(elected official)</span></li>
            </ul>
          </div>
          <div class="cand-section pros">
            <h5>&#x2705; Strengths</h5>
            <ul>
              <li>Detailed 5-year property tax reduction plan with independent budget analysis</li>
              <li>8 years city council experience with record of balanced budgets</li>
              <li>Endorsed by Texas Farm Bureau and multiple sheriffs' associations</li>
            </ul>
          </div>
          <div class="cand-section cons">
            <h5>&#x26A0;&#xFE0F; Concerns</h5>
            <ul>
              <li>No statewide office experience; largest budget managed was $180M</li>
              <li>Property tax plan may require offsetting revenue sources not yet identified</li>
            </ul>
          </div>
          <div style="margin-top:12px;padding:10px;border-radius:var(--rs);background:rgba(33,89,143,.04);border:1px solid var(--border)">
            <div style="font-size:13px;font-weight:700;margin-bottom:4px">Why this match?</div>
            <ul style="font-size:13px;color:var(--text2);line-height:1.6;margin-left:16px">
              <li>Aligns with your priority: property tax reform</li>
              <li>Matches your value: fiscal discipline and limited government</li>
              <li>Supports your stance: local control of education</li>
            </ul>
          </div>
          <div style="margin-top:10px">
            <div style="font-size:13px;font-weight:700;margin-bottom:4px">Sources</div>
            <ul style="font-size:12px;color:var(--text2);line-height:1.6;margin-left:16px">
              <li><a href="#" style="font-size:12px" onclick="return false">Sullivan for Governor &mdash; Official Campaign Site</a></li>
              <li><a href="#" style="font-size:12px" onclick="return false">Texas Tribune: Sullivan enters governor&rsquo;s race</a></li>
              <li><a href="#" style="font-size:12px" onclick="return false">Ballotpedia &mdash; Marcus Sullivan</a></li>
            </ul>
          </div>
        </div>
        <button class="expand-toggle" style="pointer-events:none">Show Less</button>
      </div>

      <div class="cand-card">
        <div style="display:flex;gap:12px;align-items:center">
          <div class="cand-avatar" style="background:#D95B43">R</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div class="cand-name">Rachel Whitfield</div>
              <div class="cand-tags">
                <span class="badge badge-warn">Good Match</span>
              </div>
            </div>
          </div>
        </div>
        <div class="cand-summary">State representative with 6 years of legislative experience. Focused on water infrastructure and rural broadband. More moderate on education policy.</div>
        <button class="expand-toggle" style="pointer-events:none">Show Details</button>
      </div>

      <div class="cand-card">
        <div style="display:flex;gap:12px;align-items:center">
          <div class="cand-avatar" style="background:#5B8C5A">T</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div class="cand-name">Tom Briscoe</div>
              <div class="cand-tags">
                <span class="badge badge-warn">Best Available</span>
              </div>
            </div>
          </div>
        </div>
        <div class="cand-summary">Rancher and former county judge. Running on a strict constitutionalist platform emphasizing 10th Amendment rights and federal land policy.</div>
        <button class="expand-toggle" style="pointer-events:none">Show Details</button>
      </div>

      <!-- R2: Attorney General -->
      <div class="card race-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <div class="race-office"><span class="star">&#x2B50;</span> Attorney General</div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span class="badge badge-ok">Strong Match</span>
            <span style="color:var(--text2);font-size:18px">&rsaquo;</span>
          </div>
        </div>
        <div class="race-rec-name">Priya Kapoor</div>
        <div class="race-rec-reason">Former federal prosecutor with deep consumer protection experience. Her stance on government accountability aligns with your priorities.</div>
        <div class="race-cand-count">2 candidates</div>
        <div class="avatar-row">
          <div class="avatar-circle rec" style="background:#4A90D9">P</div>
          <div class="avatar-circle" style="background:#D95B43">J</div>
        </div>
      </div>

      <!-- R3: Comptroller -->
      <div class="card race-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <div class="race-office">Comptroller of Public Accounts</div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span class="badge badge-warn">Good Match</span>
            <span style="color:var(--text2);font-size:18px">&rsaquo;</span>
          </div>
        </div>
        <div class="race-rec-name">David Chen</div>
        <div class="race-rec-reason">CPA with state budget experience. Pragmatic fiscal approach with emphasis on transparent accounting practices.</div>
        <div class="race-cand-count">3 candidates</div>
        <div class="avatar-row">
          <div class="avatar-circle rec" style="background:#4A90D9">D</div>
          <div class="avatar-circle" style="background:#D95B43">A</div>
          <div class="avatar-circle" style="background:#5B8C5A">W</div>
        </div>
      </div>

      <div class="section-head">Other Contested Races</div>

      <!-- R4: Commissioner of Agriculture -->
      <div class="card race-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <div class="race-office">Commissioner of Agriculture</div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span class="badge badge-warn">Best Available</span>
            <span style="color:var(--text2);font-size:18px">&rsaquo;</span>
          </div>
        </div>
        <div class="race-rec-name">Linda Morales</div>
        <div class="race-rec-reason">Third-generation rancher with practical water management experience. Both candidates have limited policy platforms.</div>
        <div class="race-cand-count">2 candidates</div>
        <div class="avatar-row">
          <div class="avatar-circle rec" style="background:#4A90D9">L</div>
          <div class="avatar-circle" style="background:#D95B43">B</div>
        </div>
      </div>

      <!-- R5: Railroad Commissioner -->
      <div class="card race-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <div class="race-office">Railroad Commissioner</div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span class="badge badge-ok">Strong Match</span>
            <span style="color:var(--text2);font-size:18px">&rsaquo;</span>
          </div>
        </div>
        <div class="race-rec-name">James Okafor</div>
        <div class="race-rec-reason">Petroleum engineer with 20 years of industry experience. Strong on grid reliability and responsible energy development.</div>
        <div class="race-cand-count">4 candidates</div>
        <div class="avatar-row">
          <div class="avatar-circle rec" style="background:#4A90D9">J</div>
          <div class="avatar-circle" style="background:#D95B43">K</div>
          <div class="avatar-circle" style="background:#5B8C5A">M</div>
          <div class="avatar-circle" style="background:#8E6BBF">S</div>
        </div>
      </div>

      <div class="section-head">Local Races</div>

      <!-- R6: County Commissioner -->
      <div class="card race-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <div class="race-office">County Commissioner &mdash; Precinct 3</div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span class="badge badge-ok">Strong Match</span>
            <span style="color:var(--text2);font-size:18px">&rsaquo;</span>
          </div>
        </div>
        <div class="race-rec-name">Robert Tran</div>
        <div class="race-rec-reason">Former county budget director. Focuses on road maintenance, property tax transparency, and keeping county spending in check.</div>
        <div class="race-cand-count">2 candidates</div>
        <div class="avatar-row">
          <div class="avatar-circle rec" style="background:#4A90D9">R</div>
          <div class="avatar-circle" style="background:#D95B43">C</div>
        </div>
      </div>

      <!-- R Proposition -->
      <div class="section-head">Propositions</div>

      <div class="card">
        <div class="prop-header">
          <div class="prop-title">Prop 1: Property Tax Freeze for Seniors</div>
          <span class="badge badge-ok">Lean Yes</span>
        </div>
        <div class="prop-desc">Shall the Texas Legislature freeze property tax assessments at current levels for homeowners aged 65 and older?</div>
        <div style="margin-top:10px">
          <div class="prop-outcome pass"><span style="flex-shrink:0">&#x2705;</span><div><b>If it passes:</b> Senior homeowners see property taxes frozen at current assessment, reducing displacement from rising valuations.</div></div>
          <div class="prop-outcome fail"><span style="flex-shrink:0">&#x274C;</span><div><b>If it fails:</b> Senior property taxes continue adjusting with market valuations, maintaining current revenue trajectory for local services.</div></div>
        </div>
        <div class="prop-reasoning"><span style="flex-shrink:0">&#x1F9E0;</span><div>Based on your emphasis on property tax relief and support for fixed-income protections, this aligns with your stated priorities. However, revenue offsets would shift burden to non-senior taxpayers.</div></div>
      </div>

    </div><!-- /republican -->

    <!-- ==================== DEMOCRAT BALLOT ==================== -->
    <div data-party="democrat">

      <div class="section-head">Key Races</div>

      <!-- D1: Governor -->
      <div class="card race-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <div class="race-office"><span class="star">&#x2B50;</span> Governor</div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span class="badge badge-ok">Strong Match</span>
            <span style="color:var(--text2);font-size:18px">&rsaquo;</span>
          </div>
        </div>
        <div class="race-rec-name">Angela Washington</div>
        <div class="race-rec-reason">Former school superintendent with comprehensive public education plan. Her healthcare access expansion matches your top priorities.</div>
        <div class="race-cand-count">4 candidates</div>
        <div class="avatar-row">
          <div class="avatar-circle rec" style="background:#4A90D9">A</div>
          <div class="avatar-circle" style="background:#D95B43">C</div>
          <div class="avatar-circle" style="background:#5B8C5A">M</div>
          <div class="avatar-circle" style="background:#8E6BBF">J</div>
        </div>
      </div>

      <!-- D1 detail: expanded race view -->
      <div class="rec-box">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h4>&#x2705; Angela Washington</h4>
          <span class="badge badge-ok">Strong Match</span>
        </div>
        <p>Washington's education reform plan and Medicaid expansion proposal address your top two issues. Her 15 years as superintendent demonstrates executive leadership at scale.</p>
      </div>

      <div class="cand-card recommended">
        <div style="display:flex;gap:12px;align-items:center">
          <div class="cand-avatar" style="background:#4A90D9">A</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div class="cand-name">Angela Washington</div>
              <div class="cand-tags">
                <span class="badge badge-ok">Recommended</span>
              </div>
            </div>
          </div>
        </div>
        <div class="cand-summary">Former school superintendent and education policy advocate. Running on expanding public school funding, Medicaid expansion, and renewable energy investment across rural Texas.</div>
        <div class="cand-details">
          <div class="cand-section">
            <h5>Key Positions</h5>
            <div class="pos-chips">
              <span class="pos-chip">Public Education</span>
              <span class="pos-chip">Healthcare Access</span>
              <span class="pos-chip">Renewable Energy</span>
              <span class="pos-chip">Voting Rights</span>
            </div>
          </div>
          <div class="cand-section pros">
            <h5>&#x2705; Strengths</h5>
            <ul>
              <li>15 years leading a 40,000-student school district with improved outcomes</li>
              <li>Detailed Medicaid expansion plan with cost projections from state budget office</li>
              <li>Endorsed by Texas State Teachers Association and Texas AFL-CIO</li>
            </ul>
          </div>
          <div class="cand-section cons">
            <h5>&#x26A0;&#xFE0F; Concerns</h5>
            <ul>
              <li>No prior elected office; transition from appointed to elected leadership untested</li>
              <li>Renewable energy plan timeline may be ambitious given current grid infrastructure</li>
            </ul>
          </div>
        </div>
        <button class="expand-toggle" style="pointer-events:none">Show Less</button>
      </div>

      <div class="cand-card">
        <div style="display:flex;gap:12px;align-items:center">
          <div class="cand-avatar" style="background:#D95B43">C</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div class="cand-name">Carlos Fuentes</div>
              <div class="cand-tags">
                <span class="badge badge-warn">Good Match</span>
              </div>
            </div>
          </div>
        </div>
        <div class="cand-summary">State senator with 10 years of legislative experience. Champion of workers' rights and criminal justice reform. Strong on immigration policy.</div>
        <button class="expand-toggle" style="pointer-events:none">Show Details</button>
      </div>

      <div class="cand-card">
        <div style="display:flex;gap:12px;align-items:center">
          <div class="cand-avatar" style="background:#5B8C5A">M</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div class="cand-name">Michelle Torres-Kim</div>
              <div class="cand-tags">
                <span class="badge badge-warn">Good Match</span>
              </div>
            </div>
          </div>
        </div>
        <div class="cand-summary">Environmental lawyer and former EPA regional counsel. Running on climate resilience, clean water, and environmental justice for underserved communities.</div>
        <button class="expand-toggle" style="pointer-events:none">Show Details</button>
      </div>

      <div class="cand-card">
        <div style="display:flex;gap:12px;align-items:center">
          <div class="cand-avatar" style="background:#8E6BBF">J</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div class="cand-name">Jerome Bradley</div>
              <div class="cand-tags">
                <span class="badge" style="color:var(--text2);background:rgba(128,128,128,.12);font-size:12px">Limited public info</span>
              </div>
            </div>
          </div>
        </div>
        <div class="cand-summary">Community organizer and small business owner. First-time candidate focused on affordable housing and local economic development.</div>
        <button class="expand-toggle" style="pointer-events:none">Show Details</button>
      </div>

      <!-- D2: Attorney General -->
      <div class="card race-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <div class="race-office"><span class="star">&#x2B50;</span> Attorney General</div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span class="badge badge-ok">Strong Match</span>
            <span style="color:var(--text2);font-size:18px">&rsaquo;</span>
          </div>
        </div>
        <div class="race-rec-name">Denise Obi</div>
        <div class="race-rec-reason">Civil rights attorney focused on voting access and police accountability. Aligns with your emphasis on justice reform.</div>
        <div class="race-cand-count">2 candidates</div>
        <div class="avatar-row">
          <div class="avatar-circle rec" style="background:#4A90D9">D</div>
          <div class="avatar-circle" style="background:#D95B43">R</div>
        </div>
      </div>

      <div class="section-head">Other Contested Races</div>

      <!-- D3: Land Commissioner -->
      <div class="card race-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <div class="race-office">Land Commissioner</div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span class="badge badge-warn">Good Match</span>
            <span style="color:var(--text2);font-size:18px">&rsaquo;</span>
          </div>
        </div>
        <div class="race-rec-name">Samuel Reyes</div>
        <div class="race-rec-reason">Environmental scientist with coastal resilience expertise. Plans for veterans&rsquo; land program expansion align with your priorities.</div>
        <div class="race-cand-count">3 candidates</div>
        <div class="avatar-row">
          <div class="avatar-circle rec" style="background:#4A90D9">S</div>
          <div class="avatar-circle" style="background:#D95B43">F</div>
          <div class="avatar-circle" style="background:#5B8C5A">N</div>
        </div>
      </div>

      <!-- D4: State Senate -->
      <div class="card race-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <div class="race-office">State Senate &mdash; District 14</div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span class="badge badge-ok">Strong Match</span>
            <span style="color:var(--text2);font-size:18px">&rsaquo;</span>
          </div>
        </div>
        <div class="race-rec-name">Aisha Patel</div>
        <div class="race-rec-reason">Healthcare policy expert and former hospital administrator. Championing Medicaid expansion and maternal health funding.</div>
        <div class="race-cand-count">2 candidates</div>
        <div class="avatar-row">
          <div class="avatar-circle rec" style="background:#4A90D9">A</div>
          <div class="avatar-circle" style="background:#D95B43">G</div>
        </div>
      </div>

      <div class="section-head">Local Races</div>

      <!-- D5: County Judge -->
      <div class="card race-card">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
          <div class="race-office">County Judge</div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <span class="badge badge-warn">Good Match</span>
            <span style="color:var(--text2);font-size:18px">&rsaquo;</span>
          </div>
        </div>
        <div class="race-rec-name">Diana Okonkwo</div>
        <div class="race-rec-reason">Public health official focused on county hospital funding and flood resilience. Good alignment on healthcare but less detail on budget specifics.</div>
        <div class="race-cand-count">3 candidates</div>
        <div class="avatar-row">
          <div class="avatar-circle rec" style="background:#4A90D9">D</div>
          <div class="avatar-circle" style="background:#D95B43">L</div>
          <div class="avatar-circle" style="background:#5B8C5A">E</div>
        </div>
      </div>

      <!-- D Proposition -->
      <div class="section-head">Propositions</div>

      <div class="card">
        <div class="prop-header">
          <div class="prop-title">Prop 3: Universal Pre-K Funding</div>
          <span class="badge badge-ok">Lean Yes</span>
        </div>
        <div class="prop-desc">Shall the state allocate $2 billion annually to provide universal pre-kindergarten programs for all four-year-olds in Texas?</div>
        <div style="margin-top:10px">
          <div class="prop-outcome pass"><span style="flex-shrink:0">&#x2705;</span><div><b>If it passes:</b> Free pre-K available to all Texas four-year-olds regardless of income, with certified teacher requirements and small class sizes.</div></div>
          <div class="prop-outcome fail"><span style="flex-shrink:0">&#x274C;</span><div><b>If it fails:</b> Pre-K remains income-qualified, with current waitlists in urban areas. Existing Head Start and private options continue unchanged.</div></div>
        </div>
        <div class="prop-reasoning"><span style="flex-shrink:0">&#x1F9E0;</span><div>Your emphasis on public education investment and early childhood development makes this a strong alignment. Research shows long-term economic returns from pre-K, though funding mechanism involves sales tax reallocation.</div></div>
      </div>

    </div><!-- /democrat -->

    <!-- ==================== Shared footer content ==================== -->

    <!-- Share CTA -->
    <div class="share-cta">
      <div style="font-size:32px;margin-bottom:8px">&#x1F4E3;</div>
      <div class="share-cta-title" data-t="Build Your Own Guide">Build Your Own Guide</div>
      <div class="share-cta-body" data-t="This sample shows what a personalized ballot looks like. Answer a few questions about your values and priorities, and Texas Votes will match you with candidates in your actual races.">This sample shows what a personalized ballot looks like. Answer a few questions about your values and priorities, and Texas Votes will match you with candidates in your actual races.</div>
      <a class="btn btn-primary btn-inline" href="/app?start=1" data-t="Get Your Personalized Ballot">Get Your Personalized Ballot</a>
    </div>

    <!-- Footer -->
    <div class="page-footer">
      <a href="/" data-t="Texas Votes">Texas Votes</a> &middot;
      <a href="/how-it-works" data-t="How It Works">How It Works</a> &middot;
      <a href="/privacy" data-t="Privacy">Privacy</a>
      <br>
      <span style="color:var(--red)">&starf;</span> <span data-t="Built in Texas">Built in Texas</span> &middot;
      <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a>
    </div>

  </div><!-- /ballot-container -->

  <script>
  function setParty(p){
    var body=document.body;
    var btnR=document.getElementById('btn-rep');
    var btnD=document.getElementById('btn-dem');
    var label=document.getElementById('party-label');
    if(p==='democrat'){
      body.classList.add('party-dem');
      btnR.classList.remove('on');
      btnD.classList.add('on');
      label.textContent='Democratic';
    }else{
      body.classList.remove('party-dem');
      btnR.classList.add('on');
      btnD.classList.remove('on');
      label.textContent='Republican';
    }
    window.scrollTo({top:0,behavior:'smooth'});
  }
  </script>
  ${pageI18n({
    'SAMPLE BALLOT \\u2014 Fictional candidates and recommendations for demonstration': 'BOLETA DE EJEMPLO \\u2014 Candidatos ficticios y recomendaciones para demostraci\u00F3n',
    'Republican': 'Republicano',
    'Democrat': 'Dem\u00F3crata',
    'Build Your Own Guide': 'Crea Tu Propia Gu\u00EDa',
    'This sample shows what a personalized ballot looks like. Answer a few questions about your values and priorities, and Texas Votes will match you with candidates in your actual races.': 'Este ejemplo muestra c\u00F3mo se ve una boleta personalizada. Responde algunas preguntas sobre tus valores y prioridades, y Texas Votes te emparejar\u00E1 con candidatos en tus carreras reales.',
    'Get Your Personalized Ballot': 'Obt\u00E9n Tu Boleta Personalizada',
  })}
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

function handleHowItWorks() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  ${pageHead({
    title: "How It Works — Texas Votes",
    description: "A plain-language explanation of how Texas Votes uses AI to help you find candidates that match your values.",
    url: "https://txvotes.app/how-it-works",
  })}
  <style>
    .step{display:flex;gap:1rem;align-items:flex-start;margin-bottom:1.25rem}
    .step-num{flex-shrink:0;width:2.25rem;height:2.25rem;background:var(--blue);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem}
    .step-text{flex:1}
    .step-text strong{display:block;margin-bottom:0.15rem}
    .promise-list{list-style:none;padding:0}
    .promise-list li{padding:0.5rem 0;border-bottom:1px solid var(--border);font-size:1rem}
    .promise-list li:last-child{border-bottom:none}
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back-top">&larr; Texas Votes</a>
    <h1 data-t="How It Works">How It Works</h1>
    <p class="subtitle" data-t="Texas Votes is a free tool that helps you figure out which candidates on your ballot match your values. Here's how it works, in plain language.">Texas Votes is a free tool that helps you figure out which candidates on your ballot match your values. Here's how it works, in plain language.</p>

    <div class="cta-banner"><a class="cta-btn" href="/app?start=1" data-t="Build My Voting Guide">Build My Voting Guide</a><p class="cta-sub" data-t="5-minute personalized ballot">5-minute personalized ballot</p></div>

    <h2 data-t="What Does This App Do?">What Does This App Do?</h2>
    <p data-t="Texas Votes asks you a few questions about what matters to you — things like education, public safety, the economy, or healthcare. Then it looks at the candidates running in your area and suggests which ones are the best fit based on your answers.">Texas Votes asks you a few questions about what matters to you — things like education, public safety, the economy, or healthcare. Then it looks at the candidates running in your area and suggests which ones are the best fit based on your answers.</p>
    <p data-t="Think of it like a matchmaker, but for elections. You tell it what you care about, and it connects you with candidates who share those priorities.">Think of it like a matchmaker, but for elections. You tell it what you care about, and it connects you with candidates who share those priorities.</p>

    <h2 data-t="How Does the AI Part Work?">How Does the AI Part Work?</h2>
    <p data-t="The app uses artificial intelligence (the same kind of technology behind tools like ChatGPT) to read through candidate information and compare it to your answers. Here's the process, step by step:">The app uses artificial intelligence (the same kind of technology behind tools like ChatGPT) to read through candidate information and compare it to your answers. Here's the process, step by step:</p>

    <div class="step">
      <div class="step-num">1</div>
      <div class="step-text"><strong data-t="You answer a short interview">You answer a short interview</strong><span data-t="It takes about 5 minutes. You pick the issues you care about, how you lean politically, and what qualities matter to you in a candidate.">It takes about 5 minutes. You pick the issues you care about, how you lean politically, and what qualities matter to you in a candidate.</span></div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-text"><strong data-t="The AI reads candidate profiles">The AI reads candidate profiles</strong><span data-t="It looks at each candidate's positions, endorsements, track record, and public statements — information gathered from official government sources, news outlets, and nonpartisan references.">It looks at each candidate's positions, endorsements, track record, and public statements — information gathered from official government sources, news outlets, and nonpartisan references.</span></div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-text"><strong data-t="It finds your best matches">It finds your best matches</strong><span data-t="The AI compares what you said you care about with what each candidate stands for, then ranks them as a Strong Match, Good Match, or Best Available.">The AI compares what you said you care about with what each candidate stands for, then ranks them as a Strong Match, Good Match, or Best Available.</span></div>
    </div>
    <div class="step">
      <div class="step-num">4</div>
      <div class="step-text"><strong data-t="You get a personalized ballot">You get a personalized ballot</strong><span data-t="You see your matches with short explanations of why each candidate was recommended. You can print it as a cheat sheet to bring to the polls.">You see your matches with short explanations of why each candidate was recommended. You can print it as a cheat sheet to bring to the polls.</span></div>
    </div>

    <h2 data-t="Where Does the Candidate Information Come From?">Where Does the Candidate Information Come From?</h2>
    <p data-t="All candidate data is gathered from public sources, prioritized in this order:">All candidate data is gathered from public sources, prioritized in this order:</p>
    <ul>
      <li data-t="Official government records — filings with the Texas Secretary of State, county election offices">Official government records — filings with the Texas Secretary of State, county election offices</li>
      <li data-t="Nonpartisan references — Ballotpedia, VoteSmart, and similar databases">Nonpartisan references — Ballotpedia, VoteSmart, and similar databases</li>
      <li data-t="News coverage — reporting from established news organizations">News coverage — reporting from established news organizations</li>
      <li data-t="Campaign materials — candidates' own websites and public statements">Campaign materials — candidates' own websites and public statements</li>
    </ul>
    <p data-t="The data is automatically re-checked every day to stay current. When sources disagree, official government records take priority.">The data is automatically re-checked every day to stay current. When sources disagree, official government records take priority.</p>

    <h2 data-t="What This App Does NOT Do">What This App Does NOT Do</h2>
    <ul class="promise-list">
      <li data-t="It does not tell you who to vote for. It shows you matches and explains why, but the final choice is always yours.">It does not tell you who to vote for. It shows you matches and explains why, but the final choice is always yours.</li>
      <li data-t="It does not store your personal information. Your answers stay on your phone or computer. They are never sent to our servers or saved anywhere we can see them.">It does not store your personal information. Your answers stay on your phone or computer. They are never sent to our servers or saved anywhere we can see them.</li>
      <li data-t="It does not track you. No cookies, no ad tracking, no personal data collection. We count anonymous page views to improve the app — that's it.">It does not track you. No cookies, no ad tracking, no personal data collection. We count anonymous page views to improve the app — that's it.</li>
      <li data-t="It does not favor any political party. The AI is given strict instructions to be neutral. Candidates are shuffled randomly so no one gets an unfair advantage from being listed first.">It does not favor any political party. The AI is given strict instructions to be neutral. Candidates are shuffled randomly so no one gets an unfair advantage from being listed first. <a href="/nonpartisan">Learn more about our nonpartisan design.</a></li>
      <li data-t="It does not replace your own research. This is a starting point to help you explore candidates. We always encourage you to verify information on your own.">It does not replace your own research. This is a starting point to help you explore candidates. We always encourage you to verify information on your own.</li>
    </ul>

    <h2 data-t="How Can I Trust It?">How Can I Trust It?</h2>
    <p data-t="We've built this app to be as transparent as possible:">We've built this app to be as transparent as possible:</p>
    <ul>
      <li data-t="The entire source code is public — anyone can inspect it">The entire source code is public — anyone can inspect it</li>
      <li data-t="Four independent AI systems reviewed our code and methodology for bias">Four independent AI systems reviewed our code and methodology for bias</li>
      <li data-t="Every recommendation tells you why a candidate was matched to you">Every recommendation tells you <em>why</em> a candidate was matched to you</li>
      <li data-t="Every candidate profile includes links to original sources so you can check for yourself">Every candidate profile includes links to original sources so you can check for yourself</li>
      <li data-t="A live dashboard shows how complete and up-to-date our data is">A live dashboard shows how complete and up-to-date our data is</li>
      <li data-t="You can flag any candidate information that looks biased or inaccurate using the Flag this info button — reports go directly to our team for review">You can flag any candidate information that looks biased or inaccurate using the "Flag this info" button — reports go directly to our team for review</li>
      <li data-t="Automated balance checks ensure every candidate gets equal analytical treatment — no one gets more praise or criticism than their opponents">Automated balance checks ensure every candidate gets equal analytical treatment — no one gets more praise or criticism than their opponents</li>
    </ul>
    <p data-t="If you want the technical details, the pages below go deeper:">If you want the technical details, the pages below go deeper:</p>

    <h2 data-t="Related">Related</h2>
    <ul class="related-links">
      <li><a href="/nonpartisan" data-t="Nonpartisan by Design">Nonpartisan by Design</a> — <span data-t="How we keep the app fair for all voters">How we keep the app fair for all voters</span></li>
      <li><a href="/audit" data-t="AI Bias Audit">AI Bias Audit</a> — <span data-t="Independent review of our AI by four different systems">Independent review of our AI by four different systems</span></li>
      <li><a href="/data-quality" data-t="Data Quality Dashboard">Data Quality Dashboard</a> — <span data-t="Live metrics on how complete our data is">Live metrics on how complete our data is</span></li>
      <li><a href="/open-source" data-t="Open Source">Open Source</a> — <span data-t="Source code, architecture, and independent code reviews">Source code, architecture, and independent code reviews</span></li>
      <li><a href="/privacy" data-t="Privacy Policy">Privacy Policy</a> — <span data-t="What data we collect (almost none) and why">What data we collect (almost none) and why</span></li>
      <li><a href="/candidates" data-t="All Candidates">All Candidates</a> — <span data-t="Browse every candidate with detailed profiles">Browse every candidate with detailed profiles</span></li>
    </ul>

    <div class="page-footer"><a href="/" data-t="Texas Votes">Texas Votes</a> &middot; <a href="/how-it-works" data-t="How It Works">How It Works</a> &middot; <a href="/privacy" data-t="Privacy">Privacy</a><br><span style="color:var(--red)">&starf;</span> <span data-t="Built in Texas">Built in Texas</span> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></div>
  </div>
  ${pageI18n({
    'Texas Votes is a free tool that helps you figure out which candidates on your ballot match your values. Here\'s how it works, in plain language.': 'Texas Votes es una herramienta gratuita que te ayuda a descubrir qu\u00E9 candidatos en tu boleta coinciden con tus valores. As\u00ED funciona, en palabras sencillas.',
    'What Does This App Do?': '\u00BFQu\u00E9 Hace Esta App?',
    'Texas Votes asks you a few questions about what matters to you \\u2014 things like education, public safety, the economy, or healthcare. Then it looks at the candidates running in your area and suggests which ones are the best fit based on your answers.': 'Texas Votes te hace algunas preguntas sobre lo que te importa \\u2014 como educaci\u00F3n, seguridad p\u00FAblica, la econom\u00EDa o salud. Luego revisa los candidatos en tu \u00E1rea y sugiere cu\u00E1les son los m\u00E1s compatibles seg\u00FAn tus respuestas.',
    'Think of it like a matchmaker, but for elections. You tell it what you care about, and it connects you with candidates who share those priorities.': 'Pi\u00E9nsalo como un servicio de compatibilidad, pero para elecciones. T\u00FA dices lo que te importa y te conecta con candidatos que comparten esas prioridades.',
    'How Does the AI Part Work?': '\u00BFC\u00F3mo Funciona la Parte de IA?',
    'The app uses artificial intelligence (the same kind of technology behind tools like ChatGPT) to read through candidate information and compare it to your answers. Here\'s the process, step by step:': 'La app usa inteligencia artificial (la misma tecnolog\u00EDa detr\u00E1s de herramientas como ChatGPT) para leer la informaci\u00F3n de candidatos y compararla con tus respuestas. As\u00ED funciona el proceso, paso a paso:',
    'You answer a short interview': 'Respondes una entrevista corta',
    'It takes about 5 minutes. You pick the issues you care about, how you lean politically, and what qualities matter to you in a candidate.': 'Toma unos 5 minutos. Eliges los temas que te importan, tu inclinaci\u00F3n pol\u00EDtica y qu\u00E9 cualidades valoras en un candidato.',
    'The AI reads candidate profiles': 'La IA lee los perfiles de candidatos',
    'It looks at each candidate\'s positions, endorsements, track record, and public statements \\u2014 information gathered from official government sources, news outlets, and nonpartisan references.': 'Revisa las posiciones, respaldos, historial y declaraciones p\u00FAblicas de cada candidato \\u2014 informaci\u00F3n recopilada de fuentes gubernamentales oficiales, medios de comunicaci\u00F3n y referencias apartidistas.',
    'It finds your best matches': 'Encuentra tus mejores coincidencias',
    'The AI compares what you said you care about with what each candidate stands for, then ranks them as a Strong Match, Good Match, or Best Available.': 'La IA compara lo que dijiste que te importa con lo que representa cada candidato, y los clasifica como Coincidencia Fuerte, Buena Coincidencia o Mejor Disponible.',
    'You get a personalized ballot': 'Recibes una boleta personalizada',
    'You see your matches with short explanations of why each candidate was recommended. You can print it as a cheat sheet to bring to the polls.': 'Ves tus coincidencias con explicaciones cortas de por qu\u00E9 se recomend\u00F3 cada candidato. Puedes imprimirla como gu\u00EDa r\u00E1pida para llevar a las urnas.',
    'Where Does the Candidate Information Come From?': '\u00BFDe D\u00F3nde Viene la Informaci\u00F3n de los Candidatos?',
    'All candidate data is gathered from public sources, prioritized in this order:': 'Todos los datos de candidatos se recopilan de fuentes p\u00FAblicas, priorizados en este orden:',
    'Official government records \\u2014 filings with the Texas Secretary of State, county election offices': 'Registros gubernamentales oficiales \\u2014 archivos del Secretario de Estado de Texas, oficinas electorales del condado',
    'Nonpartisan references \\u2014 Ballotpedia, VoteSmart, and similar databases': 'Referencias apartidistas \\u2014 Ballotpedia, VoteSmart y bases de datos similares',
    'News coverage \\u2014 reporting from established news organizations': 'Cobertura de noticias \\u2014 reportajes de organizaciones de noticias establecidas',
    'Campaign materials \\u2014 candidates\' own websites and public statements': 'Materiales de campa\u00F1a \\u2014 sitios web y declaraciones p\u00FAblicas de los candidatos',
    'The data is automatically re-checked every day to stay current. When sources disagree, official government records take priority.': 'Los datos se verifican autom\u00E1ticamente todos los d\u00EDas para mantenerse actualizados. Cuando las fuentes no coinciden, los registros gubernamentales oficiales tienen prioridad.',
    'What This App Does NOT Do': 'Lo Que Esta App NO Hace',
    'It does not tell you who to vote for. It shows you matches and explains why, but the final choice is always yours.': 'No te dice por qui\u00E9n votar. Te muestra coincidencias y explica por qu\u00E9, pero la decisi\u00F3n final siempre es tuya.',
    'It does not store your personal information. Your answers stay on your phone or computer. They are never sent to our servers or saved anywhere we can see them.': 'No almacena tu informaci\u00F3n personal. Tus respuestas permanecen en tu tel\u00E9fono o computadora. Nunca se env\u00EDan a nuestros servidores ni se guardan donde podamos verlas.',
    'It does not track you. No cookies, no ad tracking, no personal data collection. We count anonymous page views to improve the app \\u2014 that\'s it.': 'No te rastrea. Sin cookies, sin seguimiento publicitario, sin recolecci\u00F3n de datos personales. Contamos visitas an\u00F3nimas para mejorar la app \\u2014 eso es todo.',
    'It does not favor any political party. The AI is given strict instructions to be neutral. Candidates are shuffled randomly so no one gets an unfair advantage from being listed first.': 'No favorece a ning\u00FAn partido pol\u00EDtico. La IA tiene instrucciones estrictas de ser neutral. Los candidatos se mezclan al azar para que nadie tenga ventaja por aparecer primero.',
    'It does not replace your own research. This is a starting point to help you explore candidates. We always encourage you to verify information on your own.': 'No reemplaza tu propia investigaci\u00F3n. Es un punto de partida para explorar candidatos. Siempre te animamos a verificar la informaci\u00F3n por tu cuenta.',
    'How Can I Trust It?': '\u00BFC\u00F3mo Puedo Confiar en Esto?',
    'We\'ve built this app to be as transparent as possible:': 'Hemos construido esta app para ser lo m\u00E1s transparente posible:',
    'The entire source code is public \\u2014 anyone can inspect it': 'Todo el c\u00F3digo fuente es p\u00FAblico \\u2014 cualquiera puede inspeccionarlo',
    'Four independent AI systems reviewed our code and methodology for bias': 'Cuatro sistemas de IA independientes revisaron nuestro c\u00F3digo y metodolog\u00EDa en busca de sesgo',
    'Every recommendation tells you why a candidate was matched to you': 'Cada recomendaci\u00F3n te dice por qu\u00E9 un candidato fue emparejado contigo',
    'Every candidate profile includes links to original sources so you can check for yourself': 'Cada perfil de candidato incluye enlaces a fuentes originales para que puedas verificar',
    'A live dashboard shows how complete and up-to-date our data is': 'Un panel en vivo muestra qu\u00E9 tan completos y actualizados est\u00E1n nuestros datos',
    'You can flag any candidate information that looks biased or inaccurate using the Flag this info button \\u2014 reports go directly to our team for review': 'Puedes reportar cualquier informaci\u00F3n de candidatos que parezca sesgada o inexacta usando el bot\u00F3n "Reportar esta info" \\u2014 los reportes van directamente a nuestro equipo para revisi\u00F3n',
    'Automated balance checks ensure every candidate gets equal analytical treatment \\u2014 no one gets more praise or criticism than their opponents': 'Verificaciones autom\u00E1ticas de equilibrio aseguran que cada candidato reciba el mismo tratamiento anal\u00EDtico \\u2014 nadie recibe m\u00E1s elogios o cr\u00EDticas que sus oponentes',
    'If you want the technical details, the pages below go deeper:': 'Si quieres los detalles t\u00E9cnicos, las p\u00E1ginas a continuaci\u00F3n profundizan m\u00E1s:',
    'What data we collect (almost none) and why': 'Qu\u00E9 datos recopilamos (casi ninguno) y por qu\u00E9',
  })}
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
  ${pageHead({
    title: "Nonpartisan by Design — Texas Votes",
    description: "How Texas Votes ensures fairness: randomized order, no party labels, neutral AI, privacy-first design, and more.",
    url: "https://txvotes.app/nonpartisan",
  })}
</head>
<body>
  <div class="container">
    <a href="/" class="back-top">&larr; Texas Votes</a>
    <h1 data-t="Nonpartisan by Design">Nonpartisan by Design</h1>
    <p class="subtitle" data-t="Texas Votes matches candidates to your values, not your party. Every design decision is made to keep the experience fair for all voters.">Texas Votes matches candidates to your values, not your party. Every design decision is made to keep the experience fair for all voters — regardless of where you fall on the political spectrum.</p>

    <div class="cta-banner"><a class="cta-btn" href="/app?start=1" data-t="Build My Voting Guide">Build My Voting Guide</a><p class="cta-sub" data-t="5-minute personalized ballot">5-minute personalized ballot</p></div>

    <h2 data-t="Randomized Candidate Order">Randomized Candidate Order</h2>
    <p data-t="Candidates and answer options are shuffled every time so position on screen never creates bias.">Candidates and answer options are shuffled every time so position on screen never creates bias.</p>

    <h2 data-t="Both Ballots Generated Equally">Both Ballots Generated Equally</h2>
    <p data-t="Republican and Democratic ballots are generated simultaneously with identical AI prompts and formatting.">Republican and Democratic ballots are generated simultaneously with identical AI prompts and formatting. For undecided voters, even the loading order is randomized.</p>

    <h2 data-t="No Party Labels on Candidates">No Party Labels on Candidates</h2>
    <p data-t="Party affiliation is intentionally hidden from candidate cards so you evaluate candidates on their positions, not partisan identity.">Party affiliation is intentionally hidden from candidate cards so you evaluate candidates on their positions, not partisan identity.</p>

    <h2 data-t="Values-Based Matching">Values-Based Matching</h2>
    <p data-t="Recommendations are based on your stated issues, priorities, and candidate qualities — not party registration.">Recommendations are based on your stated issues, priorities, and candidate qualities — not party registration.</p>

    <h2 data-t="Neutral Interview Questions">Neutral Interview Questions</h2>
    <p data-t="Every question is framed neutrally. Answer options are shuffled.">Every question is framed neutrally. Answer options are shuffled. The spectrum picker says "No wrong answers." All deep-dive policy labels use strictly descriptive, symmetric language — reviewed and normalized through independent AI audits to eliminate rhetorical heat from both sides of every issue.</p>

    <h2 data-t="Six-Point Political Spectrum">Six-Point Political Spectrum</h2>
    <p data-t="Goes beyond left/right: Progressive, Liberal, Moderate, Conservative, Libertarian, and Independent.">Goes beyond left/right: Progressive, Liberal, Moderate, Conservative, Libertarian, and Independent. Moderate and Independent voters are never auto-assigned a party.</p>

    <h2 data-t="Balanced Proposition Coverage">Balanced Proposition Coverage</h2>
    <p data-t="Every proposition shows supporters AND opponents, fiscal impact, outcomes if it passes or fails.">Every proposition shows supporters AND opponents, fiscal impact, outcomes if it passes or fails, and includes a "Your Call" option for genuinely contested issues.</p>

    <h2 data-t="AI Transparency and Guardrails">AI Transparency &amp; Guardrails</h2>
    <p data-t="Every AI prompt includes an explicit NONPARTISAN instruction block.">Every AI prompt includes an explicit NONPARTISAN instruction block requiring: factual, issue-based reasoning only; no partisan framing or loaded terms; equal analytical rigor for all candidates regardless of position; and recommendations connected to the voter's specific stated values — never to party-line assumptions. Disclaimers appear on every recommendation screen. Confidence levels (Strong Match, Good Match, Best Available) prevent false certainty.</p>

    <h2 data-t="Verified Candidate Data">Verified Candidate Data</h2>
    <p data-t="All candidates are cross-referenced against official filings.">All candidates are cross-referenced against official filings from the Texas Secretary of State, county clerks, and Ballotpedia. Candidate data includes positions, endorsements, strengths, and concerns — presented with equal depth for every candidate in a race.</p>
    <p data-t="Endorsements include context labels identifying the type of each endorsing organization.">Endorsements include context labels identifying the type of each endorsing organization (e.g., labor union, editorial board, advocacy group, elected official). This helps voters understand who is behind each endorsement without having to research each organization separately.</p>
    <p data-t="A daily automated updater re-verifies candidate data using AI-powered web research.">A daily automated updater re-verifies candidate data using AI-powered web research. Each ballot page and candidate profile displays a "Data last verified" timestamp so you can see exactly when the information was last checked.</p>

    <h2 data-t="Source Citations">Source Citations</h2>
    <p data-t="Every candidate profile includes per-candidate source URLs so voters can verify claims independently.">Every candidate profile includes per-candidate source URLs so voters can verify claims independently — sources are attributed to individual candidates, not just per-race, ensuring every claim can be traced to its origin. Sources are visible on candidate profile pages and in the PWA ballot view, linking directly to official filings, news articles, and campaign materials. All source citations include the URL, title, and the date the source was last accessed.</p>

    <h2 data-t="Match Transparency">Match Transparency</h2>
    <p data-t="Each candidate recommendation includes Why this match factors.">Each candidate recommendation includes "Why this match?" factors — short phrases citing the specific voter priorities that drove the recommendation. Instead of a generic "Good Match" label, voters can see exactly which of their stated values and issue priorities the AI connected to each candidate. This makes the recommendation logic auditable at the individual level.</p>

    <h2 data-t="Source Priority Hierarchy">Source Priority Hierarchy</h2>
    <p data-t="All AI research prompts include an explicit 7-tier source ranking policy.">All AI research prompts include an explicit 7-tier source ranking policy. When the AI uses web search to gather candidate data, it is instructed to prefer official government filings (Texas Secretary of State, county election offices) over campaign websites, nonpartisan references (Ballotpedia, VoteSmart) over news outlets, and to avoid blogs, social media, and opinion sites. When sources conflict, official filings override campaign claims, and campaign claims override news reporting. This hierarchy is documented in our <a href="/api/audit/export">methodology export</a>.</p>

    <h2 data-t="Limited Data Transparency">Limited Data Transparency</h2>
    <p data-t="When a candidate has sparse public information, the app displays a Limited public info label.">When a candidate has sparse public information — fewer than two of key positions, endorsements, strengths, or concerns populated — the app displays a "Limited public info" label. This prevents information asymmetry from looking like favoritism: if one candidate has a detailed profile and another doesn't, the label makes it clear the gap is a data limitation, not an editorial choice.</p>

    <h2 data-t="County Coverage Transparency">County Coverage Transparency</h2>
    <p data-t="Texas has 254 counties, and local race data is added county by county.">Texas has 254 counties, and local race data is added county by county. When a voter's county doesn't yet have local race data, the app clearly labels this: "Local races for [County] County are not yet available. Your ballot shows statewide and district races only." This appears on both the ballot page and the printable cheat sheet, so voters always know the scope of their guide — rather than silently omitting races and leaving voters unaware.</p>

    <h2 data-t="Nonpartisan Translations">Nonpartisan Translations</h2>
    <p data-t="All Spanish translations are reviewed for partisan bias.">All Spanish translations are reviewed for partisan bias. Proposition titles and descriptions use identical grammatical structures for both parties. Data terms (candidate names, positions) stay in English for accuracy; only the display layer is translated.</p>

    <h2 data-t="Encouraging Independent Research">Encouraging Independent Research</h2>
    <p data-t="Every screen says Do your own research before voting. The app is a starting point, not the final word.">Every screen says "Do your own research before voting." The app is a starting point, not the final word.</p>

    <h2 data-t="Privacy-First Design">Privacy-First Design</h2>
    <p data-t="All data stays on your device. No tracking, no ads. Your political views are never stored on our servers.">All data stays on your device. We collect only anonymous page-view counts (via Cloudflare Web Analytics — no cookies, no personal data) and anonymous usage event counts (like "guide generated") to improve the app. No tracking, no ads. Your political views are never stored on our servers.</p>

    <h2 data-t="Open Source Approach">Open Source Approach</h2>
    <p data-t="The full prompt sent to the AI and every design decision is documented. Nothing is hidden.">The full prompt sent to the AI and every design decision is documented. Nothing is hidden. <a href="/open-source">View the source code, architecture details, and independent AI code reviews.</a></p>

    <h2 data-t="Independent AI Audit">Independent AI Audit</h2>
    <p data-t="We've submitted our full AI prompts, data pipeline, and methodology to four independent AI systems for bias review.">We've submitted our full AI prompts, data pipeline, and methodology to four independent AI systems (ChatGPT, Gemini, Grok, and Claude) for bias review. Audit findings directly informed improvements, including normalizing all deep-dive answer labels to use neutral, descriptive language with symmetric phrasing across opposing positions. <a href="/audit">Read the full audit results and methodology export.</a></p>

    <h2 data-t="Automated Balance Checks">Automated Balance Checks</h2>
    <p data-t="An automated balance check system scores the symmetry of pros and cons across all candidates in every race.">An automated balance check system scores the symmetry of pros and cons across all candidates in every race. If one candidate has significantly more strengths listed than their opponent, or if the detail level is uneven, the system flags it for review. Balance scores are published on the <a href="/data-quality">Data Quality Dashboard</a> and available as a <a href="/api/balance-check">public API</a>. This ensures no candidate receives disproportionate praise or criticism.</p>

    <h2 data-t="Flag This Info">Flag This Info</h2>
    <p data-t="Every candidate card in the app includes a Flag this info button.">Every candidate card in the app includes a "Flag this info" button. If you spot something that looks biased, inaccurate, or outdated, you can report it directly. Reports are sent to <a href="mailto:flagged@txvotes.app">flagged@txvotes.app</a> and reviewed by our team. This voter-driven accountability mechanism ensures the data stays honest even when automated checks miss something.</p>

    <h2 data-t="Data Transparency">Data Transparency</h2>
    <p data-t="Our Data Quality Dashboard shows live metrics on ballot coverage, candidate completeness, and county data availability.">Our <a href="/data-quality">Data Quality Dashboard</a> shows live metrics on ballot coverage, candidate completeness, and county data availability. See exactly how fresh and complete our election data is at any time.</p>

    <h2 data-t="Related">Related</h2>
    <ul class="related-links">
      <li><a href="/how-it-works" data-t="How It Works">How It Works</a> — <span data-t="Plain-language explanation for non-technical users">Plain-language explanation for non-technical users</span></li>
      <li><a href="/audit" data-t="AI Bias Audit">AI Bias Audit</a> — <span data-t="Independent review by four AI systems">Independent review by four AI systems</span></li>
      <li><a href="/data-quality" data-t="Data Quality Dashboard">Data Quality Dashboard</a> — <span data-t="Live metrics on ballot coverage and candidate completeness">Live metrics on ballot coverage and candidate completeness</span></li>
      <li><a href="/open-source" data-t="Open Source">Open Source</a> — <span data-t="Source code, architecture, and independent code reviews">Source code, architecture, and independent code reviews</span></li>
      <li><a href="/candidates" data-t="All Candidates">All Candidates</a> — <span data-t="Browse every candidate with detailed profiles">Browse every candidate with detailed profiles</span></li>
    </ul>

    <div class="page-footer"><a href="/" data-t="Texas Votes">Texas Votes</a> &middot; <a href="/how-it-works" data-t="How It Works">How It Works</a> &middot; <a href="/privacy" data-t="Privacy">Privacy</a><br><span style="color:var(--red)">&starf;</span> <span data-t="Built in Texas">Built in Texas</span> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></div>
  </div>
  ${pageI18n({
    'Texas Votes matches candidates to your values, not your party. Every design decision is made to keep the experience fair for all voters.': 'Texas Votes empareja candidatos con tus valores, no con tu partido. Cada decisi\u00F3n de dise\u00F1o se toma para mantener la experiencia justa para todos los votantes.',
    'Randomized Candidate Order': 'Orden Aleatorio de Candidatos',
    'Candidates and answer options are shuffled every time so position on screen never creates bias.': 'Los candidatos y opciones de respuesta se mezclan cada vez para que la posici\u00F3n en pantalla nunca cree sesgo.',
    'Both Ballots Generated Equally': 'Ambas Boletas Generadas por Igual',
    'Republican and Democratic ballots are generated simultaneously with identical AI prompts and formatting.': 'Las boletas Republicana y Dem\u00F3crata se generan simult\u00E1neamente con prompts de IA y formato id\u00E9nticos.',
    'No Party Labels on Candidates': 'Sin Etiquetas de Partido en los Candidatos',
    'Party affiliation is intentionally hidden from candidate cards so you evaluate candidates on their positions, not partisan identity.': 'La afiliaci\u00F3n partidista se oculta intencionalmente de las tarjetas de candidatos para que eval\u00FAes a los candidatos por sus posiciones, no por identidad partidista.',
    'Values-Based Matching': 'Coincidencia Basada en Valores',
    'Recommendations are based on your stated issues, priorities, and candidate qualities \\u2014 not party registration.': 'Las recomendaciones se basan en tus temas, prioridades y cualidades de candidatos \\u2014 no en registro de partido.',
    'Neutral Interview Questions': 'Preguntas de Entrevista Neutrales',
    'Every question is framed neutrally. Answer options are shuffled.': 'Cada pregunta se formula de manera neutral. Las opciones de respuesta se mezclan.',
    'Six-Point Political Spectrum': 'Espectro Pol\u00EDtico de Seis Puntos',
    'Goes beyond left/right: Progressive, Liberal, Moderate, Conservative, Libertarian, and Independent.': 'Va m\u00E1s all\u00E1 de izquierda/derecha: Progresista, Liberal, Moderado, Conservador, Libertario e Independiente.',
    'Balanced Proposition Coverage': 'Cobertura Equilibrada de Proposiciones',
    'Every proposition shows supporters AND opponents, fiscal impact, outcomes if it passes or fails.': 'Cada proposici\u00F3n muestra partidarios Y opositores, impacto fiscal, resultados si se aprueba o no.',
    'AI Transparency and Guardrails': 'Transparencia y Salvaguardas de IA',
    'Every AI prompt includes an explicit NONPARTISAN instruction block.': 'Cada prompt de IA incluye un bloque expl\u00EDcito de instrucciones APARTIDISTAS.',
    'Verified Candidate Data': 'Datos de Candidatos Verificados',
    'All candidates are cross-referenced against official filings.': 'Todos los candidatos se verifican contra archivos oficiales.',
    'Endorsements include context labels identifying the type of each endorsing organization.': 'Los respaldos incluyen etiquetas de contexto que identifican el tipo de cada organizaci\u00F3n que respalda.',
    'A daily automated updater re-verifies candidate data using AI-powered web research.': 'Un actualizador autom\u00E1tico diario re-verifica los datos de candidatos usando investigaci\u00F3n web impulsada por IA.',
    'Source Citations': 'Citas de Fuentes',
    'Every candidate profile includes per-candidate source URLs so voters can verify claims independently.': 'Cada perfil de candidato incluye URLs de fuentes por candidato para que los votantes puedan verificar afirmaciones independientemente.',
    'Match Transparency': 'Transparencia de Coincidencias',
    'Each candidate recommendation includes Why this match factors.': 'Cada recomendaci\u00F3n de candidato incluye factores de "Por qu\u00E9 esta coincidencia".',
    'Source Priority Hierarchy': 'Jerarqu\u00EDa de Prioridad de Fuentes',
    'All AI research prompts include an explicit 7-tier source ranking policy.': 'Todos los prompts de investigaci\u00F3n de IA incluyen una pol\u00EDtica expl\u00EDcita de clasificaci\u00F3n de fuentes de 7 niveles.',
    'Limited Data Transparency': 'Transparencia de Datos Limitados',
    'When a candidate has sparse public information, the app displays a Limited public info label.': 'Cuando un candidato tiene informaci\u00F3n p\u00FAblica escasa, la app muestra una etiqueta de "Informaci\u00F3n p\u00FAblica limitada".',
    'County Coverage Transparency': 'Transparencia de Cobertura por Condado',
    'Texas has 254 counties, and local race data is added county by county.': 'Texas tiene 254 condados, y los datos de carreras locales se agregan condado por condado.',
    'Nonpartisan Translations': 'Traducciones Apartidistas',
    'All Spanish translations are reviewed for partisan bias.': 'Todas las traducciones al espa\u00F1ol son revisadas para detectar sesgo partidista.',
    'Encouraging Independent Research': 'Fomentando la Investigaci\u00F3n Independiente',
    'Every screen says Do your own research before voting. The app is a starting point, not the final word.': 'Cada pantalla dice "Haz tu propia investigaci\u00F3n antes de votar." La app es un punto de partida, no la \u00FAltima palabra.',
    'Privacy-First Design': 'Dise\u00F1o con Privacidad Primero',
    'All data stays on your device. No tracking, no ads. Your political views are never stored on our servers.': 'Todos los datos permanecen en tu dispositivo. Sin seguimiento, sin anuncios. Tus opiniones pol\u00EDticas nunca se almacenan en nuestros servidores.',
    'Open Source Approach': 'Enfoque de C\u00F3digo Abierto',
    'The full prompt sent to the AI and every design decision is documented. Nothing is hidden.': 'El prompt completo enviado a la IA y cada decisi\u00F3n de dise\u00F1o est\u00E1 documentado. Nada est\u00E1 oculto.',
    'Independent AI Audit': 'Auditor\u00EDa Independiente de IA',
    'We\'ve submitted our full AI prompts, data pipeline, and methodology to four independent AI systems for bias review.': 'Hemos enviado nuestros prompts de IA completos, pipeline de datos y metodolog\u00EDa a cuatro sistemas de IA independientes para revisi\u00F3n de sesgo.',
    'Automated Balance Checks': 'Verificaciones Autom\u00E1ticas de Equilibrio',
    'An automated balance check system scores the symmetry of pros and cons across all candidates in every race.': 'Un sistema autom\u00E1tico de verificaci\u00F3n de equilibrio eval\u00FAa la simetr\u00EDa de pros y contras entre todos los candidatos en cada carrera.',
    'Flag This Info': 'Reportar Esta Info',
    'Every candidate card in the app includes a Flag this info button.': 'Cada tarjeta de candidato en la app incluye un bot\u00F3n "Reportar esta info".',
    'Data Transparency': 'Transparencia de Datos',
    'Our Data Quality Dashboard shows live metrics on ballot coverage, candidate completeness, and county data availability.': 'Nuestro Panel de Calidad de Datos muestra m\u00E9tricas en vivo sobre cobertura de boletas, datos completos de candidatos y disponibilidad de datos por condado.',
  })}
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

async function handleAuditPage(env) {
  // Load audit results from KV
  const [summaryRaw, chatgptRaw, geminiRaw, grokRaw, claudeRaw] = await Promise.all([
    env.ELECTION_DATA.get("audit:summary"),
    env.ELECTION_DATA.get("audit:result:chatgpt"),
    env.ELECTION_DATA.get("audit:result:gemini"),
    env.ELECTION_DATA.get("audit:result:grok"),
    env.ELECTION_DATA.get("audit:result:claude"),
  ]);

  const providerResults = {
    chatgpt: chatgptRaw ? JSON.parse(chatgptRaw) : null,
    gemini: geminiRaw ? JSON.parse(geminiRaw) : null,
    grok: grokRaw ? JSON.parse(grokRaw) : null,
    claude: claudeRaw ? JSON.parse(claudeRaw) : null,
  };

  const summary = summaryRaw ? JSON.parse(summaryRaw) : null;

  // Build audit cards HTML dynamically
  function renderAuditCard(result, fallbackName) {
    const displayName = result?.displayName || fallbackName;
    const model = result?.model ? ` (${result.model})` : "";

    if (!result) {
      return `<div class="audit-card">
      <h3>${displayName} Review</h3>
      <span class="audit-score audit-pending" data-t="Pending">Pending</span>
      <p style="margin-top:0.5rem;font-size:0.9rem;color:var(--text2)" data-t="Audit not yet run. Results will be published here when complete.">Audit not yet run. Results will be published here when complete.</p>
    </div>`;
    }

    if (result.status === "success" && result.scores) {
      const score = result.scores.overallScore;
      const dims = result.scores.dimensions || {};
      const dimLabels = {
        partisanBias: "Partisan Bias",
        factualAccuracy: "Factual Accuracy",
        fairnessOfFraming: "Fairness of Framing",
        balanceOfProsCons: "Balance of Pros/Cons",
        transparency: "Transparency",
      };
      let dimRows = "";
      for (const [key, label] of Object.entries(dimLabels)) {
        if (key in dims) {
          dimRows += `<tr><td style="padding:0.2rem 0.5rem 0.2rem 0;font-size:0.85rem" data-t="${label}">${label}</td><td style="padding:0.2rem 0;font-size:0.85rem;font-weight:600;text-align:right">${dims[key]} / 10</td></tr>`;
        }
      }
      const dimTable = dimRows ? `<table style="width:100%;margin:0.75rem 0;border-collapse:collapse">${dimRows}</table>` : "";
      const summary = result.scores.topStrength ? `<p style="margin-top:0.5rem;font-size:0.85rem;color:var(--text2)"><strong data-t="Strength:">Strength:</strong> ${escapeHtml(result.scores.topStrength)}</p>` : "";
      const weakness = result.scores.topWeakness ? `<p style="font-size:0.85rem;color:var(--text2)"><strong data-t="Weakness:">Weakness:</strong> ${escapeHtml(result.scores.topWeakness)}</p>` : "";
      const timestamp = result.timestamp ? `<p style="font-size:0.8rem;color:var(--text2);margin-top:0.5rem" data-t="Last run:">Last run: ${new Date(result.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}${model}</p>` : "";
      const fullReport = result.responseText ? `<details style="margin-top:0.75rem"><summary style="font-size:0.85rem" data-t="View Full Report">View Full Report</summary><div class="prompt-box" style="margin-top:0.5rem">${escapeHtml(result.responseText)}</div></details>` : "";

      return `<div class="audit-card">
      <h3>${displayName} Review</h3>
      <span class="audit-score">${score} / 10</span>
      ${dimTable}${summary}${weakness}${timestamp}${fullReport}
    </div>`;
    }

    if (result.status === "api_error") {
      return `<div class="audit-card">
      <h3>${displayName} Review</h3>
      <span class="audit-score audit-pending" data-t="Error">Error</span>
      <p style="margin-top:0.5rem;font-size:0.9rem;color:var(--text2)">API error: ${escapeHtml(result.error || "Unknown error")}${model}</p>
    </div>`;
    }

    if (result.status === "parse_failed") {
      const fullReport = result.responseText ? `<details style="margin-top:0.75rem"><summary style="font-size:0.85rem" data-t="View Raw Response">View Raw Response</summary><div class="prompt-box" style="margin-top:0.5rem">${escapeHtml(result.responseText)}</div></details>` : "";
      return `<div class="audit-card">
      <h3>${displayName} Review</h3>
      <span class="audit-score audit-pending" data-t="Score Parse Failed">Score Parse Failed</span>
      <p style="margin-top:0.5rem;font-size:0.9rem;color:var(--text2)" data-t="The AI returned a report but scores could not be extracted automatically.">The AI returned a report but scores could not be extracted automatically.${model}</p>
      ${fullReport}
    </div>`;
    }

    // Fallback for unknown status
    return `<div class="audit-card">
      <h3>${displayName} Review</h3>
      <span class="audit-score audit-pending" data-t="Pending">Pending</span>
      <p style="margin-top:0.5rem;font-size:0.9rem;color:var(--text2)">Status: ${escapeHtml(result.status || "unknown")}</p>
    </div>`;
  }

  const auditCardsHtml = renderAuditCard(providerResults.chatgpt, "ChatGPT (OpenAI)")
    + renderAuditCard(providerResults.gemini, "Gemini (Google)")
    + renderAuditCard(providerResults.grok, "Grok (xAI)")
    + renderAuditCard(providerResults.claude, "Claude (Anthropic)");

  const lastRunHtml = summary?.completedAt
    ? `<p class="note" style="margin-bottom:1rem">Last automated audit: ${new Date(summary.completedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}${summary.averageScore ? ` &middot; Average score: ${summary.averageScore} / 10` : ""}</p>`
    : "";

  // Audit prompt text — defined outside template literal and JSON.stringify'd
  // so that quotes, newlines, and special characters are properly escaped for
  // embedding in the browser-side <script> block.
  const auditPromptText = 'You are an independent auditor reviewing an AI-powered voting guide application called "Texas Votes" (txvotes.app). This app generates personalized voting recommendations for Texas elections using Claude (by Anthropic).\n\nYour job is to evaluate the app\'s methodology, prompts, and data practices for fairness, bias, and transparency. Be rigorous and honest \u2014 identify real problems, not just surface-level concerns. The app\'s credibility depends on genuine independent review.\n\nBelow is a complete export of the app\'s AI prompts, data pipelines, safeguards, and methodology. Review it thoroughly and produce a structured audit report.\n\n=== METHODOLOGY EXPORT ===\n\n';
  const auditPromptSuffix = '\n\n=== END EXPORT ===\n\nPlease evaluate the following five dimensions and provide:\n- A score from 1 (poor) to 10 (excellent) for each dimension\n- Specific findings (both strengths and weaknesses)\n- Actionable recommendations for improvement\n\n## DIMENSION 1: Partisan Bias\nEvaluate whether the prompts, data structures, and methodology favor one political party or ideology over another.\n\n## DIMENSION 2: Factual Accuracy Safeguards\nEvaluate whether the system has adequate protections against hallucination, fabrication, and factual errors.\n\n## DIMENSION 3: Fairness of Framing\nEvaluate whether the way questions are asked, options are presented, and recommendations are framed is genuinely neutral.\n\n## DIMENSION 4: Balance of Pros/Cons\nEvaluate whether candidate strengths and weaknesses are presented with equal depth and fairness.\n\n## DIMENSION 5: Transparency of Methodology\nEvaluate whether the app is genuinely transparent about how it works and what its limitations are.\n\n## OUTPUT FORMAT\nPlease structure your response with: Overall Assessment, Scores table (1-10 per dimension), Detailed Findings per dimension (Strengths, Weaknesses, Recommendations), Critical Issues, and Conclusion.';
  const auditPromptTextJson = JSON.stringify(auditPromptText);
  const auditPromptSuffixJson = JSON.stringify(auditPromptSuffix);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  ${pageHead({
    title: "AI Audit — Texas Votes",
    description: "Independent AI audit of Texas Votes' recommendation methodology. Full prompts, data sources, and bias reviews by ChatGPT, Gemini, Grok, and Claude.",
    url: "https://txvotes.app/audit",
  })}
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
    <a href="/" class="back-top">&larr; Texas Votes</a>
    <h1 style="margin-top:1rem" data-t="AI Audit">AI Audit</h1>
    <p class="subtitle" data-t="Texas Votes uses AI to generate personalized voting guides. To prove our process is fair and nonpartisan, we publish our complete methodology.">Texas Votes uses AI to generate personalized voting guides. To prove our process is fair and nonpartisan, we publish our complete methodology and have submitted it to four independent AI systems for bias review.</p>

    <div class="cta-banner"><a class="cta-btn" href="/app?start=1" data-t="Build My Voting Guide">Build My Voting Guide</a><p class="cta-sub" data-t="5-minute personalized ballot">5-minute personalized ballot</p></div>

    <h2 style="margin-top:1.5rem" data-t="Independent AI Audit Scores">Independent AI Audit Scores</h2>
    <p data-t="We submitted our complete methodology to four independent AI systems. Each scored our process across five dimensions: partisan bias, factual accuracy, fairness of framing, balance of pros/cons, and transparency.">We submitted our complete methodology to four independent AI systems. Each scored our process across five dimensions: partisan bias, factual accuracy, fairness of framing, balance of pros/cons, and transparency.</p>
    ${lastRunHtml}
    ${auditCardsHtml}
    <p class="note" style="margin-bottom:2rem" data-t="Each AI was given the same prompt with our full methodology export embedded. Scores are extracted automatically from structured JSON responses.">Each AI was given the same prompt with our full <a href="/api/audit/export">methodology export</a> embedded. Scores are extracted automatically from structured JSON responses. You can also <a href="/api/audit/results">view the raw results as JSON</a>.</p>

    <div style="margin-bottom:2rem">
      <a class="export-btn" href="/api/audit/export" target="_blank" data-t="Download Full Methodology Export (JSON)">Download Full Methodology Export (JSON)</a>
      <p class="note" data-t="This JSON file contains every prompt, safeguard, and data pipeline used in the app. You can paste it into any AI system to verify our claims.">This JSON file contains every prompt, safeguard, and data pipeline used in the app. You can paste it into any AI system to verify our claims.</p>
    </div>

    <h2 data-t="Run the Audit Yourself">Run the Audit Yourself</h2>
    <p data-t="Don't just take our word for it. Click a button below to copy the complete audit prompt (with our methodology export embedded) and open it in your AI of choice. Just paste and hit send.">Don't just take our word for it. Click a button below to copy the complete audit prompt (with our methodology export embedded) and open it in your AI of choice. Just paste and hit send.</p>
    <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin:1rem 0">
      <button class="export-btn" onclick="runAudit('https://chatgpt.com/')" style="border:none;cursor:pointer" data-t="Audit with ChatGPT">Audit with ChatGPT</button>
      <button class="export-btn" onclick="runAudit('https://gemini.google.com/app')" style="border:none;cursor:pointer" data-t="Audit with Gemini">Audit with Gemini</button>
      <button class="export-btn" onclick="runAudit('https://grok.x.ai/')" style="border:none;cursor:pointer" data-t="Audit with Grok">Audit with Grok</button>
      <button class="export-btn" onclick="runAudit('https://claude.ai/')" style="border:none;cursor:pointer" data-t="Audit with Claude">Audit with Claude</button>
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
        var prompt=${auditPromptTextJson}+json+${auditPromptSuffixJson};
        await copyText(prompt);
        t.textContent='Prompt copied! Paste it into the chat.';t.style.background='#16a34a';
        setTimeout(function(){t.style.display='none'},8000);
      }catch(e){
        t.textContent='Error: '+e.message;t.style.background='#dc2626';t.style.display='block';
      }
    }
    </script>

    <h2 data-t="How We Generate Recommendations">How We Generate Recommendations</h2>
    <p data-t="When a voter uses Texas Votes, the process works as follows:">When a voter uses Texas Votes, the process works as follows:</p>
    <ol style="padding-left:1.5rem;margin-bottom:0.75rem">
      <li style="margin-bottom:0.5rem" data-t="Interview: The voter answers questions about their top issues, political spectrum, policy stances, and what qualities they value in candidates. All questions are neutrally framed and answer options are shuffled."><strong>Interview:</strong> The voter answers questions about their top issues, political spectrum, policy stances, and what qualities they value in candidates. All questions are neutrally framed and answer options are shuffled.</li>
      <li style="margin-bottom:0.5rem" data-t="District lookup: Their address is sent to the U.S. Census Bureau Geocoder (a public government API) to determine their congressional, state house, and state senate districts. This filters the ballot to only races they can vote in."><strong>District lookup:</strong> Their address is sent to the U.S. Census Bureau Geocoder (a public government API) to determine their congressional, state house, and state senate districts. This filters the ballot to only races they can vote in.</li>
      <li style="margin-bottom:0.5rem" data-t="Guide generation: The voter's profile is sent along with the full candidate data for their ballot to Claude (by Anthropic) with strict nonpartisan instructions. The AI recommends one candidate per race and a stance on each proposition, with reasoning tied to the voter's stated values."><strong>Guide generation:</strong> The voter's profile (issues, spectrum, stances) is sent along with the full candidate data for their ballot to Claude (by Anthropic) with strict nonpartisan instructions. The AI recommends one candidate per race and a stance on each proposition, with reasoning tied to the voter's stated values.</li>
      <li style="margin-bottom:0.5rem" data-t="Local storage: The generated guide is stored only on the voter's device. Nothing is saved on our servers."><strong>Local storage:</strong> The generated guide is stored only on the voter's device. Nothing is saved on our servers.</li>
    </ol>

    <h2 data-t="Our Prompts">Our Prompts</h2>
    <p data-t="These are the exact AI prompts used in production. Nothing is paraphrased or summarized.">These are the exact AI prompts used in production. Nothing is paraphrased or summarized.</p>

    <details>
      <summary data-t="Guide Generation System Prompt">Guide Generation System Prompt</summary>
      <div class="prompt-box">You are a non-partisan voting guide assistant for Texas elections. Your job is to make personalized recommendations based ONLY on the voter's stated values and the candidate data provided. You must NEVER recommend a candidate who is not listed in the provided ballot data. You must NEVER invent or hallucinate candidate information. VOICE: Always address the voter as "you" (second person). Never say "the voter" or use third person. For example, say "aligns with your values" not "aligns with the voter's values". NONPARTISAN RULES: - Base every recommendation on the voter's stated issues, values, and policy stances — never on party stereotypes or assumptions about what a voter 'should' want. - Use neutral, factual language in all reasoning. Avoid loaded terms, partisan framing, or editorial commentary. - Treat all candidates with equal analytical rigor regardless of their positions. - For propositions, connect recommendations to the voter's stated values without advocating for or against any ideology. Respond with ONLY valid JSON — no markdown, no explanation, no text outside the JSON object.</div>
    </details>

    <details>
      <summary data-t="Guide Generation User Prompt (Template)">Guide Generation User Prompt (Template)</summary>
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
    "matchFactors": ["2-3 short phrases citing specific voter priorities that drove this match"],
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
      <summary data-t="Profile Summary System Prompt">Profile Summary System Prompt</summary>
      <div class="prompt-box">You are a concise, non-partisan political analyst. Return only plain text, no formatting. Describe the voter's views using neutral, respectful language. Never use partisan labels, stereotypes, or loaded terms. Focus on their actual stated values and priorities.</div>
    </details>

    <details>
      <summary data-t="Candidate Research System Prompt (County Seeder)">Candidate Research System Prompt (County Seeder)</summary>
      <div class="prompt-box">You are a nonpartisan election data researcher for Texas. Use web_search to find verified, factual information about elections. Return ONLY valid JSON. Never fabricate information — if you cannot verify something, use null.

SOURCE PRIORITY: When evaluating web_search results, prefer sources in this order:
1. Texas Secretary of State filings (sos.state.tx.us)
2. County election offices ({county}.tx.us)
3. Official campaign websites
4. Nonpartisan references (ballotpedia.org, votesmart.org)
5. Established Texas news outlets (texastribune.org, dallasnews.com)
6. National wire services (apnews.com, reuters.com)
7. AVOID: blogs, social media, opinion sites, unverified sources

CONFLICT RESOLUTION: If sources disagree, trust official filings over campaign claims, and campaign claims over news reporting.</div>
    </details>

    <details>
      <summary data-t="Daily Updater System Prompt">Daily Updater System Prompt</summary>
      <div class="prompt-box">You are a nonpartisan election data researcher. Use web_search to find verified, factual updates about candidates. Return ONLY valid JSON. Never fabricate information — if you cannot verify something, use null.

SOURCE PRIORITY: When evaluating web_search results, prefer sources in this order:
1. Texas Secretary of State filings (sos.state.tx.us)
2. County election offices ({county}.tx.us)
3. Official campaign websites
4. Nonpartisan references (ballotpedia.org, votesmart.org)
5. Established Texas news outlets (texastribune.org, dallasnews.com)
6. National wire services (apnews.com, reuters.com)
7. AVOID: blogs, social media, opinion sites, unverified sources

CONFLICT RESOLUTION: If sources disagree, trust official filings over campaign claims, and campaign claims over news reporting.</div>
    </details>

    <h2 data-t="Data Sources">Data Sources</h2>
    <ul>
      <li data-t="Candidate filings: Texas Secretary of State official filing lists"><strong>Candidate filings:</strong> Texas Secretary of State official filing lists</li>
      <li data-t="Candidate profiles: Researched via Claude with web_search tool, cross-referenced against Ballotpedia, campaign websites, and local news. Each candidate gets the same fields: summary, background, key positions, endorsements, strengths (pros), and concerns (cons)."><strong>Candidate profiles:</strong> Researched via Claude with web_search tool, cross-referenced against Ballotpedia, campaign websites, and local news. Each candidate gets the same fields: summary, background, key positions, endorsements, strengths (pros), and concerns (cons).</li>
      <li data-t="District boundaries: U.S. Census Bureau Geocoder API (public government data)"><strong>District boundaries:</strong> U.S. Census Bureau Geocoder API (public government data)</li>
      <li data-t="County voting info: County election office websites, verified via web search"><strong>County voting info:</strong> County election office websites, verified via web search</li>
      <li data-t="Propositions: Official ballot language from the Texas Secretary of State, with background, fiscal impact, supporters, and opponents researched from nonpartisan sources"><strong>Propositions:</strong> Official ballot language from the Texas Secretary of State, with background, fiscal impact, supporters, and opponents researched from nonpartisan sources</li>
    </ul>
    <p class="note" data-t="All AI research prompts include a 7-tier source priority hierarchy. When sources conflict, official filings take precedence.">All AI research prompts include a 7-tier source priority hierarchy: TX SOS filings &gt; county offices &gt; campaign sites &gt; nonpartisan references &gt; established news &gt; wire services &gt; avoid blogs/social. When sources conflict, official filings take precedence. See <a href="/api/audit/export">the methodology export</a> for full details.</p>

    <h2 data-t="Bias Safeguards">Bias Safeguards</h2>
    <p data-t="Every layer of the system includes explicit nonpartisan constraints:">Every layer of the system includes explicit nonpartisan constraints:</p>
    <ul>
      <li data-t="Prompt-level: Every AI prompt includes a NONPARTISAN instruction block prohibiting partisan framing, loaded terms, and party-line assumptions"><strong>Prompt-level:</strong> Every AI prompt includes a NONPARTISAN instruction block prohibiting partisan framing, loaded terms, and party-line assumptions</li>
      <li data-t="Data-level: Both parties' ballots are generated with identical prompts and formatting. Every candidate gets the same structured fields. Candidates with sparse data are labeled transparently."><strong>Data-level:</strong> Both parties' ballots are generated with identical prompts and formatting. Every candidate gets the same structured fields (pros and cons, endorsements, key positions). Candidates with sparse data are labeled "Limited public info" so information gaps are transparent rather than misleading</li>
      <li data-t="UI-level: Candidate order randomized on every page load. Party labels hidden from candidate cards. Interview answer options shuffled. Confidence levels prevent false certainty"><strong>UI-level:</strong> Candidate order randomized on every page load. Party labels hidden from candidate cards. Interview answer options shuffled. Confidence levels prevent false certainty</li>
      <li data-t="Validation-level: The daily updater validates that candidate counts and names don't change unexpectedly, endorsement lists can't shrink by more than 50%, and no empty fields are introduced"><strong>Validation-level:</strong> The daily updater validates that candidate counts and names don't change unexpectedly, endorsement lists can't shrink by more than 50%, and no empty fields are introduced</li>
      <li data-t="Translation-level: Spanish translations use identical grammatical structures for both parties. Candidate names and data terms stay in English for accuracy"><strong>Translation-level:</strong> Spanish translations use identical grammatical structures for both parties. Candidate names and data terms stay in English for accuracy</li>
      <li data-t="Output constraints: The AI must return structured JSON with specific fields. It cannot recommend candidates not in the ballot data. It cannot invent candidate information."><strong>Output constraints:</strong> The AI must return structured JSON with specific fields. It cannot recommend candidates not in the ballot data. It cannot invent candidate information. Reasoning must cite the voter's specific stated values.</li>
    </ul>

    <h2 data-t="Sample Data Structure">Sample Data Structure</h2>
    <p data-t="Every candidate in our database has this structure (equal depth for all candidates):">Every candidate in our database has this structure (equal depth for all candidates):</p>
    <div class="prompt-box">{
  "name": "Candidate Name",
  "isIncumbent": true,
  "summary": "1-2 sentence neutral summary",
  "background": "Professional background",
  "education": "Educational background",
  "keyPositions": ["Position 1", "Position 2", "Position 3"],
  "endorsements": [{"name": "Endorser 1", "type": "labor union"}, {"name": "Endorser 2", "type": "editorial board"}],
  "pros": ["Strength 1", "Strength 2"],
  "cons": ["Concern 1", "Concern 2"],
  "polling": "Latest polling data or null",
  "fundraising": "Fundraising totals or null",
  "sources": [{"url": "https://...", "title": "Source Title", "accessDate": "2026-02-22"}],
  "sourcesUpdatedAt": "2026-02-22T14:30:00Z"
}</div>

    <h2 data-t="Why Four Different AIs?">Why Four Different AIs?</h2>
    <p data-t="Texas Votes uses Claude (by Anthropic) to generate recommendations. By asking four AI systems to review our methodology, we get a range of independent assessments. Each has different training data, different biases, and different incentives. If all four find our process fair, that's meaningful. If any identifies bias, we'll address it and publish the fix.">Texas Votes uses Claude (by Anthropic) to generate recommendations. By asking four AI systems — ChatGPT, Gemini, Grok, and Claude itself — to review our methodology, we get a range of independent assessments. Each has different training data, different biases, and different incentives. Including Claude as an auditor of its own system adds a self-review dimension — it knows its own capabilities and limitations better than anyone, but may also have blind spots about its own biases. If all four find our process fair, that's meaningful. If any identifies bias, we'll address it and publish the fix.</p>

    <h2 data-t="Changes Made from Audit Findings">Changes Made from Audit Findings</h2>
    <ul>
      <li data-t="County coverage labeling: We now display an info banner when local races for a county are not yet available, so voters always understand the scope of their guide."><strong>County coverage labeling:</strong> Both ChatGPT and Gemini flagged that silently omitting local races when county data is unavailable could mislead voters about their ballot's completeness. We now display an in-product info banner — "Local races for [County] County are not yet available" — on both the ballot page and the printable cheat sheet whenever a voter's county lacks local race data. This ensures voters always understand the scope of their guide.</li>
      <li data-t="Source ranking policy: We now embed a 7-tier source priority in every research prompt, ranking official filings highest and blogs/social media lowest."><strong>Source ranking policy:</strong> ChatGPT's audit recommended documenting an explicit source priority hierarchy for AI web research. We now embed a 7-tier SOURCE PRIORITY block in every research prompt — ranking Texas SOS filings highest and blogs/social media lowest — along with a CONFLICT RESOLUTION rule: official filings override campaign claims, which override news reporting. Full details are in the <a href="/api/audit/export">methodology export</a> under <code>sourceRankingPolicy</code>.</li>
      <li data-t="Automated balance checks: Added an endpoint that scores pros/cons symmetry across all races with critical/warning/info flags, integrated into the Data Quality Dashboard."><strong>Automated balance checks:</strong> Added a <a href="/api/balance-check">/api/balance-check</a> endpoint that scores pros/cons symmetry across all races with critical/warning/info flags. Results are integrated into the <a href="/data-quality">Data Quality Dashboard</a> so imbalances are caught automatically.</li>
      <li data-t="Bias reporting: Added a 'Flag this info' button on candidate cards so voters can report potential bias or inaccuracy directly."><strong>Bias reporting:</strong> Added a "Flag this info" button on candidate cards so voters can report potential bias or inaccuracy directly. Reports are sent to <a href="mailto:flagged@txvotes.app">flagged@txvotes.app</a> for review and correction.</li>
      <li data-t="Pros/cons display on recommendations: Candidate strengths and concerns are now displayed directly on ballot recommendation cards, giving voters immediate visibility into balanced analysis."><strong>Pros/cons display on recommendations:</strong> Candidate strengths and concerns are now displayed directly on ballot recommendation cards using green and orange styled boxes, giving voters immediate visibility into balanced analysis.</li>
      <li data-t="Per-candidate source validation: Each candidate profile now includes individually attributed source citations with URLs, titles, and access dates."><strong>Per-candidate source validation:</strong> Each candidate profile now includes individually attributed source citations with URLs, titles, and access dates — not just per-race sources. The county seeder validates sources during data population.</li>
    </ul>

    <h2 data-t="Ongoing Commitment">Ongoing Commitment</h2>
    <p data-t="This audit is not a one-time event.">This audit is not a one-time event. We will re-run it whenever we make significant changes to our prompts, data pipeline, or recommendation logic. The methodology export at <a href="/api/audit/export">/api/audit/export</a> always reflects the current production code.</p>

    <h2 data-t="Related">Related</h2>
    <ul class="related-links">
      <li><a href="/how-it-works" data-t="How It Works">How It Works</a> — <span data-t="Plain-language explanation for non-technical users">Plain-language explanation for non-technical users</span></li>
      <li><a href="/data-quality" data-t="Data Quality Dashboard">Data Quality Dashboard</a> — <span data-t="Live metrics on ballot coverage and candidate completeness">Live metrics on ballot coverage and candidate completeness</span></li>
      <li><a href="/open-source" data-t="Open Source">Open Source</a> — <span data-t="Source code, architecture, and independent code reviews">Source code, architecture, and independent code reviews</span></li>
      <li><a href="/nonpartisan" data-t="Nonpartisan by Design">Nonpartisan by Design</a> — <span data-t="How we ensure fairness for all voters">How we ensure fairness for all voters</span></li>
      <li><a href="/api/audit/export" data-t="Methodology Export">Methodology Export</a> — <span data-t="Full transparency of all AI prompts and data pipelines">Full transparency of all AI prompts and data pipelines</span></li>
      <li><a href="/candidates" data-t="All Candidates">All Candidates</a> — <span data-t="Browse every candidate with detailed profiles">Browse every candidate with detailed profiles</span></li>
    </ul>

    <div class="page-footer"><a href="/" data-t="Texas Votes">Texas Votes</a> &middot; <a href="/how-it-works" data-t="How It Works">How It Works</a> &middot; <a href="/privacy" data-t="Privacy">Privacy</a><br><span style="color:var(--red)">&starf;</span> <span data-t="Built in Texas">Built in Texas</span> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></div>
  </div>
  ${pageI18n({
    'AI Audit': 'Auditor\u00EDa de IA',
    'Texas Votes uses AI to generate personalized voting guides. To prove our process is fair and nonpartisan, we publish our complete methodology.': 'Texas Votes usa IA para generar gu\u00EDas de votaci\u00F3n personalizadas. Para demostrar que nuestro proceso es justo y apartidista, publicamos nuestra metodolog\u00EDa completa.',
    'Independent AI Audit Scores': 'Puntuaciones Independientes de Auditor\u00EDa de IA',
    'We submitted our complete methodology to four independent AI systems. Each scored our process across five dimensions: partisan bias, factual accuracy, fairness of framing, balance of pros/cons, and transparency.': 'Enviamos nuestra metodolog\u00EDa completa a cuatro sistemas de IA independientes. Cada uno calific\u00F3 nuestro proceso en cinco dimensiones: sesgo partidista, precisi\u00F3n factual, equidad en la presentaci\u00F3n, equilibrio de pros/contras y transparencia.',
    'Each AI was given the same prompt with our full methodology export embedded. Scores are extracted automatically from structured JSON responses.': 'Cada IA recibi\u00F3 el mismo prompt con nuestra exportaci\u00F3n completa de metodolog\u00EDa incluida. Las puntuaciones se extraen autom\u00E1ticamente de respuestas JSON estructuradas.',
    'Download Full Methodology Export (JSON)': 'Descargar Exportaci\u00F3n Completa de Metodolog\u00EDa (JSON)',
    'This JSON file contains every prompt, safeguard, and data pipeline used in the app. You can paste it into any AI system to verify our claims.': 'Este archivo JSON contiene cada prompt, salvaguarda y pipeline de datos usado en la app. Puedes pegarlo en cualquier sistema de IA para verificar nuestras afirmaciones.',
    'Run the Audit Yourself': 'Ejecuta la Auditor\u00EDa T\u00FA Mismo',
    "Don't just take our word for it. Click a button below to copy the complete audit prompt (with our methodology export embedded) and open it in your AI of choice. Just paste and hit send.": 'No solo conf\u00EDes en nuestra palabra. Haz clic en un bot\u00F3n a continuaci\u00F3n para copiar el prompt completo de auditor\u00EDa (con nuestra exportaci\u00F3n de metodolog\u00EDa incluida) y \u00E1brelo en la IA de tu elecci\u00F3n. Solo pega y env\u00EDa.',
    'Audit with ChatGPT': 'Auditar con ChatGPT',
    'Audit with Gemini': 'Auditar con Gemini',
    'Audit with Grok': 'Auditar con Grok',
    'Audit with Claude': 'Auditar con Claude',
    'How We Generate Recommendations': 'C\u00F3mo Generamos Recomendaciones',
    'When a voter uses Texas Votes, the process works as follows:': 'Cuando un votante usa Texas Votes, el proceso funciona as\u00ED:',
    'Interview: The voter answers questions about their top issues, political spectrum, policy stances, and what qualities they value in candidates. All questions are neutrally framed and answer options are shuffled.': 'Entrevista: El votante responde preguntas sobre sus temas prioritarios, espectro pol\u00EDtico, posturas pol\u00EDticas y qu\u00E9 cualidades valora en los candidatos. Todas las preguntas est\u00E1n formuladas de manera neutral y las opciones de respuesta se mezclan aleatoriamente.',
    "District lookup: Their address is sent to the U.S. Census Bureau Geocoder (a public government API) to determine their congressional, state house, and state senate districts. This filters the ballot to only races they can vote in.": 'B\u00FAsqueda de distrito: Su direcci\u00F3n se env\u00EDa al Geocodificador de la Oficina del Censo de EE.UU. (una API p\u00FAblica del gobierno) para determinar sus distritos congresionales, de la c\u00E1mara estatal y del senado estatal. Esto filtra la boleta para mostrar solo las contiendas en las que pueden votar.',
    "Guide generation: The voter's profile is sent along with the full candidate data for their ballot to Claude (by Anthropic) with strict nonpartisan instructions. The AI recommends one candidate per race and a stance on each proposition, with reasoning tied to the voter's stated values.": 'Generaci\u00F3n de gu\u00EDa: El perfil del votante se env\u00EDa junto con los datos completos de candidatos para su boleta a Claude (de Anthropic) con instrucciones estrictamente apartidistas. La IA recomienda un candidato por contienda y una postura sobre cada proposici\u00F3n, con razonamiento vinculado a los valores declarados del votante.',
    'Local storage: The generated guide is stored only on the voter\'s device. Nothing is saved on our servers.': 'Almacenamiento local: La gu\u00EDa generada se almacena solo en el dispositivo del votante. Nada se guarda en nuestros servidores.',
    'Our Prompts': 'Nuestros Prompts',
    'These are the exact AI prompts used in production. Nothing is paraphrased or summarized.': 'Estos son los prompts exactos de IA usados en producci\u00F3n. Nada est\u00E1 parafraseado ni resumido.',
    'Guide Generation System Prompt': 'Prompt del Sistema de Generaci\u00F3n de Gu\u00EDa',
    'Guide Generation User Prompt (Template)': 'Prompt de Usuario de Generaci\u00F3n de Gu\u00EDa (Plantilla)',
    'Profile Summary System Prompt': 'Prompt del Sistema de Resumen de Perfil',
    'Candidate Research System Prompt (County Seeder)': 'Prompt del Sistema de Investigaci\u00F3n de Candidatos (Sembrador de Condados)',
    'Daily Updater System Prompt': 'Prompt del Sistema de Actualizaci\u00F3n Diaria',
    'Data Sources': 'Fuentes de Datos',
    'Candidate filings: Texas Secretary of State official filing lists': 'Registros de candidatos: Listas oficiales de registro del Secretario de Estado de Texas',
    'Candidate profiles: Researched via Claude with web_search tool, cross-referenced against Ballotpedia, campaign websites, and local news. Each candidate gets the same fields: summary, background, key positions, endorsements, strengths (pros), and concerns (cons).': 'Perfiles de candidatos: Investigados a trav\u00E9s de Claude con la herramienta web_search, verificados contra Ballotpedia, sitios web de campa\u00F1a y noticias locales. Cada candidato recibe los mismos campos: resumen, trayectoria, posiciones clave, respaldos, fortalezas (pros) y preocupaciones (contras).',
    'District boundaries: U.S. Census Bureau Geocoder API (public government data)': 'L\u00EDmites de distritos: API del Geocodificador de la Oficina del Censo de EE.UU. (datos p\u00FAblicos del gobierno)',
    'County voting info: County election office websites, verified via web search': 'Info de votaci\u00F3n del condado: Sitios web de las oficinas electorales del condado, verificados por b\u00FAsqueda web',
    'Propositions: Official ballot language from the Texas Secretary of State, with background, fiscal impact, supporters, and opponents researched from nonpartisan sources': 'Proposiciones: Lenguaje oficial de boleta del Secretario de Estado de Texas, con antecedentes, impacto fiscal, partidarios y opositores investigados de fuentes apartidistas',
    'All AI research prompts include a 7-tier source priority hierarchy. When sources conflict, official filings take precedence.': 'Todos los prompts de investigaci\u00F3n de IA incluyen una jerarqu\u00EDa de prioridad de fuentes de 7 niveles. Cuando las fuentes entran en conflicto, los registros oficiales tienen prioridad.',
    'Bias Safeguards': 'Salvaguardas contra Sesgo',
    'Every layer of the system includes explicit nonpartisan constraints:': 'Cada capa del sistema incluye restricciones apartidistas expl\u00EDcitas:',
    'Prompt-level: Every AI prompt includes a NONPARTISAN instruction block prohibiting partisan framing, loaded terms, and party-line assumptions': 'Nivel de prompt: Cada prompt de IA incluye un bloque de instrucciones APARTIDISTAS que proh\u00EDbe encuadres partidistas, t\u00E9rminos tendenciosos y suposiciones de l\u00EDnea partidista',
    "Data-level: Both parties' ballots are generated with identical prompts and formatting. Every candidate gets the same structured fields. Candidates with sparse data are labeled transparently.": 'Nivel de datos: Las boletas de ambos partidos se generan con prompts y formato id\u00E9nticos. Cada candidato recibe los mismos campos estructurados. Los candidatos con datos escasos se etiquetan de manera transparente.',
    'UI-level: Candidate order randomized on every page load. Party labels hidden from candidate cards. Interview answer options shuffled. Confidence levels prevent false certainty': 'Nivel de interfaz: El orden de candidatos se aleatoriza en cada carga de p\u00E1gina. Las etiquetas de partido se ocultan de las tarjetas de candidatos. Las opciones de respuesta de la entrevista se mezclan. Los niveles de confianza previenen falsa certeza',
    "Validation-level: The daily updater validates that candidate counts and names don't change unexpectedly, endorsement lists can't shrink by more than 50%, and no empty fields are introduced": 'Nivel de validaci\u00F3n: El actualizador diario valida que los conteos y nombres de candidatos no cambien inesperadamente, las listas de respaldos no puedan reducirse m\u00E1s del 50%, y no se introduzcan campos vac\u00EDos',
    'Translation-level: Spanish translations use identical grammatical structures for both parties. Candidate names and data terms stay in English for accuracy': 'Nivel de traducci\u00F3n: Las traducciones al espa\u00F1ol usan estructuras gramaticales id\u00E9nticas para ambos partidos. Los nombres de candidatos y t\u00E9rminos de datos permanecen en ingl\u00E9s para mayor precisi\u00F3n',
    'Output constraints: The AI must return structured JSON with specific fields. It cannot recommend candidates not in the ballot data. It cannot invent candidate information.': 'Restricciones de salida: La IA debe devolver JSON estructurado con campos espec\u00EDficos. No puede recomendar candidatos que no est\u00E9n en los datos de la boleta. No puede inventar informaci\u00F3n de candidatos.',
    'Sample Data Structure': 'Estructura de Datos de Ejemplo',
    'Every candidate in our database has this structure (equal depth for all candidates):': 'Cada candidato en nuestra base de datos tiene esta estructura (misma profundidad para todos los candidatos):',
    'Why Four Different AIs?': '\u00BFPor Qu\u00E9 Cuatro IAs Diferentes?',
    "Texas Votes uses Claude (by Anthropic) to generate recommendations. By asking four AI systems to review our methodology, we get a range of independent assessments. Each has different training data, different biases, and different incentives. If all four find our process fair, that's meaningful. If any identifies bias, we'll address it and publish the fix.": 'Texas Votes usa Claude (de Anthropic) para generar recomendaciones. Al pedir a cuatro sistemas de IA que revisen nuestra metodolog\u00EDa, obtenemos una variedad de evaluaciones independientes. Cada uno tiene diferentes datos de entrenamiento, diferentes sesgos y diferentes incentivos. Si los cuatro encuentran que nuestro proceso es justo, eso es significativo. Si alguno identifica sesgo, lo abordaremos y publicaremos la correcci\u00F3n.',
    'Changes Made from Audit Findings': 'Cambios Realizados por Hallazgos de Auditor\u00EDa',
    'County coverage labeling: We now display an info banner when local races for a county are not yet available, so voters always understand the scope of their guide.': 'Etiquetado de cobertura del condado: Ahora mostramos un banner informativo cuando las contiendas locales de un condado a\u00FAn no est\u00E1n disponibles, para que los votantes siempre comprendan el alcance de su gu\u00EDa.',
    'Source ranking policy: We now embed a 7-tier source priority in every research prompt, ranking official filings highest and blogs/social media lowest.': 'Pol\u00EDtica de clasificaci\u00F3n de fuentes: Ahora incluimos una prioridad de fuentes de 7 niveles en cada prompt de investigaci\u00F3n, clasificando los registros oficiales como m\u00E1xima prioridad y blogs/redes sociales como m\u00EDnima.',
    'Automated balance checks: Added an endpoint that scores pros/cons symmetry across all races with critical/warning/info flags, integrated into the Data Quality Dashboard.': 'Verificaciones de equilibrio automatizadas: Se agreg\u00F3 un endpoint que califica la simetr\u00EDa de pros/contras en todas las contiendas con indicadores cr\u00EDticos/advertencia/info, integrado en el Panel de Calidad de Datos.',
    "Bias reporting: Added a 'Flag this info' button on candidate cards so voters can report potential bias or inaccuracy directly.": 'Reporte de sesgo: Se agreg\u00F3 un bot\u00F3n "Marcar esta info" en las tarjetas de candidatos para que los votantes puedan reportar posible sesgo o inexactitud directamente.',
    'Pros/cons display on recommendations: Candidate strengths and concerns are now displayed directly on ballot recommendation cards, giving voters immediate visibility into balanced analysis.': 'Visualizaci\u00F3n de pros/contras en recomendaciones: Las fortalezas y preocupaciones de los candidatos ahora se muestran directamente en las tarjetas de recomendaci\u00F3n de boleta, dando a los votantes visibilidad inmediata del an\u00E1lisis equilibrado.',
    'Per-candidate source validation: Each candidate profile now includes individually attributed source citations with URLs, titles, and access dates.': 'Validaci\u00F3n de fuentes por candidato: Cada perfil de candidato ahora incluye citas de fuentes individualmente atribuidas con URLs, t\u00EDtulos y fechas de acceso.',
    'Ongoing Commitment': 'Compromiso Continuo',
    'This audit is not a one-time event.': 'Esta auditor\u00EDa no es un evento \u00FAnico.',
    'Pending': 'Pendiente',
    'Audit not yet run. Results will be published here when complete.': 'Auditor\u00EDa a\u00FAn no ejecutada. Los resultados se publicar\u00E1n aqu\u00ED cuando est\u00E9n completos.',
    'Error': 'Error',
    'Score Parse Failed': 'Fallo al Extraer Puntuaci\u00F3n',
    'The AI returned a report but scores could not be extracted automatically.': 'La IA devolvi\u00F3 un informe pero las puntuaciones no se pudieron extraer autom\u00E1ticamente.',
    'Strength:': 'Fortaleza:',
    'Weakness:': 'Debilidad:',
    'Last run:': '\u00DAltima ejecuci\u00F3n:',
    'View Full Report': 'Ver Informe Completo',
    'View Raw Response': 'Ver Respuesta Sin Procesar',
    'Partisan Bias': 'Sesgo Partidista',
    'Factual Accuracy': 'Precisi\u00F3n Factual',
    'Fairness of Framing': 'Equidad en la Presentaci\u00F3n',
    'Balance of Pros/Cons': 'Equilibrio de Pros/Contras',
    'Transparency': 'Transparencia',
  })}
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

function buildAuditExportData() {
  return {
    _meta: {
      name: "Texas Votes AI Methodology Export",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      purpose: "Complete transparency export of all AI prompts, data pipelines, and safeguards used by Texas Votes (txvotes.app) to generate personalized voting guides. This document is designed to be reviewed by independent AI systems for bias assessment.",
      website: "https://txvotes.app",
      auditPage: "https://txvotes.app/audit",
      howItWorks: "https://txvotes.app/how-it-works",
      nonpartisan: "https://txvotes.app/nonpartisan",
      dataQuality: "https://txvotes.app/data-quality",
      openSource: "https://txvotes.app/open-source",
      balanceCheck: "https://txvotes.app/api/balance-check",
    },

    guideGeneration: {
      description: "When a voter completes the interview, their profile is sent with the full ballot data to generate personalized recommendations. Both Republican and Democratic ballots use identical prompts and formatting.",
      model: "Claude Sonnet (Anthropic) — claude-sonnet-4-6 with fallback to claude-sonnet-4-20250514",
      systemPrompt: "You are a non-partisan voting guide assistant for Texas elections. Your job is to make personalized recommendations based ONLY on the voter's stated values and the candidate data provided. You must NEVER recommend a candidate who is not listed in the provided ballot data. You must NEVER invent or hallucinate candidate information. VOICE: Always address the voter as \"you\" (second person). Never say \"the voter\" or use third person. For example, say \"aligns with your values\" not \"aligns with the voter's values\". NONPARTISAN RULES: - Base every recommendation on the voter's stated issues, values, and policy stances — never on party stereotypes or assumptions about what a voter 'should' want. - Use neutral, factual language in all reasoning. Avoid loaded terms, partisan framing, or editorial commentary. - Treat all candidates with equal analytical rigor regardless of their positions. - For propositions, connect recommendations to the voter's stated values without advocating for or against any ideology. Respond with ONLY valid JSON — no markdown, no explanation, no text outside the JSON object.",
      userPromptTemplate: "Recommend ONE candidate per race and a stance on each proposition. Be concise.\n\nNONPARTISAN: All reasoning must be factual and issue-based. Never use partisan framing, loaded terms, or assume what the voter should want based on their party. Treat every candidate and proposition with equal analytical rigor. Connect recommendations to the voter's specific stated values, not to party-line positions.\n\nIMPORTANT: For profileSummary, write 2 sentences in first person \u2014 conversational, specific, no generic labels. NEVER say \"I'm a Democrat/Republican\" \u2014 focus on values and priorities.\n\nVOTER: {Party} primary | Spectrum: {politicalSpectrum}\nIssues: {topIssues}\nValues: {candidateQualities}\nStances: {policyViews}\n\nBALLOT:\n{Full condensed ballot description with all races, candidates, positions, endorsements, pros, cons}\n\nVALID CANDIDATES (MUST only use these names):\n{List of candidate names per race}\n\nReturn ONLY this JSON:\n{\n  \"profileSummary\": \"2 sentences, first person, conversational\",\n  \"races\": [{\n    \"office\": \"exact office name\",\n    \"district\": \"district or null\",\n    \"recommendedCandidate\": \"exact name from list\",\n    \"reasoning\": \"1 sentence why this candidate fits the voter\",\n    \"matchFactors\": [\"2-3 short phrases citing specific voter priorities that drove this match\"],\n    \"strategicNotes\": null,\n    \"caveats\": null,\n    \"confidence\": \"Strong Match|Good Match|Best Available|Symbolic Race\"\n  }],\n  \"propositions\": [{\n    \"number\": 1,\n    \"recommendation\": \"Lean Yes|Lean No|Your Call\",\n    \"reasoning\": \"1 sentence connecting to voter\",\n    \"caveats\": null,\n    \"confidence\": \"Clear Call|Lean|Genuinely Contested\"\n  }]\n}",
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
      description: "County-level candidate data is populated using Claude with the web_search tool. The AI researches official filings and news sources to find candidates, their positions, endorsements, and backgrounds. Each candidate receives individually attributed source citations (URL, title, access date) captured from Claude web_search API responses — sources are per-candidate, not per-race, ensuring every claim can be traced to its origin.",
      systemPrompt: "You are a nonpartisan election data researcher for Texas. Use web_search to find verified, factual information about elections. Return ONLY valid JSON. Never fabricate information \u2014 if you cannot verify something, use null.\n\nSOURCE PRIORITY: When evaluating web_search results, prefer sources in this order:\n1. Texas Secretary of State filings (sos.state.tx.us)\n2. County election offices ({county}.tx.us)\n3. Official campaign websites\n4. Nonpartisan references (ballotpedia.org, votesmart.org)\n5. Established Texas news outlets (texastribune.org, dallasnews.com)\n6. National wire services (apnews.com, reuters.com)\n7. AVOID: blogs, social media, opinion sites, unverified sources\n\nCONFLICT RESOLUTION: If sources disagree, trust official filings over campaign claims, and campaign claims over news reporting.",
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
        endorsements: "Array of {name, type} objects — type is one of: labor union, editorial board, advocacy group, business group, elected official, political organization, professional association, community organization, public figure",
        pros: "Array of strengths/arguments in their favor",
        cons: "Array of concerns/arguments against",
        polling: "Latest polling data if available, or null",
        fundraising: "Fundraising totals if available, or null",
        sources: "Array of {url, title, accessDate} objects — source citations for claims about this candidate, captured from Claude web_search API responses",
        sourcesUpdatedAt: "ISO timestamp of when sources were last updated",
      },
      equalTreatment: "Every candidate in a race receives the same structured fields. The same prompt is used for all candidates in all races regardless of party, incumbency, or polling position.",
    },

    dailyUpdater: {
      description: "An automated daily cron job re-researches each contested race for new endorsements, polling, fundraising, and news. Updates are validated before being applied. Runs on the atxvotes-api worker; txvotes-api reads the same shared KV namespace.",
      model: "Claude Sonnet (claude-sonnet-4-20250514) with web_search tool (max 5 searches per race)",
      systemPrompt: "You are a nonpartisan election data researcher. Use web_search to find verified, factual updates about candidates. Return ONLY valid JSON. Never fabricate information \u2014 if you cannot verify something, use null.\n\nSOURCE PRIORITY: When evaluating web_search results, prefer sources in this order:\n1. Texas Secretary of State filings (sos.state.tx.us)\n2. County election offices ({county}.tx.us)\n3. Official campaign websites\n4. Nonpartisan references (ballotpedia.org, votesmart.org)\n5. Established Texas news outlets (texastribune.org, dallasnews.com)\n6. National wire services (apnews.com, reuters.com)\n7. AVOID: blogs, social media, opinion sites, unverified sources\n\nCONFLICT RESOLUTION: If sources disagree, trust official filings over campaign claims, and campaign claims over news reporting.",
      raceResearchPromptTemplate: "Research the latest updates for this {party} primary race in the March 3, 2026 Texas Primary Election:\n\nRACE: {office} \u2014 {district}\n\nCURRENT DATA:\n  {candidateDescriptions}\n\nSearch for updates since February 15, 2026. Look for:\n1. New endorsements\n2. New polling data\n3. Updated fundraising numbers\n4. Significant news or position changes\n\nReturn a JSON object with this exact structure (use null for any field with no update):\n{\n  \"candidates\": [\n    {\n      \"name\": \"exact candidate name\",\n      \"polling\": \"updated polling string or null\",\n      \"fundraising\": \"updated fundraising string or null\",\n      \"endorsements\": [{\"name\": \"Endorser Name\", \"type\": \"type category\"}] or null,\n      \"keyPositions\": [\"full updated list\"] or null,\n      \"pros\": [\"full updated list\"] or null,\n      \"cons\": [\"full updated list\"] or null,\n      \"summary\": \"updated summary or null\",\n      \"background\": \"updated background or null\"\n    }\n  ]\n}\n\nIMPORTANT:\n- Return ONLY valid JSON, no markdown or explanation\n- Use null for any field where you found no new information\n- Candidate names must match exactly as provided\n- For arrays: return the FULL updated list (existing + new), not just additions\n- Only update fields where you found verifiable new information\n- Endorsement type must be one of: labor union, editorial board, advocacy group, business group, elected official, political organization, professional association, community organization, public figure",
      validationRules: [
        "Candidate count must remain the same (no additions or removals)",
        "Candidate names must match exactly (no renaming)",
        "Endorsement lists cannot shrink by more than 50% (prevents accidental data loss)",
        "No empty strings in key fields (name, summary)",
        "Party cannot change between updates",
        "Empty arrays are rejected \u2014 prevents accidental data wipe",
        "Sources must have valid URLs, no duplicate URLs, max 20 per candidate",
      ],
      mergeStrategy: "Non-null fields from Claude's response overwrite existing values. Null fields are skipped (existing data preserved). Each race is updated independently with 5-second delays between API calls to avoid rate limits. Source citations are captured from Claude web_search API response blocks and merged with deduplication.",
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
        endorsements: [{ name: "Texas Teachers Association", type: "professional association" }, { name: "Former Governor Smith", type: "elected official" }],
        pros: ["Deep legislative experience", "Strong fundraising", "Bipartisan track record"],
        cons: ["Limited executive experience", "Some positions have shifted over time"],
        polling: "Leading with 35% in latest University of Texas poll",
        fundraising: "$2.1M raised as of Q4 2025",
        sources: [
          { url: "https://www.texastribune.org/2026/01/15/jane-doe-governor-race/", title: "Jane Doe enters governor's race with education platform", accessDate: "2026-02-22" },
          { url: "https://www.ballotpedia.org/Jane_Doe", title: "Jane Doe - Ballotpedia", accessDate: "2026-02-22" },
        ],
        sourcesUpdatedAt: "2026-02-22T14:30:00Z",
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

    sourceRankingPolicy: {
      description: "All AI research prompts include an explicit source priority hierarchy to ensure web_search results are evaluated in order of reliability. This was added based on ChatGPT AI audit feedback recommending documented source preferences.",
      hierarchy: [
        { tier: 1, source: "Texas Secretary of State filings", examples: ["sos.state.tx.us"], trust: "Highest — official government filings" },
        { tier: 2, source: "County election offices", examples: ["{county}.tx.us"], trust: "Official local government data" },
        { tier: 3, source: "Official campaign websites", examples: ["candidate campaign sites"], trust: "Direct from candidates — verify claims against filings" },
        { tier: 4, source: "Nonpartisan references", examples: ["ballotpedia.org", "votesmart.org"], trust: "Established nonpartisan voter information" },
        { tier: 5, source: "Established Texas news outlets", examples: ["texastribune.org", "dallasnews.com"], trust: "Professional journalism with editorial standards" },
        { tier: 6, source: "National wire services", examples: ["apnews.com", "reuters.com"], trust: "Factual reporting with editorial oversight" },
        { tier: 7, source: "Blogs, social media, opinion sites", examples: [], trust: "Lowest — avoided unless no other source exists" },
      ],
      conflictResolution: "When sources disagree: official filings override campaign claims, and campaign claims override news reporting.",
      enforcement: "SOURCE PRIORITY and CONFLICT RESOLUTION rules are embedded in the system prompts of both the daily updater (updater.js) and the county data seeder (county-seeder.js). The web_search tool is Claude's built-in tool — we cannot filter its results at the API level, so prompt-level preferences are the pragmatic enforcement mechanism.",
      promptsIncludingPolicy: ["updater.js researchRace()", "county-seeder.js callClaudeWithSearch()"],
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
        { value: "Criminal Justice", icon: "⚖️" },
        { value: "Energy & Oil/Gas", icon: "🛢️" },
        { value: "LGBTQ+ Rights", icon: "🏳️" },
        { value: "Voting & Elections", icon: "🗳️" },
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
        "Criminal Justice": {
          question: "What's most important for criminal justice reform?",
          options: [
            { label: "Focus on rehabilitation", description: "Invest in re-entry programs, reduce recidivism through support services" },
            { label: "Maintain current system", description: "Texas's approach to law and order is working, keep sentences firm" },
            { label: "Reform sentencing laws", description: "Reduce mandatory minimums, address racial disparities in sentencing" },
            { label: "Rethink incarceration", description: "Shift resources from prisons to community-based alternatives" },
          ],
        },
        "Energy & Oil/Gas": {
          question: "How should Texas manage its energy industry?",
          options: [
            { label: "Maximize production", description: "Support oil and gas expansion, reduce regulations on producers" },
            { label: "Balanced energy mix", description: "Maintain fossil fuels while investing in renewables and grid stability" },
            { label: "Accelerate clean energy", description: "Transition away from fossil fuels toward wind, solar, and storage" },
            { label: "Let the market decide", description: "Remove subsidies for all energy sources, let competition set the course" },
          ],
        },
        "LGBTQ+ Rights": {
          question: "What's the right approach to LGBTQ+ rights?",
          options: [
            { label: "Full equality protections", description: "Add sexual orientation and gender identity to anti-discrimination laws" },
            { label: "Balance with religious liberty", description: "Protect LGBTQ+ individuals while preserving faith-based exemptions" },
            { label: "Current laws are sufficient", description: "Existing legal protections are adequate, no new legislation needed" },
            { label: "Parental rights focus", description: "Parents should direct decisions about children's healthcare and education" },
          ],
        },
        "Voting & Elections": {
          question: "What matters most for elections?",
          options: [
            { label: "Expand voter access", description: "Make registration easier, extend early voting, allow mail-in ballots for all" },
            { label: "Strengthen ID requirements", description: "Require photo ID, verify citizenship, secure the voter rolls" },
            { label: "Balanced election reforms", description: "Improve access and security together with bipartisan oversight" },
            { label: "Local control", description: "Let counties and cities set their own election rules and procedures" },
          ],
        },
      },
    },

    countySeeder: {
      description: "County-level data is populated using Claude with web_search for each of Texas's top 30 counties by population (~75% of voters). Four data artifacts are generated per county: voting logistics, Republican ballot, Democratic ballot, and precinct map.",
      model: "Claude Sonnet (claude-sonnet-4-20250514) with web_search tool (max 10 searches per call)",
      systemPrompt: "You are a nonpartisan election data researcher for Texas. Use web_search to find verified, factual information about elections. Return ONLY valid JSON. Never fabricate information — if you cannot verify something, use null.\n\nSOURCE PRIORITY: When evaluating web_search results, prefer sources in this order:\n1. Texas Secretary of State filings (sos.state.tx.us)\n2. County election offices ({county}.tx.us)\n3. Official campaign websites\n4. Nonpartisan references (ballotpedia.org, votesmart.org)\n5. Established Texas news outlets (texastribune.org, dallasnews.com)\n6. National wire services (apnews.com, reuters.com)\n7. AVOID: blogs, social media, opinion sites, unverified sources\n\nCONFLICT RESOLUTION: If sources disagree, trust official filings over campaign claims, and campaign claims over news reporting.",
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
      sourceValidation: "The county seeder validates source citations during data population. Sources must have valid URLs with no duplicates, capped at 20 per candidate. The 7-tier source priority hierarchy is enforced at the prompt level, and CONFLICT RESOLUTION rules ensure official filings take precedence over campaign claims and news reporting.",
    },

    balanceChecks: {
      description: "Automated pros/cons balance checks ensure every candidate receives equal analytical treatment. The /api/balance-check endpoint runs symmetry scoring across all races and flags imbalances at critical, warning, and info severity levels. Results are integrated into the Data Quality Dashboard.",
      endpoint: "/api/balance-check",
      scoring: "Each race is scored 0-100 based on symmetry of pros/cons counts, detail length, and consistent coverage across all candidates. Combined score is the average across both party ballots.",
      severityLevels: {
        critical: "Major imbalance that could appear biased (e.g., one candidate has 5 pros and another has 0)",
        warning: "Moderate imbalance worth reviewing (e.g., significant difference in detail length)",
        info: "Minor asymmetry that is acceptable but noted for transparency",
      },
      integration: "Balance scores are displayed on the Data Quality Dashboard with drill-down flag details. The balance check runs automatically and is available as a public JSON API.",
    },

    biasReporting: {
      description: "A 'Flag this info' button on candidate cards allows voters to report potential bias or inaccuracy. Reports are sent to flagged@txvotes.app with structured issue types for review and correction.",
      feature: "Flag this info button on candidate cards in the PWA",
      reportEmail: "flagged@txvotes.app",
      issueTypes: ["Factual inaccuracy", "Biased framing", "Missing information", "Outdated information", "Other"],
      workflow: "Voter taps 'Flag this info' on a candidate card, selects an issue type, optionally adds details, and submits. The report is emailed for manual review and correction.",
    },

    strengthsConcernsDisplay: {
      description: "Candidate strengths and concerns are displayed directly on ballot recommendation cards using green (strengths) and orange (concerns) styled boxes. This gives voters immediate visibility into the balanced analysis for each candidate without needing to expand the full profile.",
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
        "6": { label: "Swedish Chef", description: "Easter egg: Triggered by typing \"bork\" on the profile page. Everything written as the Swedish Chef from the Muppets. Bork bork bork! Candidate names and office titles remain accurate." },
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
}

function handleAuditExport() {
  const exportData = buildAuditExportData();
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
  ${pageHead({
    title: "Support — Texas Votes",
    description: "Get help with Texas Votes. FAQs about recommendations, data privacy, candidate accuracy, and more.",
    url: "https://txvotes.app/support",
  })}
</head>
<body>
  <div class="container">
    <a href="/" class="back-top">&larr; Texas Votes</a>
    <h1 data-t="Support">Support</h1>
    <p class="subtitle" data-t="We're here to help.">We're here to help.</p>

    <div class="cta-banner"><a class="cta-btn" href="/app?start=1" data-t="Build My Voting Guide">Build My Voting Guide</a><p class="cta-sub" data-t="5-minute personalized ballot">5-minute personalized ballot</p></div>

    <a class="email-btn" href="mailto:howdy@txvotes.app" data-t="Email Us">Email Us</a>

    <div class="faq">
      <h2 data-t="Frequently Asked Questions">Frequently Asked Questions</h2>

      <h2 data-t="How do I reset my voting guide?">How do I reset my voting guide?</h2>
      <p data-t="Go to the Profile tab and tap Start Over at the bottom. This erases your profile and recommendations so you can retake the interview.">Go to the Profile tab and tap "Start Over" at the bottom. This erases your profile and recommendations so you can retake the interview.</p>

      <h2 data-t="Are the recommendations accurate?">Are the recommendations accurate?</h2>
      <p data-t="Recommendations are generated by AI based on real candidate data and your stated preferences. They're a starting point — we always encourage doing your own research. The app includes a disclaimer on every screen.">Recommendations are generated by AI based on real candidate data and your stated preferences. They're a starting point — we always encourage doing your own research. The app includes a disclaimer on every screen.</p>

      <h2 data-t="Where is my data stored?">Where is my data stored?</h2>
      <p data-t="Everything stays on your device. We don't store your data on our servers.">Everything stays on your device (and in your iCloud account if you have iCloud enabled). We don't store your data on our servers. See our <a href="/privacy">privacy policy</a> for details.</p>

      <h2 data-t="Which elections are covered?">Which elections are covered?</h2>
      <p data-t="Texas Votes covers the March 3, 2026 Texas Primary Election for all Texas voters, including both Republican and Democratic primaries.">Texas Votes covers the March 3, 2026 Texas Primary Election for all Texas voters, including both Republican and Democratic primaries.</p>

      <h2 data-t="I found wrong information about a candidate.">I found wrong information about a candidate.</h2>
      <p data-t="Use the Flag this info button on any candidate card in the app to report inaccuracies or bias. You can also email us directly and we'll correct it as quickly as possible.">Use the "Flag this info" button on any candidate card in the app to report inaccuracies or bias — your report goes directly to <a href="mailto:flagged@txvotes.app">flagged@txvotes.app</a> for review. You can also <a href="mailto:howdy@txvotes.app">email us</a> directly with details and we'll correct it as quickly as possible.</p>

      <h2 data-t="Where does the candidate data come from?">Where does the candidate data come from?</h2>
      <p data-t="Candidate data is researched using AI with web search, cross-referenced against official filings from the Texas Secretary of State, county clerks, and Ballotpedia.">Candidate data is researched using AI with web search, cross-referenced against official filings from the Texas Secretary of State, county clerks, and Ballotpedia. Every candidate profile includes source citations linking to the original articles, filings, and campaign materials so you can verify claims independently.</p>

      <h2 data-t="Can I preview what the ballot looks like before doing the interview?">Can I preview what the ballot looks like before doing the interview?</h2>
      <p data-t="Yes! Visit our sample ballot page to see fictional candidates and recommendations that demonstrate exactly what your personalized guide will look like.">Yes! Visit our <a href="/sample">sample ballot page</a> to see fictional candidates and recommendations that demonstrate exactly what your personalized guide will look like — including match scores, candidate details, and proposition analysis.</p>

      <h2 data-t="How do you ensure candidates are treated equally?">How do you ensure candidates are treated equally?</h2>
      <p data-t="We run automated balance checks that score the symmetry of pros/cons across all candidates in every race.">We run automated balance checks that score the symmetry of pros/cons across all candidates in every race. Imbalances are flagged at critical, warning, and info severity levels and displayed on our <a href="/data-quality">Data Quality Dashboard</a>. You can also view the raw balance report at <a href="/api/balance-check">/api/balance-check</a>.</p>

      <h2 data-t="What are the strengths and concerns on my ballot?">What are the strengths and concerns on my ballot?</h2>
      <p data-t="Each candidate's strengths and concerns are displayed directly on your ballot recommendation cards.">Each candidate's strengths (green boxes) and concerns (orange boxes) are displayed directly on your ballot recommendation cards. These give you a quick, balanced view of each candidate's key advantages and potential drawbacks — all generated with the same analytical rigor for every candidate in a race.</p>

      <h2 data-t="What issues does the interview cover?">What issues does the interview cover?</h2>
      <p data-t="The interview lets you select from 21 issues. You pick your top 3-5, and the interview dives deeper into each one.">The interview lets you select from 21 issues: Economy &amp; Cost of Living, Housing, Public Safety, Education, Healthcare, Environment &amp; Climate, Grid &amp; Infrastructure, Tech &amp; Innovation, Transportation, Immigration, Taxes, Civil Rights, Gun Policy, Abortion &amp; Reproductive Rights, Water &amp; Land, Agriculture &amp; Rural, Faith &amp; Religious Liberty, Criminal Justice, Energy &amp; Oil/Gas, LGBTQ+ Rights, and Voting &amp; Elections. You pick your top 3-5, and the interview dives deeper into each one.</p>
    </div>

    <h2 data-t="Related">Related</h2>
    <ul class="related-links">
      <li><a href="/how-it-works" data-t="How It Works">How It Works</a> — <span data-t="Plain-language explanation of the app and AI">Plain-language explanation of the app and AI</span></li>
      <li><a href="/nonpartisan" data-t="Nonpartisan by Design">Nonpartisan by Design</a> — <span data-t="How we keep the app fair for all voters">How we keep the app fair for all voters</span></li>
      <li><a href="/candidates" data-t="All Candidates">All Candidates</a> — <span data-t="Browse every candidate with detailed profiles">Browse every candidate with detailed profiles</span></li>
    </ul>

    <div class="page-footer"><a href="/" data-t="Texas Votes">Texas Votes</a> &middot; <a href="/how-it-works" data-t="How It Works">How It Works</a> &middot; <a href="/privacy" data-t="Privacy">Privacy</a><br><span style="color:var(--red)">&starf;</span> <span data-t="Built in Texas">Built in Texas</span> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></div>
  </div>
  ${pageI18n({
    'Support': 'Soporte',
    'We\'re here to help.': 'Estamos aqu\u00ED para ayudarte.',
    'Email Us': 'Env\u00EDanos un Correo',
    'Frequently Asked Questions': 'Preguntas Frecuentes',
    'How do I reset my voting guide?': '\u00BFC\u00F3mo reinicio mi gu\u00EDa de votaci\u00F3n?',
    'Go to the Profile tab and tap Start Over at the bottom. This erases your profile and recommendations so you can retake the interview.': 'Ve a la pesta\u00F1a de Perfil y toca "Empezar de Nuevo" en la parte inferior. Esto borra tu perfil y recomendaciones para que puedas retomar la entrevista.',
    'Are the recommendations accurate?': '\u00BFSon precisas las recomendaciones?',
    'Recommendations are generated by AI based on real candidate data and your stated preferences. They\'re a starting point \\u2014 we always encourage doing your own research. The app includes a disclaimer on every screen.': 'Las recomendaciones son generadas por IA basadas en datos reales de candidatos y tus preferencias. Son un punto de partida \\u2014 siempre recomendamos hacer tu propia investigaci\u00F3n. La app incluye un aviso en cada pantalla.',
    'Where is my data stored?': '\u00BFD\u00F3nde se almacenan mis datos?',
    'Everything stays on your device. We don\'t store your data on our servers.': 'Todo permanece en tu dispositivo. No almacenamos tus datos en nuestros servidores.',
    'Which elections are covered?': '\u00BFQu\u00E9 elecciones est\u00E1n cubiertas?',
    'Texas Votes covers the March 3, 2026 Texas Primary Election for all Texas voters, including both Republican and Democratic primaries.': 'Texas Votes cubre la Elecci\u00F3n Primaria de Texas del 3 de marzo de 2026 para todos los votantes de Texas, incluyendo las primarias Republicana y Dem\u00F3crata.',
    'I found wrong information about a candidate.': 'Encontr\u00E9 informaci\u00F3n incorrecta sobre un candidato.',
    'Use the Flag this info button on any candidate card in the app to report inaccuracies or bias. You can also email us directly and we\'ll correct it as quickly as possible.': 'Usa el bot\u00F3n "Reportar esta info" en cualquier tarjeta de candidato en la app para reportar inexactitudes o sesgo. Tambi\u00E9n puedes enviarnos un correo directamente y lo corregiremos lo m\u00E1s r\u00E1pido posible.',
    'Where does the candidate data come from?': '\u00BFDe d\u00F3nde vienen los datos de los candidatos?',
    'Candidate data is researched using AI with web search, cross-referenced against official filings from the Texas Secretary of State, county clerks, and Ballotpedia.': 'Los datos de candidatos se investigan usando IA con b\u00FAsqueda web, verificados contra archivos oficiales del Secretario de Estado de Texas, secretarios del condado y Ballotpedia.',
    'Can I preview what the ballot looks like before doing the interview?': '\u00BFPuedo ver c\u00F3mo se ve la boleta antes de hacer la entrevista?',
    'Yes! Visit our sample ballot page to see fictional candidates and recommendations that demonstrate exactly what your personalized guide will look like.': '\u00A1S\u00ED! Visita nuestra p\u00E1gina de boleta de ejemplo para ver candidatos ficticios y recomendaciones que demuestran exactamente c\u00F3mo se ver\u00E1 tu gu\u00EDa personalizada.',
    'How do you ensure candidates are treated equally?': '\u00BFC\u00F3mo aseguran que los candidatos sean tratados por igual?',
    'We run automated balance checks that score the symmetry of pros/cons across all candidates in every race.': 'Ejecutamos verificaciones autom\u00E1ticas de equilibrio que eval\u00FAan la simetr\u00EDa de pros y contras entre todos los candidatos en cada carrera.',
    'What are the strengths and concerns on my ballot?': '\u00BFQu\u00E9 son las fortalezas y preocupaciones en mi boleta?',
    'Each candidate\'s strengths and concerns are displayed directly on your ballot recommendation cards.': 'Las fortalezas y preocupaciones de cada candidato se muestran directamente en tus tarjetas de recomendaci\u00F3n de boleta.',
    'What issues does the interview cover?': '\u00BFQu\u00E9 temas cubre la entrevista?',
    'The interview lets you select from 21 issues. You pick your top 3-5, and the interview dives deeper into each one.': 'La entrevista te permite seleccionar entre 21 temas. Eliges tus 3-5 principales y la entrevista profundiza en cada uno.',
  })}
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
  ${pageHead({
    title: "Privacy Policy — Texas Votes",
    description: "Texas Votes privacy policy. All data stays on your device. No accounts, no tracking, no personal data collected.",
    url: "https://txvotes.app/privacy",
  })}
</head>
<body>
  <div class="container">
    <a href="/" class="back-top">&larr; Texas Votes</a>
    <h1 data-t="Privacy Policy">Privacy Policy</h1>
    <p class="updated" data-t="Last updated: February 22, 2026">Last updated: February 22, 2026</p>

    <div class="cta-banner"><a class="cta-btn" href="/app?start=1" data-t="Build My Voting Guide">Build My Voting Guide</a><p class="cta-sub" data-t="5-minute personalized ballot">5-minute personalized ballot</p></div>

    <p data-t="Texas Votes is a free voting guide website for Texas elections. Your privacy matters — here's exactly what happens with your data.">Texas Votes (<a href="https://txvotes.app">txvotes.app</a>) is a free voting guide website for Texas elections. Your privacy matters — here's exactly what happens with your data.</p>

    <h2 data-t="What we collect">What we collect</h2>
    <p data-t="We collect only what you provide during the interview:">We collect only what you provide during the interview:</p>
    <ul>
      <li data-t="Voter preferences — your top issues, political outlook, policy views, and candidate qualities">Voter preferences — your top issues, political outlook, policy views, and candidate qualities</li>
      <li data-t="Street address — used once to look up your voting districts">Street address — used once to look up your voting districts</li>
    </ul>

    <h2 data-t="How we use it">How we use it</h2>
    <ul>
      <li data-t="Your preferences are sent to our server to generate personalized ballot recommendations using AI">Your preferences are sent to our server to generate personalized ballot recommendations using AI (Claude by Anthropic)</li>
      <li data-t="Your address is sent to the U.S. Census Bureau Geocoder API to determine your districts">Your address is sent to the U.S. Census Bureau Geocoder API to determine your congressional, state house, and state senate districts</li>
      <li data-t="After generating your guide, your profile and ballot are stored locally in your browser">After generating your guide, your profile and ballot are stored locally in your browser</li>
    </ul>

    <h2 data-t="What we don't do">What we don't do</h2>
    <ul>
      <li data-t="We do not store your data on our servers">We do <strong>not</strong> store your data on our servers — the API proxy processes requests and discards them</li>
      <li data-t="We do not sell, share, or rent your personal information to anyone">We do <strong>not</strong> sell, share, or rent your personal information to anyone</li>
      <li data-t="We use Cloudflare Web Analytics for anonymous page-view counts only — no cookies, no personal data">We use <strong>Cloudflare Web Analytics</strong> for anonymous page-view counts only — no cookies, no personal data, no tracking across sites</li>
      <li data-t="We count anonymous usage events to improve the app. These counts contain no personal information.">We count anonymous usage events (like "guide generated" or "cheat sheet printed") to improve the app. These counts contain no personal information, no IP addresses, and no way to identify individual users.</li>
      <li data-t="We do not use tracking pixels or advertising SDKs">We do <strong>not</strong> use tracking pixels or advertising SDKs</li>
      <li data-t="We do not collect device identifiers, IP addresses, or usage data">We do <strong>not</strong> collect device identifiers, IP addresses, or usage data</li>
    </ul>

    <h2 data-t="Local storage">Local storage</h2>
    <p data-t="Your voter profile and ballot are saved in your browser's local storage so they persist between visits. This data never leaves your device unless you generate a new guide.">Your voter profile and ballot are saved in your browser's local storage so they persist between visits. This data never leaves your device unless you generate a new guide. Clearing your browser data will remove it.</p>

    <h2 data-t="Third-party services">Third-party services</h2>
    <ul>
      <li data-t="Anthropic (Claude API) — processes your voter profile to generate recommendations.">Anthropic (Claude API) — processes your voter profile to generate recommendations. Subject to <a href="https://www.anthropic.com/privacy">Anthropic's privacy policy</a>.</li>
      <li data-t="U.S. Census Bureau Geocoder — receives your address to return district information.">U.S. Census Bureau Geocoder — receives your address to return district information. A public government API.</li>
      <li data-t="Cloudflare Workers — our API proxy runs on Cloudflare. Requests are processed in memory and not stored.">Cloudflare Workers — our API proxy runs on Cloudflare. Requests are processed in memory and not logged or stored.</li>
      <li data-t="Cloudflare Web Analytics — collects anonymous page-view counts. No cookies, no personal data.">Cloudflare Web Analytics — collects anonymous page-view counts. No cookies, no personal data, no cross-site tracking. Subject to <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare's privacy policy</a>.</li>
    </ul>

    <h2 data-t="Data deletion">Data deletion</h2>
    <p data-t="Click Start Over in the Profile tab to erase all local data at any time. Since we don't store anything on our servers, there's nothing else to delete.">Click "Start Over" in the Profile tab to erase all local data at any time. Since we don't store anything on our servers, there's nothing else to delete.</p>

    <h2 data-t="Children's privacy">Children's privacy</h2>
    <p data-t="This site is not directed at children under 13 and does not knowingly collect information from children.">This site is not directed at children under 13 and does not knowingly collect information from children.</p>

    <h2 data-t="Changes">Changes</h2>
    <p data-t="If this policy changes, we'll update the date above and publish the new version at this URL.">If this policy changes, we'll update the date above and publish the new version at this URL.</p>

    <h2 data-t="Contact">Contact</h2>
    <p data-t="Questions? Email us">Questions? Email <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>

    <h2 data-t="Related">Related</h2>
    <ul class="related-links">
      <li><a href="/how-it-works" data-t="How It Works">How It Works</a> — <span data-t="Plain-language explanation of the app and AI">Plain-language explanation of the app and AI</span></li>
      <li><a href="/nonpartisan" data-t="Nonpartisan by Design">Nonpartisan by Design</a> — <span data-t="How we keep the app fair for all voters">How we keep the app fair for all voters</span></li>
      <li><a href="/audit" data-t="AI Bias Audit">AI Bias Audit</a> — <span data-t="Independent review of our AI by four different systems">Independent review of our AI by four different systems</span></li>
      <li><a href="/data-quality" data-t="Data Quality Dashboard">Data Quality Dashboard</a> — <span data-t="Live metrics on how complete our data is">Live metrics on how complete our data is</span></li>
      <li><a href="/open-source" data-t="Open Source">Open Source</a> — <span data-t="Source code, architecture, and independent code reviews">Source code, architecture, and independent code reviews</span></li>
      <li><a href="/candidates" data-t="All Candidates">All Candidates</a> — <span data-t="Browse every candidate with detailed profiles">Browse every candidate with detailed profiles</span></li>
    </ul>

    <div class="page-footer"><a href="/" data-t="Texas Votes">Texas Votes</a> &middot; <a href="/how-it-works" data-t="How It Works">How It Works</a> &middot; <a href="/privacy" data-t="Privacy">Privacy</a><br><span style="color:var(--red)">&starf;</span> <span data-t="Built in Texas">Built in Texas</span> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></div>
  </div>
  ${pageI18n({
    'Last updated: February 22, 2026': '\u00DAltima actualizaci\u00F3n: 22 de febrero de 2026',
    'Texas Votes is a free voting guide website for Texas elections. Your privacy matters \\u2014 here\'s exactly what happens with your data.': 'Texas Votes es un sitio web gratuito de gu\u00EDa de votaci\u00F3n para las elecciones de Texas. Tu privacidad importa \\u2014 aqu\u00ED est\u00E1 exactamente lo que pasa con tus datos.',
    'What we collect': 'Lo que recopilamos',
    'We collect only what you provide during the interview:': 'Solo recopilamos lo que proporcionas durante la entrevista:',
    'Voter preferences \\u2014 your top issues, political outlook, policy views, and candidate qualities': 'Preferencias del votante \\u2014 tus temas principales, perspectiva pol\u00EDtica, opiniones sobre pol\u00EDticas y cualidades de candidatos',
    'Street address \\u2014 used once to look up your voting districts': 'Direcci\u00F3n \\u2014 utilizada una vez para buscar tus distritos electorales',
    'How we use it': 'C\u00F3mo lo usamos',
    'Your preferences are sent to our server to generate personalized ballot recommendations using AI': 'Tus preferencias se env\u00EDan a nuestro servidor para generar recomendaciones personalizadas de boleta usando IA',
    'Your address is sent to the U.S. Census Bureau Geocoder API to determine your districts': 'Tu direcci\u00F3n se env\u00EDa a la API del Geocodificador del Censo de EE.UU. para determinar tus distritos',
    'After generating your guide, your profile and ballot are stored locally in your browser': 'Despu\u00E9s de generar tu gu\u00EDa, tu perfil y boleta se almacenan localmente en tu navegador',
    'What we don\'t do': 'Lo que NO hacemos',
    'We do not store your data on our servers': 'NO almacenamos tus datos en nuestros servidores',
    'We do not sell, share, or rent your personal information to anyone': 'NO vendemos, compartimos ni alquilamos tu informaci\u00F3n personal a nadie',
    'We use Cloudflare Web Analytics for anonymous page-view counts only \\u2014 no cookies, no personal data': 'Usamos Cloudflare Web Analytics solo para conteos an\u00F3nimos de visitas \\u2014 sin cookies, sin datos personales',
    'We count anonymous usage events to improve the app. These counts contain no personal information.': 'Contamos eventos de uso an\u00F3nimos para mejorar la app. Estos conteos no contienen informaci\u00F3n personal.',
    'We do not use tracking pixels or advertising SDKs': 'NO usamos p\u00EDxeles de seguimiento ni SDKs publicitarios',
    'We do not collect device identifiers, IP addresses, or usage data': 'NO recopilamos identificadores de dispositivo, direcciones IP ni datos de uso',
    'Local storage': 'Almacenamiento local',
    'Your voter profile and ballot are saved in your browser\'s local storage so they persist between visits. This data never leaves your device unless you generate a new guide.': 'Tu perfil de votante y boleta se guardan en el almacenamiento local de tu navegador para que persistan entre visitas. Estos datos nunca salen de tu dispositivo a menos que generes una nueva gu\u00EDa.',
    'Third-party services': 'Servicios de terceros',
    'Anthropic (Claude API) \\u2014 processes your voter profile to generate recommendations.': 'Anthropic (Claude API) \\u2014 procesa tu perfil de votante para generar recomendaciones.',
    'U.S. Census Bureau Geocoder \\u2014 receives your address to return district information.': 'Geocodificador del Censo de EE.UU. \\u2014 recibe tu direcci\u00F3n para devolver informaci\u00F3n de distritos.',
    'Cloudflare Workers \\u2014 our API proxy runs on Cloudflare. Requests are processed in memory and not stored.': 'Cloudflare Workers \\u2014 nuestro proxy API se ejecuta en Cloudflare. Las solicitudes se procesan en memoria y no se almacenan.',
    'Cloudflare Web Analytics \\u2014 collects anonymous page-view counts. No cookies, no personal data.': 'Cloudflare Web Analytics \\u2014 recopila conteos an\u00F3nimos de visitas. Sin cookies, sin datos personales.',
    'Data deletion': 'Eliminaci\u00F3n de datos',
    'Click Start Over in the Profile tab to erase all local data at any time. Since we don\'t store anything on our servers, there\'s nothing else to delete.': 'Haz clic en "Empezar de Nuevo" en la pesta\u00F1a de Perfil para borrar todos los datos locales en cualquier momento. Como no almacenamos nada en nuestros servidores, no hay nada m\u00E1s que eliminar.',
    'Children\'s privacy': 'Privacidad de menores',
    'This site is not directed at children under 13 and does not knowingly collect information from children.': 'Este sitio no est\u00E1 dirigido a menores de 13 a\u00F1os y no recopila intencionalmente informaci\u00F3n de menores.',
    'Changes': 'Cambios',
    'If this policy changes, we\'ll update the date above and publish the new version at this URL.': 'Si esta pol\u00EDtica cambia, actualizaremos la fecha arriba y publicaremos la nueva versi\u00F3n en esta URL.',
    'Contact': 'Contacto',
    'Questions? Email us': '\u00BFPreguntas? Env\u00EDanos un correo',
  })}
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
  ${pageHead({
    title: "Open Source — Texas Votes",
    description: "Texas Votes is open source. Every line of code, every AI prompt, every design decision is public. View the code, read independent AI reviews, and contribute.",
    url: "https://txvotes.app/open-source",
  })}
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
    <a href="/" class="back-top">&larr; Texas Votes</a>
    <h1 data-t="Texas Votes is Open Source">Texas Votes is Open Source</h1>
    <p class="subtitle" data-t="This app is built transparently. Every line of code, every AI prompt, every design decision is public.">This app is built transparently. Every line of code, every AI prompt, every design decision is public. We believe voting tools should be accountable to the voters who use them.</p>

    <div class="cta-banner"><a class="cta-btn" href="/app?start=1" data-t="Build My Voting Guide">Build My Voting Guide</a><p class="cta-sub" data-t="5-minute personalized ballot">5-minute personalized ballot</p></div>

    <h2 data-t="Why Open Source?">Why Open Source?</h2>
    <ul>
      <li data-t="Trust through transparency — voters can verify there's no hidden bias.">Trust through transparency — voters can verify there's no hidden bias in the code, the AI prompts, or the data pipeline. You don't have to take our word for it.</li>
      <li data-t="Community contribution — anyone can suggest improvements or report issues.">Community contribution — anyone can suggest improvements, report issues, or help improve candidate data accuracy.</li>
      <li data-t="Replicability — other states and cities can fork this project for their own elections.">Replicability — other states and cities can fork this project and adapt it for their own elections. Democracy works better when good tools are shared.</li>
    </ul>

    <h2 data-t="The Code">The Code</h2>
    <!-- TODO: Update URL when GitHub repo is created (see todolist) -->
    <p data-t="The full source code is available on GitHub.">The full source code is available on GitHub: <a href="https://github.com/txvotes/txvotes">github.com/txvotes/txvotes</a> <span style="font-size:0.85rem;color:var(--text2)">(repo pending — coming soon)</span></p>

    <p data-t="Texas Votes is a single-file progressive web app served directly from a Cloudflare Worker.">Texas Votes is a single-file progressive web app served directly from a Cloudflare Worker. There's no build step, no framework, no bundler. The entire app — HTML, CSS, and JavaScript — is generated server-side and delivered as one response.</p>

    <ul class="tech-list">
      <li><strong>JavaScript</strong> — vanilla JS, no frameworks</li>
      <li><strong>Cloudflare Workers</strong> — edge server</li>
      <li><strong>KV Storage</strong> — election data</li>
      <li><strong>Claude API</strong> — guide generation</li>
      <li><strong>Census Geocoder</strong> — district lookup</li>
      <li><strong>PWA</strong> — works offline, installable</li>
    </ul>

    <h2 data-t="Independent AI Code Reviews">Independent AI Code Reviews</h2>
    <p data-t="We submitted our full codebase to four independent AI systems for review.">We submitted our full codebase — including all AI prompts, the data pipeline, and our methodology — to four independent AI systems for review. Each was asked to evaluate the code for partisan bias, security issues, and overall code quality.</p>

    <div class="review-cards">
      <div class="review-card">
        <h3 data-t="ChatGPT Code Review">ChatGPT Code Review</h3>
        <p class="quote">"Well-intentioned methodology with strong transparency practices and balanced prompt design." — 7.5/10</p>
        <a href="/audit" data-t="Read the full review">Read the full review &rarr;</a>
      </div>
      <div class="review-card">
        <h3 data-t="Gemini Code Review">Gemini Code Review</h3>
        <p class="quote">"A strong model for nonpartisan AI voting tools. Technically rigorous with exceptional transparency." — 8.0/10</p>
        <a href="/audit" data-t="Read the full review">Read the full review &rarr;</a>
      </div>
      <div class="review-card">
        <h3 data-t="Grok Code Review">Grok Code Review</h3>
        <p class="quote">"Solid nonpartisan framework with good safeguards. Source hierarchy and daily verification add credibility." — 7.8/10</p>
        <a href="/audit" data-t="Read the full review">Read the full review &rarr;</a>
      </div>
      <div class="review-card">
        <h3 data-t="Claude Code Review">Claude Code Review</h3>
        <p class="quote">"Self-review identifies genuine blind spots. Strong prompt-level guardrails with room for runtime bias detection." — 7.6/10</p>
        <a href="/audit" data-t="Read the full review">Read the full review &rarr;</a>
      </div>
    </div>

    <h2 data-t="Automated Testing">Automated Testing</h2>
    <p data-t="648 automated tests covering interview flow, guide generation, routing, data validation, and more.">648 automated tests across 11 test files covering interview flow, guide generation, routing, data validation, balance checks, bias testing, and audit automation. Tests run on every change to catch regressions before they reach voters.</p>

    <h2 data-t="How to Contribute">How to Contribute</h2>
    <ul>
      <li data-t="Report issues — found a bug or incorrect candidate data?">Report issues — found a bug or incorrect candidate data? <a href="https://github.com/txvotes/txvotes/issues">Open an issue on GitHub</a> or <a href="mailto:howdy@txvotes.app">email us</a>.</li>
      <li data-t="Submit pull requests — code improvements and new features are welcome.">Submit pull requests — code improvements, accessibility fixes, and new features are welcome.</li>
      <li data-t="Help expand to other states — the architecture is designed to be forked.">Help expand to other states — the architecture is designed to be forked. If you want to build a voting guide for your state, we'll help you get started.</li>
      <li data-t="Spread the word — share txvotes.app with fellow Texas voters.">Spread the word — share <a href="https://txvotes.app">txvotes.app</a> with fellow Texas voters.</li>
    </ul>
    <p data-t="Contact us anytime">Contact us anytime: <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></p>

    <h2 data-t="License">License</h2>
    <p data-t="Texas Votes is released under the MIT License.">Texas Votes is released under the <strong>MIT License</strong>. This means you're free to use, modify, and distribute the code for any purpose — including building your own voting guide for another state or city. The only requirement is that you include the original license notice.</p>

    <h2 data-t="Related">Related</h2>
    <ul class="related-links">
      <li><a href="/how-it-works" data-t="How It Works">How It Works</a> — <span data-t="Plain-language explanation for non-technical users">Plain-language explanation for non-technical users</span></li>
      <li><a href="/audit" data-t="AI Bias Audit">AI Bias Audit</a> — <span data-t="Independent review by four AI systems">Independent review by four AI systems</span></li>
      <li><a href="/data-quality" data-t="Data Quality Dashboard">Data Quality Dashboard</a> — <span data-t="Live metrics on ballot coverage and candidate completeness">Live metrics on ballot coverage and candidate completeness</span></li>
      <li><a href="/nonpartisan" data-t="Nonpartisan by Design">Nonpartisan by Design</a> — <span data-t="How we ensure fairness for all voters">How we ensure fairness for all voters</span></li>
      <li><a href="/candidates" data-t="All Candidates">All Candidates</a> — <span data-t="Browse every candidate with detailed profiles">Browse every candidate with detailed profiles</span></li>
    </ul>

    <div class="page-footer"><a href="/" data-t="Texas Votes">Texas Votes</a> &middot; <a href="/how-it-works" data-t="How It Works">How It Works</a> &middot; <a href="/privacy" data-t="Privacy">Privacy</a><br><span style="color:var(--red)">&starf;</span> <span data-t="Built in Texas">Built in Texas</span> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></div>
  </div>
  ${pageI18n({
    'Texas Votes is Open Source': 'Texas Votes es C\u00F3digo Abierto',
    'This app is built transparently. Every line of code, every AI prompt, every design decision is public.': 'Esta app est\u00E1 construida con transparencia. Cada l\u00EDnea de c\u00F3digo, cada prompt de IA, cada decisi\u00F3n de dise\u00F1o es p\u00FAblica.',
    'Why Open Source?': '\u00BFPor Qu\u00E9 C\u00F3digo Abierto?',
    'Trust through transparency \\u2014 voters can verify there\'s no hidden bias.': 'Confianza a trav\u00E9s de la transparencia \\u2014 los votantes pueden verificar que no hay sesgo oculto.',
    'Community contribution \\u2014 anyone can suggest improvements or report issues.': 'Contribuci\u00F3n comunitaria \\u2014 cualquiera puede sugerir mejoras o reportar problemas.',
    'Replicability \\u2014 other states and cities can fork this project for their own elections.': 'Replicabilidad \\u2014 otros estados y ciudades pueden bifurcar este proyecto para sus propias elecciones.',
    'The Code': 'El C\u00F3digo',
    'The full source code is available on GitHub.': 'El c\u00F3digo fuente completo est\u00E1 disponible en GitHub.',
    'Texas Votes is a single-file progressive web app served directly from a Cloudflare Worker.': 'Texas Votes es una app web progresiva de un solo archivo servida directamente desde un Cloudflare Worker.',
    'Independent AI Code Reviews': 'Revisiones Independientes de C\u00F3digo por IA',
    'We submitted our full codebase to four independent AI systems for review.': 'Enviamos nuestro c\u00F3digo completo a cuatro sistemas de IA independientes para revisi\u00F3n.',
    'ChatGPT Code Review': 'Revisi\u00F3n de C\u00F3digo por ChatGPT',
    'Gemini Code Review': 'Revisi\u00F3n de C\u00F3digo por Gemini',
    'Grok Code Review': 'Revisi\u00F3n de C\u00F3digo por Grok',
    'Claude Code Review': 'Revisi\u00F3n de C\u00F3digo por Claude',
    'Read the full review': 'Leer la revisi\u00F3n completa',
    'Automated Testing': 'Pruebas Automatizadas',
    '648 automated tests covering interview flow, guide generation, routing, data validation, and more.': '648 pruebas automatizadas cubriendo flujo de entrevista, generaci\u00F3n de gu\u00EDa, enrutamiento, validaci\u00F3n de datos y m\u00E1s.',
    'How to Contribute': 'C\u00F3mo Contribuir',
    'Report issues \\u2014 found a bug or incorrect candidate data?': 'Reportar problemas \\u2014 \u00BFencontraste un error o datos incorrectos de candidatos?',
    'Submit pull requests \\u2014 code improvements and new features are welcome.': 'Enviar pull requests \\u2014 mejoras de c\u00F3digo y nuevas funciones son bienvenidas.',
    'Help expand to other states \\u2014 the architecture is designed to be forked.': 'Ayudar a expandir a otros estados \\u2014 la arquitectura est\u00E1 dise\u00F1ada para ser bifurcada.',
    'Spread the word \\u2014 share txvotes.app with fellow Texas voters.': 'Corre la voz \\u2014 comparte txvotes.app con otros votantes de Texas.',
    'Contact us anytime': 'Cont\u00E1ctanos en cualquier momento',
    'License': 'Licencia',
    'Texas Votes is released under the MIT License.': 'Texas Votes est\u00E1 publicado bajo la Licencia MIT.',
  })}
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

/// MARK: - Balance Check API

async function handleBalanceCheck(env) {
  const parties = ["republican", "democrat"];
  const results = {};

  for (const party of parties) {
    let raw = await env.ELECTION_DATA.get(`ballot:statewide:${party}_primary_2026`);
    if (!raw) raw = await env.ELECTION_DATA.get(`ballot:${party}_primary_2026`);
    if (!raw) {
      results[party] = { error: "No ballot data" };
      continue;
    }
    const ballot = JSON.parse(raw);
    results[party] = checkBallotBalance(ballot);
  }

  // Combined score: average of both party scores
  const scores = Object.values(results).filter(r => r.summary).map(r => r.summary.score);
  const combinedScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return jsonResponse({
    combinedScore,
    parties: results,
  }, 200, {
    "Cache-Control": "public, max-age=3600",
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
    await invalidateCandidatesIndex(env);
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
  await invalidateCandidatesIndex(env);
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
  ${pageHead({
    title: "Candidate Not Found — Texas Votes",
    description: "The candidate you are looking for could not be found on Texas Votes.",
    url: "https://txvotes.app/candidates",
  })}
</head>
<body>
  <div class="container">
    <a href="/candidates" class="back-top">&larr; <span data-t="All Candidates">All Candidates</span></a>
    <h1 data-t="Candidate Not Found">Candidate Not Found</h1>
    <p class="subtitle" data-t="We couldn't find a candidate matching this URL.">We couldn't find a candidate matching "${escapeHtml(slug)}". The candidate may not be in our database yet, or the URL may be incorrect.</p>
    <div class="page-footer"><a href="/" data-t="Texas Votes">Texas Votes</a> &middot; <a href="/how-it-works" data-t="How It Works">How It Works</a> &middot; <a href="/privacy" data-t="Privacy">Privacy</a><br><span style="color:var(--red)">&starf;</span> <span data-t="Built in Texas">Built in Texas</span> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></div>
  </div>
  ${pageI18n({
    'Candidate Not Found': 'Candidato No Encontrado',
    'We couldn\'t find a candidate matching this URL.': 'No pudimos encontrar un candidato que coincida con esta URL.',
  })}
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

  // Load manifest for data freshness timestamp
  let dataUpdatedAt = null;
  try {
    const manifestRaw = await env.ELECTION_DATA.get("manifest");
    if (manifestRaw) {
      const manifest = JSON.parse(manifestRaw);
      if (manifest[entry.party] && manifest[entry.party].updatedAt) {
        dataUpdatedAt = manifest[entry.party].updatedAt;
      }
    }
  } catch { /* non-fatal */ }

  // Build sections conditionally
  const sections = [];

  // Headshot — rendered inline next to name, not in sections
  const initials = c.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  const headshotImg = `<img src="/headshots/${escapeHtml(slug)}.jpg?v=2" alt="Photo of ${name}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--border);flex-shrink:0" onerror="if(this.src.indexOf('.jpg')!==-1){this.src=this.src.replace('.jpg','.png')}else{this.style.display='none';this.nextElementSibling.style.display='flex'}"><span style="display:none;width:72px;height:72px;border-radius:50%;background:var(--border);flex-shrink:0;align-items:center;justify-content:center;font-size:1.5rem;color:var(--text2)">${escapeHtml(initials)}</span>`;

  // Meta badges
  const badges = [];
  if (c.withdrawn) badges.push("Withdrawn");
  if (c.incumbent || c.isIncumbent) badges.push("Incumbent");
  badges.push(partyLabel);
  if (c.age) badges.push(`Age ${escapeHtml(String(c.age))}`);
  if (badges.length) {
    sections.push(`<div style="margin-bottom:1.5rem">${badges.map(b => {
      const style = b === "Withdrawn" ? "margin-right:0.5rem;margin-bottom:0.5rem;background:#c62626;color:#fff" : "margin-right:0.5rem;margin-bottom:0.5rem";
      return `<span class="badge" style="${style}">${escapeHtml(b)}</span>`;
    }).join("")}</div>`);
  }
  if (c.withdrawn) {
    sections.push(`<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:0.75rem 1rem;margin-bottom:1.5rem;font-size:0.95rem"><strong>This candidate has withdrawn</strong> from the race and will not appear on the ballot.</div>`);
  }
  if (isSparseCandidate(c)) {
    sections.push(`<div style="background:rgba(128,128,128,.08);border:1px solid var(--border);border-radius:8px;padding:0.75rem 1rem;margin-bottom:1.5rem;font-size:0.9rem;color:var(--text2)"><strong>Limited public information</strong> is available for this candidate. If you have corrections or additional data, please <a href="mailto:howdy@txvotes.app?subject=Data%20for%20${encodeURIComponent(c.name)}">let us know</a>.</div>`);
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
      sections.push(`<h2>Endorsements</h2><ul>${endorsements.map(e => {
        const ne = normalizeEndorsement(e);
        const typeLabel = ne.type ? ` <span style="color:#666;font-size:0.85em">(${escapeHtml(ne.type)})</span>` : "";
        return `<li>${escapeHtml(ne.name)}${typeLabel}</li>`;
      }).join("")}</ul>`);
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

  // Sources
  if (c.sources && c.sources.length) {
    const sourceItems = c.sources
      .filter(s => s && s.url)
      .map(s => {
        const title = escapeHtml(s.title || s.url);
        const url = escapeHtml(s.url);
        const dateStr = s.accessDate ? ` <span style="color:var(--text2);font-size:0.85rem">(${escapeHtml(s.accessDate)})</span>` : "";
        return `<li style="margin-bottom:0.35rem"><a href="${url}" target="_blank" rel="noopener noreferrer" style="word-break:break-all">${title}</a>${dateStr}</li>`;
      })
      .join("");
    sections.push(`<h2>Sources <span style="font-size:0.85rem;font-weight:400;color:var(--text2)">(${c.sources.length})</span></h2><ul style="padding-left:1.25rem">${sourceItems}</ul>`);
  }

  const ogDescription = rawSummary
    ? rawSummary.slice(0, 160) + (rawSummary.length > 160 ? "..." : "")
    : `${c.name} is running for ${entry.race} in the 2026 Texas ${partyLabel} Primary.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  ${pageHead({
    title: `${name} — ${escapeHtml(entry.race)} — Texas Votes`,
    description: escapeHtml(ogDescription),
    url: `https://txvotes.app/candidate/${escapeHtml(entry.slug)}`,
    image: `https://txvotes.app/headshots/${escapeHtml(entry.slug)}.jpg`,
    type: "profile",
  })}
</head>
<body>
  <div class="container">
    <a href="/candidates" class="back-top">&larr; <span data-t="All Candidates">All Candidates</span></a>
    <div style="display:flex;align-items:center;gap:1rem;margin-top:1rem">
      ${headshotImg}
      <div>
        <h1 style="margin:0">${name}</h1>
        <p class="subtitle" style="margin:0.25rem 0 0">${escapeHtml(entry.race)} &middot; ${escapeHtml(partyLabel)} Primary 2026</p>
      </div>
    </div>

    <div class="cta-banner"><a class="cta-btn" href="/app?start=1" data-t="Build My Voting Guide">Build My Voting Guide</a><p class="cta-sub" data-t="5-minute personalized ballot">5-minute personalized ballot</p></div>

    ${sections.join("\n    ")}
    ${dataUpdatedAt ? `<p style="margin-top:2rem;font-size:0.85rem;color:var(--text2)" data-t="Data last verified">Data last verified: ${new Date(dataUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}${c.sources && c.sources.length ? ` &middot; ${c.sources.length} source${c.sources.length === 1 ? "" : "s"} cited` : ""}</p>` : ""}
    <p style="margin-top:${dataUpdatedAt ? "0.5rem" : "2rem"};font-size:0.9rem;color:var(--text2)" data-t="See something wrong? Let us know and we'll fix it.">See something wrong? <a href="mailto:howdy@txvotes.app?subject=Data correction: ${encodeURIComponent(c.name)}">Let us know</a> and we'll fix it.</p>

    <h2 data-t="Related">Related</h2>
    <ul class="related-links">
      <li><a href="/candidates" data-t="All Candidates">All Candidates</a> — <span data-t="Browse every candidate with detailed profiles">Browse every candidate with detailed profiles</span></li>
      <li><a href="/how-it-works" data-t="How It Works">How It Works</a> — <span data-t="Plain-language explanation of the app and AI">Plain-language explanation of the app and AI</span></li>
      <li><a href="/sample-ballot" data-t="Sample Ballot">Sample Ballot</a> — <span data-t="See what a personalized ballot looks like">See what a personalized ballot looks like</span></li>
      <li><a href="/data-quality" data-t="Data Quality Dashboard">Data Quality Dashboard</a> — <span data-t="Live metrics on ballot coverage and candidate completeness">Live metrics on ballot coverage and candidate completeness</span></li>
      <li><a href="/nonpartisan" data-t="Nonpartisan by Design">Nonpartisan by Design</a> — <span data-t="How we keep the app fair for all voters">How we keep the app fair for all voters</span></li>
    </ul>

    <div class="page-footer"><a href="/" data-t="Texas Votes">Texas Votes</a> &middot; <a href="/how-it-works" data-t="How It Works">How It Works</a> &middot; <a href="/privacy" data-t="Privacy">Privacy</a><br><span style="color:var(--red)">&starf;</span> <span data-t="Built in Texas">Built in Texas</span> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></div>
  </div>
  ${pageI18n({
    'See something wrong? Let us know and we\'ll fix it.': '\u00BFVes algo incorrecto? D\u00EDnoslo y lo corregiremos.',
    'Data last verified': 'Datos verificados por \u00FAltima vez',
    'About': 'Acerca de',
    'Education': 'Educaci\u00F3n',
    'Experience': 'Experiencia',
    'Key Positions': 'Posiciones Clave',
    'Strengths': 'Fortalezas',
    'Concerns': 'Preocupaciones',
    'Endorsements': 'Respaldos',
    'Polling': 'Encuestas',
    'Fundraising': 'Recaudaci\u00F3n de Fondos',
    'Sources': 'Fuentes',
  })}
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

  // Collect unique county names from candidates
  const countySet = new Set();
  for (const entry of allCandidates) {
    if (entry.countyName) countySet.add(entry.countyName);
  }
  const countyNames = [...countySet].sort();

  // Group by race name, then by party within each race
  // Also track which county each race belongs to (null = statewide)
  const raceMap = new Map(); // raceLabel -> { republican: [], democrat: [], countyName }
  for (const entry of allCandidates) {
    if (!raceMap.has(entry.race)) {
      raceMap.set(entry.race, { republican: [], democrat: [], countyName: entry.countyName || null });
    }
    raceMap.get(entry.race)[entry.party].push(entry);
  }

  // Build side-by-side race sections
  function renderCandidateList(candidates) {
    if (candidates.length === 0) return `<p style="color:var(--text2);font-size:0.9rem;margin:0.5rem 0">No primary candidates</p>`;
    return `<ul style="padding-left:0;margin:0.5rem 0">${candidates.map(e => {
      const isIncumbent = e.candidate.incumbent || e.candidate.isIncumbent;
      const isWithdrawn = e.candidate.withdrawn;
      const incumbentBadge = isIncumbent ? ' <span style="font-size:0.8rem;color:var(--text2)">(incumbent)</span>' : "";
      const withdrawnBadge = isWithdrawn ? ' <span style="font-size:0.8rem;color:#c62626;font-style:italic">(withdrawn)</span>' : "";
      const limitedBadge = isSparseCandidate(e.candidate) ? ' <span style="font-size:0.75rem;color:var(--text2);font-style:italic">(limited info)</span>' : "";
      const nameStyle = isWithdrawn ? ' style="color:var(--text2);text-decoration:line-through"' : "";
      const initials = e.candidate.name.split(' ').map(w => w[0]).join('').slice(0, 2);
      const placeholder = `<span style="display:none;width:32px;height:32px;border-radius:50%;background:var(--border);vertical-align:middle;margin-right:8px;line-height:32px;text-align:center;font-size:12px;color:var(--text2)">${escapeHtml(initials)}</span>`;
      const headshot = `<img src="/headshots/${escapeHtml(e.slug)}.jpg?v=2" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px;border:1px solid var(--border)${isWithdrawn ? ";opacity:0.5" : ""}" onerror="if(this.src.indexOf('.jpg')!==-1){this.src=this.src.replace('.jpg','.png')}else{this.style.display='none';this.nextElementSibling.style.display='inline-block'}">`;
      return `<li style="list-style:none;margin-bottom:0.5rem">${headshot}${placeholder}<a href="/candidate/${escapeHtml(e.slug)}"${nameStyle}>${escapeHtml(e.candidate.name)}</a>${incumbentBadge}${withdrawnBadge}${limitedBadge}</li>`;
    }).join("")}</ul>`;
  }

  let raceSections = "";
  for (const [raceName, raceData] of raceMap) {
    const dataCounty = raceData.countyName ? escapeHtml(raceData.countyName) : "statewide";
    raceSections += `
    <div class="race-section" data-county="${dataCounty}" style="margin-bottom:2rem;border:1px solid var(--border);border-radius:12px;overflow:hidden">
      <div style="background:var(--card);padding:0.75rem 1rem;border-bottom:1px solid var(--border)">
        <h2 style="margin:0;font-size:1.1rem">${escapeHtml(raceName)}</h2>
      </div>
      <div class="party-columns">
        <div class="party-col">
          <div style="font-weight:600;color:#c62626;margin-bottom:0.25rem;font-size:0.9rem">Republican</div>
          ${renderCandidateList(raceData.republican)}
        </div>
        <div class="party-col">
          <div style="font-weight:600;color:#2563eb;margin-bottom:0.25rem;font-size:0.9rem">Democrat</div>
          ${renderCandidateList(raceData.democrat)}
        </div>
      </div>
    </div>`;
  }

  if (!raceSections) {
    raceSections = `<p class="subtitle">No candidate data is available yet. Check back soon.</p>`;
  }

  // Build county filter dropdown (only shown if there are county candidates)
  let countyFilter = "";
  if (countyNames.length > 0) {
    const options = countyNames.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)} County</option>`).join("");
    countyFilter = `
    <div style="margin-bottom:1.5rem">
      <label for="county-filter" style="font-size:0.9rem;color:var(--text2);margin-right:0.5rem" data-t="Filter by county:">Filter by county:</label>
      <select id="county-filter" style="font-size:1rem;padding:0.4rem 0.75rem;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);font-family:inherit;cursor:pointer">
        <option value="all" data-t="All Counties">All Counties</option>
        <option value="statewide" data-t="Statewide Only">Statewide Only</option>
        ${options}
      </select>
      <span id="county-count" style="font-size:0.85rem;color:var(--text2);margin-left:0.75rem"></span>
    </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  ${pageHead({
    title: "All Candidates — Texas Votes",
    description: "Browse all candidates in the 2026 Texas Primary Election. View detailed profiles, positions, and endorsements.",
    url: "https://txvotes.app/candidates",
  })}
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
    <a href="/" class="back-top">&larr; Texas Votes</a>
    <h1 style="margin-top:1rem" data-t="All Candidates">All Candidates</h1>
    <p class="subtitle" data-t="2026 Texas Primary Election — March 3, 2026">2026 Texas Primary Election — March 3, 2026</p>

    <div class="cta-banner"><a class="cta-btn" href="/app?start=1" data-t="Build My Voting Guide">Build My Voting Guide</a><p class="cta-sub" data-t="5-minute personalized ballot">5-minute personalized ballot</p></div>

    ${countyFilter}

    ${raceSections}

    <h2 data-t="Related">Related</h2>
    <ul class="related-links">
      <li><a href="/how-it-works" data-t="How It Works">How It Works</a> — <span data-t="Plain-language explanation of the app and AI">Plain-language explanation of the app and AI</span></li>
      <li><a href="/sample-ballot" data-t="Sample Ballot">Sample Ballot</a> — <span data-t="See what a personalized ballot looks like">See what a personalized ballot looks like</span></li>
      <li><a href="/data-quality" data-t="Data Quality Dashboard">Data Quality Dashboard</a> — <span data-t="Live metrics on ballot coverage and candidate completeness">Live metrics on ballot coverage and candidate completeness</span></li>
      <li><a href="/nonpartisan" data-t="Nonpartisan by Design">Nonpartisan by Design</a> — <span data-t="How we keep the app fair for all voters">How we keep the app fair for all voters</span></li>
      <li><a href="/audit" data-t="AI Bias Audit">AI Bias Audit</a> — <span data-t="Independent review of our AI by four different systems">Independent review of our AI by four different systems</span></li>
      <li><a href="/open-source" data-t="Open Source">Open Source</a> — <span data-t="Source code, architecture, and independent code reviews">Source code, architecture, and independent code reviews</span></li>
    </ul>

    <div class="page-footer"><a href="/" data-t="Texas Votes">Texas Votes</a> &middot; <a href="/how-it-works" data-t="How It Works">How It Works</a> &middot; <a href="/privacy" data-t="Privacy">Privacy</a><br><span style="color:var(--red)">&starf;</span> <span data-t="Built in Texas">Built in Texas</span> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></div>
  </div>
  <script>
  (function(){
    var sel = document.getElementById('county-filter');
    if (!sel) return;
    var countEl = document.getElementById('county-count');
    var sections = document.querySelectorAll('.race-section');
    function update() {
      var v = sel.value;
      var shown = 0;
      for (var i = 0; i < sections.length; i++) {
        var s = sections[i];
        var county = s.getAttribute('data-county');
        var show = false;
        if (v === 'all') {
          show = true;
        } else if (v === 'statewide') {
          show = (county === 'statewide');
        } else {
          // Show statewide + selected county
          show = (county === 'statewide' || county === v);
        }
        s.style.display = show ? '' : 'none';
        if (show) shown++;
      }
      if (countEl) {
        countEl.textContent = shown + (shown === 1 ? ' race' : ' races');
      }
    }
    sel.addEventListener('change', update);
    update();
  })();
  <\/script>
  ${pageI18n({
    '2026 Texas Primary Election \\u2014 March 3, 2026': 'Elecci\u00F3n Primaria de Texas 2026 \\u2014 3 de marzo, 2026',
    'Filter by county:': 'Filtrar por condado:',
    'All Counties': 'Todos los Condados',
    'Statewide Only': 'Solo Estatales',
  })}
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

// MARK: - Data Quality Dashboard (Public)

// All 254 Texas county FIPS codes (48001 to 48507, odd numbers only)
const TX_FIPS = [];
for (let i = 1; i <= 507; i += 2) TX_FIPS.push(`48${String(i).padStart(3, "0")}`);

// Texas county FIPS to name mapping (all 254 counties)
const TX_COUNTY_NAMES = {
  "48001":"Anderson","48003":"Andrews","48005":"Angelina","48007":"Aransas","48009":"Archer",
  "48011":"Armstrong","48013":"Atascosa","48015":"Austin","48017":"Bailey","48019":"Bandera",
  "48021":"Bastrop","48023":"Baylor","48025":"Bee","48027":"Bell","48029":"Bexar",
  "48031":"Blanco","48033":"Borden","48035":"Bosque","48037":"Bowie","48039":"Brazoria",
  "48041":"Brazos","48043":"Brewster","48045":"Briscoe","48047":"Brooks","48049":"Brown",
  "48051":"Burleson","48053":"Burnet","48055":"Caldwell","48057":"Calhoun","48059":"Callahan",
  "48061":"Cameron","48063":"Camp","48065":"Carson","48067":"Cass","48069":"Castro",
  "48071":"Chambers","48073":"Cherokee","48075":"Childress","48077":"Clay","48079":"Cochran",
  "48081":"Coke","48083":"Coleman","48085":"Collin","48087":"Collingsworth","48089":"Colorado",
  "48091":"Comal","48093":"Comanche","48095":"Concho","48097":"Cooke","48099":"Coryell",
  "48101":"Cottle","48103":"Crane","48105":"Crockett","48107":"Crosby","48109":"Culberson",
  "48111":"Dallam","48113":"Dallas","48115":"Dawson","48117":"Deaf Smith","48119":"Delta",
  "48121":"Denton","48123":"DeWitt","48125":"Dickens","48127":"Dimmit","48129":"Donley",
  "48131":"Duval","48133":"Eastland","48135":"Ector","48137":"Edwards","48139":"Ellis",
  "48141":"El Paso","48143":"Erath","48145":"Falls","48147":"Fannin","48149":"Fayette",
  "48151":"Fisher","48153":"Floyd","48155":"Foard","48157":"Fort Bend","48159":"Franklin",
  "48161":"Freestone","48163":"Frio","48165":"Gaines","48167":"Galveston","48169":"Garza",
  "48171":"Gillespie","48173":"Glasscock","48175":"Goliad","48177":"Gonzales","48179":"Gray",
  "48181":"Grayson","48183":"Gregg","48185":"Grimes","48187":"Guadalupe","48189":"Hale",
  "48191":"Hall","48193":"Hamilton","48195":"Hansford","48197":"Hardeman","48199":"Hardin",
  "48201":"Harris","48203":"Harrison","48205":"Hartley","48207":"Haskell","48209":"Hays",
  "48211":"Hemphill","48213":"Henderson","48215":"Hidalgo","48217":"Hill","48219":"Hockley",
  "48221":"Hood","48223":"Hopkins","48225":"Houston","48227":"Howard","48229":"Hudspeth",
  "48231":"Hunt","48233":"Hutchinson","48235":"Irion","48237":"Jack","48239":"Jackson",
  "48241":"Jasper","48243":"Jeff Davis","48245":"Jefferson","48247":"Jim Hogg","48249":"Jim Wells",
  "48251":"Johnson","48253":"Jones","48255":"Karnes","48257":"Kaufman","48259":"Kendall",
  "48261":"Kenedy","48263":"Kent","48265":"Kerr","48267":"Kimble","48269":"King",
  "48271":"Kinney","48273":"Kleberg","48275":"Knox","48277":"Lamar","48279":"Lamb",
  "48281":"Lampasas","48283":"La Salle","48285":"Lavaca","48287":"Lee","48289":"Leon",
  "48291":"Liberty","48293":"Limestone","48295":"Lipscomb","48297":"Live Oak","48299":"Llano",
  "48301":"Loving","48303":"Lubbock","48305":"Lynn","48307":"McCulloch","48309":"McLennan",
  "48311":"McMullen","48313":"Madison","48315":"Marion","48317":"Martin","48319":"Mason",
  "48321":"Matagorda","48323":"Maverick","48325":"Medina","48327":"Menard","48329":"Midland",
  "48331":"Milam","48333":"Mills","48335":"Mitchell","48337":"Montague","48339":"Montgomery",
  "48341":"Moore","48343":"Morris","48345":"Motley","48347":"Nacogdoches","48349":"Navarro",
  "48351":"Newton","48353":"Nolan","48355":"Nueces","48357":"Ochiltree","48359":"Oldham",
  "48361":"Orange","48363":"Palo Pinto","48365":"Panola","48367":"Parker","48369":"Parmer",
  "48371":"Pecos","48373":"Polk","48375":"Presidio","48377":"Rains","48379":"Randall",
  "48381":"Reagan","48383":"Real","48385":"Red River","48387":"Reeves","48389":"Refugio",
  "48391":"Roberts","48393":"Robertson","48395":"Rockwall","48397":"Runnels","48399":"Rusk",
  "48401":"Sabine","48403":"San Augustine","48405":"San Jacinto","48407":"San Patricio","48409":"San Saba",
  "48411":"Schleicher","48413":"Scurry","48415":"Shackelford","48417":"Shelby","48419":"Sherman",
  "48421":"Smith","48423":"Somervell","48425":"Starr","48427":"Stephens","48429":"Sterling",
  "48431":"Stonewall","48433":"Sutton","48435":"Swisher","48437":"Tarrant","48439":"Taylor",
  "48441":"Terrell","48443":"Terry","48445":"Throckmorton","48447":"Titus","48449":"Tom Green",
  "48451":"Travis","48453":"Trinity","48455":"Tyler","48457":"Upshur","48459":"Upton",
  "48461":"Uvalde","48463":"Val Verde","48465":"Van Zandt","48467":"Victoria","48469":"Walker",
  "48471":"Waller","48473":"Ward","48475":"Washington","48477":"Webb","48479":"Wharton",
  "48481":"Wheeler","48483":"Wichita","48485":"Wilbarger","48487":"Willacy","48489":"Williamson",
  "48491":"Wilson","48493":"Winkler","48495":"Wise","48497":"Wood","48499":"Yoakum",
  "48501":"Young","48503":"Zapata","48505":"Zavala","48507":"Zablocki"
};

async function handleDataQuality(env) {
  const parties = ["republican", "democrat"];
  const ballots = {};

  // Load statewide ballots (with legacy fallback)
  for (const party of parties) {
    let raw = await env.ELECTION_DATA.get(`ballot:statewide:${party}_primary_2026`);
    if (!raw) raw = await env.ELECTION_DATA.get(`ballot:${party}_primary_2026`);
    ballots[party] = raw ? JSON.parse(raw) : null;
  }

  // Load manifest for freshness
  const manifestRaw = await env.ELECTION_DATA.get("manifest");
  const manifest = manifestRaw ? JSON.parse(manifestRaw) : {};

  // Load today's update log
  const today = new Date().toISOString().slice(0, 10);
  const updateLogRaw = await env.ELECTION_DATA.get(`update_log:${today}`);
  const updateLog = updateLogRaw ? JSON.parse(updateLogRaw) : null;

  // --- Data Freshness ---
  let freshnessCards = "";
  for (const party of parties) {
    const m = manifest[party];
    const label = party === "republican" ? "Republican" : "Democrat";
    if (m && m.updatedAt) {
      const d = new Date(m.updatedAt);
      const dateStr = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      freshnessCards += `<div class="dq-card"><div class="dq-card-label">${label} Ballot</div><div class="dq-card-value">${dateStr}</div><div class="dq-card-detail">${timeStr}${m.version ? ` &middot; Version ${m.version}` : ""}</div></div>`;
    } else {
      freshnessCards += `<div class="dq-card"><div class="dq-card-label">${label} Ballot</div><div class="dq-card-value" style="color:var(--text2)">Not yet available</div></div>`;
    }
  }

  // --- Ballot Coverage ---
  let coverageCards = "";
  for (const party of parties) {
    const b = ballots[party];
    const label = party === "republican" ? "Republican" : "Democrat";
    const raceCount = b ? (b.races || []).length : 0;
    const candidateCount = b ? (b.races || []).reduce((s, r) => s + (r.candidates || []).length, 0) : 0;
    const propCount = b ? (b.propositions || []).length : 0;
    coverageCards += `<div class="dq-card"><div class="dq-card-label">${label}</div><div class="dq-card-value">${raceCount} <span class="dq-unit">races</span></div><div class="dq-card-detail">${candidateCount} candidates &middot; ${propCount} propositions</div></div>`;
  }

  // --- Candidate Data Completeness ---
  const completenessFields = ["summary", "background", "keyPositions", "endorsements", "pros", "cons"];
  let totalCandidates = 0;
  let fullProfileCount = 0;
  let sparseCount = 0;
  let totalFieldsFilled = 0;
  let totalFieldsPossible = 0;

  for (const party of parties) {
    const b = ballots[party];
    if (!b) continue;
    for (const race of (b.races || [])) {
      for (const c of (race.candidates || [])) {
        totalCandidates++;
        let filledFields = 0;
        for (const f of completenessFields) {
          totalFieldsPossible++;
          const val = c[f];
          const has = val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0);
          if (has) { filledFields++; totalFieldsFilled++; }
        }
        if (filledFields === completenessFields.length) fullProfileCount++;
        if (isSparseCandidate(c)) sparseCount++;
      }
    }
  }

  const completenessPercent = totalFieldsPossible > 0 ? Math.round((totalFieldsFilled / totalFieldsPossible) * 100) : 0;

  // --- Pros/Cons Balance ---
  let balanceHtml = "";
  const balanceReports = {};
  let combinedBalanceScore = null;
  const balanceScores = [];
  for (const party of parties) {
    if (!ballots[party]) continue;
    const report = checkBallotBalance(ballots[party]);
    balanceReports[party] = report;
    balanceScores.push(report.summary.score);
  }
  if (balanceScores.length > 0) {
    combinedBalanceScore = Math.round(balanceScores.reduce((a, b) => a + b, 0) / balanceScores.length);
  }

  let balanceCards = "";
  for (const party of parties) {
    const report = balanceReports[party];
    if (!report) continue;
    const s = report.summary;
    const label = party === "republican" ? "Republican" : "Democrat";
    let scoreColor = "var(--blue)";
    if (s.score >= 90) scoreColor = "#16a34a";
    else if (s.score >= 70) scoreColor = "#b45309";
    else scoreColor = "#dc2626";
    balanceCards += `<div class="dq-card"><div class="dq-card-label">${label}</div><div class="dq-card-value" style="color:${scoreColor}">${s.score}<span class="dq-unit">/100</span></div><div class="dq-card-detail">${s.totalFlags} flag${s.totalFlags === 1 ? "" : "s"}: ${s.criticalCount} critical, ${s.warningCount} warning, ${s.infoCount} info</div></div>`;
  }

  let balanceFlagRows = "";
  for (const party of parties) {
    const report = balanceReports[party];
    if (!report) continue;
    const pLabel = party === "republican" ? "R" : "D";
    for (const race of report.races) {
      if (race.flagCount === 0) continue;
      for (const f of race.raceFlags) {
        const sevClass = f.severity === "critical" ? "cov-no" : f.severity === "warning" ? "cov-partial" : "cov-yes";
        balanceFlagRows += `<tr><td>${pLabel}</td><td>${race.label}</td><td>\u2014</td><td class="${sevClass}">${f.severity}</td><td>${f.detail}</td></tr>`;
      }
      for (const c of race.candidates) {
        for (const f of c.flags) {
          const sevClass = f.severity === "critical" ? "cov-no" : f.severity === "warning" ? "cov-partial" : "cov-yes";
          balanceFlagRows += `<tr><td>${pLabel}</td><td>${race.label}</td><td>${c.name}</td><td class="${sevClass}">${f.severity}</td><td>${f.detail}</td></tr>`;
        }
      }
    }
  }

  if (balanceFlagRows) {
    balanceHtml = `
    <div class="dq-card-grid">${balanceCards}</div>
    <details style="margin-top:0.75rem">
      <summary style="cursor:pointer;font-weight:600;font-size:0.95rem;color:var(--blue)">View flag details</summary>
      <div style="overflow-x:auto;margin-top:0.5rem">
      <table style="font-size:0.85rem;width:100%;border-collapse:collapse">
        <tr style="background:var(--blue);color:#fff"><th style="padding:4px 8px">Party</th><th style="padding:4px 8px">Race</th><th style="padding:4px 8px">Candidate</th><th style="padding:4px 8px">Severity</th><th style="padding:4px 8px">Detail</th></tr>
        ${balanceFlagRows}
      </table>
      </div>
    </details>`;
  } else {
    balanceHtml = `
    <div class="dq-card-grid">${balanceCards}</div>
    <p class="dq-note">No balance issues detected. All candidates have symmetric pros/cons coverage.</p>`;
  }

  // --- County Coverage ---
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
  const repPresent = Object.values(countyBallotResults).filter(v => v.republican).length;
  const demPresent = Object.values(countyBallotResults).filter(v => v.democrat).length;

  // Build county checker data (name to coverage) for inline JS
  const countyCheckerData = {};
  for (const fips of TX_FIPS) {
    const name = TX_COUNTY_NAMES[fips];
    if (!name) continue;
    countyCheckerData[name.toLowerCase()] = {
      info: !!countyInfoResults[fips],
      rep: !!(countyBallotResults[fips]?.republican),
      dem: !!(countyBallotResults[fips]?.democrat),
    };
  }

  // --- Today's Update Activity ---
  let updateHtml = "";
  if (updateLog) {
    const checkedCount = updateLog.log ? (updateLog.log.match(/Checking /g) || []).length : 0;
    const updatedCount = updateLog.updated || 0;
    const errorCount = updateLog.errors || 0;
    updateHtml = `<div class="dq-card-grid"><div class="dq-card"><div class="dq-card-value">${checkedCount}</div><div class="dq-card-label">Races checked</div></div><div class="dq-card"><div class="dq-card-value">${updatedCount}</div><div class="dq-card-label">Updates applied</div></div><div class="dq-card"><div class="dq-card-value">${errorCount}</div><div class="dq-card-label">Errors</div></div></div>`;
    if (updateLog.timestamp) {
      const logTime = new Date(updateLog.timestamp);
      updateHtml += `<p class="dq-note">Last check: ${logTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} CT</p>`;
    }
  } else {
    updateHtml = `<p style="color:var(--text2)">No updates yet today. Data is checked and refreshed daily.</p>`;
  }

  const checkerDataJson = JSON.stringify(countyCheckerData);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  ${pageHead({
    title: "Data Quality — Texas Votes",
    description: "Live transparency dashboard showing the completeness and freshness of Texas Votes election data.",
    url: "https://txvotes.app/data-quality",
  })}
  <style>
    .dq-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:1.5rem}
    .dq-card{background:var(--card);border:1px solid var(--border);border-radius:var(--rs);padding:1.25rem;text-align:center}
    .dq-card-label{font-size:0.85rem;color:var(--text2);margin-bottom:0.25rem;font-weight:600}
    .dq-card-value{font-size:1.5rem;font-weight:800;color:var(--blue)}
    .dq-card-detail{font-size:0.82rem;color:var(--text2);margin-top:0.25rem}
    .dq-unit{font-size:0.9rem;font-weight:600}
    .dq-note{font-size:0.85rem;color:var(--text2);margin-top:0.5rem}
    .dq-progress{background:var(--border);border-radius:99px;height:12px;overflow:hidden;margin:0.75rem 0}
    .dq-progress-bar{height:100%;border-radius:99px;background:var(--blue);transition:width .3s}
    .dq-checker-hero{background:var(--card);border:2px solid var(--blue);border-radius:var(--rs);padding:1.5rem;margin-bottom:2rem}
    .dq-checker-title{margin:0 0 0.25rem 0;font-size:1.3rem;font-weight:800;color:var(--blue);text-align:center}
    .dq-checker-subtitle{margin:0 0 1rem 0;font-size:0.95rem;color:var(--text2);text-align:center}
    .dq-checker-hero input{width:100%;padding:0.85rem 1rem;border:2px solid var(--blue);border-radius:var(--rs);font-size:1.1rem;background:var(--bg);color:var(--text);font-family:inherit;box-sizing:border-box}
    .dq-checker-hero input::placeholder{color:var(--text2)}
    .dq-checker-hero input:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 3px rgba(59,130,246,.2)}
    .dq-checker-result{margin-top:0.75rem;padding:1rem;border-radius:var(--rs);display:none;font-size:0.95rem}
    .dq-checker-result.visible{display:block}
    .dq-checker-result.found{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3)}
    .dq-checker-result.partial{background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.3)}
    .dq-checker-result.notfound{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2)}
    .dq-links{list-style:none;padding:0;margin:0}
    .dq-links li{margin-bottom:0.75rem}
    .dq-links a{font-weight:600;font-size:0.95rem}
    .cov-yes{background:rgba(34,197,94,.15);color:#16a34a;text-align:center;font-weight:600}
    .cov-no{background:rgba(239,68,68,.12);color:#dc2626;text-align:center}
    .cov-partial{background:rgba(234,179,8,.15);color:#b45309;text-align:center}
    details table td,details table th{border:1px solid var(--border);padding:4px 8px;text-align:left}
  </style>
</head>
<body>
  <div class="container" style="max-width:720px">
    <a href="/" class="back-top">&larr; Texas Votes</a>
    <h1 data-t="Data Quality Dashboard">Data Quality Dashboard</h1>
    <p class="subtitle" data-t="Live transparency report on the completeness and freshness of our election data.">Live transparency report on the completeness and freshness of our election data. Updated daily via automated research pipeline.</p>

    <div class="cta-banner"><a class="cta-btn" href="/app?start=1" data-t="Build My Voting Guide">Build My Voting Guide</a><p class="cta-sub" data-t="5-minute personalized ballot">5-minute personalized ballot</p></div>

    <div class="dq-checker-hero">
      <div class="dq-checker-title" data-t="Check Your County">Check Your County</div>
      <p class="dq-checker-subtitle" data-t="See what local election data is available for your county">See what local election data is available for your county</p>
      <input type="text" id="county-input" placeholder="Type a county name (e.g., Travis, Harris, Bexar)..." autocomplete="off">
      <div id="county-result" class="dq-checker-result"></div>
    </div>

    <h2 data-t="Data Freshness">Data Freshness</h2>
    <div class="dq-card-grid">
      ${freshnessCards}
    </div>

    <h2 data-t="Ballot Coverage">Ballot Coverage</h2>
    <div class="dq-card-grid">
      ${coverageCards}
    </div>

    <h2 data-t="Candidate Data Completeness">Candidate Data Completeness</h2>
    <div class="dq-card" style="text-align:left;margin-bottom:1.5rem">
      <div style="display:flex;align-items:baseline;gap:0.75rem;margin-bottom:0.25rem">
        <span style="font-size:2rem;font-weight:800;color:var(--blue)">${completenessPercent}%</span>
        <span style="font-size:0.95rem;color:var(--text2)">overall completeness</span>
      </div>
      <div class="dq-progress"><div class="dq-progress-bar" style="width:${completenessPercent}%"></div></div>
      <p style="font-size:0.9rem;color:var(--text);margin:0.5rem 0">${fullProfileCount} of ${totalCandidates} candidates have full profiles. ${sparseCount > 0 ? `${sparseCount} candidate${sparseCount === 1 ? " has" : "s have"} limited public information.` : "All candidates have sufficient data."}</p>
      <p class="dq-note">Candidates with limited public information are clearly labeled throughout the app.</p>
    </div>

    <h2 data-t="Pros/Cons Balance">Pros/Cons Balance</h2>
    <div class="dq-card" style="text-align:left;margin-bottom:1.5rem">
      <div style="display:flex;align-items:baseline;gap:0.75rem;margin-bottom:0.25rem">
        <span style="font-size:2rem;font-weight:800;color:${combinedBalanceScore !== null && combinedBalanceScore >= 90 ? "#16a34a" : combinedBalanceScore !== null && combinedBalanceScore >= 70 ? "#b45309" : combinedBalanceScore !== null ? "#dc2626" : "var(--blue)"}">${combinedBalanceScore !== null ? combinedBalanceScore : "N/A"}<span class="dq-unit">/100</span></span>
        <span style="font-size:0.95rem;color:var(--text2)">balance score</span>
      </div>
      <p style="font-size:0.9rem;color:var(--text);margin:0.5rem 0">Measures symmetry of strengths and concerns across candidates: equal count, similar detail level, and consistent coverage within each race.</p>
      ${balanceHtml}
      <p class="dq-note" style="margin-top:0.75rem">Balance checks run automatically. <a href="/api/balance-check">View raw JSON report</a>. Voters can also report bias directly using the "Flag this info" button on any candidate card — reports go to <a href="mailto:flagged@txvotes.app">flagged@txvotes.app</a> and feed back into data quality improvements.</p>
    </div>

    <h2 data-t="County Coverage">County Coverage</h2>
    <div class="dq-card-grid">
      <div class="dq-card"><div class="dq-card-value">${infoPresent}<span class="dq-unit"> / 254</span></div><div class="dq-card-label" data-t="Counties with voting info">Counties with voting info</div></div>
      <div class="dq-card"><div class="dq-card-value">${repPresent}<span class="dq-unit"> / 254</span></div><div class="dq-card-label" data-t="Republican local ballots">Republican local ballots</div></div>
      <div class="dq-card"><div class="dq-card-value">${demPresent}<span class="dq-unit"> / 254</span></div><div class="dq-card-label" data-t="Democrat local ballots">Democrat local ballots</div></div>
    </div>

    <h2 style="margin-top:2rem" data-t="Today's Update Activity">Today's Update Activity</h2>
    ${updateHtml}

    <h2 data-t="Related">Related</h2>
    <ul class="dq-links related-links">
      <li><a href="/how-it-works" data-t="How It Works">How It Works</a> — <span data-t="Plain-language explanation for non-technical users">Plain-language explanation for non-technical users</span></li>
      <li><a href="/audit" data-t="AI Bias Audit">AI Bias Audit</a> — <span data-t="Independent review by four AI systems">Independent review by four AI systems</span></li>
      <li><a href="/api/audit/export" data-t="Methodology Export">Methodology Export</a> — <span data-t="Full transparency of all AI prompts and data pipelines">Full transparency of all AI prompts and data pipelines</span></li>
      <li><a href="/open-source" data-t="Open Source">Open Source</a> — <span data-t="Source code, architecture, and independent code reviews">Source code, architecture, and independent code reviews</span></li>
      <li><a href="/nonpartisan" data-t="Nonpartisan by Design">Nonpartisan by Design</a> — <span data-t="How we ensure fairness for all voters">How we ensure fairness for all voters</span></li>
      <li><a href="/candidates" data-t="Candidate Profiles">Candidate Profiles</a> — <span data-t="Browse all candidates with detailed information">Browse all candidates with detailed information</span></li>
    </ul>

    <div class="page-footer"><a href="/" data-t="Texas Votes">Texas Votes</a> &middot; <a href="/how-it-works" data-t="How It Works">How It Works</a> &middot; <a href="/privacy" data-t="Privacy">Privacy</a><br><span style="color:var(--red)">&starf;</span> <span data-t="Built in Texas">Built in Texas</span> &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></div>
  </div>
  <script>
  (function(){
    var data=${checkerDataJson};
    var input=document.getElementById("county-input");
    var result=document.getElementById("county-result");
    input.addEventListener("input",function(){
      var v=input.value.trim().toLowerCase();
      result.className="dq-checker-result";
      result.textContent="";
      if(!v)return;
      var matches=Object.keys(data).filter(function(k){return k.indexOf(v)===0||k===v;});
      if(matches.length===0){
        result.className="dq-checker-result visible notfound";
        result.textContent="No matching county found. Check your spelling and try again.";
        return;
      }
      var county=matches[0];
      var d=data[county];
      var name=county.charAt(0).toUpperCase()+county.slice(1);
      var parts=[];
      if(d.info)parts.push("voting info");
      if(d.rep)parts.push("Republican ballot");
      if(d.dem)parts.push("Democrat ballot");
      if(parts.length===3){
        result.className="dq-checker-result visible found";
        result.textContent=name+" County has full coverage: "+parts.join(", ")+".";
      }else if(parts.length>0){
        result.className="dq-checker-result visible partial";
        result.textContent=name+" County has partial coverage: "+parts.join(", ")+". More data is being added.";
      }else{
        result.className="dq-checker-result visible notfound";
        result.textContent=name+" County does not have local data yet. Statewide and district races are still available.";
      }
    });
  })();
  </script>
  ${pageI18n({
    'Live transparency report on the completeness and freshness of our election data.': 'Informe de transparencia en vivo sobre la integridad y frescura de nuestros datos electorales.',
    'Check Your County': 'Consulta Tu Condado',
    'See what local election data is available for your county': 'Mira qu\u00E9 datos electorales locales est\u00E1n disponibles para tu condado',
    'Data Freshness': 'Frescura de Datos',
    'Ballot Coverage': 'Cobertura de Boletas',
    'Candidate Data Completeness': 'Datos Completos de Candidatos',
    'Pros/Cons Balance': 'Equilibrio de Pros/Contras',
    'County Coverage': 'Cobertura por Condado',
    'Counties with voting info': 'Condados con info de votaci\u00F3n',
    'Republican local ballots': 'Boletas locales Republicanas',
    'Democrat local ballots': 'Boletas locales Dem\u00F3cratas',
    'Today\'s Update Activity': 'Actividad de Actualizaci\u00F3n de Hoy',
    'Browse all candidates with detailed information': 'Explora todos los candidatos con informaci\u00F3n detallada',
  })}
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
  ${pageHead({
    title: "Data Coverage — Texas Votes Admin",
    description: "Admin dashboard for Texas Votes data coverage.",
  })}
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
    <a href="/" class="back-top">&larr; Texas Votes</a>
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

    <div class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/how-it-works">How It Works</a> &middot; <a href="/privacy">Privacy</a><br><span style="color:var(--red)">&starf;</span> Built in Texas &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=utf-8" },
  });
}

// MARK: - Admin Analytics Dashboard

async function queryAnalyticsEngine(env, sql) {
  const accountId = env.CF_ACCOUNT_ID;
  const apiToken = env.CF_API_TOKEN;
  if (!accountId || !apiToken) return null;
  const resp = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
    { method: "POST", headers: { Authorization: `Bearer ${apiToken}` }, body: sql }
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Analytics query failed (${resp.status}): ${text}`);
  }
  return resp.json();
}

async function handleAdminAnalytics(env) {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
    return new Response(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Analytics — Texas Votes Admin</title>${PAGE_CSS}<style>.container{max-width:900px}</style></head><body><div class="container"><a href="/" class="back-top">&larr; Texas Votes</a><h1>Analytics Dashboard</h1><p style="color:var(--text2)">Analytics Engine query credentials not configured.</p><p>Set these secrets:</p><pre style="background:var(--card);border:1px solid var(--border);padding:1rem;border-radius:var(--rs);overflow-x:auto">cd worker\nnpx wrangler secret put CF_ACCOUNT_ID -c wrangler.txvotes.toml\nnpx wrangler secret put CF_API_TOKEN -c wrangler.txvotes.toml</pre><p style="font-size:0.85rem;color:var(--text2)">The API token needs <strong>Account Analytics Read</strong> permission.</p></div></body></html>`, { headers: { "Content-Type": "text/html;charset=utf-8" } });
  }

  const ds = "txvotes_events";
  const errors = [];
  async function sq(label, sql) {
    try { return await queryAnalyticsEngine(env, sql); }
    catch (e) { errors.push(label + ": " + e.message); return { data: [] }; }
  }

  const [totalsR, dailyR, langR, timingR, toneR, abandonR, pagesR, partyR, errorsR, hourlyR] = await Promise.all([
    sq("totals", "SELECT blob1 AS event, count() AS total, sum(double1) AS value_sum FROM " + ds + " WHERE timestamp > NOW() - INTERVAL '7' DAY GROUP BY event ORDER BY total DESC FORMAT JSON"),
    sq("daily", "SELECT toDate(timestamp) AS day, blob1 AS event, count() AS total FROM " + ds + " WHERE timestamp > NOW() - INTERVAL '7' DAY GROUP BY day, event ORDER BY day ASC, total DESC FORMAT JSON"),
    sq("language", "SELECT blob2 AS lang, count() AS total FROM " + ds + " WHERE timestamp > NOW() - INTERVAL '7' DAY GROUP BY lang ORDER BY total DESC FORMAT JSON"),
    sq("timing", "SELECT blob1 AS event, count() AS total, avg(double2) AS avg_ms, min(double2) AS min_ms, max(double2) AS max_ms FROM " + ds + " WHERE timestamp > NOW() - INTERVAL '7' DAY AND blob1 IN ('guide_complete','interview_complete') AND double2 > 0 GROUP BY event FORMAT JSON"),
    sq("tones", "SELECT blob3 AS tone_level, count() AS total FROM " + ds + " WHERE timestamp > NOW() - INTERVAL '7' DAY AND blob1 = 'tone_select' GROUP BY tone_level ORDER BY tone_level ASC FORMAT JSON"),
    sq("abandon", "SELECT blob3 AS phase, count() AS total, avg(double2) AS avg_ms FROM " + ds + " WHERE timestamp > NOW() - INTERVAL '7' DAY AND blob1 = 'interview_abandon' GROUP BY phase ORDER BY total DESC FORMAT JSON"),
    sq("pages", "SELECT blob3 AS page, count() AS total FROM " + ds + " WHERE timestamp > NOW() - INTERVAL '7' DAY AND blob1 = 'page_view' GROUP BY page ORDER BY total DESC LIMIT 20 FORMAT JSON"),
    sq("party", "SELECT blob3 AS party, count() AS total FROM " + ds + " WHERE timestamp > NOW() - INTERVAL '7' DAY AND blob1 = 'party_switch' GROUP BY party ORDER BY total DESC FORMAT JSON"),
    sq("errors", "SELECT blob3 AS error_msg, count() AS total FROM " + ds + " WHERE timestamp > NOW() - INTERVAL '7' DAY AND blob1 = 'guide_error' GROUP BY error_msg ORDER BY total DESC LIMIT 10 FORMAT JSON"),
    sq("hourly", "SELECT toStartOfHour(timestamp) AS hour, count() AS total FROM " + ds + " WHERE timestamp > NOW() - INTERVAL '2' DAY GROUP BY hour ORDER BY hour ASC FORMAT JSON"),
  ]);

  const totals = totalsR.data || [];
  const daily = dailyR.data || [];
  const langs = langR.data || [];
  const guideTiming = timingR.data || [];
  const tones = toneR.data || [];
  const abandons = abandonR.data || [];
  const pagesList = pagesR.data || [];
  const partySwitches = partyR.data || [];
  const guideErrors = errorsR.data || [];
  const hourly = hourlyR.data || [];

  const evm = {};
  for (const r of totals) evm[r.event] = Number(r.total) || 0;

  const km = [
    { l: "Page Views", v: evm.page_view || 0 },
    { l: "Interviews Started", v: evm.interview_start || 0 },
    { l: "Interviews Completed", v: evm.interview_complete || 0 },
    { l: "Guides Generated", v: evm.guide_complete || 0 },
    { l: "Guide Errors", v: evm.guide_error || 0 },
    { l: "I Voted!", v: evm.i_voted || 0 },
    { l: "Share App", v: evm.share_app || 0 },
    { l: "Share Race", v: evm.share_race || 0 },
    { l: "Share Voted", v: evm.share_voted || 0 },
    { l: "Cheatsheet Prints", v: evm.cheatsheet_print || 0 },
    { l: "Language Toggles", v: evm.lang_toggle || 0 },
    { l: "Interview Abandons", v: evm.interview_abandon || 0 },
  ];

  const iStarts = evm.interview_start || 0;
  const iCompletes = evm.interview_complete || 0;
  const cr = iStarts > 0 ? ((iCompletes / iStarts) * 100).toFixed(1) : "N/A";

  const statCards = km.map(m => `<div class="stat-card"><div class="num">${m.v.toLocaleString()}</div><div class="label">${m.l}</div></div>`).join("");
  const crCard = `<div class="stat-card"><div class="num" style="color:${cr !== "N/A" && parseFloat(cr) >= 50 ? "#16a34a" : "var(--red)"}">${cr}${cr !== "N/A" ? "%" : ""}</div><div class="label">Interview Completion Rate</div></div>`;

  const allEvRows = totals.map(r => `<tr><td><code>${escapeHtml(r.event)}</code></td><td style="text-align:right">${Number(r.total).toLocaleString()}</td></tr>`).join("") || '<tr><td colspan="2" style="color:var(--text2)">No data</td></tr>';

  const dayMap = {};
  for (const r of daily) { if (!dayMap[r.day]) dayMap[r.day] = {}; dayMap[r.day][r.event] = Number(r.total) || 0; }
  const sortedDays = Object.keys(dayMap).sort();
  const de = ["page_view","interview_start","interview_complete","guide_complete","guide_error","i_voted","share_app","interview_abandon"];
  const dh = de.map(e => `<th>${e.replace(/_/g, " ")}</th>`).join("");
  const db = sortedDays.map(d => `<tr><td style="font-weight:600">${d}</td>${de.map(e => `<td style="text-align:right">${(dayMap[d][e] || 0).toLocaleString()}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${de.length + 1}" style="color:var(--text2)">No data</td></tr>`;

  const lr = langs.map(r => `<tr><td>${escapeHtml(r.lang || "(empty)")}</td><td style="text-align:right">${Number(r.total).toLocaleString()}</td></tr>`).join("") || '<tr><td colspan="2" style="color:var(--text2)">No data</td></tr>';
  const tmr = guideTiming.map(r => `<tr><td><code>${escapeHtml(r.event)}</code></td><td style="text-align:right">${Number(r.total).toLocaleString()}</td><td style="text-align:right">${((Number(r.avg_ms)||0)/1000).toFixed(1)}s</td><td style="text-align:right">${((Number(r.min_ms)||0)/1000).toFixed(1)}s</td><td style="text-align:right">${((Number(r.max_ms)||0)/1000).toFixed(1)}s</td></tr>`).join("") || '<tr><td colspan="5" style="color:var(--text2)">No data</td></tr>';

  const tl = {"1":"Just the Facts","2":"Simple & Clear","3":"Balanced","4":"Deep Dive","5":"Expert","6":"Swedish Chef","7":"Cowboy"};
  const tn = tones.map(r => `<tr><td>${r.tone_level||"?"}</td><td>${tl[r.tone_level]||"Unknown"}</td><td style="text-align:right">${Number(r.total).toLocaleString()}</td></tr>`).join("") || '<tr><td colspan="3" style="color:var(--text2)">No data</td></tr>';

  const ab = abandons.map(r => `<tr><td>${escapeHtml(r.phase||"?")}</td><td style="text-align:right">${Number(r.total).toLocaleString()}</td><td style="text-align:right">${((Number(r.avg_ms)||0)/1000).toFixed(1)}s</td></tr>`).join("") || '<tr><td colspan="3" style="color:var(--text2)">No data</td></tr>';
  const pg = pagesList.map(r => `<tr><td>${escapeHtml(r.page||"(empty)")}</td><td style="text-align:right">${Number(r.total).toLocaleString()}</td></tr>`).join("") || '<tr><td colspan="2" style="color:var(--text2)">No data</td></tr>';
  const psr = partySwitches.map(r => `<tr><td style="text-transform:capitalize">${escapeHtml(r.party||"?")}</td><td style="text-align:right">${Number(r.total).toLocaleString()}</td></tr>`).join("") || '<tr><td colspan="2" style="color:var(--text2)">No data</td></tr>';
  const er = guideErrors.map(r => `<tr><td><code style="word-break:break-all">${escapeHtml(r.error_msg||"(empty)")}</code></td><td style="text-align:right">${Number(r.total).toLocaleString()}</td></tr>`).join("") || '<tr><td colspan="2" style="color:var(--text2)">No errors</td></tr>';

  let sparkHtml = '<p style="color:var(--text2)">No hourly data</p>';
  if (hourly.length > 0) {
    const mx = Math.max(...hourly.map(h => Number(h.total) || 0), 1);
    sparkHtml = '<div class="spark-container">' + hourly.map(h => {
      const v = Number(h.total) || 0;
      return `<div class="spark-bar" style="height:${Math.max((v/mx)*100,2)}%" title="${(h.hour||'').slice(11,16)}: ${v}"></div>`;
    }).join("") + '</div><div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text2);margin-top:2px"><span>48h ago</span><span>Now</span></div>';
  }

  const errBanner = errors.length > 0
    ? `<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:var(--rs);padding:0.75rem 1rem;margin-bottom:1.5rem;font-size:0.85rem;color:#dc2626"><strong>Query errors:</strong><ul style="margin:0.5rem 0 0;padding-left:1.25rem">${errors.map(e => '<li>' + escapeHtml(e) + '</li>').join("")}</ul></div>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  ${pageHead({
    title: "Analytics — Texas Votes Admin",
    description: "Admin analytics dashboard for Texas Votes.",
  })}
  <style>
    .container{max-width:1200px}
    table{width:100%;border-collapse:collapse;margin-bottom:2rem;font-size:0.9rem}
    th,td{padding:6px 10px;border:1px solid var(--border);text-align:left}
    th{background:var(--blue);color:#fff;font-weight:600;font-size:0.85rem;position:sticky;top:0}
    .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin-bottom:2rem}
    .stat-card{background:var(--card);border:1px solid var(--border);border-radius:var(--rs);padding:1rem;text-align:center}
    .stat-card .num{font-size:2rem;font-weight:800;color:var(--blue)}
    .stat-card .label{font-size:0.85rem;color:var(--text2)}
    .scroll-table{max-height:400px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--rs);margin-bottom:2rem}
    .scroll-table table{margin-bottom:0}
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:2rem}
    @media(max-width:768px){.two-col{grid-template-columns:1fr}}
    .spark-container{display:flex;align-items:flex-end;gap:1px;height:80px;background:var(--card);border:1px solid var(--border);border-radius:var(--rs);padding:8px;margin-bottom:0.25rem}
    .spark-bar{flex:1;background:var(--blue);border-radius:2px 2px 0 0;min-width:2px;opacity:0.8;transition:opacity .15s}
    .spark-bar:hover{opacity:1}
    code{background:rgba(128,128,128,.1);padding:1px 4px;border-radius:3px;font-size:0.85em}
    .section-note{font-size:0.8rem;color:var(--text2);margin-top:-1.5rem;margin-bottom:1rem}
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back-top">&larr; Texas Votes</a>
    <h1>Analytics Dashboard</h1>
    <p class="subtitle">Event tracking data from the last 7 days via Cloudflare Analytics Engine.</p>
    ${errBanner}
    <h2>Key Metrics (Last 7 Days)</h2>
    <div class="stat-grid">
      ${statCards}
      ${crCard}
    </div>
    <h2>Activity (Last 48 Hours)</h2>
    ${sparkHtml}
    <h2>Daily Breakdown</h2>
    <div class="scroll-table">
    <table><tr><th>Date</th>${dh}</tr>${db}</table>
    </div>
    <div class="two-col">
      <div>
        <h2>All Events</h2>
        <div class="scroll-table"><table><tr><th>Event</th><th style="text-align:right">Count</th></tr>${allEvRows}</table></div>
      </div>
      <div>
        <h2>Top Pages</h2>
        <div class="scroll-table"><table><tr><th>Page (Hash)</th><th style="text-align:right">Views</th></tr>${pg}</table></div>
      </div>
    </div>
    <h2>Guide Generation Timing</h2>
    <p class="section-note">Average, min, and max duration for completed interviews and guide builds.</p>
    <table><tr><th>Event</th><th style="text-align:right">Count</th><th style="text-align:right">Avg</th><th style="text-align:right">Min</th><th style="text-align:right">Max</th></tr>${tmr}</table>
    <div class="two-col">
      <div>
        <h2>Tone Distribution</h2>
        <table><tr><th>Level</th><th>Name</th><th style="text-align:right">Selections</th></tr>${tn}</table>
      </div>
      <div>
        <h2>Language Usage</h2>
        <table><tr><th>Language</th><th style="text-align:right">Events</th></tr>${lr}</table>
      </div>
    </div>
    <div class="two-col">
      <div>
        <h2>Interview Abandonment</h2>
        <p class="section-note">Where users drop off and how long they spent.</p>
        <table><tr><th>Phase</th><th style="text-align:right">Count</th><th style="text-align:right">Avg Time</th></tr>${ab}</table>
      </div>
      <div>
        <h2>Party Switches</h2>
        <table><tr><th>Switched To</th><th style="text-align:right">Count</th></tr>${psr}</table>
      </div>
    </div>
    <h2>Guide Errors</h2>
    <div class="scroll-table"><table><tr><th>Error Message</th><th style="text-align:right">Count</th></tr>${er}</table></div>
    <div class="page-footer"><a href="/">Texas Votes</a> &middot; <a href="/admin/coverage">Coverage</a> &middot; <a href="/privacy">Privacy</a><br><span style="color:var(--red)">&starf;</span> Built in Texas &middot; <a href="mailto:howdy@txvotes.app">howdy@txvotes.app</a></div>
  </div>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html;charset=utf-8" } });
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
      if (url.pathname === "/how-it-works") {
        return handleHowItWorks();
      }
      if (url.pathname === "/nonpartisan") {
        return handleNonpartisan();
      }
      if (url.pathname === "/audit") {
        return handleAuditPage(env);
      }
      if (url.pathname === "/api/audit/export") {
        return handleAuditExport();
      }
      if (url.pathname === "/api/audit/results") {
        const raw = await env.ELECTION_DATA.get("audit:summary");
        return jsonResponse(raw ? JSON.parse(raw) : { providers: {}, averageScore: null });
      }
      if (url.pathname.startsWith("/api/audit/results/")) {
        const provider = url.pathname.slice("/api/audit/results/".length).replace(/\/+$/, "");
        const raw = await env.ELECTION_DATA.get(`audit:result:${provider}`);
        if (!raw) return jsonResponse({ error: "No results for provider: " + provider }, 404);
        return jsonResponse(JSON.parse(raw));
      }
      if (url.pathname === "/sample") {
        return handleSampleBallot();
      }
      if (url.pathname === "/open-source") {
        return handleOpenSource();
      }
      if (url.pathname === "/data-quality") {
        return handleDataQuality(env);
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
      if (url.pathname === "/api/balance-check") {
        return handleBalanceCheck(env);
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
      // Vanity LLM entry points
      if (url.pathname === "/gemini") {
        return handlePWA_Clear("/app?gemini", "Texas Votes (Powered by Gemini)");
      }
      if (url.pathname === "/grok") {
        return handlePWA_Clear("/app?grok", "Texas Votes (Powered by Grok)");
      }
      if (url.pathname === "/chatgpt") {
        return handlePWA_Clear("/app?chatgpt", "Texas Votes (Powered by ChatGPT)");
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
      // Admin analytics dashboard (GET with Bearer auth)
      if (url.pathname === "/admin/analytics") {
        const auth = request.headers.get("Authorization");
        if (!auth || auth !== `Bearer ${env.ADMIN_SECRET}`) {
          return new Response("Unauthorized", { status: 401 });
        }
        return handleAdminAnalytics(env);
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

    // POST: /api/audit/run — trigger automated AI audit
    if (url.pathname === "/api/audit/run") {
      const auth = request.headers.get("Authorization");
      if (!auth || auth !== `Bearer ${env.ADMIN_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      const body = await request.json().catch(() => ({}));
      const exportData = buildAuditExportData();
      const result = await runAudit(env, {
        providers: body.providers,
        force: body.force,
        exportData,
        triggeredBy: "api",
      });
      return jsonResponse(result);
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

    // Run AI audit daily until election day (March 3, 2026)
    if (new Date() <= new Date("2026-03-04T00:00:00Z")) {
      ctx.waitUntil(
        runAudit(env, {
          exportData: buildAuditExportData(),
          triggeredBy: "cron",
        })
      );
    }
  },
};
