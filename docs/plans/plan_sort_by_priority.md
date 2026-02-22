# Implementation Plan: Sort-by-Priority Drag Interface

## 1. Current State Analysis

### Issues Picker (Phase 2 -- `renderIssues()`)
- **File:** `/Users/joshuabaer/Library/Mobile Documents/com~apple~CloudDocs/Xcode/ATXVotes/worker/src/pwa.js`
- **Lines:** ~1326-1340
- **UI:** Grid of 17 tappable chips (`chip-grid`), user selects 3-7 by toggling
- **Data:** `S.issues` is an **array of strings** (the `.v` values), e.g. `["Housing", "Taxes", "Education"]`
- **Display order:** Randomized once via `shuffle(ISSUES)` -> `shuffledIssues`
- **Action handler:** `toggle-issue` (line ~2108-2111) -- pushes/splices from `S.issues`, max 7
- **Header:** "What issues matter most to you?" / "Pick your top 3-7."

### Qualities Picker (Phase 5 -- `renderQualities()`)
- **Lines:** ~1373-1387
- **UI:** Grid of 10 tappable chips (`chip-grid`), user selects 2-3 by toggling
- **Data:** `S.qualities` is an **array of strings**, e.g. `["Integrity & Honesty", "Experience"]`
- **Display order:** Randomized once via `shuffle(QUALITIES)` -> `shuffledQualities`
- **Action handler:** `toggle-quality` (line ~2124-2127) -- pushes/splices from `S.qualities`, max 3
- **Header:** "What do you value most in a candidate?" / "Pick 2-3 that matter most."

### How Data Flows to the API
1. **Save to localStorage** (line ~1189): `topIssues: S.issues`, `candidateQualities: S.qualities`
2. **Sent to `/app/api/guide`** (line ~2256): `topIssues: S.issues`, `candidateQualities: S.qualities`
3. **Server-side** (`pwa-guide.js` lines 111-112, 269-270): `.join(", ")` -- issues and qualities become comma-separated strings in the Claude prompt
4. The prompt says "Top issues: Economy & Cost of Living, Housing, Taxes" with no ranking info

### Item Counts
- **Issues:** 17 items (each has `.v` string and `.icon` emoji)
- **Qualities:** 10 items (each is a string key in `QUAL_ICONS` with an SVG icon)

---

## 2. Recommended Approach: Hybrid (Touch Drag + Button Fallback)

### Why Not HTML5 Drag-and-Drop Alone
- HTML5 `draggable` attribute and `dragstart`/`dragover`/`drop` events **do not work on mobile browsers**
- Mobile Safari and Chrome for Android do not fire drag events from touch input
- A polyfill (e.g. `dragdroptouch`) would add an external dependency -- against the project's zero-dependency constraint

### Why Not Touch Events Alone
- Touch events (`touchstart`/`touchmove`/`touchend`) work perfectly on mobile but do not exist on desktop
- Mouse events (`mousedown`/`mousemove`/`mouseup`) work on desktop but not on mobile

### Recommended: Unified Pointer Approach with Button Fallback
1. **Primary interaction:** Touch drag on mobile, mouse drag on desktop, using a unified handler that reads from both `e.touches[0]` and `e.clientY`
2. **Fallback interaction:** Up/down arrow buttons on each item for accessibility and for users who find drag difficult
3. **No external dependencies** -- pure vanilla JS, fits in the string-array pattern

This satisfies WCAG 2.5.7 (Dragging Movements) which requires that any drag operation also be achievable via single-pointer clicks.

---

## 3. UI Design

### New Layout: Vertical Sortable List

```
+--------------------------------------------------+
|  Rank your issues by priority                     |
|  Drag to reorder, or use arrows. #1 = most       |
|  important to you.                                |
+--------------------------------------------------+
|                                                   |
|  +----------------------------------------------+ |
|  | 1  [up] [dn]  Economy & Cost of Living       | |
|  +----------------------------------------------+ |
|  | 2  [up] [dn]  Housing                        | |
|  +----------------------------------------------+ |
|  | 3  [up] [dn]  Public Safety                  | |
|  +----------------------------------------------+ |
|  | 4  [up] [dn]  Education                      | |
|  +----------------------------------------------+ |
|  | 5  [up] [dn]  Healthcare                     | |
|  +----------------------------------------------+ |
|  | 6  [up] [dn]  Environment & Climate          | |
|  +----------------------------------------------+ |
|  | ...                                          | |
|  +----------------------------------------------+ |
|  | 17 [up] [dn]  Faith & Religious Liberty      | |
|  +----------------------------------------------+ |
|                                                   |
|  [        Continue        ]                       |
+--------------------------------------------------+
```

