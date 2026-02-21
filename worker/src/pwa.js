// PWA — Full web app served as a single HTML page
// All CSS and JS inline — no build step

export function handlePWA() {
  return new Response(APP_HTML, {
    headers: {
      "Content-Type": "text/html;charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

export function handlePWA_SW() {
  return new Response(SERVICE_WORKER, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache",
    },
  });
}

export function handlePWA_Clear() {
  var html = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>ATX Votes — Updating</title>' +
    '<style>body{font-family:-apple-system,system-ui,sans-serif;display:flex;' +
    'align-items:center;justify-content:center;min-height:100vh;margin:0;' +
    'background:#f5f5f5;color:#333;text-align:center}' +
    '@media(prefers-color-scheme:dark){body{background:#1a1a1a;color:#e5e5e5}}' +
    '.box{padding:2rem;max-width:400px}h2{margin:0 0 1rem}p{color:#666;line-height:1.5}' +
    '.done{color:#22c55e;font-weight:600}</style></head><body><div class="box">' +
    '<h2>Updating ATX Votes...</h2><p id="status">Clearing old cache...</p></div>' +
    '<script>' +
    '(async function(){' +
      'var s=document.getElementById("status");' +
      'try{' +
        'var swCount=0;' +
        'if("serviceWorker" in navigator){' +
          'var regs=await navigator.serviceWorker.getRegistrations();' +
          'for(var r of regs){await r.unregister();swCount++}' +
        '}' +
        'var keys=await caches.keys();' +
        'for(var k of keys) await caches.delete(k);' +
        's.innerHTML="<span class=done>Updated!</span><br><br>Redirecting...";' +
        'setTimeout(function(){location.href="/app"},1000);' +
      '}catch(e){' +
        's.textContent="Error: "+e.message+". Try manually clearing browser data.";' +
      '}' +
    '})();' +
    '</script></body></html>';
  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=utf-8",
      "Cache-Control": "no-store, no-cache",
    },
  });
}

