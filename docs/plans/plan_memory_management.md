# Memory Management Review Plan

## 1. localStorage Usage in the PWA

### 1.1 Complete Key Inventory

The PWA stores the following keys in localStorage:

| Key | Type | Est. Size | Written | Cleared on Reset? |
|-----|------|-----------|---------|-------------------|
| `tx_votes_profile` | JSON object (issues, spectrum, policyViews, qualities, freeform, address, summary, districts, readingLevel) | 1-5 KB | `save()` | Yes |
| `tx_votes_ballot_republican` | Full ballot JSON (all races, candidates, endorsements, pros/cons, sources) | 50-200 KB | `save()` | Yes |
| `tx_votes_ballot_democrat` | Full ballot JSON (same structure) | 50-200 KB | `save()` | Yes |
| `tx_votes_selected_party` | Short string ("republican" or "democrat") | ~12 B | `save()` | Yes |
| `tx_votes_has_voted` | "1" or "" | ~1 B | `save()` | Yes |
| `tx_votes_data_updated_republican` | ISO date string | ~24 B | `save()` | **NO** |
| `tx_votes_data_updated_democrat` | ISO date string | ~24 B | `save()` | **NO** |
| `tx_votes_lang` | "en" or "es" | ~2 B | `setLang()` | **NO** |
| `tx_votes_sharePromptSeen` | "1" | ~1 B | `showSharePrompt()` | Yes |
| `tx_votes_ee_chef` | "1" | ~1 B | Easter egg unlock | **NO** |
| `tx_votes_ee_cowboy` | "1" | ~1 B | Easter egg unlock | **NO** |
| `tx_votes_llm_compare_claude` | Full ballot JSON per party | 50-200 KB | LLM compare debug | Yes (via llm-clear) |
| `tx_votes_llm_compare_chatgpt` | Full ballot JSON per party | 50-200 KB | LLM compare debug | Yes (via llm-clear) |
| `tx_votes_llm_compare_gemini` | Full ballot JSON per party | 50-200 KB | LLM compare debug | Yes (via llm-clear) |
| `tx_votes_llm_compare_grok` | Full ballot JSON per party | 50-200 KB | LLM compare debug | Yes (via llm-clear) |

**Legacy keys** (from atx_votes_* prefix, written by old versions):

| Key | Cleared on Reset? |
|-----|-------------------|
| `atx_votes_profile` | Yes |
| `atx_votes_ballot_republican` | Yes |
| `atx_votes_ballot_democrat` | Yes |
| `atx_votes_selected_party` | Yes |
| `atx_votes_has_voted` | Yes |
| `atx_votes_lang` | **NO** (read during migration but never deleted) |

### 1.2 Storage Size Analysis

**Worst case total**: A user who has generated guides with all 4 LLM comparisons could have:
- 2 main ballots: ~400 KB
- 4 LLM comparisons x 2 ballots each: ~1.6 MB
- Profile + misc: ~5 KB
- **Total: ~2 MB**

localStorage limit is typically **5-10 MB** per origin. This is within bounds but could become tight if ballot data grows (e.g., more county races, longer source lists with 20 sources per candidate).

### 1.3 Issues Found

**ISSUE 1: No storage quota handling.** All `localStorage.setItem()` calls are wrapped in try/catch but there is no user-facing error message or recovery strategy when storage is full. The `save()` function silently fails, meaning the user's profile and ballot data would be lost on next page load.

**ISSUE 2: Orphaned keys on reset.** The in-app "Start over" reset (action=reset, lines 2803-2814) removes most keys but misses:
- `tx_votes_data_updated_republican`
- `tx_votes_data_updated_democrat`
- `tx_votes_lang` (intentional? language preference is arguably independent of guide data)
- `tx_votes_ee_chef` (intentional - Easter egg should persist)
- `tx_votes_ee_cowboy` (intentional - Easter egg should persist)
- All `tx_votes_llm_compare_*` keys (these ARE cleaned, but via a separate `llm-clear` action, not on profile reset)

