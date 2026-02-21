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
  ".chip svg{flex-shrink:0}",
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
  ".tab{flex:1;display:flex;flex-direction:column;align-items:center;padding:10px 0 6px;font-size:13px;font-weight:700;color:var(--text2);text-decoration:none;gap:4px;cursor:pointer;border:none;background:none;font-family:inherit;transition:color .15s;white-space:nowrap}",
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
  ".lang-on{background:var(--blue);color:#fff;border-color:var(--blue)}",
  ".lang-off{background:var(--fill3);border-color:var(--border2);color:var(--text)}",

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
  ".cand-avatar{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;flex-shrink:0;overflow:hidden}",
  ".cand-name{font-size:17px;font-weight:700}",
  ".cand-tags{display:flex;gap:6px;flex-shrink:0;margin-top:2px}",
  ".cand-summary{font-size:14px;color:var(--text2);line-height:1.5;margin-top:8px}",
  ".cand-details{margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}",
  ".cand-section{margin-bottom:10px}",
  ".cand-section h5{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}",
  ".cand-section.pros h5{color:var(--ok)}",
  ".cand-section.cons h5{color:var(--bad)}",
  ".cand-section li{font-size:14px;line-height:1.5;margin-left:16px;margin-bottom:2px}",
  ".pos-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}",
  ".pos-chip{font-size:13px;padding:4px 10px;border-radius:12px;background:rgba(33,89,143,.08);color:var(--blue)}",
  "@media(prefers-color-scheme:dark){.pos-chip{background:rgba(102,153,217,.12)}}",

  // Expand toggle
  ".expand-toggle{font-size:14px;color:var(--blue);cursor:pointer;background:none;border:none;padding:8px 0;font-weight:600;font-family:inherit}",

  // Proposition card
  ".prop-header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}",
  ".prop-title{font-size:16px;font-weight:700}",
  ".prop-desc{font-size:14px;color:var(--text2);line-height:1.5;margin-top:6px}",
  ".prop-trans{font-size:13px;color:var(--text2);line-height:1.5;margin-top:4px;font-style:italic}",
  ".prop-details{margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}",
  ".prop-section{margin-bottom:10px}",
  ".prop-section h5{font-size:13px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}",
  ".prop-section p{font-size:14px;line-height:1.5}",
  ".prop-cols{display:flex;gap:12px;margin-bottom:10px}",
  ".prop-col{flex:1;min-width:0}",
  ".prop-col h5{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}",
  ".prop-col.for h5{color:var(--ok)}",
  ".prop-col.against h5{color:var(--bad)}",
  ".prop-col ul{margin:0;padding-left:16px}",
  ".prop-col li{font-size:13px;line-height:1.5;margin-bottom:2px}",
  ".prop-outcome{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:var(--rs);margin-bottom:6px;font-size:13px;line-height:1.5}",
  ".prop-outcome.pass{background:rgba(51,166,82,.06);border:1px solid rgba(51,166,82,.2)}",
  ".prop-outcome.fail{background:rgba(209,51,51,.06);border:1px solid rgba(209,51,51,.2)}",
  "@media(prefers-color-scheme:dark){.prop-outcome.pass{background:rgba(77,199,107,.08)}.prop-outcome.fail{background:rgba(255,89,89,.08)}}",
  ".prop-reasoning{display:flex;gap:8px;align-items:flex-start;padding:10px;border-radius:var(--rs);background:rgba(33,89,143,.04);margin-top:8px;font-size:13px;line-height:1.5;font-style:italic;color:var(--text2)}",
  "@media(prefers-color-scheme:dark){.prop-reasoning{background:rgba(102,153,217,.06)}}",

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

  // I Voted sticker (oval, matching iOS)
  ".voted-sticker{width:220px;height:165px;border-radius:50%;border:1.5px solid rgba(0,0,0,.15);display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto 16px;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.12);padding:12px;gap:2px}",
  ".voted-text{font-size:42px;font-weight:700;font-style:italic;font-family:Georgia,'Times New Roman',serif;color:#0D2738;line-height:1}",
  ".voted-early{font-size:24px;font-weight:700;font-style:italic;font-family:Georgia,'Times New Roman',serif;color:#CC1919;line-height:1}",

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
    "#topnav,#tabs,.cs-actions,.back-btn,.party-row{display:none!important}" +
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

  // Accessibility: reduce motion
  "@media(prefers-reduced-motion:reduce){" +
    ".loading-icon{animation:none}" +
    ".loading-msg{animation:none}" +
    ".dot-active{animation:none}" +
    ".spinner{animation:none}" +
    ".card-touch{transition:none}" +
    ".chip,.radio,.btn,.tab,.topnav-link,.party-btn,.acc-chev,.progress-fill{transition:none}" +
  "}",

  // Accessibility: focus visible
  "[data-action]:focus-visible,.btn:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid var(--blue);outline-offset:2px;border-radius:var(--rs)}",
  ".chip:focus-visible{outline:2px solid var(--blue);outline-offset:2px}",
  ".radio:focus-visible{outline:2px solid var(--blue);outline-offset:2px}",

  // Skip link
  ".skip-link{position:absolute;top:-40px;left:0;background:var(--blue);color:#fff;padding:8px 16px;z-index:100;font-size:14px;font-weight:600;text-decoration:none;border-radius:0 0 var(--rs) 0}",
  ".skip-link:focus{top:0}",
].join("\n");

// MARK: - App JavaScript

