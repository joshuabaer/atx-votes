# Texas Votes Logo Design Brief

## 1. Project Overview

**App:** Texas Votes (txvotes.app)
**Purpose:** Nonpartisan, personalized voting guide for Texas elections
**Tagline:** "Your personalized voting guide for Texas elections"
**Short name:** TX Votes

The app is a single-file PWA served from a Cloudflare Worker with no build step. All assets are either inline SVG or data URIs. The logo must work within this architecture -- ideally as hand-authored SVG that can be embedded directly in code.

---

## 2. Current Brand Inventory

### Existing Brand Elements

| Element | Current Implementation | Location |
|---------|----------------------|----------|
| **Topnav brand mark** | Red five-pointed star SVG (18x18) + "Texas Votes" in blue text | `pwa.js` line 1244 (ICON_STAR) |
| **Hero icon** | Same red star SVG at 64x64 | `pwa.js` line 1278 |
| **PWA manifest icon** | Blue rounded-rect (#21598e) with white "V" letter, 512x512 SVG | `pwa.js` lines 112-125 |
| **OG image** | 1200x630 SVG: Texas flag graphic + "Texas Votes" text on dark bg | `worker/public/og-image.svg` |
| **Landing page** | Inline Texas flag SVG (120x80) above "Texas Votes" heading | `index.js` lines 266-273 |
| **Footer/watermark** | Red HTML star entity (&starf;) + "Built in Texas" | Multiple locations |
| **Cheat sheet header** | Red HTML star + "Your Ballot Cheat Sheet" | `pwa.js` line 1585 |
| **Favicon** | None currently set (no `<link rel="icon">` in HTML) |
| **Apple touch icon** | None currently set |

### Current Weaknesses

1. **No favicon at all** -- browser tabs show a blank/default icon
2. **No apple-touch-icon** -- iOS home screen shows a page screenshot instead of a proper icon
3. **PWA icon is a plain "V" on a blue rectangle** -- generic, not memorable
4. **OG image uses a Texas flag illustration** -- doesn't communicate the product, just the state
5. **No unified logo system** -- the red star, the "V" icon, and the Texas flag are three unrelated visual identities
6. **No maskable icon variant** -- Android may crop the current icon poorly

---

## 3. Color Palette (from CSS variables)

### Light Mode

| Token | Value | Hex | Usage |
|-------|-------|-----|-------|
| `--blue` | `rgb(33,89,143)` | `#21598F` | Primary brand, buttons, links, topnav text |
| `--red` | `rgb(191,38,38)` | `#BF2626` | Star icon, accents, border-top, progress bar |
| `--gold` | `rgb(217,166,33)` | `#D9A621` | Key race stars, rating stars |
| `--bg` | `#faf8f0` | `#FAF8F0` | Page background (warm off-white) |
| `--card` | `#fff` | `#FFFFFF` | Card backgrounds |
| `--text` | `rgb(31,31,36)` | `#1F1F24` | Primary text |
| `--text2` | `rgb(115,115,128)` | `#737380` | Secondary text |
| `--ok` | `rgb(51,166,82)` | `#33A652` | Success/positive |
| `--rep` | `rgb(217,38,38)` | `#D92626` | Republican party color |
| `--dem` | `rgb(38,77,191)` | `#264DBF` | Democrat party color |

### Dark Mode

| Token | Value | Hex |
|-------|-------|-----|
| `--blue` | `rgb(102,153,217)` | `#6699D9` |
| `--red` | `rgb(235,88,88)` | `#EB5858` |
| `--gold` | `rgb(242,191,64)` | `#F2BF40` |
| `--bg` | `rgb(28,28,31)` | `#1C1C1F` |
| `--card` | `rgb(43,43,46)` | `#2B2B2E` |

### Additional Brand Colors (from OG image / Texas flag usage)

| Name | Hex | Usage |
|------|-----|-------|
| Old Glory Blue | `#002868` | Texas flag canton |
| Old Glory Red | `#BF0A30` | Texas flag stripes |
| Theme color | `#21598E` | PWA theme, manifest `theme_color` |
| Background color | `#FAF8F0` | Manifest `background_color` |

### Recommended Logo Colors

The logo should primarily use:
- **`#21598F` (--blue)** as the primary mark color, matching theme_color
- **`#BF2626` (--red)** as the accent, matching the existing red star and top border
- **White (`#FFFFFF`)** for reversed/knockout versions on dark backgrounds

The gold (`#D9A621`) should be reserved for the star element if used, creating a three-color hierarchy: blue (structure) + red (accent) + gold (star highlight).

---

## 4. Competitive Landscape

### How Similar Apps Brand Themselves

| App | Logo Style | Colors | Key Visual |
|-----|-----------|--------|------------|
| **Vote.org** | Wordmark, modern sans-serif | Purple (#6941BD), Blue (#1A42CF), Red (#FF2846) | Clean typography, no pictorial mark |
| **BallotReady** | Wordmark + checkmark icon | Blue dominant, green checkmark | Checkmark inside a shield/ballot motif |
| **Ballotpedia** | Wordmark with stylized "B" | Blue (#2962FF) | Encyclopedia-style, text-heavy |
| **Vote411** | Wordmark "VOTE411" in bold type | Deep teal (#0B4369), Magenta (#BB29BB) | Numbers integrated into the wordmark |
| **Rock the Vote** | Bold stencil-style wordmark | Red, white, blue | Energetic, youth-oriented |
| **ISideWith** | Wordmark + balance scale icon | Purple, gray | Scale of justice metaphor |

### Patterns and Observations

1. **Most civic tech apps use wordmarks, not pictorial logos** -- the name IS the brand
2. **Blue is the dominant color** across all platforms (trust, authority, nonpartisanship)
3. **Red is used sparingly as accent** -- too much red reads as partisan
4. **Checkmarks and ballot boxes are overused** -- they are generic
5. **The Texas lone star is a distinctive differentiator** -- no competitor uses it
6. **Simplicity wins** -- at 16x16 favicon size, detail is lost

### Texas Votes Differentiators

- **Geographic identity** (Texas) gives a strong visual hook that national apps lack
- **The lone star** is universally associated with Texas, instantly recognizable
- **"Votes" is action-oriented** compared to "ballot" or "guide" in competitors
- **Warm color palette** (#FAF8F0 background) feels approachable vs. clinical whites

---

## 5. Three Logo Concept Directions

### Concept A: "Lone Star Ballot" (Recommended)

**Description:** A five-pointed star where the interior contains a subtle ballot/checkmark integration. The star is the primary mark, rendered in `--red` (#BF2626) with a clean geometric style. Inside the star, a single checkmark stroke in white suggests the act of voting. Below/beside the star, "Texas Votes" is set in a bold sans-serif, with "Texas" in `--blue` and "Votes" in `--text` (or all in `--blue`).

**Icon-only version (for favicon/PWA):** Just the star with the embedded checkmark, on a `--blue` (#21598F) rounded-rectangle background. The star renders in white or `--gold`.

**Rationale:**
- Builds on the existing red star brand element already in the app
- The checkmark inside the star is unique -- no competitor uses this combination
- Works at every size: the star silhouette is recognizable even at 16x16
- Nonpartisan: a Texas star with a checkmark says "vote" without saying "party"
- Leverages the strongest existing brand equity (the red star is everywhere in the current UI)

**Variations:**
- Light bg: Red star + blue text
- Dark bg: Light red star (#EB5858) + light blue text (#6699D9)
- Favicon: White star-with-check on blue (#21598F) circle or rounded rect
- Maskable: Same, with extra padding (safe zone is inner 80% circle)

### Concept B: "Texas V"

**Description:** A bold geometric "V" shape that doubles as a Texas-shaped silhouette or incorporates a lone star at the vertex. The "V" stands for both "Votes" and the checkmark gesture of voting. Rendered in `--blue` (#21598F) with a small `--red` star at the bottom point of the V.

**Icon-only version:** The V-star monogram on a warm cream (#FAF8F0) or dark (#1C1C1F) background.

**Rationale:**
- The current PWA icon already uses a "V" -- this evolves it rather than replacing it
- A "V" is universally understood as a vote/checkmark gesture
- Adding the star at the vertex creates a unique mark
- Letter-based logos are popular in civic tech (Ballotpedia's "B", etc.)

**Weaknesses:**
- A "V" alone is generic (Victoria's Secret, Vlone, Verizon, etc.)
- Less "Texan" feeling than a pure star approach
- The star may be too small at favicon sizes to be legible at the V's vertex

### Concept C: "Star & Stripes Shield"

**Description:** A shield or badge shape (rounded rectangle with a slight taper) containing horizontal red and white stripes on the right two-thirds, with a blue canton on the left containing a single white star -- essentially a stylized Texas flag in badge form. "Texas Votes" text sits below or integrated as a banner across the bottom.

**Icon-only version:** The shield/badge alone, which reads as a Texas flag at a glance.

**Rationale:**
- The Texas flag is already used on the landing page and OG image
- A badge/shield shape connotes authority and trustworthiness
- Highly distinctive -- immediately says "Texas"
- The flag design is public domain, no trademark concerns

**Weaknesses:**
- More complex than Concepts A or B, harder to render at small sizes
- The landing page already uses a Texas flag illustration -- risk of "just a flag, not a logo"
- Stripes create visual noise at 16x16 favicon size
- May read as government/official rather than approachable civic tech

---

## 6. Size Requirements

### Minimum Required Assets

Based on modern best practices (Evil Martians "How to Favicon in 2026" approach):

| Asset | Size | Format | Purpose | Priority |
|-------|------|--------|---------|----------|
| **favicon.svg** | any (square viewport) | SVG | Modern browser tabs, supports dark mode via CSS media query | Critical |
| **favicon.ico** | 32x32 | ICO | Legacy browsers, bots, RSS readers that request `/favicon.ico` | Critical |
| **apple-touch-icon.png** | 180x180 | PNG | iOS home screen icon | Critical |
| **icon-192.png** | 192x192 | PNG | PWA manifest (home screen) | Critical |
| **icon-512.png** | 512x512 | PNG | PWA manifest (splash screen) | Critical |
| **icon-512-maskable.png** | 512x512 (with padding) | PNG | PWA manifest (Android adaptive icons) | Important |
| **og-image.svg** | 1200x630 | SVG/PNG | Social media sharing cards (Open Graph) | Important |

### Current vs. Needed

| Asset | Current | Action Needed |
|-------|---------|---------------|
| PWA 512 icon | Data URI SVG "V" on blue | Replace with proper logo |
| PWA 192 icon | Missing | Add to manifest |
| Maskable icon | Missing | Add to manifest with `purpose: "maskable"` |
| favicon.svg | Missing | Create and add `<link rel="icon">` |
| favicon.ico | Missing | Create and serve from `/favicon.ico` |
| apple-touch-icon | Missing | Create and add `<link rel="apple-touch-icon">` |
| OG image | Texas flag illustration | Redesign with logo + tagline |

### HTML Head Tags Needed

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

### Manifest Icons Needed

```json
{
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Topnav Inline SVG

The current `ICON_STAR` is an 18x18 viewBox SVG. The new logo mark should work at this size as a simple, bold shape. The current star path (`M12 2l2.9 6.26L22 9.27l-5 5.14L18.18 22 12 18.56 5.82 22 7 14.41 2 9.27l7.1-1.01L12 2z`) could be enhanced with the checkmark detail or replaced.

---

## 7. Recommended Approach

### SVG-First, Code-Native

Given the architecture (no build step, all assets inline or served from the Worker), the logo should be:

1. **Authored as hand-crafted SVG** -- not exported from Illustrator with bloated paths
2. **Simple enough to express in ~5-10 SVG elements** (paths, circles, rects)
3. **Stored as a string constant** in `pwa.js` for inline use, and as a static file for favicon/manifest

### Implementation Plan

**Phase 1: Design the SVG mark (can be done in code)**

- Write the logo SVG by hand using basic path commands
- Test at 16x16, 32x32, 180x180, and 512x512 to verify legibility
- Embed dark-mode CSS in the favicon.svg using `@media (prefers-color-scheme: dark)`

**Phase 2: Generate raster assets**

Tools that can convert SVG to PNG at various sizes:
- **sharp** (Node.js) -- `sharp('logo.svg').resize(512,512).png().toFile('icon-512.png')`
- **Inkscape CLI** -- `inkscape -w 512 -h 512 logo.svg -o icon-512.png`
- **resvg** (Rust, also has Node bindings) -- high-fidelity SVG-to-PNG
- **ImageMagick** -- `convert -background none -resize 512x512 logo.svg icon-512.png`
- **Squoosh CLI** or **pngquant** for optimization
- For favicon.ico: **ImageMagick** -- `convert icon-32.png favicon.ico`

**Phase 3: Integrate into the codebase**

1. Update `ICON_STAR` in pwa.js with the new mark SVG
2. Update the manifest icons array (replace data URI with served files or new data URIs)
3. Add `<link rel="icon">` and `<link rel="apple-touch-icon">` to `APP_HTML` head
4. Serve `/favicon.ico`, `/favicon.svg`, `/apple-touch-icon.png` from the Worker (static assets via wrangler.toml or inline responses)
5. Update `og-image.svg` with the new logo
6. Update the landing page to use the new mark instead of the raw Texas flag SVG

### Can This Be Done In-Code or Does It Need a Designer?

**This can be done entirely in code.** Here is why:

1. The existing brand already has strong visual DNA (red star + blue text) -- no creative strategy needed
2. The recommended Concept A (star + checkmark) is geometrically simple -- a five-pointed star is defined by 10 coordinate pairs, and a checkmark is 3 points
3. SVG is a text format -- you write XML, not pixels
4. The app's aesthetic is clean and utilitarian, not illustrative -- a hand-crafted geometric logo fits perfectly
5. Raster export is automated via CLI tools

**However, a designer would add value for:**
- Optical adjustments (the checkmark might look off-center mathematically but need visual correction)
- Exploring the mark at emotional level (does it feel trustworthy? approachable? serious?)
- Creating a proper brand guide if the project scales beyond the current scope
- Alternative colorways and usage rules for print, merchandise, partnerships

**Verdict:** Start with an in-code SVG implementation of Concept A. If the project gains traction and needs formal branding (partnerships, press kit, app store listing), invest in a designer to refine it at that point.

---

## 8. Open Questions

1. **Should the star have 5 points (Texas lone star) or could it be stylized?** The standard five-pointed star is most recognizable and most "Texan."
2. **Should the favicon SVG support dark mode?** Yes -- an SVG favicon can contain `<style>@media(prefers-color-scheme:dark){...}</style>` to swap colors. This is a free win.
3. **Should PWA icons use data URIs or served files?** The current approach uses a data URI. For larger/more complex icons, served PNG files are more reliable across platforms. Recommend switching to served files.
4. **Should the OG image be SVG or PNG?** Some social platforms (LinkedIn, iMessage) don't render SVG OG images. Consider generating a PNG version or using a Cloudflare Worker to convert on-the-fly.
5. **Maskable icon safe zone:** Android's maskable icon spec requires the important content within the inner 80% circle (409x409 of a 512x512 canvas). The star mark must fit within this area with padding.

---

## 9. Sources

- [How to Favicon in 2026 (Evil Martians)](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs) -- modern minimal favicon approach
- [PWA Icon Requirements and Safe Areas (Logo Foundry)](https://logofoundry.app/blog/pwa-icon-requirements-safe-areas) -- maskable icon safe zones
- [Define App Icons (MDN)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons) -- PWA manifest icon spec
- [Favicon Size & Dimensions Guide (2025)](https://faviconbuilder.com/guides/favicon-size-and-dimensions/) -- comprehensive size reference
- [Vite PWA Minimal Requirements](https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html) -- manifest icon minimums
- [Center for Civic Design](https://civicdesign.org/) -- voter education design best practices
- [Vote.org Design Guidelines](https://www.vote.org/design/) -- civic tech design reference
- [VOTE411 Brand Assets (Brandfetch)](https://brandfetch.com/vote411.org) -- competitor branding reference
- [SVG Generation Methods Comparison (SVG AI)](https://www.svgai.org/blog/svg-generation/svg-generation-methods-comparison) -- programmatic SVG tools
