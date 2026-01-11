---
status: pending
priority: p1
issue_id: "053"
tags: [code-review, playwright-test, phase-4-checkins, bug]
dependencies: ["037"]
---

# Check-in Card Stuck in Loading State

## Problem Statement

The Daily Check-in card on the /today page is permanently stuck in a loading state (showing animated skeleton). The `useTodayCheckin()` hook never resolves, preventing users from starting a check-in.

## Findings

**Location:** `src/components/checkin/checkin-card.tsx` and `src/lib/db/hooks.ts`

**Observed Behavior:**
- Card shows "Daily Check-in" heading with animated loading skeleton
- "Start check-in" button never appears
- Hook remains in undefined (loading) state indefinitely
- No console errors visible

**Expected Behavior:**
- Card should show "Take a moment to reflect on your day" text
- "Start check-in" button should be visible and clickable

**Discovery:** Found during Playwright browser testing of PR #7

**Likely Root Cause:**
This is likely related to issue #037 (schema migration v2→v3). The `useLiveQuery` hook in `useTodayCheckin()` may be failing silently due to schema mismatch or the query returning unexpected data format.

```typescript
// src/lib/db/hooks.ts
export function useTodayCheckin() {
  const today = new Date().toISOString().split('T')[0];
  return useLiveQuery(
    () => db.checkins.where('date').equals(today).first(),
    []
  );
}
```

## Proposed Solutions

### Option 1: Fix Schema Migration First
Resolve issue #037 to ensure database schema is correct.

**Pros:** Addresses root cause
**Cons:** Requires migration implementation
**Effort:** Medium
**Risk:** Low

### Option 2: Add Error Boundary and Fallback
Wrap the hook with error handling to show fallback UI.

**Pros:** Better UX while debugging
**Cons:** Masks underlying issue
**Effort:** Low
**Risk:** Low

## Recommended Action

Fix #037 first, then verify this issue is resolved.

## Technical Details

**Affected files:**
- `src/lib/db/hooks.ts`
- `src/components/checkin/checkin-card.tsx`
- `src/lib/db/schema.ts` (root cause)

## Acceptance Criteria

- [ ] Check-in card loads within 1 second
- [ ] "Start check-in" button is visible and clickable
- [ ] Clicking button navigates to /today/checkin
- [ ] Check-in flow can be completed

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Discovered during Playwright testing | Hook stuck loading, likely schema issue |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
- Related: #037 (schema migration)
