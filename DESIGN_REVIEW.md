# ATX Votes Design Review Checklist

Run quarterly or before major releases. Each section includes automated verification commands.

---

## 1. Force Unwraps

All `!` usage should be justified (constant strings, known-safe values) or replaced with safe alternatives.

```bash
# Find all force unwraps in Swift source (excluding tests)
rg '!\)|as!|try!' --glob '*.swift' --glob '!*Tests/*' --glob '!*.generated.*'
```

**Justified force unwraps:**
- `SampleData.swift` — static URL constants for known-valid strings (documented fallbacks)
- `VotingInfoView.swift` — static URL constants defined at file scope

---

## 2. Logging Hygiene

All logging should use `os.Logger` with subsystem `app.atxvotes` and appropriate category. No bare `print()` in production code.

```bash
# Find bare print() calls (should be zero in production code)
rg 'print\(' --glob '*.swift' --glob '!*Tests/*' --glob '!*Preview*'

# Verify all loggers use correct subsystem
rg 'Logger\(subsystem:' --glob '*.swift'
```

---

## 3. Accessibility

Every interactive element needs VoiceOver support. Section headers need `.isHeader` trait.

```bash
# Views with Button but no accessibilityLabel (potential gaps)
rg 'Button\(' --glob '*.swift' --glob '!*Tests/*' -l

# Check for .isHeader usage on section headings
rg 'isHeader' --glob '*.swift'

# Check for accessibilityLabel coverage
rg 'accessibilityLabel' --glob '*.swift' -c

# Check for accessibilityHidden on decorative images
rg 'accessibilityHidden' --glob '*.swift' -c

# Verify Reduce Motion is respected
rg 'accessibilityReduceMotion' --glob '*.swift'
```

---

## 4. Dynamic Type

Theme fonts should use semantic text styles (`.body`, `.headline`, etc.) for automatic scaling. Fixed-size fonts are acceptable for decorative elements only.

```bash
# Find fixed-size fonts (acceptable for icons/badges, flag body text)
rg 'Font\.system\(size:' --glob '*.swift' --glob '!*Tests/*' -c

# Verify Theme uses semantic text styles
rg 'Font\.system\(\.' AustinVotes/Theme.swift
```

---

## 5. Memory & Retain Cycles

Check for missing `[weak self]` in closures that capture `self`.

```bash
# Task closures (should use [weak self] if capturing self in long-lived tasks)
rg 'Task \{|Task\.detached|\.task \{' --glob '*.swift' --glob '!*Tests/*'

# Check for weak self usage
rg '\[weak self\]' --glob '*.swift'

# DispatchQueue closures
rg 'DispatchQueue\.' --glob '*.swift' --glob '!*Tests/*'
```

---

## 6. Error Handling

Errors should be surfaced to the user, not silently swallowed. Check for empty catch blocks.

```bash
# Find catch blocks (verify none are empty or just commenting)
rg 'catch \{' --glob '*.swift' --glob '!*Tests/*' -A 2

# Find try? usage (acceptable for decode/encode, flag others)
rg 'try\?' --glob '*.swift' --glob '!*Tests/*'
```

---

## 7. Service Architecture

Services should not be instantiated ad-hoc. Check for consistent dependency patterns.

```bash
# Find service instantiations (should be in Store or DI container, not in Views)
rg 'ClaudeService\(\)|DistrictLookupService\(\)' --glob '*.swift' --glob '!*Tests/*'
```

---

## 8. Hardcoded Strings

Election-specific data should live in JSON files or constants, not scattered through views.

```bash
# Find hardcoded dates
rg '2026|March 3|Feb 17|Feb 27' --glob '*.swift' --glob '!*Tests/*' --glob '!*SampleData*'

# Find hardcoded URLs
rg 'URL\(string:' --glob '*.swift' --glob '!*Tests/*'
```

---

## 9. Build Verification

```bash
# iOS build
xcodebuild build -scheme AustinVotes -destination 'platform=iOS Simulator,name=iPhone 16,OS=18.4' -quiet

# Run tests
xcodebuild test -scheme AustinVotes -destination 'platform=iOS Simulator,name=iPhone 16,OS=18.4' -quiet
```

---

## Review History

| Date | Reviewer | Notes |
|------|----------|-------|
| 2026-02-19 | Initial | Created checklist based on Canary app patterns |