### Each Row Detail

```
+--------------------------------------------------+
| [drag  ]  [rank]  [icon] Issue Name     [^] [v]  |
| [handle]  [#]                                     |
+--------------------------------------------------+

  drag handle = hamburger icon (three horizontal lines), visible touch target
  rank        = number badge (1, 2, 3...)
  icon        = existing emoji icon for issues, SVG for qualities
  [^] [v]     = up/down arrow buttons
```

### Active Drag State

```
+--------------------------------------------------+
|  3  ::::  Education                      ^   v   |  <-- being dragged, elevated shadow
+--------------------------------------------------+
|  ~~~~~~~~~ placeholder gap ~~~~~~~~~~~~~~~~      |  <-- gap where item will land
+--------------------------------------------------+
```

### Visual Design Tokens (matching existing design system)
- Row background: `var(--fill3)` (same as `.radio` and `.chip`)
- Row border: `1.5px solid var(--border2)` (matches `.chip` and `.radio`)
- Active/dragging: elevated `box-shadow`, `z-index: 10`, slightly scaled
- Rank badge: `var(--blue)` background with white text (small circle)
- Arrow buttons: `var(--text2)` color, 44x44px minimum touch target
- Row height: ~52px (comfortable for touch)
- Gap between rows: 4px (tighter than chips to emphasize list order)

---

## 4. Data Model Changes

### Current Model
```js
S.issues = ["Housing", "Taxes", "Education"]    // subset, selection order
S.qualities = ["Integrity & Honesty", "Experience"]  // subset, selection order
```

### New Model
```js
S.issues = [                                     // ALL items, ranked by priority
  "Housing",                // rank 1 (most important)
  "Education",              // rank 2
  "Economy & Cost of Living", // rank 3
  "Taxes",                  // rank 4
  ...                       // all 17 items
]
S.qualities = [                                  // ALL items, ranked by priority
  "Integrity & Honesty",   // rank 1
  "Experience",             // rank 2
  "Strong Leadership",      // rank 3
  ...                       // all 10 items
]
```

### Key Insight: The Array IS the Ranking
- Array index = priority rank (index 0 = top priority)
- ALL items are always in the array -- no selection/deselection
- Position in the array conveys importance
- This is backward-compatible: the API already receives an array and joins it with commas; items listed first will naturally be weighted more heavily by Claude

### Migration for Existing Users
When `load()` reads a saved profile with a partial `S.issues` array (old format, only 3-7 items):
1. Keep selected items in their existing order (they become the top-ranked items)
2. Append all remaining ISSUES items (not in the saved list) in their default order after the selected ones
3. Same logic for `S.qualities`

This ensures existing users see their previous selections promoted to the top of the ranked list.

---

## 5. API Prompt Changes

### Current (pwa-guide.js)
```js
var issues = (profile.topIssues || []).join(", ");
// Produces: "Housing, Taxes, Education"
```

### New
```js
var issues = (profile.topIssues || []).map(function(item, i) {
  return (i + 1) + ". " + item;
}).join(", ");
// Produces: "1. Housing, 2. Education, 3. Economy & Cost of Living, 4. Taxes, ..."
```

Or, to avoid overwhelming the prompt with 17 ranked items, consider a tiered approach:
```js
var top = profile.topIssues.slice(0, 5);
var rest = profile.topIssues.slice(5);
var issueStr = "Top priorities (ranked): " + top.join(", ") +
  (rest.length ? ". Also cares about: " + rest.join(", ") : "");
```

The same pattern applies to qualities. This gives Claude clear priority signal without changing the API contract shape.

### Deep Dives
Currently, deep-dive questions are generated for every issue the user selected (line ~2102-2103):
```js
for(var i=0;i<S.issues.length;i++){
  if(DEEP_DIVES[S.issues[i]]) S.ddQuestions.push(DEEP_DIVES[S.issues[i]])
}
```

With all 17 issues in `S.issues`, this would generate deep dives for every issue that has one defined, which is too many. Change to only generate deep dives for the top N (e.g., top 5):
```js
var topN = S.issues.slice(0, 5);
for(var i=0;i<topN.length;i++){
  if(DEEP_DIVES[topN[i]]) S.ddQuestions.push(DEEP_DIVES[topN[i]])
}
```

---

## 6. Implementation Steps