**ISSUE 3: Migration does not clean up old keys.** The one-time migration (lines 1493-1498) copies `atx_votes_*` to `tx_votes_*` but never deletes the `atx_votes_*` originals. The legacy keys are cleaned on reset, but only 5 of the 6 known atx_ keys (missing `atx_votes_lang`). This means users who migrated are storing duplicate data (~200-400 KB wasted).

**ISSUE 4: No expiration or staleness check.** Ballot data from a completed election cycle remains in localStorage indefinitely. After March 3, 2026, there is no mechanism to clear 2026 primary data or prompt the user to start fresh for the next election cycle.

### 1.4 Recommendations

1. **Add a storage quota check**: Before writing large ballot data, check `navigator.storage.estimate()` (where available) or measure current usage. Show a warning toast if approaching limits.

2. **Fix reset to remove all keys**: Add `tx_votes_data_updated_republican`, `tx_votes_data_updated_democrat`, and `tx_votes_llm_compare_*` to the reset cleanup. Consider whether language and Easter egg keys should also be cleared.

3. **Clean up migrated legacy keys**: After the migration block copies data, delete the `atx_votes_*` originals. Also delete `atx_votes_lang`.

4. **Add election-cycle expiration**: Store an `tx_votes_election_date` key. On load, if the election date has passed by more than 7 days, prompt the user to clear old data or auto-clear.

5. **LLM compare data is large**: Consider not persisting LLM compare data to localStorage at all (it is a debug feature). Or at minimum, clear it on profile reset.

---

## 2. Service Worker Cache

### 2.1 Cache Strategy

- **Cache name**: `txvotes-v2` (hardcoded in `SERVICE_WORKER` string, pwa.js line 74)
- **Versioning strategy**: The cache name contains a manual version number (`v2`). When the name changes, old caches are deleted on `activate` event (lines 78-82).
- **Fetch strategy**: Network-first for the app shell. Every request goes to the network first; on success, the response is cached. On network failure, the cached version is served as offline fallback (lines 91-97).
- **API requests**: Fetch-only (no caching). `/app/api/*` requests bypass the cache entirely and return a `503 offline` response on failure (lines 85-89).

### 2.2 Cache Invalidation

- **On deploy**: The worker serves `Cache-Control: no-cache` for the app HTML and SW JS. The service worker uses `skipWaiting()` on install, and claims all clients on activate. Old caches with different names are purged on activate.
- **Manual clear**: `/app/clear` unregisters ALL service workers, deletes ALL caches via `caches.keys()`, clears ALL localStorage, then redirects to `/`.
- **On init (pwa.js lines 3321-3327)**: The PWA unregisters ALL existing service workers, then re-registers `/app/sw.js`. This is a nuclear approach that ensures a fresh SW on every full page load.

### 2.3 Issues Found

**ISSUE 5: Service worker re-registration on every load.** Lines 3321-3327 unregister ALL service workers then immediately re-register. This is a heavy-handed approach that defeats the purpose of a service worker (persistent background caching). Every page load triggers an unregister-then-register cycle, creating unnecessary network overhead. The intent appears to be ensuring users always get the latest SW, but the `skipWaiting()` + `Cache-Control: no-cache` combination should already achieve this.

**ISSUE 6: Cache can grow unbounded within a version.** The network-first strategy caches every successful response into the `txvotes-v2` cache. There is no limit on the number of entries or total cache size. Since the app is a single-page PWA with few routes this is unlikely to be a practical problem, but requests to `/app/api/ballot?party=*` or other API endpoints would also be cached if they do not match the `/app/api/` check. Wait -- the SW explicitly skips caching for `/app/api/` requests (line 85), so only the app shell HTML/manifest/SW are cached. This is fine.

**ISSUE 7: No versioned cache invalidation on deploy.** The cache name `txvotes-v2` is hardcoded. To invalidate the cache, you must manually bump the version string in the source code and redeploy. There is no automatic cache-busting tied to the deployment process. The current mitigation (Cache-Control: no-cache + nuclear SW re-registration) works but is inelegant.

### 2.4 Recommendations

