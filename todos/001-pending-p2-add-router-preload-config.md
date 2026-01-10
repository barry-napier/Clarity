---
status: pending
priority: p2
issue_id: "001"
tags: [code-review, performance, router]
dependencies: []
---

# Add Router Preload Configuration

## Problem Statement

The router configuration in `src/router.tsx` lacks `defaultPreload` setting. Without it, route prefetching defaults to `false`, missing an opportunity for near-instant navigation UX.

## Findings

**Source:** Performance Oracle Agent Review of PR #1

**Location:** `/Users/bnapier/projects/clarity/src/router.tsx:4-9`

```typescript
export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    // Missing: defaultPreload: 'intent'
  })
}
```

**Impact:** Users will experience slight navigation delays that could be eliminated with hover/focus prefetching.

## Proposed Solutions

### Option A: Add intent-based preloading (Recommended)

```typescript
export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',  // Prefetch on hover/focus
  })
}
```

- **Pros:** Near-instant navigation, minimal implementation
- **Cons:** None
- **Effort:** Small (one line)
- **Risk:** None

### Option B: Add viewport-based preloading

```typescript
defaultPreload: 'viewport'  // Prefetch all visible links
```

- **Pros:** Even faster for visible links
- **Cons:** Higher bandwidth usage
- **Effort:** Small
- **Risk:** Low - may prefetch unnecessary routes

## Recommended Action

Implement Option A in a future PR when adding more routes.

## Technical Details

- **Affected Files:** `src/router.tsx`
- **Components:** Router configuration
- **Database Changes:** None

## Acceptance Criteria

- [ ] `defaultPreload: 'intent'` added to router config
- [ ] Navigation feels instant on hover/focus
- [ ] No regression in initial page load

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #1 review | Performance consideration for TanStack Router |

## Resources

- [PR #1](https://github.com/barry-napier/Clarity/pull/1)
- [TanStack Router Preloading Docs](https://tanstack.com/router/latest/docs/framework/react/guide/preloading)
