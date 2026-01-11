---
status: pending
priority: p2
issue_id: "049"
tags: [code-review, patterns, phase-4-checkins, duplication]
dependencies: []
---

# Duplicate getTodayDate() Utility Defined Three Times

## Problem Statement

The same `getTodayDate()` utility function is defined identically in three files, violating DRY principles.

## Findings

**Locations:**
- `src/lib/captures.ts:6-8`
- `src/lib/chats.ts:8-10`
- `src/lib/checkins.ts:6-8`

```typescript
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}
```

**Impact:**
- Code duplication
- Potential for drift if changed in one place
- Harder to add features (e.g., timezone handling)

## Proposed Solutions

### Option 1: Extract to date-utils.ts (Recommended)
Create shared utility module.

```typescript
// src/lib/date-utils.ts
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}
```

**Pros:** Single source of truth, easy to enhance
**Cons:** Minor refactor
**Effort:** Low
**Risk:** Low

## Recommended Action

Option 1 - Extract to shared utility.

## Technical Details

**Affected files:**
- Create: `src/lib/date-utils.ts`
- Update: `src/lib/captures.ts`
- Update: `src/lib/chats.ts`
- Update: `src/lib/checkins.ts`

## Acceptance Criteria

- [ ] Single getTodayDate definition
- [ ] All usages import from shared module
- [ ] Build passes
- [ ] Tests still pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #7 patterns review | Extract common utilities to shared modules |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