1. **Remove the nuclear SW re-registration**: The `skipWaiting()` + `Cache-Control: no-cache` headers should be sufficient. Remove the unregister-all-then-register pattern (lines 3321-3327) and replace with a simple registration.

2. **Consider a build-time cache version**: If a build step is ever added, embed a commit hash or timestamp into the cache name.

3. **Current approach works**: Despite the issues noted, the actual cache behavior is sound for a single-page PWA. The cache only holds the app shell, and the network-first strategy ensures freshness.

---

## 3. KV Data Retention

### 3.1 Complete KV Key Inventory

| Key Pattern | Example | Written By | Frequency |
|-------------|---------|------------|-----------|
| `ballot:statewide:{party}_primary_2026` | `ballot:statewide:republican_primary_2026` | Initial seed + `updater.js` | 2 keys total |
| `ballot:{party}_primary_2026` | `ballot:republican_primary_2026` | Legacy (old format) | 2 keys (read-only fallback) |
| `ballot:county:{fips}:{party}_primary_2026` | `ballot:county:48453:republican_primary_2026` | `county-seeder.js` | Up to 60 keys (30 counties x 2 parties) |
| `county_info:{fips}` | `county_info:48453` | `county-seeder.js` | Up to 30 keys |
| `precinct_map:{fips}` | `precinct_map:48453` | `county-seeder.js` | Up to 30 keys |
| `manifest` | `manifest` | `updater.js` | 1 key |
| `candidates_index` | `candidates_index` | `index.js loadAllCandidates()` | 1 key (cache, rebuilt on miss) |
| `update_log:{date}` | `update_log:2026-02-22` | `updater.js` | 1 key per day cron runs |
| `audit:summary` | `audit:summary` | `audit-runner.js` | 1 key |
| `audit:result:{provider}` | `audit:result:chatgpt` | `audit-runner.js` | Up to 4 keys |
| `audit:log:{date}` | `audit:log:2026-02-22` | `audit-runner.js` | 1 key per day audit runs |

### 3.2 Estimated KV Data Sizes

| Key Type | Est. Size Per Key | Total Keys | Total Size |
|----------|-------------------|------------|------------|
| Statewide ballots | 100-500 KB | 2 (+2 legacy) | ~1-2 MB |
| County ballots | 10-50 KB | ~60 | ~0.6-3 MB |
| County info | 1-5 KB | ~30 | ~30-150 KB |
| Precinct maps | 0.5-2 KB | ~30 | ~15-60 KB |
| Candidates index | 200-800 KB | 1 | ~200-800 KB |
| Update logs | 5-20 KB | ~30 (one per day of campaign) | ~150-600 KB |
| Audit results | 5-30 KB | 4 | ~20-120 KB |
| Audit logs | 5-20 KB | ~30 | ~150-600 KB |
| Manifest | <1 KB | 1 | <1 KB |
| **Total** | | **~190 keys** | **~2-8 MB** |

KV value size limit is 25 MB per key. Total KV storage on the paid plan is effectively unlimited (billed by operations, not storage). No size issues.

### 3.3 Issues Found

**ISSUE 8: Update logs accumulate forever.** `update_log:{date}` keys are written daily by the cron updater and never deleted. Over time this creates an unbounded number of keys. For this election cycle (~30 days), this is manageable. But across election cycles, logs will pile up.

**ISSUE 9: Audit logs accumulate forever.** Same issue as update logs -- `audit:log:{date}` keys are never cleaned up.

**ISSUE 10: No post-election cleanup strategy.** The updater has a cutoff (`if (new Date() > new Date("2026-03-04T00:00:00Z"))`) that stops the cron after election day, but there is no mechanism to:
- Archive or delete the 2026 primary data when a new election cycle begins
- Remove stale `ballot:*`, `county_info:*`, `precinct_map:*` keys
- Clear the `candidates_index` cache for old elections
- Remove the legacy `ballot:{party}_primary_2026` keys