### Step 1: Add CSS for Sortable List (~20 lines)
Add new CSS rules to the style array (around line 166-176):
```css
.sort-list { list-style:none; padding:0; margin:0 }
.sort-item {
  display:flex; align-items:center; gap:8px;
  padding:10px 12px; margin-bottom:4px;
  border-radius:var(--rs); border:1.5px solid var(--border2);
  background:var(--fill3); font-size:15px;
  user-select:none; touch-action:none;
  position:relative; transition:transform 0.2s ease;
}
.sort-item.dragging {
  box-shadow:0 4px 16px rgba(0,0,0,.18);
  z-index:10; opacity:0.95;
  transition:none;
}
.sort-item .rank {
  min-width:24px; height:24px; border-radius:50%;
  background:var(--blue); color:#fff; font-size:13px;
  font-weight:700; display:flex; align-items:center;
  justify-content:center; flex-shrink:0;
}
.sort-item .drag-handle {
  cursor:grab; padding:4px; color:var(--text2); flex-shrink:0;
}
.sort-item .sort-arrows {
  margin-left:auto; display:flex; gap:2px; flex-shrink:0;
}
.sort-item .sort-arrows button {
  width:36px; height:36px; border:none; background:none;
  color:var(--text2); font-size:18px; cursor:pointer;
  border-radius:6px; display:flex; align-items:center;
  justify-content:center;
}
.sort-item .sort-arrows button:active { background:var(--border) }
```

### Step 2: Write the Drag Engine (~60 lines of JS)
Add a reusable `initSortable(containerId, stateKey)` function:

```
function initSortable(containerId, stateKey) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var dragItem = null;
  var startY = 0;
  var startIndex = 0;
  var itemHeight = 0;
  var items = [];

  function onStart(e) {
    // Only start from drag handle
    var handle = e.target.closest('.drag-handle');
    if (!handle) return;
    e.preventDefault();
    dragItem = handle.closest('.sort-item');
    items = Array.from(container.children);
    startIndex = items.indexOf(dragItem);
    itemHeight = dragItem.offsetHeight + 4; // including margin
    startY = (e.touches ? e.touches[0].clientY : e.clientY);
    dragItem.classList.add('dragging');
    document.body.style.overflow = 'hidden';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, {passive: false});
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
  }

  function onMove(e) {
    if (!dragItem) return;
    e.preventDefault();
    var y = (e.touches ? e.touches[0].clientY : e.clientY);
    var dy = y - startY;
    dragItem.style.transform = 'translateY(' + dy + 'px)';
    // Shift other items
    var currentIndex = startIndex + Math.round(dy / itemHeight);
    currentIndex = Math.max(0, Math.min(items.length - 1, currentIndex));
    items.forEach(function(item, i) {
      if (item === dragItem) return;
      if (i >= Math.min(startIndex, currentIndex) &&
          i <= Math.max(startIndex, currentIndex)) {
        var shift = (currentIndex > startIndex) ? -itemHeight : itemHeight;
        item.style.transform = 'translateY(' + shift + 'px)';
      } else {
        item.style.transform = '';
      }
    });
  }

  function onEnd(e) {
    if (!dragItem) return;
    var y = (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);
    var dy = y - startY;
    var newIndex = startIndex + Math.round(dy / itemHeight);
    newIndex = Math.max(0, Math.min(items.length - 1, newIndex));
    // Update state array
    var arr = S[stateKey];
    var moved = arr.splice(startIndex, 1)[0];
    arr.splice(newIndex, 0, moved);
    // Cleanup
    dragItem.classList.remove('dragging');
    dragItem.style.transform = '';
    items.forEach(function(item) { item.style.transform = ''; });
    document.body.style.overflow = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchend', onEnd);
    dragItem = null;
    render();
  }

  container.addEventListener('mousedown', onStart);
  container.addEventListener('touchstart', onStart, {passive: false});
}
```

### Step 3: Replace `renderIssues()` (~25 lines)
Replace the chip-grid rendering with a sortable list:

```
function renderIssues() {
  // On first visit, initialize S.issues with all items in shuffled order
  if (S.issues.length < ISSUES.length) {
    var existing = S.issues.slice();
    var rest = shuffle(ISSUES.filter(function(x) {
      return existing.indexOf(x.v) === -1;
    })).map(function(x) { return x.v; });
    S.issues = existing.concat(rest);
  }
  var h = '<div class="phase-header">'
    + '<h2>' + t('Rank your issues by priority') + '</h2>'
    + '<p>' + t('Drag to reorder, or use arrows. #1 = most important.') + '</p>'
    + '</div>';
  h += '<div id="sort-issues" class="sort-list">';
  for (var i = 0; i < S.issues.length; i++) {
    var issue = ISSUES.find(function(x) { return x.v === S.issues[i]; });
    var icon = issue ? issue.icon : '';
    h += '<div class="sort-item" data-index="' + i + '">'
      + '<span class="drag-handle">&#9776;</span>'
      + '<span class="rank">' + (i + 1) + '</span>'
      + '<span>' + icon + ' ' + t(S.issues[i]) + '</span>'
      + '<span class="sort-arrows">'
      + '<button data-action="sort-up" data-key="issues" data-index="' + i + '"'
      + (i === 0 ? ' disabled' : '') + '>&#9650;</button>'
      + '<button data-action="sort-down" data-key="issues" data-index="' + i + '"'
      + (i === S.issues.length - 1 ? ' disabled' : '') + '>&#9660;</button>'
      + '</span></div>';
  }
  h += '</div>';
  h += '<button class="btn btn-primary mt-md" data-action="next">'
    + t('Continue') + '</button>';
  return h;
}
```