export function handlePWA_Manifest() {
  return new Response(MANIFEST, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

// MARK: - Service Worker

var SERVICE_WORKER = [
  "var CACHE='atxvotes-v2';",
  "self.addEventListener('install',function(e){",
  "  self.skipWaiting();",
  "});",
  "self.addEventListener('activate',function(e){",
  "  e.waitUntil(caches.keys().then(function(ks){",
  "    return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}));",
  "  }));",
  "  self.clients.claim();",
  "});",
  "self.addEventListener('fetch',function(e){",
  "  if(e.request.url.indexOf('/app/api/')!==-1){",
  "    e.respondWith(fetch(e.request).catch(function(){",
  "      return new Response('{\"error\":\"offline\"}',{status:503,headers:{'Content-Type':'application/json'}});",
  "    }));",
  "    return;",
  "  }",
  // Network-first for app shell: always fetch latest, cache for offline fallback
  "  e.respondWith(fetch(e.request).then(function(res){",
  "    var clone=res.clone();",
  "    caches.open(CACHE).then(function(c){c.put(e.request,clone)});",
  "    return res;",
  "  }).catch(function(){return caches.match(e.request)}));",
  "});",
].join("\n");

// MARK: - Manifest

var MANIFEST = JSON.stringify({
  name: "ATX Votes",
  short_name: "ATX Votes",
  description:
    "Your personalized voting guide for Austin & Travis County elections",
  start_url: "/app",
  display: "standalone",
  background_color: "#faf8f0",
  theme_color: "#21598e",
  icons: [
    {
      src:
        "data:image/svg+xml," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' +
            '<rect width="512" height="512" rx="96" fill="#21598e"/>' +
            '<text x="256" y="380" font-size="280" font-weight="900" text-anchor="middle" fill="white" font-family="system-ui">V</text>' +
            "</svg>"
        ),
      sizes: "512x512",
      type: "image/svg+xml",
      purpose: "any",
    },
  ],
});

// MARK: - CSS

var CSS = [
  "*{margin:0;padding:0;box-sizing:border-box}",
  ":root{" +
    "--blue:rgb(33,89,143);--gold:rgb(217,166,33);--bg:#faf8f0;--card:#fff;" +
    "--text:rgb(31,31,36);--text2:rgb(115,115,128);" +
    "--ok:rgb(51,166,82);--warn:rgb(230,140,26);--bad:rgb(209,51,51);" +
    "--rep:rgb(217,38,38);--dem:rgb(38,77,191);" +
    "--border:rgba(128,128,128,.15);--border2:rgba(128,128,128,.25);" +
    "--fill3:rgba(128,128,128,.08);--shadow:rgba(0,0,0,.06);" +
    "--r:16px;--rs:10px;--ps:8px;--pm:16px;--pl:24px" +
    "}",
  "@media(prefers-color-scheme:dark){:root{" +
    "--blue:rgb(102,153,217);--gold:rgb(242,191,64);--bg:rgb(28,28,31);--card:rgb(43,43,46);" +
    "--text:rgb(237,237,240);--text2:rgb(153,153,166);" +
    "--ok:rgb(77,199,107);--warn:rgb(255,166,51);--bad:rgb(255,89,89);" +
    "--rep:rgb(255,77,77);--dem:rgb(89,128,242);" +
    "--border:rgba(255,255,255,.15);--border2:rgba(255,255,255,.2);" +
    "--fill3:rgba(255,255,255,.08);--shadow:rgba(0,0,0,.3)" +
    "}}",
  "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}",
  "#app{max-width:480px;margin:0 auto;padding:var(--pm)}",
  ".card{background:var(--card);border-radius:var(--r);padding:var(--pm);box-shadow:0 2px 8px var(--shadow);margin-bottom:12px}",
  ".card-touch{cursor:pointer;transition:transform .15s}",
  ".card-touch:active{transform:scale(.98)}",

  // Buttons
  ".btn{display:block;width:100%;padding:14px;border:none;border-radius:var(--rs);font-size:17px;font-weight:700;cursor:pointer;text-align:center;transition:opacity .15s;font-family:inherit;text-decoration:none}",
  ".btn:active{opacity:.85}",
  ".btn-primary{background:var(--blue);color:#fff}",
  ".btn-secondary{background:rgba(33,89,143,.1);color:var(--blue)}",
  "@media(prefers-color-scheme:dark){.btn-secondary{background:rgba(102,153,217,.15)}}",
  ".btn-danger{background:rgba(209,51,51,.1);color:var(--bad)}",
  ".btn:disabled{opacity:.4;cursor:default}",

  // Chips
  ".chip{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:99px;border:1.5px solid var(--border2);background:var(--fill3);font-size:15px;cursor:pointer;transition:all .15s;user-select:none}",
  ".chip-on{background:var(--blue);color:#fff;border-color:var(--blue)}",
  ".chip-grid{display:flex;flex-wrap:wrap;gap:10px}",

  // Radio options
  ".radio{padding:14px 16px;border-radius:var(--rs);border:1.5px solid var(--border2);background:var(--fill3);cursor:pointer;transition:all .15s;margin-bottom:10px}",
  ".radio-on{border-color:var(--blue);background:rgba(33,89,143,.1)}",
  "@media(prefers-color-scheme:dark){.radio-on{background:rgba(102,153,217,.15)}}",
  ".radio b{display:block;font-size:16px;margin-bottom:2px}",
  ".radio .desc{font-size:13px;color:var(--text2);line-height:1.4}",

  // Progress bar
  ".progress{height:4px;background:var(--border);border-radius:2px;margin-bottom:20px;overflow:hidden}",
  ".progress-fill{height:100%;background:var(--blue);border-radius:2px;transition:width .3s}",

  // Header
  ".phase-header{margin-bottom:var(--pl)}",
  ".phase-header h2{font-size:22px;font-weight:800;letter-spacing:-.3px;margin-bottom:4px}",
  ".phase-header p{font-size:15px;color:var(--text2);line-height:1.5}",
  ".back-btn{display:inline-flex;align-items:center;gap:4px;font-size:15px;color:var(--blue);background:none;border:none;cursor:pointer;padding:8px 0;margin-bottom:8px;font-family:inherit;font-weight:600}",

  // Layout: body is flex column, #app scrolls, #tabs sticks to bottom
  "html,body{height:100%;margin:0}",
  "body{display:flex;flex-direction:column}",
  "#app{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}",

  // Top nav (desktop)
  "#topnav{display:none}",
  "@media(min-width:600px){" +
    "#topnav{display:block;background:var(--card);border-bottom:1px solid var(--border2);box-shadow:0 1px 4px var(--shadow)}" +
    ".topnav-inner{max-width:480px;margin:0 auto;display:flex;align-items:center;padding:0 var(--pm)}" +
    ".topnav-brand{font-size:18px;font-weight:800;color:var(--blue);margin-right:auto;padding:12px 0;letter-spacing:-.3px}" +
    ".topnav-link{display:flex;align-items:center;gap:6px;padding:12px 16px;font-size:14px;font-weight:600;color:var(--text2);text-decoration:none;cursor:pointer;border:none;background:none;font-family:inherit;transition:color .15s;border-bottom:2px solid transparent;margin-bottom:-1px}" +
    ".topnav-link:hover{color:var(--blue)}" +
    ".topnav-link.on{color:var(--blue);border-bottom-color:var(--blue)}" +
    ".topnav-link svg{width:18px;height:18px}" +
    "#tabs{display:none}" +
  "}",

  // Bottom tab bar (mobile)
  ".tab-bar{background:var(--card);border-top:2px solid var(--border2);display:flex;max-width:480px;margin:0 auto;width:100%;padding:8px 0;padding-bottom:calc(8px + env(safe-area-inset-bottom,8px));box-shadow:0 -2px 8px var(--shadow)}",
  "#tabs{background:var(--card);box-shadow:0 -2px 8px var(--shadow)}",
  ".tab{flex:1;display:flex;flex-direction:column;align-items:center;padding:10px 0 6px;font-size:13px;font-weight:700;color:var(--text2);text-decoration:none;gap:4px;cursor:pointer;border:none;background:none;font-family:inherit;transition:color .15s}",
  ".tab:hover{color:var(--blue)}",
  ".tab-active{color:var(--blue)}",
  ".tab-icon{display:flex;align-items:center;justify-content:center;height:28px}",
  ".tab-icon svg{width:26px;height:26px}",

  // Party switcher
  ".party-row{display:flex;gap:12px;margin-bottom:16px}",
  ".party-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:var(--rs);font-size:17px;font-weight:700;cursor:pointer;border:1.5px solid;transition:all .2s;font-family:inherit;background:none}",
  ".party-rep{color:var(--rep);border-color:rgba(217,38,38,.3)}",
  ".party-rep.on{background:var(--rep);color:#fff;border-color:var(--rep)}",
  ".party-dem{color:var(--dem);border-color:rgba(38,77,191,.3)}",
  ".party-dem.on{background:var(--dem);color:#fff;border-color:var(--dem)}",

  // Badges
  ".badge{display:inline-block;font-size:14px;font-weight:600;padding:3px 10px;border-radius:99px;white-space:nowrap}",
  ".badge-ok{color:var(--ok);background:rgba(51,166,82,.12)}",
  ".badge-warn{color:var(--warn);background:rgba(230,140,26,.12)}",
  ".badge-bad{color:var(--bad);background:rgba(209,51,51,.12)}",
  ".badge-blue{color:var(--blue);background:rgba(33,89,143,.12)}",
  "@media(prefers-color-scheme:dark){.badge-ok{background:rgba(77,199,107,.15)}.badge-warn{background:rgba(255,166,51,.15)}.badge-bad{background:rgba(255,89,89,.15)}.badge-blue{background:rgba(102,153,217,.15)}}",
  ".star{color:var(--gold);font-size:12px;margin-left:6px}",

  // Disclaimer
  ".disclaimer{display:flex;gap:10px;align-items:flex-start;padding:12px;background:rgba(230,140,26,.08);border:1px solid rgba(230,140,26,.3);border-radius:var(--rs);margin-bottom:16px;font-size:13px;line-height:1.5;color:var(--text2)}",
  ".disclaimer b{color:var(--text);font-size:15px;display:block;margin-bottom:2px}",

  // Recommendation box
  ".rec-box{padding:14px;border-radius:var(--rs);border:1.5px solid var(--ok);background:rgba(51,166,82,.06);margin-bottom:16px}",
  "@media(prefers-color-scheme:dark){.rec-box{background:rgba(77,199,107,.08)}}",
  ".rec-box h4{font-size:17px;margin-bottom:4px}",
  ".rec-box p{font-size:14px;color:var(--text2);line-height:1.5}",

  // Candidate card
  ".cand-card{border:1.5px solid var(--border);border-radius:var(--rs);padding:14px;margin-bottom:10px}",
  ".cand-card.recommended{border-color:var(--ok)}",
  ".cand-name{font-size:17px;font-weight:700}",
  ".cand-tags{display:flex;gap:6px;flex-shrink:0;margin-top:2px}",
  ".cand-summary{font-size:14px;color:var(--text2);line-height:1.5;margin-top:8px}",
  ".cand-details{margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}",
  ".cand-section{margin-bottom:10px}",
  ".cand-section h5{font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}",
  ".cand-section li{font-size:14px;line-height:1.5;margin-left:16px;margin-bottom:2px}",

  // Expand toggle
  ".expand-toggle{font-size:14px;color:var(--blue);cursor:pointer;background:none;border:none;padding:8px 0;font-weight:600;font-family:inherit}",

  // Proposition card
  ".prop-header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}",
  ".prop-title{font-size:16px;font-weight:700}",
  ".prop-desc{font-size:14px;color:var(--text2);line-height:1.5;margin-top:6px}",
  ".prop-details{margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}",
  ".prop-section{margin-bottom:10px}",
  ".prop-section h5{font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}",
  ".prop-section p{font-size:14px;line-height:1.5}",

  // Section headers
  ".section-head{font-size:18px;font-weight:800;margin:24px 0 12px;display:flex;align-items:center;gap:8px}",
  ".section-head:first-child{margin-top:0}",

  // Loading
  ".loading{text-align:center;padding:60px 20px}",
  ".loading h2{font-size:22px;font-weight:800;margin-bottom:8px}",
  ".loading p{font-size:15px;color:var(--text2);margin-bottom:24px}",
  ".spinner{width:48px;height:48px;border:4px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 24px}",
  "@keyframes spin{to{transform:rotate(360deg)}}",
  ".loading-icon{font-size:56px;animation:bounce 1.5s ease-in-out infinite;margin-bottom:16px}",
  "@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}",
  ".loading-msg{animation:fadeIn .4s ease}",
  "@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}",
  ".dots{display:flex;gap:8px;justify-content:center;margin-top:16px}",
  ".dot{width:10px;height:10px;border-radius:50%;background:var(--border)}",
  ".dot-done{background:var(--blue)}",
  ".dot-active{background:var(--blue);animation:pulse 1s ease-in-out infinite}",
  "@keyframes pulse{50%{transform:scale(1.3)}}",

  // Form
  ".form-group{margin-bottom:16px}",
  ".form-group label{display:block;font-size:14px;font-weight:600;margin-bottom:6px}",
  ".form-group input{width:100%;padding:12px;border:1.5px solid var(--border2);border-radius:var(--rs);font-size:16px;background:var(--card);color:var(--text);font-family:inherit}",
  ".form-group input:focus{outline:none;border-color:var(--blue)}",
  ".form-row{display:flex;gap:12px}",
  ".form-row .form-group{flex:1}",

  // Info page
  ".countdown{font-size:36px;font-weight:900;color:var(--blue);text-align:center;margin-bottom:4px}",
  ".countdown-label{font-size:14px;color:var(--text2);text-align:center;margin-bottom:24px}",
  ".info-item{padding:12px 0;border-bottom:1px solid var(--border)}",
  ".info-item:last-child{border-bottom:none}",
  ".info-label{font-size:13px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.5px}",
  ".info-value{font-size:16px;font-weight:600;margin-top:2px}",
  // Accordion sections
  ".acc{border-radius:var(--rs);overflow:hidden;margin-bottom:10px;border:1px solid var(--border);background:var(--card)}",
  ".acc-head{display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:pointer;font-size:16px;font-weight:700;color:var(--text);user-select:none}",
  ".acc-head:hover{background:rgba(0,0,0,.03)}",
  "@media(prefers-color-scheme:dark){.acc-head:hover{background:rgba(255,255,255,.05)}}",
  ".acc-icon{font-size:20px;flex-shrink:0}",
  ".acc-chev{margin-left:auto;color:var(--text2);font-size:14px;transition:transform .2s}",
  ".acc-chev.open{transform:rotate(180deg)}",
  ".acc-body{padding:0 16px 14px;font-size:14px;line-height:1.6;color:var(--text)}",
  ".vi-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)}",
  ".vi-row:last-child{border-bottom:none}",
  ".vi-strike{text-decoration:line-through;color:var(--text2)}",
  ".vi-highlight{color:var(--blue);font-weight:600}",
  ".vi-warn{display:flex;gap:10px;align-items:flex-start;padding:12px;background:rgba(230,140,26,.08);border:1px solid rgba(230,140,26,.3);border-radius:var(--rs);margin-top:10px;font-size:13px;line-height:1.5}",
  ".vi-check{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:15px}",
  ".vi-check-icon{color:var(--ok);font-size:16px;flex-shrink:0}",
  ".vi-link{display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--border);font-size:15px;font-weight:600}",
  ".vi-link:last-child{border-bottom:none}",
  ".vi-link a{color:var(--blue);text-decoration:none}",
  ".vi-badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px}",
  ".vi-badge-req{color:#d13333;background:rgba(209,51,51,.1)}",
  ".vi-badge-opt{color:var(--text2);background:rgba(128,128,128,.1)}",

  // Welcome
  ".hero{text-align:center;padding:40px 0 20px}",
  ".hero-icon{font-size:64px;margin-bottom:12px}",
  ".hero h1{font-size:28px;font-weight:900;color:var(--blue);letter-spacing:-.5px}",
  ".hero p{font-size:16px;color:var(--text2);margin-top:8px;line-height:1.5}",
  ".features{margin:24px 0;text-align:left}",
  ".features div{padding:8px 0;font-size:15px;display:flex;align-items:center;gap:10px}",
  ".features span{font-size:18px}",

  // Profile
  ".profile-section{margin-bottom:20px}",
  ".profile-section h3{font-size:14px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}",
  ".profile-summary{font-size:16px;line-height:1.6;font-style:italic;color:var(--text2);margin-bottom:20px}",

  // Actions row
  ".actions{display:flex;gap:10px;margin:16px 0}",
  ".actions .btn{flex:1;padding:10px;font-size:14px}",

  // Cheat sheet
  ".cs-header{text-align:center;padding:12px 0 8px}",
  ".cs-header h2{font-size:20px;font-weight:800;color:var(--blue)}",
  ".cs-meta{font-size:12px;color:var(--text2);margin-top:2px}",
  ".cs-party{display:inline-block;color:#fff;font-size:13px;font-weight:700;padding:2px 10px;border-radius:99px;margin:4px 0}",
  ".cs-party-rep{background:var(--rep)}",
  ".cs-party-dem{background:var(--dem)}",
  ".cs-table{width:100%;border-collapse:collapse;font-size:14px}",
  ".cs-table th{background:var(--blue);color:#fff;text-align:left;padding:5px 10px;font-size:12px;font-weight:700;letter-spacing:.5px;font-family:monospace}",
  ".cs-table td{padding:5px 10px;border-bottom:1px solid var(--border);vertical-align:top}",
  ".cs-table tr:nth-child(even) td{background:var(--fill3)}",
  ".cs-table .cs-vote{font-weight:700;text-align:right;white-space:nowrap}",
  ".cs-table .cs-star{color:var(--gold);margin-right:2px}",
  ".cs-table .cs-yes{color:var(--ok)}",
  ".cs-table .cs-no{color:var(--bad)}",
  ".cs-table .cs-yourcall{color:var(--warn)}",
  ".cs-table .cs-uncontested{color:var(--text2)}",
  ".cs-footer{text-align:center;padding:8px 0;font-size:11px;color:var(--text2)}",
  ".cs-legend{display:flex;justify-content:center;gap:16px;font-size:11px;color:var(--text2);padding:4px 0}",
  ".cs-actions{display:flex;gap:10px;justify-content:center;margin:12px 0}",
  ".cs-actions .btn{padding:10px 20px;font-size:14px;width:auto}",

  // Print styles
  "@media print{" +
    "#topnav,#tabs,.cs-actions,.back-btn{display:none!important}" +
    "html,body{height:auto;display:block}" +
    "#app{max-width:100%;padding:8px;overflow:visible;flex:none}" +
    ".cs-header h2{font-size:18px}" +
    ".cs-table{font-size:12px}" +
    ".cs-table th{padding:4px 8px}" +
    ".cs-table td{padding:3px 8px}" +
    "@page{margin:0.4in;size:letter}" +
  "}",

  // Misc
  ".text-center{text-align:center}",
  ".mt-sm{margin-top:8px}",
  ".mt-md{margin-top:16px}",
  ".mb-md{margin-bottom:16px}",
  ".hidden{display:none}",
  "a{color:var(--blue)}",
  ".error-box{padding:16px;background:rgba(209,51,51,.08);border:1px solid rgba(209,51,51,.3);border-radius:var(--rs);margin-bottom:16px;text-align:center}",
  ".error-box p{font-size:14px;color:var(--bad);line-height:1.5}",
].join("\n");

// MARK: - App JavaScript

var APP_JS = [
  // ============ VERSION CHECK ============
  "var APP_VERSION=12;",
  // ============ DATA ============
  "var ISSUES=[" +
    '{v:"Economy & Cost of Living",icon:"\u{1F4B0}"},' +
    '{v:"Housing",icon:"\u{1F3E0}"},' +
    '{v:"Community Safety",icon:"\u{1F6E1}\u{FE0F}"},' +
    '{v:"Education",icon:"\u{1F393}"},' +
    '{v:"Healthcare",icon:"\u2764\u{FE0F}"},' +
    '{v:"Environment & Climate",icon:"\u{1F33F}"},' +
    '{v:"Grid & Infrastructure",icon:"\u26A1"},' +
    '{v:"Tech & Innovation",icon:"\u{1F4BB}"},' +
    '{v:"Transportation",icon:"\u{1F697}"},' +
    '{v:"Immigration",icon:"\u{1F30E}"},' +
    '{v:"Taxes",icon:"\u{1F4B5}"},' +
    '{v:"Civil Rights",icon:"\u2696\u{FE0F}"}' +
    "];",

  'var SPECTRUM=[' +
    '{v:"Progressive",d:"Bold systemic change, social justice focused"},' +
    '{v:"Liberal",d:"Expand rights and services, government as a force for good"},' +
    '{v:"Moderate",d:"Pragmatic center, best ideas from both sides"},' +
    '{v:"Conservative",d:"Limited government, traditional values, fiscal discipline"},' +
    '{v:"Libertarian",d:"Maximum freedom, minimal government"},' +
    '{v:"Independent / Issue-by-Issue",d:"I decide issue by issue, not by party"}' +
    "];",

  'var QUALITIES=[' +
    '"Competence & Track Record","Integrity & Honesty","Independence","Experience",' +
    '"Fresh Perspective","Bipartisan / Works Across Aisle","Strong Leadership","Community Ties"' +
    "];",

  // Deep dive questions keyed by issue
  "var DEEP_DIVES={" +
    '"Housing":{q:"On housing, where do you land?",opts:[' +
      '{l:"Build, build, build",d:"Ease zoning, encourage density, let the market work"},' +
      '{l:"Smart growth",d:"More housing with affordability guardrails"},' +
      '{l:"Protect neighborhoods",d:"Preserve character, limit density changes"},' +
      "{l:\"It's complicated\",d:\"Case by case \\u2014 depends on the neighborhood\"}" +
    "]}," +
    '"Community Safety":{q:"On public safety, what\\u2019s your approach?",opts:[' +
      '{l:"Fully fund police",d:"Hire more officers, strong prosecution"},' +
      '{l:"Reform + fund",d:"Fund police but invest in alternatives too"},' +
      '{l:"Redirect funding",d:"Move money toward prevention and social services"},' +
      '{l:"Major overhaul needed",d:"Fundamental changes to how we approach safety"}' +
    "]}," +
    '"Economy & Cost of Living":{q:"On taxes and government spending?",opts:[' +
      '{l:"Cut taxes & spending",d:"Government does too much, let people keep their money"},' +
      '{l:"Redirect spending",d:"Same budget, better priorities"},' +
      '{l:"Invest more if it works",d:"Willing to pay more for effective programs"},' +
      '{l:"Tax the wealthy more",d:"Fund services through progressive taxation"}' +
    "]}," +
    '"Tech & Innovation":{q:"On tech and AI regulation?",opts:[' +
      '{l:"Hands off",d:"Let innovation lead, regulate later if needed"},' +
      '{l:"Light touch",d:"Basic guardrails but don\\u2019t slow things down"},' +
      '{l:"Proactive regulation",d:"Get ahead of problems before they happen"},' +
      '{l:"Strong oversight",d:"Tech companies have too much unchecked power"}' +
    "]}," +
    '"Education":{q:"On public education, what\\u2019s your priority?",opts:[' +
      '{l:"School choice first",d:"Vouchers, charters, let parents decide"},' +
      '{l:"Fix public schools",d:"More funding and support for neighborhood schools"},' +
      '{l:"Teacher-focused",d:"Raise pay, reduce class sizes, trust educators"},' +
      '{l:"Back to basics",d:"Focus on core academics, less politics in schools"}' +
    "]}," +
    '"Healthcare":{q:"On healthcare, where do you stand?",opts:[' +
      '{l:"Free market",d:"Less regulation, more competition to lower costs"},' +
      '{l:"Expand Medicaid",d:"Texas should accept federal Medicaid expansion"},' +
      '{l:"Universal coverage",d:"Everyone deserves healthcare regardless of income"},' +
      '{l:"Local solutions",d:"Community health centers and county programs"}' +
    "]}," +
    '"Environment & Climate":{q:"On environment and climate?",opts:[' +
      "{l:\"Don't overreact\",d:\"Protect energy jobs, market-driven solutions\"}," +
      '{l:"All of the above",d:"Renewables and fossil fuels, pragmatic transition"},' +
      '{l:"Go green fast",d:"Aggressive renewable targets and climate action"},' +
      '{l:"Local focus",d:"Clean air and water in Austin, green spaces, urban heat"}' +
    "]}," +
    '"Grid & Infrastructure":{q:"On the power grid and infrastructure?",opts:[' +
      '{l:"Deregulate more",d:"Competition drives reliability, less ERCOT control"},' +
      '{l:"Weatherize & invest",d:"Mandate upgrades, spend what it takes to prevent outages"},' +
      '{l:"Connect the grid",d:"Link Texas to national grid for backup"},' +
      '{l:"Local resilience",d:"Microgrids, batteries, community-level solutions"}' +
    "]}," +
    '"Transportation":{q:"On Austin transportation, what\\u2019s the priority?",opts:[' +
      '{l:"Build more roads",d:"Expand highways and reduce congestion for drivers"},' +
      '{l:"Public transit",d:"Light rail, better buses, less car dependence"},' +
      '{l:"Balanced approach",d:"Roads, transit, bikes, and walkability together"},' +
      '{l:"Remote work first",d:"Reduce the need to commute in the first place"}' +
    "]}," +
    '"Immigration":{q:"On immigration, what\\u2019s your view?",opts:[' +
      '{l:"Secure the border",d:"Enforcement first, then talk about reform"},' +
      '{l:"Enforce but reform",d:"Secure borders AND create legal pathways"},' +
      '{l:"Welcoming approach",d:"Immigrants strengthen Austin, expand protections"},' +
      "{l:\"Local isn't federal\",d:\"City shouldn't spend resources on federal immigration enforcement\"}" +
    "]}," +
    '"Civil Rights":{q:"On civil rights and equality?",opts:[' +
      '{l:"Equal treatment",d:"Same rules for everyone, no special categories"},' +
      '{l:"Protect what we have",d:"Maintain current protections, don\\u2019t roll them back"},' +
      '{l:"Expand protections",d:"Stronger anti-discrimination laws and enforcement"},' +
      '{l:"Systemic change",d:"Address root causes of inequality, not just symptoms"}' +
    "]}" +
    "};",

  // ============ STATE ============
  "var S={" +
    "phase:0,issues:[],spectrum:null,policyViews:{},qualities:[]," +
    "address:{street:'',city:'Austin',state:'TX',zip:''}," +
    "ddIndex:0,ddQuestions:[]," +
    "repBallot:null,demBallot:null,selectedParty:'republican'," +
    "guideComplete:false,summary:null,districts:null," +
    "isLoading:false,loadPhase:0,loadMsg:'',error:null," +
    "expanded:{'vi-dates':true,'vi-id':true},disclaimerDismissed:false" +
    "};",

  // Shuffled arrays (set once per question display)
  "var shuffledIssues=null,shuffledSpectrum=null,shuffledQualities=null,shuffledDD={};",

  // ============ UTILS ============
  "function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')}",

  "function shuffle(a){var b=a.slice();for(var i=b.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=b[i];b[i]=b[j];b[j]=t}return b}",

  "function sortOrder(r){var o=r.office;" +
    "if(o.indexOf('U.S. Senator')!==-1)return 0;" +
    "if(o.indexOf('U.S. Rep')!==-1)return 1;" +
    "if(o.indexOf('Governor')!==-1)return 10;" +
    "if(o.indexOf('Lt. Governor')!==-1||o.indexOf('Lieutenant')!==-1)return 11;" +
    "if(o.indexOf('Attorney General')!==-1)return 12;" +
    "if(o.indexOf('Comptroller')!==-1)return 13;" +
    "if(o.indexOf('Agriculture')!==-1)return 14;" +
    "if(o.indexOf('Land')!==-1)return 15;" +
    "if(o.indexOf('Railroad')!==-1)return 16;" +
    "if(o.indexOf('State Rep')!==-1)return 20;" +
    "if(o.indexOf('Supreme Court')!==-1)return 30;" +
    "if(o.indexOf('Criminal Appeals')!==-1)return 31;" +
    "if(o.indexOf('Court of Appeals')!==-1)return 32;" +
    "if(o.indexOf('Board of Education')!==-1)return 40;" +
    "return 50}",

  // ============ PERSISTENCE ============
  "function save(){" +
    "try{" +
    "localStorage.setItem('atx_votes_profile',JSON.stringify({" +
      "topIssues:S.issues,politicalSpectrum:S.spectrum,policyViews:S.policyViews," +
      "candidateQualities:S.qualities,address:S.address,summaryText:S.summary,districts:S.districts" +
    "}));" +
    "if(S.repBallot)localStorage.setItem('atx_votes_ballot_republican',JSON.stringify(S.repBallot));" +
    "if(S.demBallot)localStorage.setItem('atx_votes_ballot_democrat',JSON.stringify(S.demBallot));" +
    "localStorage.setItem('atx_votes_selected_party',S.selectedParty);" +
    "}catch(e){}" +
  "}",

  "function load(){" +
    "try{" +
    "var p=localStorage.getItem('atx_votes_profile');" +
    "if(p){p=JSON.parse(p);S.issues=p.topIssues||[];S.spectrum=p.politicalSpectrum||null;" +
    "S.policyViews=p.policyViews||{};S.qualities=p.candidateQualities||[];" +
    "S.address=p.address||{street:'',city:'Austin',state:'TX',zip:''};" +
    "S.summary=p.summaryText||null;S.districts=p.districts||null}" +
    "var rb=localStorage.getItem('atx_votes_ballot_republican');" +
    "if(rb)S.repBallot=JSON.parse(rb);" +
    "var db=localStorage.getItem('atx_votes_ballot_democrat');" +
    "if(db)S.demBallot=JSON.parse(db);" +
    "var sp=localStorage.getItem('atx_votes_selected_party');" +
    "if(sp)S.selectedParty=sp;" +
    "if(S.repBallot||S.demBallot)S.guideComplete=true;" +
    "}catch(e){}" +
  "}",

  // ============ RENDER ============
  "function topNav(active){" +
    "return '<div class=\"topnav-inner\">" +
      "<span class=\"topnav-brand\">ATX Votes</span>" +
      "<a class=\"topnav-link'+(active==='#/ballot'?' on':'')+'\" data-action=\"nav\" data-to=\"#/ballot\">'+ICON_BALLOT+'My Ballot</a>" +
      "<a class=\"topnav-link'+(active==='#/info'?' on':'')+'\" data-action=\"nav\" data-to=\"#/info\">'+ICON_INFO+'Vote Info</a>" +
      "<a class=\"topnav-link'+(active==='#/profile'?' on':'')+'\" data-action=\"nav\" data-to=\"#/profile\">'+ICON_PROFILE+'Profile</a>" +
    "</div>';" +
  "}",
  "function render(){" +
    "var app=document.getElementById('app');" +
    "var tabs=document.getElementById('tabs');" +
    "var tnav=document.getElementById('topnav');" +
    "if(!S.guideComplete){app.innerHTML=renderInterview();tabs.innerHTML='';tnav.innerHTML='';return}" +
    "var h=location.hash||'#/ballot';" +
    "if(h.indexOf('#/race/')===0){app.innerHTML=renderRaceDetail(parseInt(h.split('/')[2]));tabs.innerHTML=tabBar('#/ballot');tnav.innerHTML=topNav('#/ballot')}" +
    "else if(h==='#/cheatsheet'){app.innerHTML=renderCheatSheet();tabs.innerHTML='';tnav.innerHTML=topNav('#/ballot')}" +
    "else if(h==='#/profile'){app.innerHTML=renderProfile();tabs.innerHTML=tabBar('#/profile');tnav.innerHTML=topNav('#/profile')}" +
    "else if(h==='#/info'){app.innerHTML=renderVoteInfo();tabs.innerHTML=tabBar('#/info');tnav.innerHTML=topNav('#/info')}" +
    "else{app.innerHTML=renderBallot();tabs.innerHTML=tabBar('#/ballot');tnav.innerHTML=topNav('#/ballot')}" +
  "}",

  // ============ TAB BAR ============
  // SVG icons matching iOS SF Symbols: checkmark.seal.fill, info.circle.fill, person.circle.fill
  "var ICON_BALLOT='<svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M12 1C9.8 1 7.9 2.3 7.2 4.2L3.6 6.3C2.6 6.9 2 8 2 9.2V14.8C2 16 2.6 17.1 3.6 17.7L10.4 21.6C11.4 22.2 12.6 22.2 13.6 21.6L20.4 17.7C21.4 17.1 22 16 22 14.8V9.2C22 8 21.4 6.9 20.4 6.3L16.8 4.2C16.1 2.3 14.2 1 12 1ZM16.3 9.3L11 14.6L7.7 11.3C7.3 10.9 7.3 10.3 7.7 9.9C8.1 9.5 8.7 9.5 9.1 9.9L11 11.8L14.9 7.9C15.3 7.5 15.9 7.5 16.3 7.9C16.7 8.3 16.7 8.9 16.3 9.3Z\"/></svg>';",
  "var ICON_INFO='<svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V11H13V17ZM13 9H11V7H13V9Z\"/></svg>';",
  "var ICON_PROFILE='<svg width=\"28\" height=\"28\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z\"/></svg>';",
  "function tabBar(active){" +
    "return '<nav class=\"tab-bar\">" +
      "<a class=\"tab'+(active==='#/ballot'?' tab-active':'')+'\" data-action=\"nav\" data-to=\"#/ballot\"><span class=\"tab-icon\">'+ICON_BALLOT+'</span>My Ballot</a>" +
      "<a class=\"tab'+(active==='#/info'?' tab-active':'')+'\" data-action=\"nav\" data-to=\"#/info\"><span class=\"tab-icon\">'+ICON_INFO+'</span>Vote Info</a>" +
      "<a class=\"tab'+(active==='#/profile'?' tab-active':'')+'\" data-action=\"nav\" data-to=\"#/profile\"><span class=\"tab-icon\">'+ICON_PROFILE+'</span>Profile</a>" +
    "</nav>';" +
  "}",

  // ============ INTERVIEW VIEWS ============
  "function renderInterview(){" +
    "if(S.phase===0)return renderWelcome();" +
    "if(S.phase===6)return renderBuilding();" +
    "var step=S.phase;var total=5;" +
    "if(S.phase===3){step=3};" +
    "var pbar='<div class=\"progress\"><div class=\"progress-fill\" style=\"width:'+(step/total*100)+'%\"></div></div>';" +
    "var back='<button class=\"back-btn\" data-action=\"back\">&larr; Back</button>';" +
    "if(S.phase===1)return pbar+renderIssues();" +
    "if(S.phase===2)return pbar+back+renderSpectrum();" +
    "if(S.phase===3)return pbar+back+renderDeepDive();" +
    "if(S.phase===4)return pbar+back+renderQualities();" +
    "if(S.phase===5)return pbar+back+renderAddress();" +
    "return'';" +
  "}",

  // Welcome
  "function renderWelcome(){" +
    "return '<div class=\"hero\">" +
      "<div class=\"hero-icon\">\u{1F5F3}\u{FE0F}</div>" +
      "<h1>ATX Votes</h1>" +
      "<p>Your personalized voting guide for Austin &amp; Travis County elections.</p>" +
    "</div>" +
    "<div class=\"card\"><div style=\"text-align:center;margin-bottom:16px\">" +
      "<span class=\"badge badge-blue\">Texas Primary &mdash; March 3, 2026</span></div>" +
      "<div class=\"features\">" +
        "<div><span>\u2705</span> 5-minute interview learns your values</div>" +
        "<div><span>\u{1F4CB}</span> Personalized ballot with recommendations</div>" +
        "<div><span>\u{1F5A8}\u{FE0F}</span> Print your cheat sheet for the booth</div>" +
        "<div><span>\u{1F4CD}</span> Find your polling location</div>" +
        "<div><span>\u2696\u{FE0F}</span> Nonpartisan by design</div>" +
      "</div>" +
      "<button class=\"btn btn-primary mt-md\" data-action=\"start\">Build My Guide</button>" +
    "</div>';" +
  "}",

  // Issues
  "function renderIssues(){" +
    "if(!shuffledIssues)shuffledIssues=shuffle(ISSUES);" +
    "var h='<div class=\"phase-header\"><h2>What issues matter most to you?</h2><p>Pick your top 3-5. We\\u2019ll dig deeper on these.</p></div>';" +
    "h+='<div class=\"chip-grid\">';" +
    "for(var i=0;i<shuffledIssues.length;i++){" +
      "var issue=shuffledIssues[i];" +
      "var on=S.issues.indexOf(issue.v)!==-1;" +
      "h+='<div class=\"chip'+(on?' chip-on':'')+'\" data-action=\"toggle-issue\" data-value=\"'+esc(issue.v)+'\">'+issue.icon+' '+esc(issue.v)+'</div>'" +
    "}" +
    "h+='</div>';" +
    "var n=S.issues.length;" +
    "h+='<p class=\"text-center mt-md\" style=\"font-size:14px;color:var(--text2)\">'+n+' of 3-5 selected</p>';" +
    "h+='<button class=\"btn btn-primary mt-md\" data-action=\"next\"'+(n<3?' disabled':'')+'>Continue</button>';" +
    "return h;" +
  "}",

  // Spectrum
  "function renderSpectrum(){" +
    "if(!shuffledSpectrum)shuffledSpectrum=shuffle(SPECTRUM);" +
    "var h='<div class=\"phase-header\"><h2>How would you describe your political approach?</h2><p>There\\u2019s no wrong answer. This helps us understand your lens.</p></div>';" +
    "for(var i=0;i<shuffledSpectrum.length;i++){" +
      "var sp=shuffledSpectrum[i];" +
      "var on=S.spectrum===sp.v;" +
      "h+='<div class=\"radio'+(on?' radio-on':'')+'\" data-action=\"select-spectrum\" data-value=\"'+esc(sp.v)+'\"><b>'+esc(sp.v)+'</b><span class=\"desc\">'+esc(sp.d)+'</span></div>'" +
    "}" +
    "h+='<button class=\"btn btn-primary mt-md\" data-action=\"next\"'+(S.spectrum?'':' disabled')+'>Continue</button>';" +
    "return h;" +
  "}",

  // Deep Dives
  "function renderDeepDive(){" +
    "if(S.ddQuestions.length===0){S.phase=4;return renderInterview()}" +
    "var dd=S.ddQuestions[S.ddIndex];" +
    "var key=dd.q;" +
    "if(!shuffledDD[key])shuffledDD[key]=shuffle(dd.opts);" +
    "var opts=shuffledDD[key];" +
    "var current=S.policyViews[key]||null;" +
    "var h='<div class=\"phase-header\"><h2>'+esc(dd.q)+'</h2><p>Question '+(S.ddIndex+1)+' of '+S.ddQuestions.length+'</p></div>';" +
    "for(var i=0;i<opts.length;i++){" +
      "var on=current===opts[i].l;" +
      "h+='<div class=\"radio'+(on?' radio-on':'')+'\" data-action=\"select-dd\" data-value=\"'+esc(opts[i].l)+'\"><b>'+esc(opts[i].l)+'</b><span class=\"desc\">'+esc(opts[i].d)+'</span></div>'" +
    "}" +
    "h+='<button class=\"btn btn-primary mt-md\" data-action=\"next-dd\"'+(current?'':' disabled')+'>Continue</button>';" +
    "return h;" +
  "}",

  // Qualities
  "function renderQualities(){" +
    "if(!shuffledQualities)shuffledQualities=shuffle(QUALITIES);" +
    "var h='<div class=\"phase-header\"><h2>What do you value most in a candidate?</h2><p>Pick 2-3 that matter most.</p></div>';" +
    "h+='<div class=\"chip-grid\">';" +
    "for(var i=0;i<shuffledQualities.length;i++){" +
      "var q=shuffledQualities[i];" +
      "var on=S.qualities.indexOf(q)!==-1;" +
      "h+='<div class=\"chip'+(on?' chip-on':'')+'\" data-action=\"toggle-quality\" data-value=\"'+esc(q)+'\">'+esc(q)+'</div>'" +
    "}" +
    "h+='</div>';" +
    "var n=S.qualities.length;" +
    "h+='<p class=\"text-center mt-md\" style=\"font-size:14px;color:var(--text2)\">'+n+' of 2-3 selected</p>';" +
    "h+='<button class=\"btn btn-primary mt-md\" data-action=\"next\"'+(n<2?' disabled':'')+'>Continue</button>';" +
    "return h;" +
  "}",

  // Address
  "function renderAddress(){" +
    "var h='<div class=\"phase-header\"><h2>Where do you vote?</h2><p>We\\u2019ll look up your districts to show the right races.</p></div>';" +
    "h+='<form id=\"addr-form\">';" +
    "h+='<div class=\"form-group\"><label>Street Address</label><input name=\"street\" placeholder=\"123 Congress Ave\" value=\"'+esc(S.address.street)+'\"></div>';" +
    "h+='<div class=\"form-row\">';" +
    "h+='<div class=\"form-group\"><label>City</label><input name=\"city\" value=\"'+esc(S.address.city)+'\"></div>';" +
    "h+='<div class=\"form-group\" style=\"flex:.5\"><label>ZIP</label><input name=\"zip\" placeholder=\"78701\" value=\"'+esc(S.address.zip)+'\" inputmode=\"numeric\" maxlength=\"5\"></div>';" +
    "h+='</div>';" +
    "h+='<div class=\"form-group\"><label>State</label><input value=\"TX\" disabled></div>';" +
    "h+='<button type=\"submit\" class=\"btn btn-primary mt-md\">Build My Guide</button>';" +
    "h+='</form>';" +
    "h+='<p class=\"text-center mt-md\" style=\"font-size:13px;color:var(--text2)\">You can skip the address &mdash; we\\u2019ll show all races.</p>';" +
    "h+='<button class=\"btn btn-secondary mt-sm\" data-action=\"skip-address\">Skip &amp; Build Guide</button>';" +
    "return h;" +
  "}",

  // Building / Loading
  "function renderBuilding(){" +
    "var icons=['\u{1F5F3}\u{FE0F}','\u{1F4CD}','\u{1F50D}','\u{1F418}','\u{1FACF}','\u2728'];" +
    "var msgs=['Finding your ballot...','Looking up your districts...','Researching candidates...'," +
      "'Researching first party...','Researching second party...','Finalizing recommendations...'];" +
    "var pct=Math.min(100,Math.round((S.loadPhase/5)*100));" +
    "var h='<div class=\"loading\">';" +
    "h+='<div class=\"loading-icon\">'+(icons[S.loadPhase]||'\u{1F5F3}\u{FE0F}')+'</div>';" +
    "h+='<h2>Building Your Guide</h2>';" +
    "h+='<p style=\"min-height:24px\" class=\"loading-msg\">'+esc(S.loadMsg||msgs[0])+'</p>';" +
    "h+='<div class=\"progress\" style=\"max-width:240px;margin:20px auto 16px;height:6px\"><div class=\"progress-fill\" style=\"width:'+pct+'%;transition:width .5s ease\"></div></div>';" +
    "if(S.error){h+='<div class=\"error-box\" style=\"margin-top:16px\"><p>'+esc(S.error)+'</p></div><button class=\"btn btn-primary mt-md\" data-action=\"retry\">Try Again</button>'}" +
    "h+='<div class=\"dots\" style=\"margin-top:20px\">';" +
    "for(var i=0;i<6;i++){" +
      "var cls='dot';if(i<S.loadPhase)cls+=' dot-done';else if(i===S.loadPhase&&!S.error)cls+=' dot-active';" +
      "h+='<div class=\"'+cls+'\"></div>'" +
    "}" +
    "h+='</div></div>';" +
    "return h;" +
  "}",

  // ============ BALLOT VIEWS ============
  "function getBallot(){" +
    "return S.selectedParty==='democrat'?S.demBallot:S.repBallot" +
  "}",

  "function renderBallot(){" +
    "var b=getBallot();" +
    "if(!b)return '<div class=\"card\"><p>No ballot available for this party.</p></div>'+renderPartySwitcher();" +
    "var races=b.races.slice().sort(function(a,b){return sortOrder(a)-sortOrder(b)});" +
    "var contested=races.filter(function(r){return r.isContested});" +
    "var uncontested=races.filter(function(r){return!r.isContested});" +
    "var keyRaces=contested.filter(function(r){return r.isKeyRace});" +
    "var otherContested=contested.filter(function(r){return!r.isKeyRace});" +
    "var h=renderPartySwitcher();" +
    // Disclaimer (dismissible)
    "if(!S.disclaimerDismissed){" +
      "h+='<div class=\"disclaimer\"><span style=\"font-size:20px\">\u26A0\u{FE0F}</span><div>" +
        "<b>AI-Generated Recommendations</b>" +
        "These recommendations are generated by AI based on your stated values. They may contain errors. Always do your own research before voting." +
      "</div><button data-action=\"dismiss-disclaimer\" style=\"background:none;border:none;font-size:20px;cursor:pointer;padding:4px 8px;color:var(--text2);flex-shrink:0\">&times;</button></div>'" +
    "}" +
    // Actions
    "h+='<div class=\"actions\">';" +
    "h+='<button class=\"btn btn-secondary\" data-action=\"nav\" data-to=\"#/cheatsheet\">\u{1F5A8}\u{FE0F} Print Cheat Sheet</button>';" +
    "h+='<button class=\"btn btn-secondary\" data-action=\"share\">\u{1F4E4} Share</button>';" +
    "h+='</div>';" +
    // Key races
    "if(keyRaces.length){" +
      "h+='<div class=\"section-head\">\u2B50 Key Races</div>';" +
      "for(var i=0;i<keyRaces.length;i++)h+=renderRaceCard(keyRaces[i],races)" +
    "}" +
    // Other contested
    "if(otherContested.length){" +
      "h+='<div class=\"section-head\">Other Contested Races</div>';" +
      "for(var i=0;i<otherContested.length;i++)h+=renderRaceCard(otherContested[i],races)" +
    "}" +
    // Propositions
    "if(b.propositions&&b.propositions.length){" +
      "h+='<div class=\"section-head\">Propositions</div>';" +
      "for(var i=0;i<b.propositions.length;i++)h+=renderPropCard(b.propositions[i])" +
    "}" +
    // Uncontested
    "if(uncontested.length){" +
      "h+='<div class=\"section-head\">Uncontested Races</div>';" +
      "for(var i=0;i<uncontested.length;i++){" +
        "var r=uncontested[i];var name=r.candidates.length?r.candidates[0].name:'TBD';" +
        "h+='<div class=\"card\"><div style=\"font-size:14px;color:var(--text2)\">'+esc(r.office)+(r.district?' \\u2014 '+esc(r.district):'')+'</div>" +
          "<div style=\"font-size:16px;font-weight:600;margin-top:2px\">'+esc(name)+'</div></div>'" +
      "}" +
    "}" +
    // Footer links
    "h+='<div style=\"text-align:center;padding:24px 0 8px;font-size:13px;color:var(--text2)\">';" +
    "h+='<a href=\"/nonpartisan\" target=\"_blank\" style=\"color:var(--text2)\">Nonpartisan by Design</a>';" +
    "h+=' &middot; ';" +
    "h+='<a href=\"/privacy\" target=\"_blank\" style=\"color:var(--text2)\">Privacy Policy</a>';" +
    "h+='<br><span style=\"margin-top:6px;display:inline-block\">Built in Austin, TX &middot; <a href=\"mailto:howdy@atxvotes.app\" style=\"color:var(--text2)\">howdy@atxvotes.app</a> &middot; v'+APP_VERSION+'</span>';" +
    "h+='</div>';" +
    "return h;" +
  "}",

  // ============ CHEAT SHEET ============
  "function renderCheatSheet(){" +
    "var b=getBallot();" +
    "if(!b)return '<p>No ballot available.</p>';" +
    "var races=b.races.slice().sort(function(a,b){return sortOrder(a)-sortOrder(b)});" +
    "var contested=races.filter(function(r){return r.isContested});" +
    "var uncontested=races.filter(function(r){return!r.isContested});" +
    "var profile=null;try{var p=localStorage.getItem('atx_votes_profile');if(p)profile=JSON.parse(p)}catch(e){}" +
    "var addr=profile&&profile.address?profile.address:null;" +
    "var partyName=S.selectedParty==='democrat'?'Democrat':'Republican';" +
    "var partyCls=S.selectedParty==='democrat'?'cs-party-dem':'cs-party-rep';" +
    // Header
    "var h='<div class=\"cs-header\">';" +
    "h+='<h2>Your Ballot Cheat Sheet</h2>';" +
    "if(addr&&addr.street){h+='<div class=\"cs-meta\">'+esc(addr.street)+', '+esc(addr.city||'Austin')+' '+esc(addr.zip||'')+'</div>'}" +
    "h+='<span class=\"cs-party '+partyCls+'\">'+esc(partyName)+' Primary</span>';" +
    "h+='<div class=\"cs-meta\">March 3, 2026</div>';" +
    "h+='</div>';" +
    // Actions (hidden in print)
    "h+='<div class=\"cs-actions\">';" +
    "h+='<button class=\"btn btn-primary\" data-action=\"do-print\">Print Cheat Sheet</button>';" +
    "h+='<button class=\"btn btn-secondary\" data-action=\"share\">Share</button>';" +
    "h+='</div>';" +
    // Contested races table
    "if(contested.length){" +
      "h+='<table class=\"cs-table\"><thead><tr><th>CONTESTED RACES</th><th style=\"text-align:right\">YOUR VOTE</th></tr></thead><tbody>';" +
      "for(var i=0;i<contested.length;i++){" +
        "var r=contested[i];" +
        "var star=r.isKeyRace?'<span class=\"cs-star\">\u2B50</span>':'';" +
        "var label=esc(r.office)+(r.district?' \\u2014 '+esc(r.district):'');" +
        "var vote=r.recommendation?esc(r.recommendation.candidateName):'\\u2014';" +
        "h+='<tr><td>'+star+label+'</td><td class=\"cs-vote\">'+vote+'</td></tr>'" +
      "}" +
      "h+='</tbody></table>'" +
    "}" +
    // Propositions table
    "if(b.propositions&&b.propositions.length){" +
      "h+='<table class=\"cs-table\" style=\"margin-top:8px\"><thead><tr><th>PROPOSITIONS</th><th style=\"text-align:right\">YOUR VOTE</th></tr></thead><tbody>';" +
      "for(var i=0;i<b.propositions.length;i++){" +
        "var p=b.propositions[i];" +
        "var rec=p.recommendation||'';" +
        "var cls='';if(rec==='Lean Yes'||rec==='FOR')cls='cs-yes';else if(rec==='Lean No'||rec==='AGAINST')cls='cs-no';else cls='cs-yourcall';" +
        "h+='<tr><td>Prop '+esc(p.number||''+(i+1))+': '+esc(p.title)+'</td><td class=\"cs-vote '+cls+'\">'+esc(rec)+'</td></tr>'" +
      "}" +
      "h+='</tbody></table>'" +
    "}" +
    // Uncontested table
    "if(uncontested.length){" +
      "h+='<table class=\"cs-table\" style=\"margin-top:8px\"><thead><tr><th>UNCONTESTED</th><th style=\"text-align:right\">CANDIDATE</th></tr></thead><tbody>';" +
      "for(var i=0;i<uncontested.length;i++){" +
        "var r=uncontested[i];" +
        "var name=r.candidates.length?esc(r.candidates[0].name):'TBD';" +
        "var label=esc(r.office)+(r.district?' \\u2014 '+esc(r.district):'');" +
        "h+='<tr><td>'+label+'</td><td class=\"cs-vote cs-uncontested\">'+name+'</td></tr>'" +
      "}" +
      "h+='</tbody></table>'" +
    "}" +
    // Legend & footer
    "h+='<div class=\"cs-legend\"><span>\u2B50 = Key race</span><span>\u26A0\uFE0F AI-generated — do your own research</span></div>';" +
    "h+='<div class=\"cs-footer\">Built with ATX Votes &middot; atxvotes.app</div>';" +
    // Back link (hidden in print)
    "h+='<div style=\"text-align:center;margin-top:8px\" class=\"cs-actions\"><button class=\"btn btn-secondary\" data-action=\"nav\" data-to=\"#/ballot\">&larr; Back to Ballot</button></div>';" +
    "return h;" +
  "}",

  "function renderPartySwitcher(){" +
    "var hasRep=!!S.repBallot,hasDem=!!S.demBallot;" +
    "if(!hasRep&&!hasDem)return'';" +
    "if(hasRep&&!hasDem){S.selectedParty='republican';return''}" +
    "if(!hasRep&&hasDem){S.selectedParty='democrat';return''}" +
    "return '<div class=\"party-row\">" +
      "<button class=\"party-btn party-rep'+(S.selectedParty==='republican'?' on':'')+'\" data-action=\"set-party\" data-value=\"republican\">" +
        "\u{1F418} Republican</button>" +
      "<button class=\"party-btn party-dem'+(S.selectedParty==='democrat'?' on':'')+'\" data-action=\"set-party\" data-value=\"democrat\">" +
        "\u{1FACF} Democrat</button>" +
    "</div>';" +
  "}",

  "function renderRaceCard(race,allRaces){" +
    "var idx=-1;for(var i=0;i<allRaces.length;i++){if(allRaces[i].id===race.id){idx=i;break}}" +
    "var h='<div class=\"card card-touch\" data-action=\"nav\" data-to=\"#/race/'+idx+'\">';" +
    "h+='<div style=\"display:flex;justify-content:space-between;align-items:flex-start\">';" +
    "h+='<div style=\"flex:1;min-width:0\"><div style=\"font-size:14px;color:var(--text2)\">'+esc(race.office)+(race.district?' \\u2014 '+esc(race.district):'')+'</div>';" +
    "if(race.isKeyRace)h+='<span class=\"star\">\u2B50</span>';" +
    "if(race.recommendation){" +
      "h+='<div style=\"font-size:17px;font-weight:700;margin-top:4px\">'+esc(race.recommendation.candidateName)+'</div>';" +
      "h+='<div style=\"font-size:13px;color:var(--text2);margin-top:2px;line-height:1.4\">'+esc(race.recommendation.reasoning)+'</div>'" +
    "}" +
    "h+='<div style=\"font-size:13px;color:var(--text2);margin-top:4px\">'+race.candidates.length+' candidate'+(race.candidates.length!==1?'s':'')+'</div>';" +
    "h+='</div>';" +
    "h+='<div style=\"display:flex;align-items:center;gap:8px;flex-shrink:0\">';" +
    "if(race.recommendation){h+=confBadge(race.recommendation.confidence)}" +
    "h+='<span style=\"color:var(--text2);font-size:18px\">&rsaquo;</span>';" +
    "h+='</div>';" +
    "h+='</div></div>';" +
    "return h;" +
  "}",

  "function confBadge(c){" +
    "var cls='badge-ok';" +
    "if(c==='Best Available'||c==='Symbolic Race')cls='badge-warn';" +
    "return '<span class=\"badge '+cls+'\">'+esc(c)+'</span>'" +
  "}",

  "function renderPropCard(prop){" +
    "var eid='prop-'+prop.number;" +
    "var isOpen=S.expanded[eid];" +
    "var recClass='badge-warn';" +
    "if(prop.recommendation==='Lean Yes')recClass='badge-ok';" +
    "if(prop.recommendation==='Lean No')recClass='badge-bad';" +
    "var h='<div class=\"card\">';" +
    "h+='<div class=\"prop-header\"><div class=\"prop-title\">Prop '+prop.number+': '+esc(prop.title)+'</div>';" +
    "h+='<span class=\"badge '+recClass+'\">'+esc(prop.recommendation)+'</span></div>';" +
    "h+='<div class=\"prop-desc\">'+esc(prop.description)+'</div>';" +
    "if(prop.reasoning){h+='<div style=\"font-size:14px;color:var(--text2);margin-top:6px;font-style:italic\">'+esc(prop.reasoning)+'</div>'}" +
    "if(isOpen){" +
      "h+='<div class=\"prop-details\">';" +
      "if(prop.background){h+='<div class=\"prop-section\"><h5>Background</h5><p>'+esc(prop.background)+'</p></div>'}" +
      "if(prop.fiscalImpact){h+='<div class=\"prop-section\"><h5>Fiscal Impact</h5><p>'+esc(prop.fiscalImpact)+'</p></div>'}" +
      "if(prop.supporters&&prop.supporters.length){h+='<div class=\"prop-section\"><h5>Supporters</h5><p>'+prop.supporters.map(esc).join('; ')+'</p></div>'}" +
      "if(prop.opponents&&prop.opponents.length){h+='<div class=\"prop-section\"><h5>Opponents</h5><p>'+prop.opponents.map(esc).join('; ')+'</p></div>'}" +
      "if(prop.ifPasses){h+='<div class=\"prop-section\"><h5>If It Passes</h5><p>'+esc(prop.ifPasses)+'</p></div>'}" +
      "if(prop.ifFails){h+='<div class=\"prop-section\"><h5>If It Fails</h5><p>'+esc(prop.ifFails)+'</p></div>'}" +
      "if(prop.caveats){h+='<div class=\"prop-section\"><h5>Caveats</h5><p>'+esc(prop.caveats)+'</p></div>'}" +
      "h+='</div>'" +
    "}" +
    "h+='<button class=\"expand-toggle\" data-action=\"toggle-expand\" data-id=\"'+eid+'\">'+(isOpen?'Show Less':'Learn More')+'</button>';" +
    "h+='</div>';" +
    "return h;" +
  "}",

  // Race Detail
  "function renderRaceDetail(idx){" +
    "var b=getBallot();if(!b)return '<p>No ballot</p>';" +
    "var races=b.races.slice().sort(function(a,b){return sortOrder(a)-sortOrder(b)});" +
    "var race=races[idx];if(!race)return '<p>Race not found</p>';" +
    "var candidates=shuffle(race.candidates);" +
    "var h='<button class=\"back-btn\" data-action=\"nav\" data-to=\"#/ballot\">&larr; Back to Ballot</button>';" +
    "h+='<h2 style=\"font-size:22px;font-weight:800;margin-bottom:4px\">'+esc(race.office)+'</h2>';" +
    "if(race.district)h+='<div style=\"font-size:15px;color:var(--text2);margin-bottom:16px\">'+esc(race.district)+'</div>';" +
    "else h+='<div style=\"margin-bottom:16px\"></div>';" +
    // Recommendation box
    "if(race.recommendation){" +
      "var rec=race.recommendation;" +
      "h+='<div class=\"rec-box\">';" +
      "h+='<div style=\"display:flex;justify-content:space-between;align-items:center\">';" +
      "h+='<h4>\u2705 '+esc(rec.candidateName)+'</h4>';" +
      "h+=confBadge(rec.confidence);" +
      "h+='</div>';" +
      "h+='<p>'+esc(rec.reasoning)+'</p>';" +
      "if(rec.strategicNotes)h+='<p style=\"margin-top:6px\"><b>Strategy:</b> '+esc(rec.strategicNotes)+'</p>';" +
      "if(rec.caveats)h+='<p style=\"margin-top:6px\"><b>Note:</b> '+esc(rec.caveats)+'</p>';" +
      "h+='</div>'" +
    "}" +
    // Candidates
    "h+='<div class=\"section-head\">All Candidates</div>';" +
    "for(var i=0;i<candidates.length;i++){" +
      "var c=candidates[i];" +
      "var eid='cand-'+c.id;" +
      "var isOpen=S.expanded[eid];" +
      "h+='<div class=\"cand-card'+(c.isRecommended?' recommended':'')+'\">';" +
      "h+='<div style=\"display:flex;justify-content:space-between;align-items:flex-start\">';" +
      "h+='<div class=\"cand-name\">'+esc(c.name)+'</div>';" +
      "h+='<div class=\"cand-tags\">';" +
      "if(c.isIncumbent)h+='<span class=\"badge badge-blue\">Incumbent</span>';" +
      "if(c.isRecommended)h+='<span class=\"badge badge-ok\">Recommended</span>';" +
      "h+='</div></div>';" +
      "h+='<div class=\"cand-summary\">'+esc(c.summary)+'</div>';" +
      "if(isOpen){" +
        "h+='<div class=\"cand-details\">';" +
        "if(c.keyPositions&&c.keyPositions.length){h+='<div class=\"cand-section\"><h5>Key Positions</h5><ul>';for(var j=0;j<c.keyPositions.length;j++)h+='<li>'+esc(c.keyPositions[j])+'</li>';h+='</ul></div>'}" +
        "if(c.endorsements&&c.endorsements.length){h+='<div class=\"cand-section\"><h5>Endorsements</h5><ul>';for(var j=0;j<c.endorsements.length;j++)h+='<li>'+esc(c.endorsements[j])+'</li>';h+='</ul></div>'}" +
        "if(c.pros&&c.pros.length){h+='<div class=\"cand-section\"><h5>Pros</h5><ul>';for(var j=0;j<c.pros.length;j++)h+='<li>'+esc(c.pros[j])+'</li>';h+='</ul></div>'}" +
        "if(c.cons&&c.cons.length){h+='<div class=\"cand-section\"><h5>Cons</h5><ul>';for(var j=0;j<c.cons.length;j++)h+='<li>'+esc(c.cons[j])+'</li>';h+='</ul></div>'}" +
        "if(c.fundraising){h+='<div class=\"cand-section\"><h5>Fundraising</h5><p>'+esc(c.fundraising)+'</p></div>'}" +
        "if(c.polling){h+='<div class=\"cand-section\"><h5>Polling</h5><p>'+esc(c.polling)+'</p></div>'}" +
        "h+='</div>'" +
      "}" +
      "h+='<button class=\"expand-toggle\" data-action=\"toggle-expand\" data-id=\"'+eid+'\">'+(isOpen?'Show Less':'Show Details')+'</button>';" +
      "h+='</div>'" +
    "}" +
    "return h;" +
  "}",

  // ============ PROFILE VIEW ============
  "function renderProfile(){" +
    "var h='<h2 style=\"font-size:22px;font-weight:800;margin-bottom:16px\">Your Profile</h2>';" +
    "if(S.summary){h+='<div class=\"profile-summary\">\"'+esc(S.summary)+'\"</div>'}" +
    "h+='<div class=\"card\">';" +
    // Issues
    "h+='<div class=\"profile-section\"><h3>Top Issues</h3><div class=\"chip-grid\">';" +
    "for(var i=0;i<S.issues.length;i++){" +
      "var issue=ISSUES.find(function(x){return x.v===S.issues[i]});" +
      "h+='<span class=\"chip chip-on\">'+(issue?issue.icon+' ':'')+esc(S.issues[i])+'</span>'" +
    "}" +
    "h+='</div></div>';" +
    // Spectrum
    "if(S.spectrum){h+='<div class=\"profile-section\"><h3>Political Approach</h3><p style=\"font-size:16px\">'+esc(S.spectrum)+'</p></div>'}" +
    // Policy views
    "var pvKeys=Object.keys(S.policyViews);" +
    "if(pvKeys.length){" +
      "h+='<div class=\"profile-section\"><h3>Policy Stances</h3>';" +
      "for(var i=0;i<pvKeys.length;i++){h+='<div style=\"margin-bottom:6px\"><span style=\"font-size:13px;color:var(--text2)\">'+esc(pvKeys[i])+'</span><br><span style=\"font-size:15px;font-weight:600\">'+esc(S.policyViews[pvKeys[i]])+'</span></div>'}" +
      "h+='</div>'" +
    "}" +
    // Qualities
    "if(S.qualities.length){" +
      "h+='<div class=\"profile-section\"><h3>Candidate Qualities</h3><div class=\"chip-grid\">';" +
      "for(var i=0;i<S.qualities.length;i++)h+='<span class=\"chip chip-on\">'+esc(S.qualities[i])+'</span>';" +
      "h+='</div></div>'" +
    "}" +
    // Address
    "if(S.address&&S.address.street){h+='<div class=\"profile-section\"><h3>Address</h3><p style=\"font-size:15px\">'+esc(S.address.street)+', '+esc(S.address.city)+', '+esc(S.address.state)+' '+esc(S.address.zip)+'</p></div>'}" +
    "h+='</div>';" +
    // Send Feedback + Credits
    "h+='<div class=\"card\" style=\"margin-top:16px;text-align:center\">';" +
    "h+='<a href=\"mailto:howdy@atxvotes.app\" style=\"font-size:15px;font-weight:600\">Send Feedback &rarr;</a>';" +
    "h+='<p style=\"font-size:13px;color:var(--text2);margin-top:8px\">Powered by Claude (Anthropic)</p>';" +
    "h+='</div>';" +
    // Start Over
    "h+='<div style=\"margin-top:32px;padding-top:20px;border-top:1px solid var(--border)\">';" +
    "h+='<button class=\"btn btn-danger\" data-action=\"reset\">Start Over</button>';" +
    "h+='<p class=\"text-center mt-sm\" style=\"font-size:13px;color:var(--text2)\">This will erase your profile and recommendations.</p>';" +
    "h+='</div>';" +
    // Footer links
    "h+='<div style=\"text-align:center;padding:24px 0 8px;font-size:13px;color:var(--text2)\">';" +
    "h+='<a href=\"/nonpartisan\" target=\"_blank\" style=\"color:var(--text2)\">Nonpartisan by Design</a>';" +
    "h+=' &middot; ';" +
    "h+='<a href=\"/privacy\" target=\"_blank\" style=\"color:var(--text2)\">Privacy Policy</a>';" +
    "h+='</div>';" +
    "return h;" +
  "}",

  // ============ VOTE INFO VIEW ============
  "function accSection(id,icon,title,body){" +
    "var open=S.expanded[id];" +
    "var h='<div class=\"acc\">';" +
    "h+='<div class=\"acc-head\" data-action=\"toggle-expand\" data-id=\"'+id+'\">';" +
    "h+='<span class=\"acc-icon\">'+icon+'</span>';" +
    "h+=esc(title);" +
    "h+='<span class=\"acc-chev'+(open?' open':'')+'\">&#x25BC;</span>';" +
    "h+='</div>';" +
    "if(open){h+='<div class=\"acc-body\">'+body+'</div>'}" +
    "h+='</div>';" +
    "return h;" +
  "}",

  "function renderVoteInfo(){" +
    "var election=new Date(2026,2,3);" + // March 3, 2026
    "var now=new Date();" +
    "var diff=Math.ceil((election-now)/(1000*60*60*24));" +
    "var h='<h2 style=\"font-size:22px;font-weight:800;margin-bottom:16px\">Voting Info</h2>';" +
    // Countdown card
    "h+='<div class=\"card\" style=\"text-align:center;margin-bottom:16px\">';" +
    "if(diff>0){h+='<div class=\"countdown\">'+diff+'</div><div class=\"countdown-label\">days until Election Day</div>'}" +
    "else if(diff===0){h+='<div class=\"countdown\">\u{1F5F3}\u{FE0F}</div><div class=\"countdown-label\">Today is Election Day!</div>'}" +
    "else{h+='<div class=\"countdown\">\u2705</div><div class=\"countdown-label\">Election Day has passed</div>'}" +
    "h+='</div>';" +

    // Polling location card
    "h+='<div class=\"card\" style=\"margin-bottom:16px\">';" +
    "h+='<div style=\"font-size:16px;font-weight:700;margin-bottom:4px\">Find Your Polling Location</div>';" +
    "h+='<p style=\"font-size:14px;color:var(--text2);margin-bottom:12px\">Travis County uses Vote Centers \\u2014 you can vote at any location.</p>';" +
    "h+='<div style=\"display:flex;gap:8px;flex-wrap:wrap\">';" +
    "h+='<a href=\"https://countyclerk.traviscountytx.gov/departments/elections/current-election/\" target=\"_blank\" class=\"btn btn-primary\" style=\"flex:1;text-align:center;text-decoration:none\">Find Locations &rarr;</a>';" +
    "h+='<a href=\"https://votetravis.gov\" target=\"_blank\" class=\"btn btn-secondary\" style=\"flex:1;text-align:center;text-decoration:none\">VoteTravis.gov</a>';" +
    "h+='</div></div>';" +

    // Key Dates accordion
    "var kdBody='';" +
    "var regPast=new Date(2026,1,2)<now;" + // Feb 2
    "var mailDate=new Date(2026,1,20);" + // Feb 20
    "var mailPast=mailDate<now;" +
    "var evStart=new Date(2026,1,17);" + // Feb 17
    "var evEnd=new Date(2026,1,27);" + // Feb 27
    "var evActive=now>=evStart&&now<=evEnd;" +
    "kdBody+='<div class=\"vi-row\"><span'+(regPast?' class=\"vi-strike\"':'')+'>Registration deadline</span><span'+(regPast?' class=\"vi-strike\"':'')+'>Feb 2, 2026</span></div>';" +
    "kdBody+='<div class=\"vi-row\"><span'+(mailPast?' class=\"vi-strike\"':'')+'>Mail ballot application deadline</span><span'+(mailPast?' class=\"vi-strike\"':'')+'>Feb 20, 2026</span></div>';" +
    "kdBody+='<div class=\"vi-row\"><span'+(evActive?' class=\"vi-highlight\"':'')+'>Early voting</span><span'+(evActive?' class=\"vi-highlight\"':'')+'>Feb 17 \\u2013 27, 2026</span></div>';" +
    "kdBody+='<div class=\"vi-row\"><span class=\"vi-highlight\">Election Day</span><span class=\"vi-highlight\">March 3, 2026</span></div>';" +
    "h+=accSection('vi-dates','\u{1F4C5}','Key Dates',kdBody);" +

    // Early Voting accordion
    "var evBody='';" +
    "evBody+='<div class=\"vi-row\"><span>Feb 17 \\u2013 21</span><span>7:00 AM \\u2013 7:00 PM</span></div>';" +
    "evBody+='<div class=\"vi-row\"><span>Feb 22 (Sunday)</span><span>12:00 PM \\u2013 6:00 PM</span></div>';" +
    "evBody+='<div class=\"vi-row\"><span>Feb 23 \\u2013 25</span><span>7:00 AM \\u2013 7:00 PM</span></div>';" +
    "evBody+='<div class=\"vi-row\"><span style=\"font-weight:600\">Feb 26 \\u2013 27</span><span style=\"font-weight:600\">7:00 AM \\u2013 10:00 PM</span></div>';" +
    "evBody+='<p style=\"font-size:13px;color:var(--text2);margin-top:8px\">Vote at any early voting location in Travis County.</p>';" +
    "h+=accSection('vi-early','\u{1F552}','Early Voting',evBody);" +

    // Election Day accordion
    "var edBody='';" +
    "edBody+='<div class=\"vi-row\"><span style=\"font-weight:600\">Hours</span><span style=\"font-weight:600\">7:00 AM \\u2013 7:00 PM</span></div>';" +
    "edBody+='<p style=\"margin-top:8px\">Vote at any Vote Center in Travis County with a \\u201CVote Here / Aqu\\u00ED\\u201D sign.</p>';" +
    "edBody+='<p style=\"margin-top:8px;padding:10px;background:rgba(33,89,143,.06);border-radius:var(--rs);font-size:13px\">" +
      "<b>Open Primary:</b> Texas has open primaries \\u2014 tell the poll worker which party\\u2019s primary you want. You can only vote in one.</p>';" +
    "edBody+='<div style=\"margin-top:10px\"><a href=\"https://countyclerk.traviscountytx.gov/departments/elections/current-election/\" target=\"_blank\" style=\"font-size:14px;font-weight:600;color:var(--blue)\">Find Election Day locations &rarr;</a></div>';" +
    "h+=accSection('vi-eday','\u{1F3DB}\u{FE0F}','Election Day',edBody);" +

    // Voter ID accordion
    "var idBody='';" +
    "var ids=['Texas driver\\u2019s license or DPS ID','Texas Election ID Certificate (EIC)','Texas concealed handgun license','U.S. military ID with photo','U.S. citizenship certificate with photo','U.S. passport (book or card)'];" +
    "for(var i=0;i<ids.length;i++){idBody+='<div class=\"vi-check\"><span class=\"vi-check-icon\">\\u2705</span>'+ids[i]+'</div>'}" +
    "idBody+='<p style=\"font-size:13px;color:var(--text2);margin-top:8px\">Expired IDs accepted if expired less than 4 years. No expiration limit for voters 70+.</p>';" +
    "h+=accSection('vi-id','\u{1F4CB}','Voter ID',idBody);" +

    // What to Bring accordion
    "var bringBody='';" +
    "bringBody+='<div style=\"padding:8px 0;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)\">';" +
    "bringBody+='<span>\u{1F4CB} Photo ID</span><span class=\"vi-badge vi-badge-req\">REQUIRED</span></div>';" +
    "bringBody+='<div style=\"padding:8px 0;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)\">';" +
    "bringBody+='<span>\u{1F4C4} Your cheat sheet (printed)</span><span class=\"vi-badge vi-badge-opt\">Optional</span></div>';" +
    "bringBody+='<div style=\"padding:8px 0;display:flex;justify-content:space-between;align-items:center\">';" +
    "bringBody+='<span>\u{1F4B3} Voter registration card</span><span class=\"vi-badge vi-badge-opt\">Optional</span></div>';" +
    "bringBody+='<div class=\"vi-warn\"><span style=\"font-size:18px\">\u26A0\u{FE0F}</span><div><b>Travis County:</b> You may NOT use your phone in the voting booth. Print your cheat sheet before you go!</div></div>';" +
    "h+=accSection('vi-bring','\u{1F6CD}\u{FE0F}','What to Bring',bringBody);" +

    // Resources accordion
    "var resBody='';" +
    "resBody+='<div class=\"vi-link\"><a href=\"https://lwvaustin.org/voters-guide\" target=\"_blank\">League of Women Voters Guide &rarr;</a></div>';" +
    "resBody+='<div class=\"vi-link\"><a href=\"https://vote411.org\" target=\"_blank\">VOTE411 \\u2014 Personalized ballot &rarr;</a></div>';" +
    "resBody+='<div class=\"vi-link\"><a href=\"https://votetravis.gov\" target=\"_blank\">VoteTravis.gov \\u2014 Official info &rarr;</a></div>';" +
    "resBody+='<div class=\"vi-link\"><a href=\"https://votetexas.gov\" target=\"_blank\">VoteTexas.gov \\u2014 State info &rarr;</a></div>';" +
    "resBody+='<div class=\"vi-link\"><a href=\"https://www.kut.org\" target=\"_blank\">KUT Austin Voter Guide &rarr;</a></div>';" +
    "h+=accSection('vi-res','\u{1F517}','Resources',resBody);" +

    // Contact card
    "h+='<div class=\"card\" style=\"margin-top:16px\">';" +
    "h+='<div style=\"font-size:16px;font-weight:700;margin-bottom:8px\">Travis County Elections</div>';" +
    "h+='<div style=\"padding:6px 0\"><a href=\"tel:5122388683\" style=\"font-size:15px;color:var(--blue);font-weight:600\">\u{1F4DE} (512) 238-8683</a></div>';" +
    "h+='<div style=\"padding:6px 0\"><a href=\"https://votetravis.gov\" target=\"_blank\" style=\"font-size:15px;color:var(--blue);font-weight:600\">\u{1F310} votetravis.gov</a></div>';" +
    "h+='</div>';" +

    // Footer links
    "h+='<div style=\"text-align:center;padding:24px 0 8px;font-size:13px;color:var(--text2)\">';" +
    "h+='<a href=\"/nonpartisan\" target=\"_blank\" style=\"color:var(--text2)\">Nonpartisan by Design</a>';" +
    "h+=' &middot; ';" +
    "h+='<a href=\"/privacy\" target=\"_blank\" style=\"color:var(--text2)\">Privacy Policy</a>';" +
    "h+='<br><span style=\"margin-top:6px;display:inline-block\">Built in Austin, TX &middot; <a href=\"mailto:howdy@atxvotes.app\" style=\"color:var(--text2)\">howdy@atxvotes.app</a></span>';" +
    "h+='</div>';" +
    "return h;" +
  "}",

  // ============ EVENT HANDLING ============
  "document.getElementById('app').addEventListener('click',function(e){" +
    "var el=e.target.closest('[data-action]');if(!el)return;e.preventDefault();" +
    "var action=el.dataset.action;" +
    "if(action==='start'){S.phase=1;render()}" +
    "else if(action==='back'){" +
      "if(S.phase===3&&S.ddIndex>0){S.ddIndex--;render()}" +
      "else if(S.phase===4&&S.ddQuestions.length>0){S.phase=3;S.ddIndex=S.ddQuestions.length-1;render()}" +
      "else{S.phase=Math.max(0,S.phase-1);render()}" +
    "}" +
    "else if(action==='next'){" +
      "if(S.phase===1){" +
        "S.ddQuestions=[];S.ddIndex=0;" +
        "for(var i=0;i<S.issues.length;i++){if(DEEP_DIVES[S.issues[i]])S.ddQuestions.push(DEEP_DIVES[S.issues[i]])}" +
      "}" +
      "S.phase++;render()" +
    "}" +
    "else if(action==='toggle-issue'){" +
      "var v=el.dataset.value;var idx=S.issues.indexOf(v);" +
      "if(idx!==-1)S.issues.splice(idx,1);else if(S.issues.length<5)S.issues.push(v);" +
      "render()" +
    "}" +
    "else if(action==='select-spectrum'){S.spectrum=el.dataset.value;render()}" +
    "else if(action==='select-dd'){" +
      "var dd=S.ddQuestions[S.ddIndex];" +
      "S.policyViews[dd.q]=el.dataset.value;render()" +
    "}" +
    "else if(action==='next-dd'){" +
      "if(S.ddIndex<S.ddQuestions.length-1){S.ddIndex++;render()}" +
      "else{S.phase=4;render()}" +
    "}" +
    "else if(action==='toggle-quality'){" +
      "var v=el.dataset.value;var idx=S.qualities.indexOf(v);" +
      "if(idx!==-1)S.qualities.splice(idx,1);else if(S.qualities.length<3)S.qualities.push(v);" +
      "render()" +
    "}" +
    "else if(action==='skip-address'){S.address={street:'',city:'',state:'TX',zip:''};buildGuide()}" +
    "else if(action==='retry'){buildGuide()}" +
    "else if(action==='set-party'){S.selectedParty=el.dataset.value;save();render()}" +
    "else if(action==='toggle-expand'){" +
      "var id=el.dataset.id;S.expanded[id]=!S.expanded[id];render()" +
    "}" +
    "else if(action==='nav'){location.hash=el.dataset.to}" +
    "else if(action==='reset'){" +
      "if(confirm('Start over? This will erase your profile and recommendations.')){" +
        "S.phase=0;S.issues=[];S.spectrum=null;S.policyViews={};S.qualities=[];" +
        "S.address={street:'',city:'Austin',state:'TX',zip:''};S.ddIndex=0;S.ddQuestions=[];" +
        "S.repBallot=null;S.demBallot=null;S.selectedParty='republican';" +
        "S.guideComplete=false;S.summary=null;S.districts=null;S.expanded={};" +
        "shuffledIssues=null;shuffledSpectrum=null;shuffledQualities=null;shuffledDD={};" +
        "try{localStorage.removeItem('atx_votes_profile');localStorage.removeItem('atx_votes_ballot_republican');" +
        "localStorage.removeItem('atx_votes_ballot_democrat');localStorage.removeItem('atx_votes_selected_party')}catch(e){}" +
        "location.hash='#/';render()" +
      "}" +
    "}" +
    "else if(action==='dismiss-disclaimer'){S.disclaimerDismissed=true;render()}" +
    "else if(action==='do-print'){window.print()}" +
    "else if(action==='share'){shareGuide()}" +
  "});",

  // Tab bar click handler (tabs live outside #app)
  "document.getElementById('tabs').addEventListener('click',function(e){" +
    "var el=e.target.closest('[data-action]');if(!el)return;e.preventDefault();" +
    "if(el.dataset.action==='nav'){location.hash=el.dataset.to}" +
  "});",
  "document.getElementById('topnav').addEventListener('click',function(e){" +
    "var el=e.target.closest('[data-action]');if(!el)return;e.preventDefault();" +
    "if(el.dataset.action==='nav'){location.hash=el.dataset.to}" +
  "});",

  // Form submit for address
  "document.getElementById('app').addEventListener('submit',function(e){" +
    "e.preventDefault();" +
    "var form=e.target;" +
    "var st=form.street.value;" +
    "if(st.toLowerCase()==='station'){st='701 Brazos St.';form.city.value='Austin';form.zip.value='78701'}" +
    "S.address={street:st,city:form.city.value||'Austin',state:'TX',zip:form.zip.value};" +
    "buildGuide();" +
  "});",

  // Hash change
  "window.addEventListener('hashchange',render);",

  // ============ BUILD GUIDE ============
  "function buildGuide(){" +
    "S.phase=6;S.error=null;S.loadPhase=0;S.loadMsg='Finding your ballot...';S.isLoading=true;render();" +
    "doGuide();" +
  "}",

  "async function doGuide(){" +
    "try{" +
      // Step 1: Look up districts if address provided
      "if(S.address&&S.address.street&&S.address.zip){" +
        "S.loadPhase=1;S.loadMsg='Looking up your districts...';render();" +
        "try{" +
          "var dRes=await fetch('/app/api/districts',{method:'POST',headers:{'Content-Type':'application/json'}," +
            "body:JSON.stringify({street:S.address.street,city:S.address.city||'Austin',state:'TX',zip:S.address.zip})});" +
          "if(dRes.ok)S.districts=await dRes.json();" +
        "}catch(e){}" +
      "}" +
      // Step 2: Build profile object for API
      "var profile={" +
        "topIssues:S.issues," +
        "politicalSpectrum:S.spectrum||'Moderate'," +
        "policyViews:S.policyViews," +
        "candidateQualities:S.qualities" +
      "};" +
      // Infer party order
      "var demFirst=false;" +
      "if(S.spectrum==='Progressive'||S.spectrum==='Liberal')demFirst=true;" +
      "else if(S.spectrum==='Moderate'||S.spectrum==='Independent / Issue-by-Issue')demFirst=Math.random()<0.5;" +
      // Step 3: Generate both ballots in parallel
      "S.loadPhase=2;S.loadMsg='Researching candidates...';render();" +
      "var repP=fetch('/app/api/guide',{method:'POST',headers:{'Content-Type':'application/json'}," +
        "body:JSON.stringify({party:'republican',profile:profile,districts:S.districts})}).then(function(r){return r.json()});" +
      "var demP=fetch('/app/api/guide',{method:'POST',headers:{'Content-Type':'application/json'}," +
        "body:JSON.stringify({party:'democrat',profile:profile,districts:S.districts})}).then(function(r){return r.json()});" +
      // Await in order
      "var repResult=null,demResult=null;" +
      "if(demFirst){" +
        "S.loadPhase=3;S.loadMsg='Researching Democrats...';render();" +
        "try{demResult=await demP}catch(e){}" +
        "S.loadPhase=4;S.loadMsg='Researching Republicans...';render();" +
        "try{repResult=await repP}catch(e){}" +
      "}else{" +
        "S.loadPhase=3;S.loadMsg='Researching Republicans...';render();" +
        "try{repResult=await repP}catch(e){}" +
        "S.loadPhase=4;S.loadMsg='Researching Democrats...';render();" +
        "try{demResult=await demP}catch(e){}" +
      "}" +
      "S.loadPhase=5;S.loadMsg='Finalizing recommendations...';render();" +
      // Process results
      "if(repResult&&repResult.ballot)S.repBallot=repResult.ballot;" +
      "if(demResult&&demResult.ballot)S.demBallot=demResult.ballot;" +
      "if(!S.repBallot&&!S.demBallot){" +
        "S.error='Failed to generate recommendations. Please try again.';" +
        "render();return" +
      "}" +
      // Set summary from inferred party
      "S.summary=(demFirst?(demResult&&demResult.profileSummary):(repResult&&repResult.profileSummary))||" +
        "(repResult&&repResult.profileSummary)||(demResult&&demResult.profileSummary)||null;" +
      // Set default party
      "if(S.spectrum==='Progressive'||S.spectrum==='Liberal')S.selectedParty='democrat';" +
      "else if(S.spectrum==='Conservative'||S.spectrum==='Libertarian')S.selectedParty='republican';" +
      "else S.selectedParty=S.repBallot?'republican':'democrat';" +
      // Ensure the selected party has a ballot, fallback if not
      "if(S.selectedParty==='republican'&&!S.repBallot)S.selectedParty='democrat';" +
      "if(S.selectedParty==='democrat'&&!S.demBallot)S.selectedParty='republican';" +
      // Save and show
      "S.guideComplete=true;S.isLoading=false;" +
      "save();" +
      "await new Promise(function(r){setTimeout(r,500)});" +
      "location.hash='#/ballot';render();" +
    "}catch(err){" +
      "S.error=err.message||'Something went wrong. Please try again.';render();" +
    "}" +
  "}",

  // ============ SHARE ============
  "function shareGuide(){" +
    "var b=getBallot();if(!b)return;" +
    "var lines=['ATX Votes \\u2014 My Voting Guide','Build yours at atxvotes.app/app',''];" +
    "var races=b.races.slice().sort(function(a,b){return sortOrder(a)-sortOrder(b)}).filter(function(r){return r.isContested&&r.recommendation});" +
    "for(var i=0;i<races.length;i++){" +
      "var r=races[i];" +
      "lines.push(r.office+(r.district?' \\u2014 '+r.district:'')+': '+r.recommendation.candidateName)" +
    "}" +
    "if(b.propositions&&b.propositions.length){" +
      "lines.push('');lines.push('Propositions:');" +
      "for(var i=0;i<b.propositions.length;i++){" +
        "var p=b.propositions[i];lines.push('Prop '+p.number+': '+p.recommendation)" +
      "}" +
    "}" +
    "" +
    "var text=lines.join('\\n');" +
    "if(navigator.share){" +
      "navigator.share({title:'ATX Votes',text:text}).catch(function(){})" +
    "}else{" +
      "navigator.clipboard.writeText(text).then(function(){alert('Copied to clipboard!')}).catch(function(){alert(text)})" +
    "}" +
  "}",

  // ============ BACKGROUND REFRESH ============
  "function refreshBallots(){" +
    "if(!S.guideComplete)return;" +
    "var parties=[];" +
    "if(S.repBallot)parties.push('republican');" +
    "if(S.demBallot)parties.push('democrat');" +
    "parties.forEach(function(party){" +
      "fetch('/app/api/ballot?party='+party).then(function(r){" +
        "if(!r.ok)return null;return r.json()" +
      "}).then(function(remote){" +
        "if(!remote)return;" +
        "var key=party==='republican'?'repBallot':'demBallot';" +
        "var current=S[key];if(!current)return;" +
        "var changed=false;" +
        "for(var ri=0;ri<current.races.length;ri++){" +
          "var cr=current.races[ri];" +
          "var rr=null;" +
          "for(var j=0;j<remote.races.length;j++){" +
            "if(remote.races[j].office===cr.office&&remote.races[j].district===cr.district){rr=remote.races[j];break}" +
          "}" +
          "if(!rr)continue;" +
          "for(var ci=0;ci<cr.candidates.length;ci++){" +
            "var cc=cr.candidates[ci];var rc=null;" +
            "for(var k=0;k<rr.candidates.length;k++){" +
              "if(rr.candidates[k].name===cc.name){rc=rr.candidates[k];break}" +
            "}" +
            "if(!rc)continue;" +
            // Merge factual fields, preserve personalized fields
            "current.races[ri].candidates[ci].endorsements=rc.endorsements;" +
            "current.races[ri].candidates[ci].polling=rc.polling;" +
            "current.races[ri].candidates[ci].fundraising=rc.fundraising;" +
            "current.races[ri].candidates[ci].background=rc.background;" +
            "current.races[ri].candidates[ci].pros=rc.pros;" +
            "current.races[ri].candidates[ci].cons=rc.cons;" +
            "current.races[ri].candidates[ci].keyPositions=rc.keyPositions;" +
            "current.races[ri].candidates[ci].summary=rc.summary;" +
            "changed=true" +
          "}" +
        "}" +
        "if(changed){S[key]=current;save()}" +
      "}).catch(function(){})" +
    "})" +
  "}",

  // ============ INIT ============
  "load();",
  "if(!S.guideComplete&&location.hash&&location.hash!=='#/')location.hash='#/';",
  "render();",
  "refreshBallots();",
  "if('serviceWorker' in navigator){" +
    "navigator.serviceWorker.getRegistrations().then(function(regs){" +
      "regs.forEach(function(r){r.unregister()});" +
      "navigator.serviceWorker.register('/app/sw.js').catch(function(){});" +
    "}).catch(function(){" +
      "navigator.serviceWorker.register('/app/sw.js').catch(function(){});" +
    "})" +
  "}",
].join("\n");

// MARK: - App HTML (must be after CSS and APP_JS)

var APP_HTML =
  '<!DOCTYPE html><html lang="en"><head>' +
  '<meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  "<title>ATX Votes</title>" +
  '<link rel="manifest" href="/app/manifest.json">' +
  '<meta name="theme-color" content="#21598e">' +
  '<meta name="apple-mobile-web-app-capable" content="yes">' +
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">' +
  '<meta name="description" content="Your personalized voting guide for Austin &amp; Travis County elections.">' +
  "<style>" +
  CSS +
  "</style>" +
  "</head><body>" +
  '<div id="topnav"></div>' +
  '<div id="app"></div>' +
  '<div id="tabs"></div>' +
  "<script>" +
  APP_JS +
  "</script>" +
  "</body></html>";