**ISSUE 11: Legacy ballot keys are never cleaned up.** The code reads from `ballot:{party}_primary_2026` as a fallback (updater.js lines 98-101, index.js lines 99-100) but never migrates data to the new `ballot:statewide:*` format or deletes the legacy keys. Both old and new keys coexist indefinitely.

**ISSUE 12: Manifest versioning is minimal.** The manifest only tracks `{ party: { updatedAt, version } }`. It does not track which election cycle the data belongs to, what county data has been seeded, or any schema version. This makes it hard to determine which KV keys are current vs. stale.

### 3.4 Recommendations

1. **Add a log cleanup cron**: After election day, run a cleanup job that deletes `update_log:*` and `audit:log:*` keys older than 30 days. Use `ELECTION_DATA.list({ prefix: "update_log:" })` and `ELECTION_DATA.list({ prefix: "audit:log:" })` to enumerate them.

2. **Add election-cycle tagging to manifest**: Expand the manifest to include `{ electionCycle: "primary_2026", ... }`. When preparing for a new cycle, a migration script can list and delete all keys matching the old cycle.

3. **Create a KV cleanup admin endpoint**: `POST /api/admin/cleanup` with ADMIN_SECRET auth that:
   - Lists all KV keys
   - Identifies keys from past election cycles
   - Deletes stale keys (dry-run mode first)
   - Deletes legacy `ballot:{party}_primary_2026` keys after verifying `ballot:statewide:*` equivalents exist

4. **Delete legacy ballot keys**: Add a one-time migration in the updater that checks if `ballot:statewide:*` keys exist, and if so, deletes the `ballot:*` legacy keys. This saves ~200-500 KB of KV storage and eliminates the fallback code path.

5. **Cap update log retention**: Only keep the last N days of logs. In the daily updater, after writing the new log, delete logs older than 14 days.

---

## 4. State Cleanup in the PWA

### 4.1 In-App "Start Over" (Reset)

**What it does** (lines 2804-2814):
1. Resets all in-memory state variables (`S.phase=0`, `S.issues=[]`, etc.)
2. Removes 6 `tx_votes_*` localStorage keys (profile, ballot_republican, ballot_democrat, selected_party, has_voted, sharePromptSeen)
3. Removes 5 `atx_votes_*` localStorage keys (profile, ballot_republican, ballot_democrat, selected_party, has_voted)
4. Resets `location.hash` to `#/` and re-renders

**What it misses**:
- `tx_votes_data_updated_republican` / `tx_votes_data_updated_democrat` (orphaned timestamps)
- `tx_votes_llm_compare_*` keys (up to 4 keys, potentially 800 KB+ of LLM compare data)
- `tx_votes_lang` (language preference -- may be intentionally preserved)
- `tx_votes_ee_chef` / `tx_votes_ee_cowboy` (Easter eggs -- intentionally preserved)

### 4.2 /app/clear Page

**What it does** (pwa.js lines 22-59):
1. Calls `localStorage.clear()` -- **nukes everything** including language, Easter eggs, and any other origin's data
2. Unregisters all service workers
3. Deletes all caches via `caches.keys()`
4. Redirects to `/` (or a custom URL for vanity entry points like `/cowboy`, `/chef`, `/gemini`, `/grok`, `/chatgpt`)

**Difference from in-app reset**: `/app/clear` is far more aggressive -- it clears ALL localStorage (not just tx_votes_* keys), ALL service workers, and ALL caches. This is the "nuclear option."

### 4.3 Memory Leaks in the SPA

**Event Listeners**: The PWA uses event delegation (single listeners on `#app`, `#tabs`, `#topnav`, and `document`). This is a good pattern that avoids listener accumulation. Specific findings:

- **Sortable drag handlers** (lines 1427-1431): The `initSortable()` function adds `mousemove`, `touchmove`, `mouseup`, `touchend` listeners on `document` during drag operations, and correctly removes them in `onEnd()` (lines 1463-1466). However, the `mousedown`/`touchstart` listeners on the container (lines 1470-1471) are added each time `initSortable()` is called, which happens on every render of phase 2 (Issues) and phase 5 (Qualities). **This is a potential leak**: if `render()` is called multiple times during these phases, the container gets multiple identical start listeners. However, since `render()` replaces the container's innerHTML (creating a new DOM element), the old listeners are garbage collected with the old elements. **No leak.**