### Step 4: Replace `renderQualities()` (~25 lines)
Same pattern as issues but with `S.qualities`, `QUALITIES`, and `QUAL_ICONS`.

### Step 5: Add Action Handlers for Arrow Buttons (~10 lines)
In the event delegation block (around line ~2108):

```
else if (action === 'sort-up') {
  var key = el.dataset.key;
  var idx = parseInt(el.dataset.index);
  if (idx > 0) {
    var tmp = S[key][idx - 1];
    S[key][idx - 1] = S[key][idx];
    S[key][idx] = tmp;
    render();
  }
}
else if (action === 'sort-down') {
  var key = el.dataset.key;
  var idx = parseInt(el.dataset.index);
  if (idx < S[key].length - 1) {
    var tmp = S[key][idx + 1];
    S[key][idx + 1] = S[key][idx];
    S[key][idx] = tmp;
    render();
  }
}
```

### Step 6: Initialize Drag Engine After Render (~5 lines)
After `render()` updates the DOM, call `initSortable`:

```
// At end of render() function, after innerHTML is set:
if (S.phase === 2) initSortable('sort-issues', 'issues');
if (S.phase === 5) initSortable('sort-qualities', 'qualities');
```

### Step 7: Update Deep Dive Logic (~3 lines)
Change line ~2102-2103 to only use top 5 issues:
```
var topIssues = S.issues.slice(0, 5);
for (var i = 0; i < topIssues.length; i++) {
  if (DEEP_DIVES[topIssues[i]]) S.ddQuestions.push(DEEP_DIVES[topIssues[i]]);
}
```

### Step 8: Update API Prompt Format (~8 lines in pwa-guide.js)
Change `pwa-guide.js` lines 111-112 and 269-270:
```js
var issues = (profile.topIssues || []).slice(0, 7).map(function(item, i) {
  return (i + 1) + ". " + item;
}).join(", ");
var otherIssues = (profile.topIssues || []).slice(7);
var issueStr = issues + (otherIssues.length
  ? " (also: " + otherIssues.join(", ") + ")" : "");
```

### Step 9: Update Profile Review Display (~5 lines)
Change the profile display (lines ~1826-1830) to show ranked list instead of unordered chips:
```
h += '<div class="profile-section"><h3>' + t('Issues (by priority)') + '</h3>';
h += '<ol style="margin:0;padding-left:24px">';
for (var i = 0; i < S.issues.length; i++) {
  var issue = ISSUES.find(function(x) { return x.v === S.issues[i]; });
  h += '<li style="font-size:15px;margin-bottom:4px">'
    + (issue ? issue.icon + ' ' : '') + t(S.issues[i]) + '</li>';
}
h += '</ol></div>';
```

### Step 10: Handle Backward Compatibility in `load()` (~8 lines)
In the `load()` function (line ~1204), after restoring `S.issues` and `S.qualities`, pad them with missing items:
```
// After: S.issues = p.topIssues || [];
var allIssueVals = ISSUES.map(function(x) { return x.v; });
if (S.issues.length < allIssueVals.length) {
  var missing = allIssueVals.filter(function(v) {
    return S.issues.indexOf(v) === -1;
  });
  S.issues = S.issues.concat(missing);
}
// Same for S.qualities
```

### Step 11: Remove Old Toggle Handlers (~4 lines)
Remove or disable the `toggle-issue` and `toggle-quality` action handlers (lines ~2108-2111 and ~2124-2127) since they are no longer needed.

### Step 12: Remove Shuffle Variables (~2 lines)
`shuffledIssues` and `shuffledQualities` are no longer needed since the list order is now the user's ranking. Remove their declarations and the conditional shuffle calls.

---

## 7. Mobile Considerations

### Touch Target Size
- Each row is at least 48px tall (44px minimum recommended by Apple/Google)
- Arrow buttons are 36x36px with padding, totaling ~44px touch target
- Drag handle is a wide hamburger icon, easy to grab