var APP_JS = [
  // ============ VERSION CHECK ============
  "var APP_VERSION=25;",

  // ============ i18n ============
  "var LANG=localStorage.getItem('atx_votes_lang')||((navigator.language||'').slice(0,2)==='es'?'es':'en');",
  "function setLang(l){LANG=l;localStorage.setItem('atx_votes_lang',l);shuffledIssues=null;shuffledSpectrum=null;shuffledQualities=null;shuffledDD={};render();" +
    "if(S.summary&&S.guideComplete){regenerateSummary()}" +
  "}",
  "var TR={" +
    // Welcome & General
    "'Your personalized voting guide for Austin & Travis County elections.':'Tu gu\\u00EDa personalizada de votaci\\u00F3n para Austin y el condado de Travis.'," +
    "'Texas Primary \\u2014 March 3, 2026':'Primaria de Texas \\u2014 3 de marzo, 2026'," +
    "'5-minute interview learns your values':'Entrevista r\\u00E1pida sobre tus valores'," +
    "'Personalized ballot with recommendations':'Boleta personalizada con recomendaciones'," +
    "'Print your cheat sheet for the booth':'Imprime tu gu\\u00EDa r\\u00E1pida para la casilla'," +
    "'Find your polling location':'Encuentra tu lugar de votaci\\u00F3n'," +
    "'Nonpartisan by design':'Apartidista por dise\\u00F1o'," +
    "'Build My Guide':'Crear mi gu\\u00EDa'," +
    // Interview
    "'What issues matter most to you?':'\\u00BFQu\\u00E9 temas te importan m\\u00E1s?'," +
    "'Pick your top 3-5. We\\u2019ll dig deeper on these.':'Elige los 3 a 5 m\\u00E1s importantes. Profundizaremos en estos.'," +
    "'of 3-5 selected':'de 3-5 seleccionados'," +
    "'Continue':'Continuar'," +
    "'Back':'Atr\\u00E1s'," +
    "'How would you describe your political approach?':'\\u00BFC\\u00F3mo describir\\u00EDas tu enfoque pol\\u00EDtico?'," +
    "'There\\u2019s no wrong answer. This helps us understand your lens.':'No hay respuesta incorrecta. Esto nos ayuda a entender tu perspectiva.'," +
    "'What do you value most in a candidate?':'\\u00BFQu\\u00E9 es lo que m\\u00E1s valoras en un candidato?'," +
    "'Pick 2-3 that matter most.':'Elige 2 o 3 que m\\u00E1s te importen.'," +
    "'of 2-3 selected':'de 2-3 seleccionados'," +
    "'Question':'Pregunta'," +
    "'of':'de'," +
    // Address
    "'Where do you vote?':'\\u00BFD\\u00F3nde votas?'," +
    "'We\\u2019ll look up your districts to show the right races.':'Buscaremos tus distritos para mostrar las contiendas correctas.'," +
    "'Street Address':'Direcci\\u00F3n'," +
    "'City':'Ciudad'," +
    "'ZIP':'C\\u00F3digo postal'," +
    "'State':'Estado'," +
    "'Your address stays on your device. It\\u2019s only used to look up your ballot districts \\u2014 we never store or share it.':'Tu direcci\\u00F3n se queda en tu dispositivo. Solo se usa para buscar tus distritos electorales \\u2014 nunca la almacenamos ni compartimos.'," +
    "'You can skip the address \\u2014 we\\u2019ll show all races.':'Puedes omitir la direcci\\u00F3n \\u2014 mostraremos todas las contiendas.'," +
    "'Skip & Build Guide':'Omitir y crear gu\\u00EDa'," +
    // Building
    "'Building Your Guide':'Creando tu gu\\u00EDa'," +
    "'Finding your ballot...':'Buscando tu boleta...'," +
    "'Looking up your districts...':'Buscando tus distritos...'," +
    "'Researching candidates...':'Investigando candidatos...'," +
    "'Researching Republicans...':'Investigando republicanos...'," +
    "'Researching Democrats...':'Investigando dem\\u00F3cratas...'," +
    "'Finalizing recommendations...':'Finalizando recomendaciones...'," +
    "'Failed to generate recommendations. Please try again.':'No se pudieron generar recomendaciones. Intenta de nuevo.'," +
    "'Try Again':'Intentar de nuevo'," +
    // Tab bar & nav
    "'My Ballot':'Boleta'," +
    "'Vote Info':'Info'," +
    "'Profile':'Perfil'," +
    // Ballot
    "'Republican':'Republicano'," +
    "'Democratic':'Dem\\u00F3crata'," +
    "'Democrat':'Dem\\u00F3crata'," +
    "'Tuesday, March 3, 2026':'Martes, 3 de marzo, 2026'," +
    "'Showing all races':'Mostrando todas las contiendas'," +
    "'No ballot available for this party.':'No hay boleta disponible para este partido.'," +
    "'AI-Generated Recommendations':'Recomendaciones generadas por IA'," +
    "'These recommendations are generated by AI based on your stated values. They may contain errors. Always do your own research before voting.':'Estas recomendaciones son generadas por IA bas\\u00E1ndose en tus valores. Pueden contener errores. Siempre haz tu propia investigaci\\u00F3n antes de votar.'," +
    "'Print Cheat Sheet':'Imprimir gu\\u00EDa r\\u00E1pida'," +
    "'Share':'Compartir'," +
    "'Key Races':'Contiendas clave'," +
    "'Other Contested Races':'Otras contiendas competidas'," +
    "'Propositions':'Proposiciones'," +
    "'Uncontested Races':'Contiendas sin oposici\\u00F3n'," +
    "'candidate':'candidato'," +
    "'candidates':'candidatos'," +
    // Race detail
    "'Back to Ballot':'Volver a la boleta'," +
    "'All Candidates':'Todos los candidatos'," +
    "'Incumbent':'Titular'," +
    "'Recommended':'Recomendado'," +
    "'Strategy:':'Estrategia:'," +
    "'Note:':'Nota:'," +
    "'Key Positions':'Posiciones clave'," +
    "'Strengths':'Fortalezas'," +
    "'Concerns':'Preocupaciones'," +
    "'Endorsements':'Respaldos'," +
    "'Fundraising':'Recaudaci\\u00F3n de fondos'," +
    "'Polling':'Encuestas'," +
    "'Show Less':'Ver menos'," +
    "'Show Details':'Ver detalles'," +
    "'Learn More':'Saber m\\u00E1s'," +
    // Confidence badges
    "'Our Pick':'Nuestra recomendaci\\u00F3n'," +
    "'Strong Match':'Altamente compatible'," +
    "'Good Match':'Buena opci\\u00F3n'," +
    "'Lean':'Inclinaci\\u00F3n'," +
    "'Lean Yes':'A favor'," +
    "'Lean No':'En contra'," +
    "'Your Call':'Tu decisi\\u00F3n'," +
    "'Clear Call':'Decisi\\u00F3n clara'," +
    "'Best Available':'Mejor opci\\u00F3n disponible'," +
    "'Symbolic Race':'Contienda simb\\u00F3lica'," +
    "'Genuinely Contested':'Verdaderamente competida'," +
    "'Not Sure Yet':'A\\u00FAn no estoy seguro'," +
    // Propositions
    "'If it passes:':'Si se aprueba:'," +
    "'If it fails:':'Si no se aprueba:'," +
    "'Background':'Antecedentes'," +
    "'Fiscal Impact':'Impacto fiscal'," +
    "'Supporters':'Partidarios'," +
    "'Opponents':'Opositores'," +
    "'Caveats':'Advertencias'," +
    // Proposition titles (Democrat)
    "'Expand Medicaid':'Expandir Medicaid'," +
    "'Humane immigration reform':'Reforma migratoria humanitaria'," +
    "'Reproductive rights':'Derechos reproductivos'," +
    "'Housing affordability':'Vivienda asequible'," +
    "'Public school funding':'Financiamiento de escuelas p\\u00FAblicas'," +
    "'Online voter registration':'Registro de votantes en l\\u00EDnea'," +
    "'Environmental standards':'Est\\u00E1ndares ambientales'," +
    "'Cannabis legalization':'Legalizaci\\u00F3n del cannabis'," +
    "'Raise state employee wages':'Aumento de salarios de empleados estatales'," +
    "'Redistricting reform':'Reforma de redistribuci\\u00F3n de distritos'," +
    "'Fair taxation':'Tributaci\\u00F3n justa'," +
    "'Expand public transit':'Expandir transporte p\\u00FAblico'," +
    "'Red flag gun safety laws':'Leyes de alerta de seguridad de armas'," +
    // Proposition titles (Republican)
    "'Phase out property taxes':'Eliminar gradualmente impuestos a la propiedad'," +
    "'Voter approval for local tax hikes':'Aprobaci\\u00F3n de votantes para aumentos de impuestos locales'," +
    "'Healthcare & vaccination status':'Atenci\\u00F3n m\\u00E9dica y estado de vacunaci\\u00F3n'," +
    "'Life at fertilization in schools':'Vida desde la fertilizaci\\u00F3n en escuelas'," +
    "'Ban school health clinics':'Prohibir cl\\u00EDnicas de salud en escuelas'," +
    "'Term limits':'L\\u00EDmites de mandato'," +
    "'Protect Texas water':'Proteger el agua de Texas'," +
    "'End services for undocumented immigrants':'Terminar servicios para inmigrantes indocumentados'," +
    "'No Democratic committee chairs':'Sin presidentes de comit\\u00E9 dem\\u00F3cratas'," +
    "'Prohibit Sharia Law':'Prohibir la ley Sharia'," +
    // Proposition descriptions (Democrat)
    "'Texas should expand Medicaid to ensure access to affordable healthcare for all residents.':'Texas deber\\u00EDa expandir Medicaid para asegurar acceso a atenci\\u00F3n m\\u00E9dica asequible para todos los residentes.'," +
    "'Texas should adopt humane and dignified immigration policies and clear pathways to citizenship.':'Texas deber\\u00EDa adoptar pol\\u00EDticas migratorias humanas y dignas con caminos claros a la ciudadan\\u00EDa.'," +
    "'Texans should have the right to make their own healthcare decisions, including reproductive rights, with removal of insurance barriers to treatment.':'Los texanos deber\\u00EDan tener el derecho a tomar sus propias decisiones de salud, incluyendo derechos reproductivos, eliminando barreras de seguro para el tratamiento.'," +
    "'The state should use funding and regulation to address the housing crisis in urban and rural communities.':'El estado deber\\u00EDa usar financiamiento y regulaci\\u00F3n para abordar la crisis de vivienda en comunidades urbanas y rurales.'," +
    "'Texas should equalize per-pupil spending to the national average. Texas currently ranks 42nd.':'Texas deber\\u00EDa igualar el gasto por alumno al promedio nacional. Texas actualmente ocupa el puesto 42.'," +
    "'Texas should implement secure online voter registration, already used by 42 other states.':'Texas deber\\u00EDa implementar el registro seguro de votantes en l\\u00EDnea, ya utilizado por otros 42 estados.'," +
    "'Texas should enforce stricter environmental standards for air, water, and biodiversity.':'Texas deber\\u00EDa aplicar est\\u00E1ndares ambientales m\\u00E1s estrictos para aire, agua y biodiversidad.'," +
    "'Texas should legalize adult cannabis use and automatically expunge past cannabis-related convictions.':'Texas deber\\u00EDa legalizar el uso de cannabis para adultos y borrar autom\\u00E1ticamente condenas previas relacionadas con cannabis.'," +
    "'State and school employee salaries should be raised to national averages with biennial cost-of-living adjustments.':'Los salarios de empleados estatales y escolares deber\\u00EDan aumentarse al promedio nacional con ajustes bienales por costo de vida.'," +
    "'Texas should ban racially motivated and mid-decade redistricting.':'Texas deber\\u00EDa prohibir la redistribuci\\u00F3n de distritos motivada racialmente y a mitad de d\\u00E9cada.'," +
    "'The federal tax burden should shift to the wealthiest individuals with working-class income tax relief.':'La carga tributaria federal deber\\u00EDa trasladarse a los individuos m\\u00E1s ricos con alivio de impuestos sobre la renta para la clase trabajadora.'," +
    "'Texas should expand accessible transit in rural and urban areas.':'Texas deber\\u00EDa expandir el transporte accesible en \\u00E1reas rurales y urbanas.'," +
    "'Texas should enact Extreme Risk Protection Orders to prevent individuals with a history of domestic abuse from purchasing firearms.':'Texas deber\\u00EDa promulgar \\u00D3rdenes de Protecci\\u00F3n por Riesgo Extremo para prevenir que personas con historial de abuso dom\\u00E9stico compren armas de fuego.'," +
    // Proposition descriptions (Republican)
    "'Texas property taxes should be assessed at the purchase price and phased out entirely over the next six years through spending reductions.':'Los impuestos a la propiedad de Texas deber\\u00EDan evaluarse al precio de compra y eliminarse por completo en los pr\\u00F3ximos seis a\\u00F1os mediante reducciones de gasto.'," +
    "'Texas should require any local government budget that raises property taxes to be approved by voters at a November general election.':'Texas deber\\u00EDa requerir que cualquier presupuesto de gobierno local que aumente impuestos a la propiedad sea aprobado por los votantes en una elecci\\u00F3n general de noviembre.'," +
    "'Texas should prohibit denial of healthcare or any medical service based solely on the patient\\'s vaccination status.':'Texas deber\\u00EDa prohibir la denegaci\\u00F3n de atenci\\u00F3n m\\u00E9dica basada \\u00FAnicamente en el estado de vacunaci\\u00F3n del paciente.'," +
    "'Texas should require its public schools to teach that life begins at fertilization.':'Texas deber\\u00EDa requerir que sus escuelas p\\u00FAblicas ense\\u00F1en que la vida comienza en la fertilizaci\\u00F3n.'," +
    "'Texas should ban gender, sexuality, and reproductive clinics and services in K-12 schools.':'Texas deber\\u00EDa prohibir cl\\u00EDnicas y servicios de g\\u00E9nero, sexualidad y reproducci\\u00F3n en escuelas K-12.'," +
    "'Texas should enact term limits on all elected officials.':'Texas deber\\u00EDa establecer l\\u00EDmites de mandato para todos los funcionarios electos.'," +
    "'Texas should ban the large-scale export, or sale, of our groundwater and surface water to any single private or public entity.':'Texas deber\\u00EDa prohibir la exportaci\\u00F3n o venta a gran escala de nuestras aguas subterr\\u00E1neas y superficiales a cualquier entidad privada o p\\u00FAblica individual.'," +
    "'The Texas Legislature should reduce the burden of illegal immigration on taxpayers by ending public services for illegal immigrants.':'La Legislatura de Texas deber\\u00EDa reducir la carga de la inmigraci\\u00F3n ilegal sobre los contribuyentes al terminar los servicios p\\u00FAblicos para inmigrantes ilegales.'," +
    "'The Republican-controlled Texas Legislature should stop awarding leadership positions, including committee chairmanships, to Democrats.':'La Legislatura de Texas controlada por los republicanos deber\\u00EDa dejar de otorgar posiciones de liderazgo, incluyendo presidencias de comit\\u00E9, a los dem\\u00F3cratas.'," +
    "'Texas should prohibit Sharia Law.':'Texas deber\\u00EDa prohibir la ley Sharia.'," +
    // Cheat sheet
    "'Your Ballot Cheat Sheet':'Tu gu\\u00EDa r\\u00E1pida de boleta'," +
    "'Primary':'Primaria'," +
    "'March 3, 2026':'3 de marzo, 2026'," +
    "'Print Cheat Sheet':'Imprimir gu\\u00EDa r\\u00E1pida'," +
    "'CONTESTED RACES':'CONTIENDAS COMPETIDAS'," +
    "'YOUR VOTE':'TU VOTO'," +
    "'PROPOSITIONS':'PROPOSICIONES'," +
    "'UNCONTESTED':'SIN OPOSICI\\u00D3N'," +
    "'CANDIDATE':'CANDIDATO'," +
    "'= Key race':'= Contienda clave'," +
    "'AI-generated \\u2014 do your own research':'Generado por IA \\u2014 haz tu propia investigaci\\u00F3n'," +
    "'Built with ATX Votes':'Hecho con ATX Votes'," +
    "'Back to Ballot':'Volver a la boleta'," +
    // Profile
    "'Your Profile':'Tu perfil'," +
    "'Top Issues':'Temas principales'," +
    "'Political Approach':'Perspectiva pol\\u00EDtica'," +
    "'Policy Stances':'Posturas pol\\u00EDticas'," +
    "'Candidate Qualities':'Cualidades del candidato'," +
    "'Address':'Direcci\\u00F3n'," +
    "'Send Feedback':'Enviar comentarios'," +
    "'Powered by Claude (Anthropic)':'Desarrollado con Claude (Anthropic)'," +
    "'Start Over':'Empezar de nuevo'," +
    "'Regenerate Summary':'Regenerar resumen'," +
    "'Regenerating...':'Regenerando...'," +
    "'Please enter your street address.':'Por favor, ingresa tu direcci\\u00F3n.'," +
    "'Please enter a valid 5-digit ZIP code.':'Por favor, ingresa un c\\u00F3digo postal v\\u00E1lido de 5 d\\u00EDgitos.'," +
    "'We couldn\\u2019t find that address. Please check your street and ZIP, or skip to see all races.':'No pudimos encontrar esa direcci\\u00F3n. Verifica tu calle y c\\u00F3digo postal, o salta para ver todas las contiendas.'," +
    "'Verifying address...':'Verificando direcci\\u00F3n...'," +
    "'Could not regenerate summary. Please try again.':'No se pudo regenerar el resumen. Por favor, int\\u00E9ntalo de nuevo.'," +
    "'This will erase your profile and recommendations.':'Esto borrar\\u00E1 tu perfil y recomendaciones.'," +
    "'Start over? This will erase your profile and recommendations.':'\\u00BFEmpezar de nuevo? Esto borrar\\u00E1 tu perfil y recomendaciones.'," +
    // Vote Info
    "'Voting Info':'Info de votaci\\u00F3n'," +
    "'days until Election Day':'d\\u00EDas para el d\\u00EDa de elecciones'," +
    "'Today is Election Day!':'\\u00A1Es d\\u00EDa de elecciones!'," +
    "'Election Day has passed':'El d\\u00EDa de elecciones ha pasado'," +
    "'I Voted!':'\\u00A1Yo vot\\u00E9!'," +
    "'I Voted':'Yo vot\\u00E9'," +
    "'Early!':'\\u00A1Anticipadamente!'," +
    "'You voted! Thank you for participating in democracy.':'\\u00A1Ya votaste! Gracias por participar en la democracia.'," +
    "'Actually, I didn\\u2019t vote yet.':'En realidad, a\\u00FAn no he votado.'," +
    "'Find Your Polling Location':'Encuentra tu lugar de votaci\\u00F3n'," +
    "'Travis County uses Vote Centers \\u2014 you can vote at any location.':'El condado de Travis usa centros de votaci\\u00F3n \\u2014 puedes votar en cualquier ubicaci\\u00F3n.'," +
    "'Find Locations':'Encontrar ubicaciones'," +
    "'Key Dates':'Fechas clave'," +
    "'Registration deadline':'Fecha l\\u00EDmite de registro'," +
    "'Mail ballot application deadline':'Fecha l\\u00EDmite para solicitud de boleta por correo'," +
    "'Early voting':'Votaci\\u00F3n anticipada'," +
    "'Election Day':'D\\u00EDa de elecciones'," +
    "'Early Voting':'Votaci\\u00F3n anticipada'," +
    "'Vote at any early voting location in Travis County.':'Vota en cualquier lugar de votaci\\u00F3n anticipada en el condado de Travis.'," +
    "'Hours':'Horario'," +
    "'Open Primary:':'Primaria abierta:'," +
    "'Texas has open primaries \\u2014 tell the poll worker which party\\u2019s primary you want. You can only vote in one.':'Texas tiene primarias abiertas \\u2014 dile al trabajador electoral en cu\\u00E1l primaria quieres votar. Solo puedes votar en una.'," +
    "'Find Election Day locations':'Encuentra lugares para el d\\u00EDa de elecciones'," +
    "'Voter ID':'Identificaci\\u00F3n de votante'," +
    "'Expired IDs accepted if expired less than 4 years. No expiration limit for voters 70+.':'Se aceptan identificaciones vencidas si tienen menos de 4 a\\u00F1os de vencimiento. Sin l\\u00EDmite para votantes de 70 a\\u00F1os o m\\u00E1s.'," +
    "'What to Bring':'Qu\\u00E9 llevar'," +
    "'Photo ID':'Identificaci\\u00F3n con foto'," +
    "'Your cheat sheet (printed)':'Tu gu\\u00EDa r\\u00E1pida (impresa)'," +
    "'Voter registration card':'Tarjeta de registro de votante'," +
    "'REQUIRED':'OBLIGATORIO'," +
    "'Optional':'Opcional'," +
    "'Travis County:':'Condado de Travis:'," +
    "'You may NOT use your phone in the voting booth. Print your cheat sheet before you go!':'NO puedes usar tu tel\\u00E9fono en la casilla de votaci\\u00F3n. \\u00A1Imprime tu gu\\u00EDa antes de ir!'," +
    "'Resources':'Recursos'," +
    "'Travis County Elections':'Elecciones del condado de Travis'," +
    // Footer
    "'Nonpartisan by Design':'Apartidista por dise\\u00F1o'," +
    "'Privacy Policy':'Pol\\u00EDtica de privacidad'," +
    "'Built in Austin, TX':'Hecho en Austin, TX'," +
    // Issues
    "'Economy & Cost of Living':'Econom\\u00EDa y costo de vida'," +
    "'Housing':'Vivienda'," +
    "'Community Safety':'Seguridad comunitaria'," +
    "'Education':'Educaci\\u00F3n'," +
    "'Healthcare':'Salud'," +
    "'Environment & Climate':'Medio ambiente y clima'," +
    "'Grid & Infrastructure':'Red el\\u00E9ctrica e infraestructura'," +
    "'Tech & Innovation':'Tecnolog\\u00EDa e innovaci\\u00F3n'," +
    "'Transportation':'Transporte'," +
    "'Immigration':'Inmigraci\\u00F3n'," +
    "'Taxes':'Impuestos'," +
    "'Civil Rights':'Derechos civiles'," +
    // Spectrum
    "'Progressive':'Progresista'," +
    "'Bold systemic change, social justice focused':'Cambio sist\\u00E9mico audaz, enfocado en la justicia social'," +
    "'Liberal':'Liberal'," +
    "'Expand rights and services, government as a force for good':'Expandir derechos y servicios, el gobierno como fuerza para el bien'," +
    "'Moderate':'Moderado'," +
    "'Pragmatic center, best ideas from both sides':'Centro pragm\\u00E1tico, las mejores ideas de ambos lados'," +
    "'Conservative':'Conservador'," +
    "'Limited government, traditional values, fiscal discipline':'Gobierno limitado, valores tradicionales, disciplina fiscal'," +
    "'Libertarian':'Libertario'," +
    "'Maximum freedom, minimal government':'M\\u00E1xima libertad, gobierno m\\u00EDnimo'," +
    "'Independent / Issue-by-Issue':'Independiente / Tema por tema'," +
    "'I decide issue by issue, not by party':'Decido tema por tema, no por partido'," +
    // Qualities
    "'Competence & Track Record':'Competencia y trayectoria'," +
    "'Integrity & Honesty':'Integridad y honestidad'," +
    "'Independence':'Independencia'," +
    "'Experience':'Experiencia'," +
    "'Fresh Perspective':'Perspectiva nueva'," +
    "'Bipartisan / Works Across Aisle':'Bipartidista / Trabaja con ambos partidos'," +
    "'Strong Leadership':'Liderazgo fuerte'," +
    "'Community Ties':'Lazos comunitarios'," +
    // Deep dive questions
    "'On housing, where do you land?':'Sobre vivienda, \\u00BFcu\\u00E1l es tu postura?'," +
    "'Build, build, build':'Construir, construir, construir'," +
    "'Ease zoning, encourage density, let the market work':'Flexibilizar la zonificaci\\u00F3n, fomentar la densidad, dejar que el mercado funcione'," +
    "'Smart growth':'Crecimiento inteligente'," +
    "'More housing with affordability guardrails':'M\\u00E1s vivienda con protecciones de asequibilidad'," +
    "'Protect neighborhoods':'Proteger los vecindarios'," +
    "'Preserve character, limit density changes':'Preservar el car\\u00E1cter, limitar cambios de densidad'," +
    "'It\\u2019s complicated':'Es complicado'," +
    "'Case by case \\u2014 depends on the neighborhood':'Caso por caso \\u2014 depende del vecindario'," +
    "'On public safety, what\\u2019s your approach?':'Sobre seguridad p\\u00FAblica, \\u00BFcu\\u00E1l es tu enfoque?'," +
    "'Fully fund police':'Financiar completamente a la polic\\u00EDa'," +
    "'Hire more officers, strong prosecution':'Contratar m\\u00E1s oficiales, fiscalizaci\\u00F3n firme'," +
    "'Reform + fund':'Reformar y financiar'," +
    "'Fund police but invest in alternatives too':'Financiar a la polic\\u00EDa pero tambi\\u00E9n invertir en alternativas'," +
    "'Redirect funding':'Redirigir fondos'," +
    "'Move money toward prevention and social services':'Destinar dinero a prevenci\\u00F3n y servicios sociales'," +
    "'Major overhaul needed':'Se necesita una reforma profunda'," +
    "'Fundamental changes to how we approach safety':'Cambios fundamentales en c\\u00F3mo abordamos la seguridad'," +
    "'On taxes and government spending?':'\\u00BFSobre impuestos y gasto p\\u00FAblico?'," +
    "'Cut taxes & spending':'Recortar impuestos y gasto'," +
    "'Government does too much, let people keep their money':'El gobierno hace demasiado, dejar que la gente conserve su dinero'," +
    "'Redirect spending':'Redirigir el gasto'," +
    "'Same budget, better priorities':'Mismo presupuesto, mejores prioridades'," +
    "'Invest more if it works':'Invertir m\\u00E1s si funciona'," +
    "'Willing to pay more for effective programs':'Dispuesto a pagar m\\u00E1s por programas que funcionen'," +
    "'Tax the wealthy more':'M\\u00E1s impuestos a los ricos'," +
    "'Fund services through progressive taxation':'Financiar servicios mediante impuestos progresivos'," +
    "'On tech and AI regulation?':'\\u00BFSobre regulaci\\u00F3n de tecnolog\\u00EDa e IA?'," +
    "'Hands off':'No intervenir'," +
    "'Let innovation lead, regulate later if needed':'Dejar que la innovaci\\u00F3n lidere, regular despu\\u00E9s si es necesario'," +
    "'Light touch':'Regulaci\\u00F3n ligera'," +
    "'Basic guardrails but don\\u2019t slow things down':'L\\u00EDmites b\\u00E1sicos pero sin frenar el avance'," +
    "'Proactive regulation':'Regulaci\\u00F3n proactiva'," +
    "'Get ahead of problems before they happen':'Adelantarse a los problemas antes de que ocurran'," +
    "'Strong oversight':'Supervisi\\u00F3n estricta'," +
    "'Tech companies have too much unchecked power':'Las empresas tecnol\\u00F3gicas tienen demasiado poder sin control'," +
    "'On public education, what\\u2019s your priority?':'Sobre educaci\\u00F3n p\\u00FAblica, \\u00BFcu\\u00E1l es tu prioridad?'," +
    "'School choice first':'Libertad de elecci\\u00F3n escolar'," +
    "'Vouchers, charters, let parents decide':'Vales, escuelas ch\\u00E1rter, que los padres decidan'," +
    "'Fix public schools':'Mejorar las escuelas p\\u00FAblicas'," +
    "'More funding and support for neighborhood schools':'M\\u00E1s fondos y apoyo para las escuelas del vecindario'," +
    "'Teacher-focused':'Enfocado en los maestros'," +
    "'Raise pay, reduce class sizes, trust educators':'Aumentar salarios, reducir el tama\\u00F1o de las clases, confiar en los educadores'," +
    "'Back to basics':'Volver a lo b\\u00E1sico'," +
    "'Focus on core academics, less politics in schools':'Enfocarse en materias b\\u00E1sicas, menos pol\\u00EDtica en las escuelas'," +
    "'On healthcare, where do you stand?':'Sobre salud, \\u00BFcu\\u00E1l es tu posici\\u00F3n?'," +
    "'Free market':'Libre mercado'," +
    "'Less regulation, more competition to lower costs':'Menos regulaci\\u00F3n, m\\u00E1s competencia para reducir costos'," +
    "'Expand Medicaid':'Expandir Medicaid'," +
    "'Texas should accept federal Medicaid expansion':'Texas deber\\u00EDa aceptar la expansi\\u00F3n federal de Medicaid'," +
    "'Universal coverage':'Cobertura universal'," +
    "'Everyone deserves healthcare regardless of income':'Todos merecen atenci\\u00F3n m\\u00E9dica sin importar sus ingresos'," +
    "'Local solutions':'Soluciones locales'," +
    "'Community health centers and county programs':'Centros de salud comunitarios y programas del condado'," +
    "'On environment and climate?':'\\u00BFSobre medio ambiente y clima?'," +
    "'Don\\u2019t overreact':'No exagerar'," +
    "'Protect energy jobs, market-driven solutions':'Proteger empleos energ\\u00E9ticos, soluciones del mercado'," +
    "'All of the above':'Todo lo anterior'," +
    "'Renewables and fossil fuels, pragmatic transition':'Renovables y combustibles f\\u00F3siles, transici\\u00F3n pragm\\u00E1tica'," +
    "'Go green fast':'Transici\\u00F3n verde r\\u00E1pida'," +
    "'Aggressive renewable targets and climate action':'Metas agresivas de energ\\u00EDa renovable y acci\\u00F3n clim\\u00E1tica'," +
    "'Local focus':'Enfoque local'," +
    "'Clean air and water in Austin, green spaces, urban heat':'Aire y agua limpios en Austin, espacios verdes, calor urbano'," +
    "'On the power grid and infrastructure?':'\\u00BFSobre la red el\\u00E9ctrica e infraestructura?'," +
    "'Deregulate more':'Mayor desregulaci\\u00F3n'," +
    "'Competition drives reliability, less ERCOT control':'La competencia mejora la fiabilidad, menos control de ERCOT'," +
    "'Weatherize & invest':'Climatizar e invertir'," +
    "'Mandate upgrades, spend what it takes to prevent outages':'Exigir mejoras, gastar lo necesario para prevenir apagones'," +
    "'Connect the grid':'Conectar la red'," +
    "'Link Texas to national grid for backup':'Conectar Texas a la red nacional como respaldo'," +
    "'Local resilience':'Resiliencia local'," +
    "'Microgrids, batteries, community-level solutions':'Microrredes, bater\\u00EDas, soluciones a nivel comunitario'," +
    "'On Austin transportation, what\\u2019s the priority?':'Sobre transporte en Austin, \\u00BFcu\\u00E1l es la prioridad?'," +
    "'Build more roads':'Construir m\\u00E1s carreteras'," +
    "'Expand highways and reduce congestion for drivers':'Ampliar autopistas y reducir la congesti\\u00F3n para los conductores'," +
    "'Public transit':'Transporte p\\u00FAblico'," +
    "'Light rail, better buses, less car dependence':'Tren ligero, mejores autobuses, menos dependencia del auto'," +
    "'Balanced approach':'Enfoque equilibrado'," +
    "'Roads, transit, bikes, and walkability together':'Carreteras, transporte p\\u00FAblico, bicicletas y peatonalidad juntos'," +
    "'Remote work first':'Primero el trabajo remoto'," +
    "'Reduce the need to commute in the first place':'Reducir la necesidad de desplazarse en primer lugar'," +
    "'On immigration, what\\u2019s your view?':'Sobre inmigraci\\u00F3n, \\u00BFcu\\u00E1l es tu opini\\u00F3n?'," +
    "'Secure the border':'Asegurar la frontera'," +
    "'Enforcement first, then talk about reform':'Primero aplicar la ley, despu\\u00E9s hablar de reforma'," +
    "'Enforce but reform':'Aplicar la ley pero reformar'," +
    "'Secure borders AND create legal pathways':'Asegurar fronteras Y crear v\\u00EDas legales'," +
    "'Welcoming approach':'Enfoque acogedor'," +
    "'Immigrants strengthen Austin, expand protections':'Los inmigrantes fortalecen Austin, ampliar protecciones'," +
    "'Local isn\\u2019t federal':'Lo local no es federal'," +
    "'City shouldn\\u2019t spend resources on federal immigration enforcement':'La ciudad no deber\\u00EDa gastar recursos en la aplicaci\\u00F3n federal de inmigraci\\u00F3n'," +
    "'On civil rights and equality?':'\\u00BFSobre derechos civiles e igualdad?'," +
    "'Equal treatment':'Trato igualitario'," +
    "'Same rules for everyone, no special categories':'Las mismas reglas para todos, sin categor\\u00EDas especiales'," +
    "'Protect what we have':'Proteger lo que tenemos'," +
    "'Maintain current protections, don\\u2019t roll them back':'Mantener las protecciones actuales, no retroceder'," +
    "'Expand protections':'Ampliar protecciones'," +
    "'Stronger anti-discrimination laws and enforcement':'Leyes antidiscriminaci\\u00F3n m\\u00E1s fuertes y mejor aplicaci\\u00F3n'," +
    "'Systemic change':'Cambio sist\\u00E9mico'," +
    "'Address root causes of inequality, not just symptoms':'Abordar las causas ra\\u00EDz de la desigualdad, no solo los s\\u00EDntomas'" +
  "};",
  "function t(s){return LANG==='es'&&TR[s]||s}",

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

  'var QUAL_ICONS={' +
    '"Competence & Track Record":"<svg width=\\"16\\" height=\\"16\\" viewBox=\\"0 0 24 24\\" fill=\\"currentColor\\"><path d=\\"M3 20h2v-8H3v8zm4 0h2V9H7v11zm4 0h2V4h-2v16zm4 0h2v-6h-2v6zm4 0h2v-2h-2v2z\\"/></svg>",' +
    '"Integrity & Honesty":"<svg width=\\"16\\" height=\\"16\\" viewBox=\\"0 0 24 24\\" fill=\\"currentColor\\"><path d=\\"M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v2h-2V7zm0 4h2v6h-2v-6z\\"/></svg>",' +
    '"Independence":"<svg width=\\"16\\" height=\\"16\\" viewBox=\\"0 0 24 24\\" fill=\\"currentColor\\"><path d=\\"M12 5.5A1.5 1.5 0 1 0 12 2.5a1.5 1.5 0 0 0 0 3zM10 22V13H8l2-8h4l2 8h-2v9h-4z\\"/></svg>",' +
    '"Experience":"<svg width=\\"16\\" height=\\"16\\" viewBox=\\"0 0 24 24\\" fill=\\"currentColor\\"><path d=\\"M20 7h-4V5l-2-2h-4L8 5v2H4c-1.1 0-2 .9-2 2v5h4v-2h2v2h8v-2h2v2h4V9c0-1.1-.9-2-2-2zm-6 0h-4V5h4v2zM4 20c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4h-4v1h-2v-1H8v1H6v-1H4v4z\\"/></svg>",' +
    '"Fresh Perspective":"<svg width=\\"16\\" height=\\"16\\" viewBox=\\"0 0 24 24\\" fill=\\"currentColor\\"><path d=\\"M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z\\"/></svg>",' +
    '"Bipartisan / Works Across Aisle":"<svg width=\\"16\\" height=\\"16\\" viewBox=\\"0 0 24 24\\" fill=\\"currentColor\\"><path d=\\"M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z\\"/></svg>",' +
    '"Strong Leadership":"<svg width=\\"16\\" height=\\"16\\" viewBox=\\"0 0 24 24\\" fill=\\"currentColor\\"><path d=\\"M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z\\"/></svg>",' +
    '"Community Ties":"<svg width=\\"16\\" height=\\"16\\" viewBox=\\"0 0 24 24\\" fill=\\"currentColor\\"><path d=\\"M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z\\"/></svg>"' +
  '};',
  'var QUALITIES=Object.keys(QUAL_ICONS);',

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
    "expanded:{'vi-dates':true,'vi-bring':true},disclaimerDismissed:false,hasVoted:false" +
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
    "localStorage.setItem('atx_votes_has_voted',S.hasVoted?'1':'');" +
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
    "S.hasVoted=!!localStorage.getItem('atx_votes_has_voted');" +
    "if(S.repBallot||S.demBallot)S.guideComplete=true;" +
    "}catch(e){}" +
  "}",

  // ============ RENDER ============
  "function topNav(active){" +
    "return '<div class=\"topnav-inner\">" +
      "<span class=\"topnav-brand\">ATX Votes</span>" +
      "<a class=\"topnav-link'+(active==='#/ballot'?' on':'')+'\" data-action=\"nav\" data-to=\"#/ballot\">'+ICON_BALLOT+t('My Ballot')+'</a>" +
      "<a class=\"topnav-link'+(active==='#/info'?' on':'')+'\" data-action=\"nav\" data-to=\"#/info\">'+ICON_INFO+t('Vote Info')+'</a>" +
      "<a class=\"topnav-link'+(active==='#/profile'?' on':'')+'\" data-action=\"nav\" data-to=\"#/profile\">'+ICON_PROFILE+t('Profile')+'</a>" +
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
    "return '<nav class=\"tab-bar\" role=\"tablist\">" +
      "<a class=\"tab'+(active==='#/ballot'?' tab-active':'')+'\" data-action=\"nav\" data-to=\"#/ballot\" role=\"tab\" aria-selected=\"'+(active==='#/ballot')+'\"><span class=\"tab-icon\" aria-hidden=\"true\">'+ICON_BALLOT+'</span>'+t('My Ballot')+'</a>" +
      "<a class=\"tab'+(active==='#/info'?' tab-active':'')+'\" data-action=\"nav\" data-to=\"#/info\" role=\"tab\" aria-selected=\"'+(active==='#/info')+'\"><span class=\"tab-icon\" aria-hidden=\"true\">'+ICON_INFO+'</span>'+t('Vote Info')+'</a>" +
      "<a class=\"tab'+(active==='#/profile'?' tab-active':'')+'\" data-action=\"nav\" data-to=\"#/profile\" role=\"tab\" aria-selected=\"'+(active==='#/profile')+'\"><span class=\"tab-icon\" aria-hidden=\"true\">'+ICON_PROFILE+'</span>'+t('Profile')+'</a>" +
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
      "<p>'+t('Your personalized voting guide for Austin & Travis County elections.')+'</p>" +
    "</div>" +
    "<div class=\"card\"><div style=\"text-align:center;margin-bottom:16px\">" +
      "<span class=\"badge badge-blue\">'+t('Texas Primary \\u2014 March 3, 2026')+'</span></div>" +
      "<div class=\"features\">" +
        "<div><span>\u2705</span> '+t('5-minute interview learns your values')+'</div>" +
        "<div><span>\u{1F4CB}</span> '+t('Personalized ballot with recommendations')+'</div>" +
        "<div><span>\u{1F5A8}\u{FE0F}</span> '+t('Print your cheat sheet for the booth')+'</div>" +
        "<div><span>\u{1F4CD}</span> '+t('Find your polling location')+'</div>" +
        "<div><span>\u2696\u{FE0F}</span> '+t('Nonpartisan by design')+'</div>" +
      "</div>" +
      "<button class=\"btn btn-primary mt-md\" data-action=\"start\">'+t('Build My Guide')+'</button>" +
    "</div>" +
    "<div style=\"text-align:center;margin-top:16px\">" +
      "<a href=\"#\" data-action=\"set-lang\" data-value=\"'+(LANG==='es'?'en':'es')+'\" style=\"font-size:14px;color:var(--text2)\">'+(LANG==='es'?'Switch to English':'Cambiar a Espa\\u00F1ol')+'</a>" +
    "</div>';" +
  "}",

  // Issues
  "function renderIssues(){" +
    "if(!shuffledIssues)shuffledIssues=shuffle(ISSUES);" +
    "var h='<div class=\"phase-header\"><h2>'+t('What issues matter most to you?')+'</h2><p>'+t('Pick your top 3-5. We\\u2019ll dig deeper on these.')+'</p></div>';" +
    "h+='<div class=\"chip-grid\">';" +
    "for(var i=0;i<shuffledIssues.length;i++){" +
      "var issue=shuffledIssues[i];" +
      "var on=S.issues.indexOf(issue.v)!==-1;" +
      "h+='<div class=\"chip'+(on?' chip-on':'')+'\" data-action=\"toggle-issue\" data-value=\"'+esc(issue.v)+'\" role=\"option\" aria-selected=\"'+on+'\" tabindex=\"0\">'+issue.icon+' '+t(issue.v)+'</div>'" +
    "}" +
    "h+='</div>';" +
    "var n=S.issues.length;" +
    "h+='<p class=\"text-center mt-md\" style=\"font-size:14px;color:var(--text2)\">'+n+' '+t('of 3-5 selected')+'</p>';" +
    "h+='<button class=\"btn btn-primary mt-md\" data-action=\"next\"'+(n<3?' disabled':'')+'>'+t('Continue')+'</button>';" +
    "return h;" +
  "}",

  // Spectrum
  "function renderSpectrum(){" +
    "if(!shuffledSpectrum)shuffledSpectrum=shuffle(SPECTRUM);" +
    "var h='<div class=\"phase-header\"><h2>'+t('How would you describe your political approach?')+'</h2><p>'+t('There\\u2019s no wrong answer. This helps us understand your lens.')+'</p></div>';" +
    "for(var i=0;i<shuffledSpectrum.length;i++){" +
      "var sp=shuffledSpectrum[i];" +
      "var on=S.spectrum===sp.v;" +
      "h+='<div class=\"radio'+(on?' radio-on':'')+'\" data-action=\"select-spectrum\" data-value=\"'+esc(sp.v)+'\" role=\"radio\" aria-checked=\"'+on+'\" tabindex=\"0\"><b>'+t(sp.v)+'</b><span class=\"desc\">'+t(sp.d)+'</span></div>'" +
    "}" +
    "h+='<button class=\"btn btn-primary mt-md\" data-action=\"next\"'+(S.spectrum?'':' disabled')+'>'+t('Continue')+'</button>';" +
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
    "var h='<div class=\"phase-header\"><h2>'+t(dd.q)+'</h2><p>'+t('Question')+' '+(S.ddIndex+1)+' '+t('of')+' '+S.ddQuestions.length+'</p></div>';" +
    "for(var i=0;i<opts.length;i++){" +
      "var on=current===opts[i].l;" +
      "h+='<div class=\"radio'+(on?' radio-on':'')+'\" data-action=\"select-dd\" data-value=\"'+esc(opts[i].l)+'\" role=\"radio\" aria-checked=\"'+on+'\" tabindex=\"0\"><b>'+t(opts[i].l)+'</b><span class=\"desc\">'+t(opts[i].d)+'</span></div>'" +
    "}" +
    "h+='<button class=\"btn btn-primary mt-md\" data-action=\"next-dd\"'+(current?'':' disabled')+'>'+t('Continue')+'</button>';" +
    "return h;" +
  "}",

  // Qualities
  "function renderQualities(){" +
    "if(!shuffledQualities)shuffledQualities=shuffle(QUALITIES);" +
    "var h='<div class=\"phase-header\"><h2>'+t('What do you value most in a candidate?')+'</h2><p>'+t('Pick 2-3 that matter most.')+'</p></div>';" +
    "h+='<div class=\"chip-grid\">';" +
    "for(var i=0;i<shuffledQualities.length;i++){" +
      "var q=shuffledQualities[i];" +
      "var on=S.qualities.indexOf(q)!==-1;" +
      "h+='<div class=\"chip'+(on?' chip-on':'')+'\" data-action=\"toggle-quality\" data-value=\"'+esc(q)+'\" role=\"option\" aria-selected=\"'+on+'\" tabindex=\"0\">'+(QUAL_ICONS[q]||'')+' '+t(q)+'</div>'" +
    "}" +
    "h+='</div>';" +
    "var n=S.qualities.length;" +
    "h+='<p class=\"text-center mt-md\" style=\"font-size:14px;color:var(--text2)\">'+n+' '+t('of 2-3 selected')+'</p>';" +
    "h+='<button class=\"btn btn-primary mt-md\" data-action=\"next\"'+(n<2?' disabled':'')+'>'+t('Continue')+'</button>';" +
    "return h;" +
  "}",

  // Address
  "function renderAddress(){" +
    "var h='<div class=\"phase-header\"><h2>'+t('Where do you vote?')+'</h2><p>'+t('We\\u2019ll look up your districts to show the right races.')+'</p></div>';" +
    "h+='<form id=\"addr-form\">';" +
    "h+='<div class=\"form-group\"><label>'+t('Street Address')+'</label><input name=\"street\" placeholder=\"123 Congress Ave\" value=\"'+esc(S.address.street)+'\" autofocus></div>';" +
    "h+='<div class=\"form-row\">';" +
    "h+='<div class=\"form-group\"><label>'+t('City')+'</label><input name=\"city\" value=\"'+esc(S.address.city)+'\"></div>';" +
    "h+='<div class=\"form-group\" style=\"flex:.5\"><label>'+t('ZIP')+'</label><input name=\"zip\" placeholder=\"78701\" value=\"'+esc(S.address.zip)+'\" inputmode=\"numeric\" maxlength=\"5\"></div>';" +
    "h+='</div>';" +
    "h+='<div class=\"form-group\"><label>'+t('State')+'</label><input value=\"TX\" disabled></div>';" +
    "h+='<div style=\"display:flex;align-items:flex-start;gap:10px;padding:12px;background:rgba(51,166,82,.05);border-radius:var(--rs);margin-top:8px\">';" +
    "h+='<svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" style=\"flex-shrink:0;margin-top:1px\"><path d=\"M12 1C8.7 1 6 3.7 6 7v3H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7c0-3.3-2.7-6-6-6zm0 2c2.2 0 4 1.8 4 4v3H8V7c0-2.2 1.8-4 4-4zm0 11a2 2 0 1 1 0 4 2 2 0 0 1 0-4z\" fill=\"var(--ok)\"/></svg>';" +
    "h+='<span style=\"font-size:13px;color:var(--text2);line-height:1.4\">'+t('Your address stays on your device. It\\u2019s only used to look up your ballot districts \\u2014 we never store or share it.')+'</span>';" +
    "h+='</div>';" +
    "if(S.addressError){h+='<div class=\"error-box\" style=\"margin-top:12px\"><p>'+S.addressError+'</p></div>'}" +
    "if(S.verifyingAddress){" +
      "h+='<button type=\"button\" class=\"btn btn-primary mt-md\" disabled><span class=\"spinner\" style=\"width:16px;height:16px;display:inline-block;vertical-align:middle;margin-right:8px\"></span>'+t('Verifying address...')+'</button>'" +
    "}else{" +
      "h+='<button type=\"submit\" class=\"btn btn-primary mt-md\">'+t('Build My Guide')+'</button>'" +
    "}" +
    "h+='</form>';" +
    "h+='<p class=\"text-center mt-md\" style=\"font-size:13px;color:var(--text2)\">'+t('You can skip the address \\u2014 we\\u2019ll show all races.')+'</p>';" +
    "h+='<button class=\"btn btn-secondary mt-sm\" data-action=\"skip-address\">'+t('Skip & Build Guide')+'</button>';" +
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
    "h+='<h2>'+t('Building Your Guide')+'</h2>';" +
    "h+='<p style=\"min-height:24px\" class=\"loading-msg\" aria-live=\"polite\">'+t(S.loadMsg||msgs[0])+'</p>';" +
    "h+='<div class=\"progress\" style=\"max-width:240px;margin:20px auto 16px;height:6px\"><div class=\"progress-fill\" style=\"width:'+pct+'%;transition:width .5s ease\"></div></div>';" +
    "if(S.error){h+='<div class=\"error-box\" style=\"margin-top:16px\"><p>'+t(S.error)+'</p></div><button class=\"btn btn-primary mt-md\" data-action=\"retry\">'+t('Try Again')+'</button>'}" +
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
    "if(!b)return '<div class=\"card\"><p>'+t('No ballot available for this party.')+'</p></div>'+renderPartySwitcher();" +
    "var races=b.races.slice().sort(function(a,b){return sortOrder(a)-sortOrder(b)});" +
    "var contested=races.filter(function(r){return r.isContested});" +
    "var uncontested=races.filter(function(r){return!r.isContested});" +
    "var keyRaces=contested.filter(function(r){return r.isKeyRace});" +
    "var otherContested=contested.filter(function(r){return!r.isKeyRace});" +
    "var h=renderPartySwitcher();" +
    // Election info header
    "var partyLabel=S.selectedParty==='democrat'?t('Democratic'):t('Republican');" +
    "h+='<div class=\"card\" style=\"margin-bottom:16px;text-align:center\">';" +
    "h+='<div style=\"font-size:18px;font-weight:800\">Texas '+esc(partyLabel)+' '+t('Primary')+'</div>';" +
    "h+='<div style=\"font-size:14px;color:var(--text2);margin-top:2px\">'+t('Tuesday, March 3, 2026')+'</div>';" +
    "if(S.districts&&(S.districts.congressional||S.districts.stateSenate||S.districts.stateHouse)){" +
      "h+='<div style=\"display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px\">';" +
      "if(S.districts.congressional)h+='<span class=\"badge badge-blue\">CD-'+esc(S.districts.congressional)+'</span>';" +
      "if(S.districts.stateSenate)h+='<span class=\"badge badge-blue\">SD-'+esc(S.districts.stateSenate)+'</span>';" +
      "if(S.districts.stateHouse)h+='<span class=\"badge badge-blue\">HD-'+esc(S.districts.stateHouse)+'</span>';" +
      "h+='</div>'" +
    "}else{" +
      "h+='<div style=\"font-size:13px;color:var(--text2);margin-top:6px\">'+t('Showing all races')+'</div>'" +
    "}" +
    "h+='</div>';" +
    // Disclaimer (dismissible)
    "if(!S.disclaimerDismissed){" +
      "h+='<div class=\"disclaimer\"><span style=\"font-size:20px\">\u26A0\u{FE0F}</span><div>" +
        "<b>'+t('AI-Generated Recommendations')+'</b>" +
        "'+t('These recommendations are generated by AI based on your stated values. They may contain errors. Always do your own research before voting.')+'" +
      "</div><button data-action=\"dismiss-disclaimer\" style=\"background:none;border:none;font-size:20px;cursor:pointer;padding:4px 8px;color:var(--text2);flex-shrink:0\">&times;</button></div>'" +
    "}" +
    // Actions
    "h+='<div class=\"actions\">';" +
    "h+='<button class=\"btn btn-secondary\" data-action=\"nav\" data-to=\"#/cheatsheet\">\u{1F5A8}\u{FE0F} '+t('Print Cheat Sheet')+'</button>';" +
    "h+='<button class=\"btn btn-secondary\" data-action=\"share\">\u{1F4E4} '+t('Share')+'</button>';" +
    "h+='</div>';" +
    // Key races
    "if(keyRaces.length){" +
      "h+='<div class=\"section-head\">\u2B50 '+t('Key Races')+'</div>';" +
      "for(var i=0;i<keyRaces.length;i++)h+=renderRaceCard(keyRaces[i],races)" +
    "}" +
    // Other contested
    "if(otherContested.length){" +
      "h+='<div class=\"section-head\">'+t('Other Contested Races')+'</div>';" +
      "for(var i=0;i<otherContested.length;i++)h+=renderRaceCard(otherContested[i],races)" +
    "}" +
    // Propositions
    "if(b.propositions&&b.propositions.length){" +
      "h+='<div class=\"section-head\">'+t('Propositions')+'</div>';" +
      "for(var i=0;i<b.propositions.length;i++)h+=renderPropCard(b.propositions[i])" +
    "}" +
    // Uncontested
    "if(uncontested.length){" +
      "h+='<div class=\"section-head\">'+t('Uncontested Races')+'</div>';" +
      "for(var i=0;i<uncontested.length;i++){" +
        "var r=uncontested[i];var name=r.candidates.length?r.candidates[0].name:'TBD';" +
        "h+='<div class=\"card\"><div style=\"font-size:14px;color:var(--text2)\">'+esc(r.office)+(r.district?' \\u2014 '+esc(r.district):'')+'</div>" +
          "<div style=\"font-size:16px;font-weight:600;margin-top:2px\">'+esc(name)+'</div></div>'" +
      "}" +
    "}" +
    // Footer links
    "h+='<div style=\"text-align:center;padding:24px 0 8px;font-size:13px;color:var(--text2)\">';" +
    "h+='<a href=\"/nonpartisan\" target=\"_blank\" style=\"color:var(--text2)\">'+t('Nonpartisan by Design')+'</a>';" +
    "h+=' &middot; ';" +
    "h+='<a href=\"/privacy\" target=\"_blank\" style=\"color:var(--text2)\">'+t('Privacy Policy')+'</a>';" +
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
    "h+='<h2>'+t('Your Ballot Cheat Sheet')+'</h2>';" +
    "if(addr&&addr.street){h+='<div class=\"cs-meta\">'+esc(addr.street)+', '+esc(addr.city||'Austin')+' '+esc(addr.zip||'')+'</div>'}" +
    "h+='<span class=\"cs-party '+partyCls+'\">'+esc(partyName)+' '+t('Primary')+'</span>';" +
    "h+='<div class=\"cs-meta\">'+t('March 3, 2026')+'</div>';" +
    "h+='</div>';" +
    // Actions (hidden in print)
    "h+='<div class=\"cs-actions\">';" +
    "h+='<button class=\"btn btn-primary\" data-action=\"do-print\">'+t('Print Cheat Sheet')+'</button>';" +
    "h+='<button class=\"btn btn-secondary\" data-action=\"share\">'+t('Share')+'</button>';" +
    "h+='</div>';" +
    // Contested races table
    "if(contested.length){" +
      "h+='<table class=\"cs-table\"><thead><tr><th>'+t('CONTESTED RACES')+'</th><th style=\"text-align:right\">'+t('YOUR VOTE')+'</th></tr></thead><tbody>';" +
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
      "h+='<table class=\"cs-table\" style=\"margin-top:8px\"><thead><tr><th>'+t('PROPOSITIONS')+'</th><th style=\"text-align:right\">'+t('YOUR VOTE')+'</th></tr></thead><tbody>';" +
      "for(var i=0;i<b.propositions.length;i++){" +
        "var p=b.propositions[i];" +
        "var rec=p.recommendation||'';" +
        "var cls='';if(rec==='Lean Yes'||rec==='FOR')cls='cs-yes';else if(rec==='Lean No'||rec==='AGAINST')cls='cs-no';else cls='cs-yourcall';" +
        "h+='<tr><td>Prop '+esc(p.number||''+(i+1))+': '+esc(p.title)+'</td><td class=\"cs-vote '+cls+'\">'+t(rec)+'</td></tr>'" +
      "}" +
      "h+='</tbody></table>'" +
    "}" +
    // Uncontested table
    "if(uncontested.length){" +
      "h+='<table class=\"cs-table\" style=\"margin-top:8px\"><thead><tr><th>'+t('UNCONTESTED')+'</th><th style=\"text-align:right\">'+t('CANDIDATE')+'</th></tr></thead><tbody>';" +
      "for(var i=0;i<uncontested.length;i++){" +
        "var r=uncontested[i];" +
        "var name=r.candidates.length?esc(r.candidates[0].name):'TBD';" +
        "var label=esc(r.office)+(r.district?' \\u2014 '+esc(r.district):'');" +
        "h+='<tr><td>'+label+'</td><td class=\"cs-vote cs-uncontested\">'+name+'</td></tr>'" +
      "}" +
      "h+='</tbody></table>'" +
    "}" +
    // Legend & footer
    "h+='<div class=\"cs-legend\"><span>\u2B50 '+t('= Key race')+'</span><span>\u26A0\uFE0F '+t('AI-generated \\u2014 do your own research')+'</span></div>';" +
    "h+='<div class=\"cs-footer\">'+t('Built with ATX Votes')+' &middot; atxvotes.app</div>';" +
    // Party switcher + back link (hidden in print)
    "h+=renderPartySwitcher();" +
    "h+='<div style=\"text-align:center;margin-top:8px\" class=\"cs-actions\"><button class=\"btn btn-secondary\" data-action=\"nav\" data-to=\"#/ballot\">&larr; '+t('Back to Ballot')+'</button></div>';" +
    "return h;" +
  "}",

  "function renderPartySwitcher(){" +
    "var hasRep=!!S.repBallot,hasDem=!!S.demBallot;" +
    "if(!hasRep&&!hasDem)return'';" +
    "if(hasRep&&!hasDem){S.selectedParty='republican';return''}" +
    "if(!hasRep&&hasDem){S.selectedParty='democrat';return''}" +
    "return '<div class=\"party-row\">" +
      "<button class=\"party-btn party-rep'+(S.selectedParty==='republican'?' on':'')+'\" data-action=\"set-party\" data-value=\"republican\">" +
        "\u{1F418} '+t('Republican')+'</button>" +
      "<button class=\"party-btn party-dem'+(S.selectedParty==='democrat'?' on':'')+'\" data-action=\"set-party\" data-value=\"democrat\">" +
        "\u{1FACF} '+t('Democrat')+'</button>" +
    "</div>';" +
  "}",

  "function renderRaceCard(race,allRaces){" +
    "var idx=-1;for(var i=0;i<allRaces.length;i++){if(allRaces[i].office===race.office&&allRaces[i].district===race.district){idx=i;break}}" +
    "var label=race.office+(race.district?' \\u2014 '+race.district:'')+(race.recommendation?' \\u2014 Recommended: '+race.recommendation.candidateName:'');" +
    "var h='<div class=\"card card-touch\" data-action=\"nav\" data-to=\"#/race/'+idx+'\" role=\"link\" aria-label=\"'+esc(label)+'\" tabindex=\"0\">';" +
    "h+='<div style=\"display:flex;justify-content:space-between;align-items:flex-start\">';" +
    "h+='<div style=\"flex:1;min-width:0\"><div style=\"font-size:14px;color:var(--text2)\">'+esc(race.office)+(race.district?' \\u2014 '+esc(race.district):'')+'</div>';" +
    "if(race.isKeyRace)h+='<span class=\"star\">\u2B50</span>';" +
    "if(race.recommendation){" +
      "h+='<div style=\"font-size:17px;font-weight:700;margin-top:4px\">'+esc(race.recommendation.candidateName)+'</div>';" +
      "h+='<div style=\"font-size:13px;color:var(--text2);margin-top:2px;line-height:1.4\">'+esc(race.recommendation.reasoning)+'</div>'" +
    "}" +
    "h+='<div style=\"font-size:13px;color:var(--text2);margin-top:4px\">'+race.candidates.length+' '+(race.candidates.length!==1?t('candidates'):t('candidate'))+'</div>';" +
    "var colors=['#4A90D9','#D95B43','#5B8C5A','#8E6BBF','#D4A843','#C75B8F','#5BBFC7','#7B8D6F','#D97B43','#6B8FBF'];" +
    "h+='<div style=\"display:flex;gap:4px;margin-top:6px\">';" +
    "for(var j=0;j<race.candidates.length;j++){" +
      "var c=race.candidates[j];" +
      "var slug=c.name.toLowerCase().replace(/[^a-z0-9 -]/g,'').replace(/\\s+/g,'-');" +
      "var initial=c.name.charAt(0).toUpperCase();" +
      "var ac=colors[j%colors.length];" +
      "var bdr=c.isRecommended?'2px solid var(--blue)':'2px solid transparent';" +
      "h+='<div style=\"width:30px;height:30px;border-radius:50%;background:'+ac+';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;overflow:hidden;border:'+bdr+';flex-shrink:0\">';" +
      "h+='<img src=\"/headshots/'+slug+'.jpg\" alt=\"\" style=\"width:100%;height:100%;object-fit:cover;border-radius:50%\" onerror=\"if(this.src.indexOf(\\'.jpg\\')>0){this.src=this.src.replace(\\'.jpg\\',\\'.png\\')}else{this.style.display=\\'none\\';this.nextSibling.style.display=\\'\\';}\">';" +
      "h+='<span style=\"display:none\">'+initial+'</span></div>'" +
    "}" +
    "h+='</div>';" +
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
    "return '<span class=\"badge '+cls+'\">'+t(c)+'</span>'" +
  "}",

  "function renderPropCard(prop){" +
    "var eid='prop-'+prop.number;" +
    "var isOpen=S.expanded[eid];" +
    "var recClass='badge-warn';" +
    "if(prop.recommendation==='Lean Yes')recClass='badge-ok';" +
    "if(prop.recommendation==='Lean No')recClass='badge-bad';" +
    "var h='<div class=\"card\">';" +
    "h+='<div class=\"prop-header\"><div class=\"prop-title\">Prop '+prop.number+': '+esc(prop.title)+'</div>';" +
    "h+='<span class=\"badge '+recClass+'\">'+t(prop.recommendation)+'</span></div>';" +
    "if(LANG==='es'){var tt=t(prop.title);if(tt!==prop.title)h+='<div class=\"prop-trans\">'+esc(tt)+'</div>'}" +
    "h+='<div class=\"prop-desc\">'+esc(prop.description)+'</div>';" +
    "if(LANG==='es'){var td=t(prop.description);if(td!==prop.description)h+='<div class=\"prop-trans\">'+esc(td)+'</div>'}" +
    // If Passes / If Fails (always visible, color-coded)
    "if(prop.ifPasses||prop.ifFails){" +
      "h+='<div style=\"margin-top:10px\">';" +
      "if(prop.ifPasses){h+='<div class=\"prop-outcome pass\"><span style=\"flex-shrink:0\">\u2705</span><div><b>'+t('If it passes:')+'</b> '+esc(prop.ifPasses)+'</div></div>'}" +
      "if(prop.ifFails){h+='<div class=\"prop-outcome fail\"><span style=\"flex-shrink:0\">\u274C</span><div><b>'+t('If it fails:')+'</b> '+esc(prop.ifFails)+'</div></div>'}" +
      "h+='</div>'" +
    "}" +
    // AI reasoning (always visible)
    "if(prop.reasoning){h+='<div class=\"prop-reasoning\"><span style=\"flex-shrink:0\">\u{1F9E0}</span><div>'+esc(prop.reasoning)+'</div></div>'}" +
    "if(isOpen){" +
      "h+='<div class=\"prop-details\">';" +
      "if(prop.background){h+='<div class=\"prop-section\"><h5>'+t('Background')+'</h5><p>'+esc(prop.background)+'</p></div>'}" +
      "if(prop.fiscalImpact){h+='<div class=\"prop-section\"><h5>\u{1F4B0} '+t('Fiscal Impact')+'</h5><p>'+esc(prop.fiscalImpact)+'</p></div>'}" +
      // Side-by-side supporters vs opponents
      "if((prop.supporters&&prop.supporters.length)||(prop.opponents&&prop.opponents.length)){" +
        "h+='<div class=\"prop-cols\">';" +
        "if(prop.supporters&&prop.supporters.length){" +
          "h+='<div class=\"prop-col for\"><h5>\u{1F44D} '+t('Supporters')+'</h5><ul>';" +
          "for(var j=0;j<prop.supporters.length;j++)h+='<li>'+esc(prop.supporters[j])+'</li>';" +
          "h+='</ul></div>'" +
        "}" +
        "if(prop.opponents&&prop.opponents.length){" +
          "h+='<div class=\"prop-col against\"><h5>\u{1F44E} '+t('Opponents')+'</h5><ul>';" +
          "for(var j=0;j<prop.opponents.length;j++)h+='<li>'+esc(prop.opponents[j])+'</li>';" +
          "h+='</ul></div>'" +
        "}" +
        "h+='</div>'" +
      "}" +
      "if(prop.caveats){h+='<div class=\"prop-section\"><h5>\u26A0\u{FE0F} '+t('Caveats')+'</h5><p>'+esc(prop.caveats)+'</p></div>'}" +
      "h+='</div>'" +
    "}" +
    "h+='<button class=\"expand-toggle\" data-action=\"toggle-expand\" data-id=\"'+eid+'\" aria-expanded=\"'+!!isOpen+'\">'+(isOpen?t('Show Less'):t('Learn More'))+'</button>';" +
    "h+='</div>';" +
    "return h;" +
  "}",

  // Race Detail
  "function renderRaceDetail(idx){" +
    "var b=getBallot();if(!b)return '<p>No ballot</p>';" +
    "var races=b.races.slice().sort(function(a,b){return sortOrder(a)-sortOrder(b)});" +
    "var race=races[idx];if(!race)return '<p>Race not found</p>';" +
    "var candidates=shuffle(race.candidates);" +
    "var h='<button class=\"back-btn\" data-action=\"nav\" data-to=\"#/ballot\">&larr; '+t('Back to Ballot')+'</button>';" +
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
      "if(rec.strategicNotes)h+='<p style=\"margin-top:6px\"><b>'+t('Strategy:')+'</b> '+esc(rec.strategicNotes)+'</p>';" +
      "if(rec.caveats)h+='<p style=\"margin-top:6px\"><b>'+t('Note:')+'</b> '+esc(rec.caveats)+'</p>';" +
      "h+='</div>'" +
    "}" +
    // Candidates
    "h+='<div class=\"section-head\">'+t('All Candidates')+'</div>';" +
    "for(var i=0;i<candidates.length;i++){" +
      "var c=candidates[i];" +
      "var eid='cand-'+c.id;" +
      "var isOpen=S.expanded[eid];" +
      "var colors=['#4A90D9','#D95B43','#5B8C5A','#8E6BBF','#D4A843','#C75B8F','#5BBFC7','#7B8D6F','#D97B43','#6B8FBF'];" +
      "var avatarColor=colors[i%colors.length];" +
      "var initial=c.name.charAt(0).toUpperCase();" +
      "var slug=c.name.toLowerCase().replace(/[^a-z0-9 -]/g,'').replace(/\\s+/g,'-');" +
      "h+='<div class=\"cand-card'+(c.isRecommended?' recommended':'')+'\">';" +
      "h+='<div style=\"display:flex;gap:12px;align-items:center\">';" +
      "h+='<div class=\"cand-avatar\" style=\"background:'+avatarColor+'\">';" +
      "h+='<img src=\"/headshots/'+slug+'.jpg\" alt=\"\" style=\"width:100%;height:100%;object-fit:cover;border-radius:50%\" onerror=\"if(this.src.indexOf(\\'.jpg\\')>0){this.src=this.src.replace(\\'.jpg\\',\\'.png\\')}else{this.style.display=\\'none\\';this.nextSibling.style.display=\\'\\';}\">';" +
      "h+='<span style=\"display:none\">'+initial+'</span></div>';" +
      "h+='<div style=\"flex:1;min-width:0\">';" +
      "h+='<div style=\"display:flex;justify-content:space-between;align-items:flex-start\">';" +
      "h+='<div class=\"cand-name\">'+esc(c.name)+'</div>';" +
      "h+='<div class=\"cand-tags\">';" +
      "if(c.isIncumbent)h+='<span class=\"badge badge-blue\">'+t('Incumbent')+'</span>';" +
      "if(c.isRecommended)h+='<span class=\"badge badge-ok\">'+t('Recommended')+'</span>';" +
      "h+='</div></div>';" +
      "h+='</div></div>';" +
      "h+='<div class=\"cand-summary\">'+esc(c.summary)+'</div>';" +
      "if(isOpen){" +
        "h+='<div class=\"cand-details\">';" +
        "if(c.keyPositions&&c.keyPositions.length){h+='<div class=\"cand-section\"><h5>'+t('Key Positions')+'</h5><div class=\"pos-chips\">';for(var j=0;j<c.keyPositions.length;j++)h+='<span class=\"pos-chip\">'+esc(c.keyPositions[j])+'</span>';h+='</div></div>'}" +
        "if(c.pros&&c.pros.length){h+='<div class=\"cand-section pros\"><h5>\u2705 '+t('Strengths')+'</h5><ul>';for(var j=0;j<c.pros.length;j++)h+='<li>'+esc(c.pros[j])+'</li>';h+='</ul></div>'}" +
        "if(c.cons&&c.cons.length){h+='<div class=\"cand-section cons\"><h5>\u26A0\u{FE0F} '+t('Concerns')+'</h5><ul>';for(var j=0;j<c.cons.length;j++)h+='<li>'+esc(c.cons[j])+'</li>';h+='</ul></div>'}" +
        "if(c.endorsements&&c.endorsements.length){h+='<div class=\"cand-section\"><h5>'+t('Endorsements')+'</h5><ul>';for(var j=0;j<c.endorsements.length;j++)h+='<li>'+esc(c.endorsements[j])+'</li>';h+='</ul></div>'}" +
        "if(c.fundraising){h+='<div class=\"cand-section\"><h5>'+t('Fundraising')+'</h5><p>'+esc(c.fundraising)+'</p></div>'}" +
        "if(c.polling){h+='<div class=\"cand-section\"><h5>'+t('Polling')+'</h5><p>'+esc(c.polling)+'</p></div>'}" +
        "h+='</div>'" +
      "}" +
      "h+='<button class=\"expand-toggle\" data-action=\"toggle-expand\" data-id=\"'+eid+'\" aria-expanded=\"'+!!isOpen+'\">'+(isOpen?t('Show Less'):t('Show Details'))+'</button>';" +
      "h+='</div>'" +
    "}" +
    "return h;" +
  "}",

  // ============ PROFILE VIEW ============
  "function renderProfile(){" +
    "var h='<h2 style=\"font-size:22px;font-weight:800;margin-bottom:16px\">'+t('Your Profile')+'</h2>';" +
    "if(S.summary){" +
      "h+='<div class=\"profile-summary\">\"'+esc(S.summary)+'\"</div>';" +
      "h+='<div style=\"text-align:center;margin-bottom:16px\">';" +
      "if(S.regenerating){h+='<span style=\"font-size:13px;color:var(--text2)\">'+t('Regenerating...')+'</span>'}" +
      "else{h+='<button class=\"btn\" style=\"font-size:13px;padding:6px 14px\" data-action=\"regen-summary\">\\u2728 '+t('Regenerate Summary')+'</button>'}" +
      "h+='</div>'" +
    "}" +
    "h+='<div class=\"card\">';" +
    // Issues
    "h+='<div class=\"profile-section\"><h3>'+t('Top Issues')+'</h3><div class=\"chip-grid\">';" +
    "for(var i=0;i<S.issues.length;i++){" +
      "var issue=ISSUES.find(function(x){return x.v===S.issues[i]});" +
      "h+='<span class=\"chip chip-on\">'+(issue?issue.icon+' ':'')+t(S.issues[i])+'</span>'" +
    "}" +
    "h+='</div></div>';" +
    // Spectrum
    "if(S.spectrum){h+='<div class=\"profile-section\"><h3>'+t('Political Approach')+'</h3><p style=\"font-size:16px\">'+t(S.spectrum)+'</p></div>'}" +
    // Policy views
    "var pvKeys=Object.keys(S.policyViews);" +
    "if(pvKeys.length){" +
      "h+='<div class=\"profile-section\"><h3>'+t('Policy Stances')+'</h3>';" +
      "for(var i=0;i<pvKeys.length;i++){h+='<div style=\"margin-bottom:6px\"><span style=\"font-size:13px;color:var(--text2)\">'+t(pvKeys[i])+'</span><br><span style=\"font-size:15px;font-weight:600\">'+t(S.policyViews[pvKeys[i]])+'</span></div>'}" +
      "h+='</div>'" +
    "}" +
    // Qualities
    "if(S.qualities.length){" +
      "h+='<div class=\"profile-section\"><h3>'+t('Candidate Qualities')+'</h3><div class=\"chip-grid\">';" +
      "for(var i=0;i<S.qualities.length;i++)h+='<span class=\"chip chip-on\">'+(QUAL_ICONS[S.qualities[i]]||'')+' '+t(S.qualities[i])+'</span>';" +
      "h+='</div></div>'" +
    "}" +
    // Address
    "if(S.address&&S.address.street){h+='<div class=\"profile-section\"><h3>'+t('Address')+'</h3><p style=\"font-size:15px\">'+esc(S.address.street)+', '+esc(S.address.city)+', '+esc(S.address.state)+' '+esc(S.address.zip)+'</p></div>'}" +
    "h+='</div>';" +
    // Send Feedback + Credits
    "h+='<div class=\"card\" style=\"margin-top:16px;text-align:center\">';" +
    "h+='<a href=\"mailto:howdy@atxvotes.app\" style=\"font-size:15px;font-weight:600\">'+t('Send Feedback')+' &rarr;</a>';" +
    "h+='<p style=\"font-size:13px;color:var(--text2);margin-top:8px\">'+t('Powered by Claude (Anthropic)')+'</p>';" +
    "h+='</div>';" +
    // Language toggle
    "h+='<div class=\"card\" style=\"margin-top:16px;text-align:center\">';" +
    "h+='<div style=\"font-size:15px;font-weight:600;margin-bottom:8px\">\u{1F310} Language / Idioma</div>';" +
    "h+='<div class=\"party-row\" style=\"margin:0\">';" +
    "h+='<button class=\"party-btn'+(LANG==='en'?' lang-on':' lang-off')+'\" data-action=\"set-lang\" data-value=\"en\">English</button>';" +
    "h+='<button class=\"party-btn'+(LANG==='es'?' lang-on':' lang-off')+'\" data-action=\"set-lang\" data-value=\"es\">Espa\\u00F1ol</button>';" +
    "h+='</div></div>';" +
    // Start Over
    "h+='<div style=\"margin-top:32px;padding-top:20px;border-top:1px solid var(--border)\">';" +
    "h+='<button class=\"btn btn-danger\" data-action=\"reset\">'+t('Start Over')+'</button>';" +
    "h+='<p class=\"text-center mt-sm\" style=\"font-size:13px;color:var(--text2)\">'+t('This will erase your profile and recommendations.')+'</p>';" +
    "h+='</div>';" +
    // Footer links
    "h+='<div style=\"text-align:center;padding:24px 0 8px;font-size:13px;color:var(--text2)\">';" +
    "h+='<a href=\"/nonpartisan\" target=\"_blank\" style=\"color:var(--text2)\">'+t('Nonpartisan by Design')+'</a>';" +
    "h+=' &middot; ';" +
    "h+='<a href=\"/privacy\" target=\"_blank\" style=\"color:var(--text2)\">'+t('Privacy Policy')+'</a>';" +
    "h+='</div>';" +
    "return h;" +
  "}",

  // ============ VOTE INFO VIEW ============
  "function accSection(id,icon,title,body){" +
    "var open=S.expanded[id];" +
    "var h='<div class=\"acc\">';" +
    "h+='<div class=\"acc-head\" data-action=\"toggle-expand\" data-id=\"'+id+'\" role=\"button\" aria-expanded=\"'+!!open+'\" tabindex=\"0\">';" +
    "h+='<span class=\"acc-icon\" aria-hidden=\"true\">'+icon+'</span>';" +
    "h+=esc(title);" +
    "h+='<span class=\"acc-chev'+(open?' open':'')+'\" aria-hidden=\"true\">&#x25BC;</span>';" +
    "h+='</div>';" +
    "if(open){h+='<div class=\"acc-body\">'+body+'</div>'}" +
    "h+='</div>';" +
    "return h;" +
  "}",

  "function renderVoteInfo(){" +
    "var election=new Date(2026,2,3);" + // March 3, 2026
    "var now=new Date();" +
    "var diff=Math.ceil((election-now)/(1000*60*60*24));" +
    "var h='<h2 style=\"font-size:22px;font-weight:800;margin-bottom:16px\">'+t('Voting Info')+'</h2>';" +
    // Countdown card
    "h+='<div class=\"card\" style=\"text-align:center;margin-bottom:16px\">';" +
    "var isEarly=diff>0;" +
    "if(S.hasVoted){" +
      "h+='<div class=\"voted-sticker\">';" +
      // Inline waving flag SVG
      "h+='<svg width=\"70\" height=\"42\" viewBox=\"0 0 70 42\" style=\"margin-top:'+(isEarly?'6':'12')+'px\">';" +
      // 13 stripes
      "var sH=42/13;for(var si=0;si<13;si++){" +
        "var sc=si%2===0?'#CC1919':'#fff';" +
        "h+='<rect x=\"0\" y=\"'+(si*sH)+'\" width=\"70\" height=\"'+(sH+.5)+'\" fill=\"'+sc+'\"/>';" +
      "}" +
      // Canton (blue rectangle with stars)
      "h+='<rect x=\"0\" y=\"0\" width=\"29\" height=\"23\" fill=\"#0D2738\"/>';" +
      // 12 stars (3 rows x 4 cols)
      "for(var sr=0;sr<3;sr++){for(var sc2=0;sc2<4;sc2++){" +
        "var sx=4+sc2*6.5;var sy=4+sr*6.5;" +
        "h+='<circle cx=\"'+sx+'\" cy=\"'+sy+'\" r=\"1.5\" fill=\"#fff\"/>';" +
      "}}" +
      "h+='</svg>';" +
      "h+='<div class=\"voted-text\">'+t('I Voted')+'</div>';" +
      "if(isEarly)h+='<div class=\"voted-early\">'+t('Early!')+'</div>';" +
      "h+='</div>';" +
      "h+='<div class=\"countdown-label\" style=\"margin-bottom:8px\">'+t('You voted! Thank you for participating in democracy.')+'</div>';" +
      "h+='<button class=\"btn btn-secondary\" style=\"font-size:13px\" data-action=\"share-voted\">\u{1F4E4} '+t('Share')+'</button>';" +
      "h+='<div style=\"margin-top:8px\"><a href=\"#\" data-action=\"unvote\" style=\"font-size:13px;color:var(--text2)\">'+t('Actually, I didn\\u2019t vote yet.')+'</a></div>'" +
    "}else if(diff>0){" +
      "h+='<div class=\"countdown\">'+diff+'</div><div class=\"countdown-label\">'+t('days until Election Day')+'</div>';" +
      "h+='<button class=\"btn btn-primary\" style=\"margin-top:12px\" data-action=\"mark-voted\">\u{1F5F3}\u{FE0F} '+t('I Voted!')+'</button>'" +
    "}else if(diff===0){" +
      "h+='<div class=\"countdown\">\u{1F5F3}\u{FE0F}</div><div class=\"countdown-label\">'+t('Today is Election Day!')+'</div>';" +
      "h+='<button class=\"btn btn-primary\" style=\"margin-top:12px\" data-action=\"mark-voted\">\u{1F5F3}\u{FE0F} '+t('I Voted!')+'</button>'" +
    "}else{" +
      "h+='<div class=\"countdown\">\u2705</div><div class=\"countdown-label\">'+t('Election Day has passed')+'</div>';" +
      "h+='<button class=\"btn btn-primary\" style=\"margin-top:12px\" data-action=\"mark-voted\">\u{1F5F3}\u{FE0F} '+t('I Voted!')+'</button>'" +
    "}" +
    "h+='</div>';" +

    // Polling location card
    "h+='<div class=\"card\" style=\"margin-bottom:16px\">';" +
    "h+='<div style=\"font-size:16px;font-weight:700;margin-bottom:4px\">'+t('Find Your Polling Location')+'</div>';" +
    "h+='<p style=\"font-size:14px;color:var(--text2);margin-bottom:12px\">'+t('Travis County uses Vote Centers \\u2014 you can vote at any location.')+'</p>';" +
    "h+='<div style=\"display:flex;gap:8px;flex-wrap:wrap\">';" +
    "h+='<a href=\"https://countyclerk.traviscountytx.gov/departments/elections/current-election/\" target=\"_blank\" class=\"btn btn-primary\" style=\"flex:1;text-align:center;text-decoration:none\">'+t('Find Locations')+' &rarr;</a>';" +
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
    "kdBody+='<div class=\"vi-row\"><span'+(regPast?' class=\"vi-strike\"':'')+'>'+t('Registration deadline')+'</span><span'+(regPast?' class=\"vi-strike\"':'')+'>Feb 2, 2026</span></div>';" +
    "kdBody+='<div class=\"vi-row\"><span'+(mailPast?' class=\"vi-strike\"':'')+'>'+t('Mail ballot application deadline')+'</span><span'+(mailPast?' class=\"vi-strike\"':'')+'>Feb 20, 2026</span></div>';" +
    "kdBody+='<div class=\"vi-row\"><span'+(evActive?' class=\"vi-highlight\"':'')+'>'+t('Early voting')+'</span><span'+(evActive?' class=\"vi-highlight\"':'')+'>Feb 17 \\u2013 27, 2026</span></div>';" +
    "kdBody+='<div class=\"vi-row\"><span class=\"vi-highlight\">'+t('Election Day')+'</span><span class=\"vi-highlight\">'+t('March 3, 2026')+'</span></div>';" +
    "h+=accSection('vi-dates','\u{1F4C5}',t('Key Dates'),kdBody);" +

    // Early Voting accordion
    "var evBody='';" +
    "evBody+='<div class=\"vi-row\"><span>Feb 17 \\u2013 21</span><span>7:00 AM \\u2013 7:00 PM</span></div>';" +
    "evBody+='<div class=\"vi-row\"><span>Feb 22 (Sunday)</span><span>12:00 PM \\u2013 6:00 PM</span></div>';" +
    "evBody+='<div class=\"vi-row\"><span>Feb 23 \\u2013 25</span><span>7:00 AM \\u2013 7:00 PM</span></div>';" +
    "evBody+='<div class=\"vi-row\"><span style=\"font-weight:600\">Feb 26 \\u2013 27</span><span style=\"font-weight:600\">7:00 AM \\u2013 10:00 PM</span></div>';" +
    "evBody+='<p style=\"font-size:13px;color:var(--text2);margin-top:8px\">'+t('Vote at any early voting location in Travis County.')+'</p>';" +
    "h+=accSection('vi-early','\u{1F552}',t('Early Voting'),evBody);" +

    // Election Day accordion
    "var edBody='';" +
    "edBody+='<div class=\"vi-row\"><span style=\"font-weight:600\">'+t('Hours')+'</span><span style=\"font-weight:600\">7:00 AM \\u2013 7:00 PM</span></div>';" +
    "edBody+='<p style=\"margin-top:8px\">Vote at any Vote Center in Travis County with a \\u201CVote Here / Aqu\\u00ED\\u201D sign.</p>';" +
    "edBody+='<p style=\"margin-top:8px;padding:10px;background:rgba(33,89,143,.06);border-radius:var(--rs);font-size:13px\">" +
      "<b>'+t('Open Primary:')+'</b> '+t('Texas has open primaries \\u2014 tell the poll worker which party\\u2019s primary you want. You can only vote in one.')+'</p>';" +
    "edBody+='<div style=\"margin-top:10px\"><a href=\"https://countyclerk.traviscountytx.gov/departments/elections/current-election/\" target=\"_blank\" style=\"font-size:14px;font-weight:600;color:var(--blue)\">'+t('Find Election Day locations')+' &rarr;</a></div>';" +
    "h+=accSection('vi-eday','\u{1F3DB}\u{FE0F}',t('Election Day'),edBody);" +

    // Voter ID accordion
    "var idBody='';" +
    "var ids=['Texas driver\\u2019s license or DPS ID','Texas Election ID Certificate (EIC)','Texas concealed handgun license','U.S. military ID with photo','U.S. citizenship certificate with photo','U.S. passport (book or card)'];" +
    "for(var i=0;i<ids.length;i++){idBody+='<div class=\"vi-check\"><span class=\"vi-check-icon\">\\u2705</span>'+ids[i]+'</div>'}" +
    "idBody+='<p style=\"font-size:13px;color:var(--text2);margin-top:8px\">'+t('Expired IDs accepted if expired less than 4 years. No expiration limit for voters 70+.')+'</p>';" +
    "h+=accSection('vi-id','\u{1F4CB}',t('Voter ID'),idBody);" +

    // What to Bring accordion
    "var bringBody='';" +
    "bringBody+='<div style=\"padding:8px 0;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)\">';" +
    "bringBody+='<span>\u{1F4CB} '+t('Photo ID')+'</span><span class=\"vi-badge vi-badge-req\">'+t('REQUIRED')+'</span></div>';" +
    "bringBody+='<div style=\"padding:8px 0;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)\">';" +
    "bringBody+='<span>\u{1F4C4} '+t('Your cheat sheet (printed)')+'</span><span class=\"vi-badge vi-badge-opt\">'+t('Optional')+'</span></div>';" +
    "bringBody+='<div style=\"padding:8px 0;display:flex;justify-content:space-between;align-items:center\">';" +
    "bringBody+='<span>\u{1F4B3} '+t('Voter registration card')+'</span><span class=\"vi-badge vi-badge-opt\">'+t('Optional')+'</span></div>';" +
    "bringBody+='<div class=\"vi-warn\"><span style=\"font-size:18px\">\u26A0\u{FE0F}</span><div><b>'+t('Travis County:')+'</b> '+t('You may NOT use your phone in the voting booth. Print your cheat sheet before you go!')+'</div></div>';" +
    "h+=accSection('vi-bring','\u{1F6CD}\u{FE0F}',t('What to Bring'),bringBody);" +

    // Resources accordion
    "var resBody='';" +
    "resBody+='<div class=\"vi-link\"><a href=\"https://lwvaustin.org/voters-guide\" target=\"_blank\">League of Women Voters Guide &rarr;</a></div>';" +
    "resBody+='<div class=\"vi-link\"><a href=\"https://vote411.org\" target=\"_blank\">VOTE411 \\u2014 Personalized ballot &rarr;</a></div>';" +
    "resBody+='<div class=\"vi-link\"><a href=\"https://votetravis.gov\" target=\"_blank\">VoteTravis.gov \\u2014 Official info &rarr;</a></div>';" +
    "resBody+='<div class=\"vi-link\"><a href=\"https://votetexas.gov\" target=\"_blank\">VoteTexas.gov \\u2014 State info &rarr;</a></div>';" +
    "resBody+='<div class=\"vi-link\"><a href=\"https://www.kut.org\" target=\"_blank\">KUT Austin Voter Guide &rarr;</a></div>';" +
    "h+=accSection('vi-res','\u{1F517}',t('Resources'),resBody);" +

    // Contact card
    "h+='<div class=\"card\" style=\"margin-top:16px\">';" +
    "h+='<div style=\"font-size:16px;font-weight:700;margin-bottom:8px\">'+t('Travis County Elections')+'</div>';" +
    "h+='<div style=\"padding:6px 0\"><a href=\"tel:5122388683\" style=\"font-size:15px;color:var(--blue);font-weight:600\">\u{1F4DE} (512) 238-8683</a></div>';" +
    "h+='<div style=\"padding:6px 0\"><a href=\"https://votetravis.gov\" target=\"_blank\" style=\"font-size:15px;color:var(--blue);font-weight:600\">\u{1F310} votetravis.gov</a></div>';" +
    "h+='</div>';" +

    // Footer links
    "h+='<div style=\"text-align:center;padding:24px 0 8px;font-size:13px;color:var(--text2)\">';" +
    "h+='<a href=\"/nonpartisan\" target=\"_blank\" style=\"color:var(--text2)\">'+t('Nonpartisan by Design')+'</a>';" +
    "h+=' &middot; ';" +
    "h+='<a href=\"/privacy\" target=\"_blank\" style=\"color:var(--text2)\">'+t('Privacy Policy')+'</a>';" +
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
      "if(confirm(t('Start over? This will erase your profile and recommendations.'))){" +
        "S.phase=0;S.issues=[];S.spectrum=null;S.policyViews={};S.qualities=[];" +
        "S.address={street:'',city:'Austin',state:'TX',zip:''};S.ddIndex=0;S.ddQuestions=[];" +
        "S.repBallot=null;S.demBallot=null;S.selectedParty='republican';" +
        "S.guideComplete=false;S.summary=null;S.districts=null;S.expanded={};S.addressError=null;S.verifyingAddress=false;" +
        "shuffledIssues=null;shuffledSpectrum=null;shuffledQualities=null;shuffledDD={};" +
        "try{localStorage.removeItem('atx_votes_profile');localStorage.removeItem('atx_votes_ballot_republican');" +
        "localStorage.removeItem('atx_votes_ballot_democrat');localStorage.removeItem('atx_votes_selected_party');localStorage.removeItem('atx_votes_has_voted')}catch(e){}" +
        "location.hash='#/';render()" +
      "}" +
    "}" +
    "else if(action==='dismiss-disclaimer'){S.disclaimerDismissed=true;render()}" +
    "else if(action==='set-lang'){setLang(el.dataset.value)}" +
    "else if(action==='mark-voted'){S.hasVoted=true;save();render()}" +
    "else if(action==='unvote'){S.hasVoted=false;save();render()}" +
    "else if(action==='share-voted'){shareStickerImage()}" +
    "else if(action==='do-print'){window.print()}" +
    "else if(action==='share'){shareGuide()}" +
    "else if(action==='regen-summary'){regenerateSummary()}" +
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

  // Keyboard handler: Enter/Space activates [data-action] elements (accessibility)
  "document.addEventListener('keydown',function(e){" +
    "if(e.key==='Enter'||e.key===' '){" +
      "var el=e.target.closest('[data-action]');if(!el||el.tagName==='BUTTON'||el.tagName==='A'||el.tagName==='INPUT')return;" +
      "e.preventDefault();el.click()" +
    "}" +
  "});",

  // Form submit for address — validate then verify via geocoder
  "document.getElementById('app').addEventListener('submit',function(e){" +
    "e.preventDefault();" +
    "var form=e.target;" +
    "var st=form.street.value.trim();" +
    "if(st.toLowerCase()==='station'){st='701 Brazos St.';form.city.value='Austin';form.zip.value='78701'}" +
    "var zip=form.zip.value.trim();" +
    // Client-side validation
    "if(!st){S.addressError=t('Please enter your street address.');render();return}" +
    "if(!/^\\d{5}$/.test(zip)){S.addressError=t('Please enter a valid 5-digit ZIP code.');render();return}" +
    "S.address={street:st,city:form.city.value||'Austin',state:'TX',zip:zip};" +
    "S.addressError=null;S.verifyingAddress=true;render();" +
    // Verify address via districts API
    "fetch('/app/api/districts',{method:'POST',headers:{'Content-Type':'application/json'}," +
      "body:JSON.stringify({street:st,city:form.city.value||'Austin',state:'TX',zip:zip})})" +
    ".then(function(r){" +
      "if(r.ok)return r.json();" +
      "if(r.status===404)throw new Error('not_found');" +
      "throw new Error('unavailable')" +
    "})" +
    ".then(function(d){S.districts=d;S.verifyingAddress=false;buildGuide()})" +
    ".catch(function(err){" +
      "S.verifyingAddress=false;" +
      "if(err.message==='not_found'){" +
        "S.addressError=t('We couldn\\u2019t find that address. Please check your street and ZIP, or skip to see all races.');render()" +
      "}else{" +
        // Census geocoder unavailable — proceed without districts
        "S.addressError=null;S.districts=null;buildGuide()" +
      "}" +
    "});" +
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
      // Districts already resolved before buildGuide — skip to profile
      "S.loadPhase=1;S.loadMsg='Finding your ballot...';render();" +
      // Build profile object for API
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
        "body:JSON.stringify({party:'republican',profile:profile,districts:S.districts,lang:LANG})}).then(function(r){return r.json()});" +
      "var demP=fetch('/app/api/guide',{method:'POST',headers:{'Content-Type':'application/json'}," +
        "body:JSON.stringify({party:'democrat',profile:profile,districts:S.districts,lang:LANG})}).then(function(r){return r.json()});" +
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

  // ============ REGENERATE SUMMARY ============
  "function regenerateSummary(){" +
    "S.regenerating=true;render();" +
    "var profile={topIssues:S.issues,politicalSpectrum:S.spectrum,candidateQualities:S.qualities,policyViews:S.policyViews};" +
    "fetch('/app/api/summary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:profile,lang:LANG})})" +
    ".then(function(r){return r.json()})" +
    ".then(function(d){" +
      "if(d.error)throw new Error(d.error);" +
      "S.summary=d.summary;S.regenerating=false;save();render()" +
    "})" +
    ".catch(function(e){" +
      "S.regenerating=false;render();" +
      "alert(t('Could not regenerate summary. Please try again.'))" +
    "})" +
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

  // ============ SHARE STICKER ============
  "function shareStickerImage(){" +
    "var W=440,H=330;" +
    "var c=document.createElement('canvas');c.width=W;c.height=H;" +
    "var ctx=c.getContext('2d');" +
    // White oval background
    "ctx.save();ctx.beginPath();ctx.ellipse(W/2,H/2,W/2-4,H/2-4,0,0,Math.PI*2);ctx.closePath();" +
    "ctx.fillStyle='#fff';ctx.fill();" +
    "ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=3;ctx.stroke();ctx.clip();" +
    // Flag — 13 stripes
    "var fw=140,fh=84,fx=(W-fw)/2,fy=24;" +
    "var sH=fh/13;" +
    "for(var si=0;si<13;si++){" +
      "ctx.fillStyle=si%2===0?'#CC1919':'#fff';" +
      "ctx.fillRect(fx,fy+si*sH,fw,sH+1);" +
    "}" +
    // Canton
    "var cw=58,ch=46;" +
    "ctx.fillStyle='#0D2738';ctx.fillRect(fx,fy,cw,ch);" +
    // Stars (3x4 grid)
    "ctx.fillStyle='#fff';" +
    "for(var sr=0;sr<3;sr++){for(var sc=0;sc<4;sc++){" +
      "ctx.beginPath();ctx.arc(fx+8+sc*13,fy+8+sr*13,3,0,Math.PI*2);ctx.fill();" +
    "}}" +
    // "I Voted" text
    "ctx.fillStyle='#0D2738';ctx.font='bold italic 84px Georgia,serif';ctx.textAlign='center';ctx.textBaseline='top';" +
    "ctx.fillText('I Voted',W/2,fy+fh+8);" +
    // "Early!" text if during early voting
    "var election=new Date(2026,2,3);var now=new Date();var diff=Math.ceil((election-now)/(1000*60*60*24));" +
    "if(diff>0){ctx.fillStyle='#CC1919';ctx.font='bold italic 48px Georgia,serif';ctx.fillText('Early!',W/2,fy+fh+88);}" +
    // "atxvotes.app" at bottom
    "ctx.fillStyle='#888';ctx.font='24px -apple-system,sans-serif';ctx.fillText('atxvotes.app',W/2,H-40);" +
    "ctx.restore();" +
    // Convert to blob and share
    "c.toBlob(function(blob){" +
      "var vText='I voted in the Texas Primary! \\u{1F5F3}\\uFE0F\\n\\nBuild your personalized voting guide at atxvotes.app/app';" +
      "if(navigator.share&&navigator.canShare){" +
        "var file=new File([blob],'i-voted.png',{type:'image/png'});" +
        "var shareData={title:'I Voted!',text:vText,files:[file]};" +
        "if(navigator.canShare(shareData)){navigator.share(shareData).catch(function(){});return}" +
      "}" +
      // Fallback: text share
      "if(navigator.share){navigator.share({title:'I Voted!',text:vText}).catch(function(){})}" +
      "else{navigator.clipboard.writeText(vText).then(function(){alert('Copied to clipboard!')}).catch(function(){alert(vText)})}" +
    "},'image/png');" +
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
  '<a class="skip-link" href="#app">Skip to content</a>' +
  '<div id="topnav" role="navigation" aria-label="Main navigation"></div>' +
  '<main id="app"></main>' +
  '<div id="tabs" role="navigation" aria-label="Tab navigation"></div>' +
  "<script>" +
  APP_JS +
  "</script>" +
  "</body></html>";