- **hashchange listener** (line 2929): Added once, never removed. This is correct for an SPA.

- **visibilitychange listener** (line 3331): Added once, never removed. This is correct.

- **keydown listeners** (lines 2855, 2863, 2879): Three separate keydown listeners on `document`. These are added once at initialization and never removed. This is fine since they are lightweight and do not accumulate.

- **Share prompt overlay** (lines 3253-3264): Creates a new `div` element and adds a `click` listener. The div is removed when dismissed (`d.remove()`). The listener is on the element itself, so it is garbage collected when the element is removed. **No leak.**

- **setInterval in buildGuide** (line 2986): `rotateTimer` is created during guide building and cleared on line 2988 after `Promise.allSettled` resolves. **Correctly cleaned up.**

- **setTimeout calls**: Various `setTimeout` calls for animations (confetti, emoji burst, etc.) all reference DOM elements that are removed after the timeout fires. **No persistent leaks.**

- **rateLimitMap in index.js** (server-side): The `Map` used for rate limiting (line 3537) could grow to 10,000 entries before pruning kicks in (line 3547). On Cloudflare Workers, each isolate is short-lived, so this is not a practical concern. The pruning logic is correct.

**ISSUE 13: startMascotTimer is a no-op stub.** Lines 1857-1858 define `startMascotTimer()` and `stopMascotTimer()` as empty functions, but `setTimeout(startMascotTimer, 100)` is still called on line 1877 during the building phase. This is harmless (the timer fires, calls an empty function) but is dead code that should be cleaned up.

### 4.4 Recommendations

1. **Align reset with save**: Every key written by `save()` or elsewhere should have a corresponding `removeItem()` in the reset action. Add cleanup for:
   - `tx_votes_data_updated_republican`
   - `tx_votes_data_updated_democrat`
   - All `tx_votes_llm_compare_*` keys (already done via `llm-clear` but should also happen on profile reset)

2. **Remove dead mascot timer code**: Delete the empty `startMascotTimer()`/`stopMascotTimer()` functions and the `setTimeout(startMascotTimer, 100)` call.

3. **Consider a single cleanup function**: Create a `clearAllData()` function that both the reset action and `/app/clear` can share (with different levels of aggressiveness). This reduces the risk of save/clear key lists drifting apart.

---

## 5. Priority Summary

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | No localStorage quota handling | Medium | Small |
| 2 | Reset misses `data_updated` and `llm_compare` keys | Low | Small |
| 3 | Migration leaves duplicate `atx_votes_*` keys | Low | Small |
| 4 | No election-cycle expiration in localStorage | Medium | Medium |
| 5 | Nuclear SW re-registration on every load | Low | Small |
| 7 | Hardcoded cache version string | Low | Small |
| 8 | Update logs accumulate forever | Low | Small |
| 9 | Audit logs accumulate forever | Low | Small |
| 10 | No post-election KV cleanup strategy | Medium | Medium |
| 11 | Legacy ballot keys never cleaned up | Low | Small |
| 12 | Manifest lacks election-cycle metadata | Low | Medium |
| 13 | Dead mascot timer code | Trivial | Trivial |

### Recommended Implementation Order

1. **Quick wins** (30 min total):
   - Fix reset to remove all orphaned localStorage keys (Issue 2)
   - Clean up legacy `atx_votes_*` keys after migration (Issue 3)
   - Remove dead mascot timer code (Issue 13)

2. **Pre-election polish** (1-2 hours):
   - Add localStorage quota warning (Issue 1)
   - Simplify SW registration (Issue 5)
   - Delete legacy KV ballot keys (Issue 11)

3. **Post-election prep** (2-4 hours):
   - Add election-cycle expiration to localStorage (Issue 4)
   - Build KV cleanup admin endpoint (Issue 10)
   - Cap update/audit log retention (Issues 8, 9)
   - Expand manifest with election-cycle metadata (Issue 12)