### Scroll vs. Drag Conflict
- `touch-action: none` on `.sort-item` prevents browser scroll when touching a row
- `document.body.style.overflow = 'hidden'` during active drag prevents page scroll
- The drag handle is the only drag-initiation zone -- touching the label area does NOT start a drag, so accidental drags while scrolling are avoided
- After drag ends, scroll is re-enabled

### Long Lists (17 Issues)
- 17 items x ~56px = ~952px total list height -- will require scrolling on most phones
- The list itself scrolls normally (only the drag handle initiates drag)
- Consider adding a visual hint: subtle pulsing animation on the drag handle for first-time users
- Top items are visible immediately; users only need to drag items up from below if they care about them

### Performance
- `transform: translateY()` is GPU-accelerated, no layout thrashing
- `will-change: transform` hints to the browser to prepare for animations
- The `onMove` handler only sets `transform` -- no DOM reordering until `onEnd`
- `render()` is only called once at the end of a drag operation

### Haptic Feedback (Enhancement)
- If `navigator.vibrate` is available, a brief `navigator.vibrate(10)` on drag start gives tactile confirmation
- Not required but nice on Android devices

---

## 8. Accessibility

### Keyboard Support
- Arrow buttons provide full reorder capability without any drag interaction
- Buttons have proper `disabled` state at list boundaries
- Tab order flows naturally through the list

### Screen Readers
- Each row should include `role="listitem"` and `aria-label` with rank and item name
- Arrow buttons should have `aria-label="Move up"` / `aria-label="Move down"`
- After a move, an `aria-live="polite"` region can announce the new position

### WCAG 2.5.7 Compliance
- Dragging movements have a single-pointer alternative (the up/down arrow buttons)
- Users never need to drag to complete the flow

---

## 9. Estimated Effort

| Step | Description | Lines Changed | Effort |
|------|-------------|--------------|--------|
| 1 | CSS for sortable list | ~20 new | 15 min |
| 2 | Drag engine function | ~60 new | 45 min |
| 3 | Replace `renderIssues()` | ~25 replace | 20 min |
| 4 | Replace `renderQualities()` | ~25 replace | 15 min |
| 5 | Arrow button handlers | ~15 new | 10 min |
| 6 | Init drag after render | ~5 new | 5 min |
| 7 | Deep dive top-N limit | ~3 change | 5 min |
| 8 | API prompt format | ~8 change | 10 min |
| 9 | Profile review display | ~10 change | 10 min |
| 10 | Backward compat in load() | ~10 new | 10 min |
| 11 | Remove old handlers | ~4 delete | 5 min |
| 12 | Remove shuffle vars | ~2 delete | 2 min |
| **Testing** | Mobile + desktop + edge cases | -- | 30 min |
| **Total** | | ~190 lines | **~3 hours** |

### Testing Checklist
- [ ] Drag reorder works on iOS Safari
- [ ] Drag reorder works on Android Chrome
- [ ] Drag reorder works on desktop Chrome/Firefox/Safari with mouse
- [ ] Arrow buttons move items up/down correctly
- [ ] 17-item issue list scrolls properly on small screens
- [ ] Dragging does not interfere with page scroll
- [ ] Existing saved profiles load correctly (migration)
- [ ] Deep dives only trigger for top 5 ranked issues
- [ ] API receives ranked list and Claude prompt reflects priority order
- [ ] Profile review page shows ranked order
- [ ] `render()` cycle does not leak event listeners (drag engine re-init is clean)

---

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 17 items is a lot to rank | Users may not bother reordering bottom items | That is fine -- the default shuffled order for items they do not move simply means "no strong opinion." Only top 5-7 matter for Claude. |
| Drag feels janky on older phones | Poor UX | The arrow buttons work as a complete fallback. CSS transitions are GPU-accelerated. |
| Scroll vs. drag conflict | Users accidentally drag when scrolling | Drag only initiates from the handle icon, not from anywhere on the row. |
| Breaking change for saved profiles | Existing users see weird state | Migration logic in `load()` pads partial arrays with remaining items, preserving their existing selections as top-ranked. |
| String array format makes JS hard to edit | Development friction | This is inherent to the architecture. Use Grep to find exact locations. Test with `npx wrangler dev`. |

---

## 11. Future Enhancements (add to todolist)

- **Animated transitions:** When an item is moved via arrow buttons, animate the swap with a brief slide transition.
- **Drag handle long-press:** Require a 150ms hold before drag activates, to further reduce accidental drags.
- **Partial ranking:** Allow users to mark some items as "Don't care" which drops them to an unranked bucket at the bottom.
