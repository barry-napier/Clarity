---
status: pending
priority: p2
issue_id: "007"
tags: [code-review, performance, fonts, lcp]
dependencies: []
---

# Add Font Preloading for Inter

## Problem Statement

The Inter font is loaded from Google Fonts via a stylesheet link, but there's no preloading of the font files themselves. This can add 100-200ms to First Contentful Paint (FCP) and Largest Contentful Paint (LCP) on initial page load.

## Findings

**Source:** Performance Oracle Agent Review of PR #2

**Location:** `/Users/bnapier/projects/clarity/src/routes/__root.tsx:18-29`

```typescript
links: [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
  },
],
```

**Current behavior:**
1. Browser fetches HTML
2. Browser fetches Google Fonts CSS (render-blocking)
3. Browser parses CSS, discovers font files
4. Browser fetches font files
5. Text renders with Inter

**Network latency:** 50-200ms per request, compounded

## Proposed Solutions

### Option A: Add font preloading (Recommended for now)

**Pros:**
- Quick to implement
- Reduces LCP by 100-200ms
- Keeps Google Fonts CDN benefits

**Cons:**
- Still dependent on external CDN
- Font URLs may change (rare)

**Effort:** Small
**Risk:** Low

```typescript
links: [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  // Preload the most critical weight (400 for body text)
  {
    rel: 'preload',
    href: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50.woff2',
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
  },
],
```

### Option B: Self-host Inter font

**Pros:**
- No external dependency
- Full control over caching
- Privacy benefit (no Google tracking)
- Works offline (for Capacitor)

**Cons:**
- More setup
- Need to bundle font files

**Effort:** Medium
**Risk:** Low

```bash
npm install @fontsource/inter
```

Then import in root:
```typescript
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
```

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `src/routes/__root.tsx`

**Performance impact:**
- Current: Font loads at ~300-500ms
- With preload: Font loads at ~100-200ms
- Self-hosted: Font loads at ~50-100ms

## Acceptance Criteria

- [ ] Inter font loads without visible FOUT (Flash of Unstyled Text)
- [ ] LCP < 2.5s on 3G connection
- [ ] Font weights 400, 500, 600 all load correctly
- [ ] Lighthouse performance score maintained or improved

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #2 review | Font loading is critical path for LCP |

## Resources

- PR #2: https://github.com/barry-napier/Clarity/pull/2
- Web.dev font loading: https://web.dev/articles/optimize-webfont-loading
- @fontsource/inter: https://fontsource.org/fonts/inter
