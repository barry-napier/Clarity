---
status: complete
priority: p2
issue_id: "056"
tags: [code-review, pr-8, phase-4-checkins, typescript, type-safety]
dependencies: []
---

# Loose Record<string, ...> Types Lose Key Constraints

## Problem Statement

The check-in chat hook uses `Record<string, ...>` for stage mappings instead of constrained key types. This loses compile-time safety - the compiler can't catch typos in stage names or missing stage entries.

## Findings

**Location:** `src/lib/ai/use-checkin-chat.ts:24-29, 47`

**Current Code:**
```typescript
// Line 24-29
const STAGE_TO_TYPE: Record<string, CheckinEntry['type']> = {
  awaiting_energy: 'energy',
  awaiting_wins: 'wins',
  awaiting_friction: 'friction',
  awaiting_priority: 'priority',
};

// Line 47
function getStageQuestions(timeOfDay: 'morning' | 'evening'): Record<string, string>
```

**Issue:** Using `Record<string, ...>` means:
- Typos in stage names won't be caught at compile time
- Missing stages won't trigger compiler errors
- IDE autocomplete won't suggest valid keys

**Discovery:** TypeScript review by kieran-typescript-reviewer agent

## Proposed Solutions

### Option 1: Create Constrained Type (Recommended)
Define a type for the stages that have questions/entries.

```typescript
type StageWithEntry = 'awaiting_energy' | 'awaiting_wins' | 'awaiting_friction' | 'awaiting_priority';

const STAGE_TO_TYPE: Record<StageWithEntry, CheckinEntry['type']> = {
  awaiting_energy: 'energy',
  awaiting_wins: 'wins',
  awaiting_friction: 'friction',
  awaiting_priority: 'priority',
};

function getStageQuestions(timeOfDay: 'morning' | 'evening'): Record<StageWithEntry, string> {
  // ...
}
```

**Pros:** Full type safety, IDE autocomplete, catches typos
**Cons:** Slightly more verbose
**Effort:** Small
**Risk:** None

### Option 2: Use satisfies operator
Use TypeScript 4.9+ `satisfies` to retain inference while checking shape.

**Pros:** Less type annotation needed
**Cons:** Doesn't constrain access patterns
**Effort:** Small
**Risk:** Low

## Recommended Action

Option 1 - Create constrained type alias. Small investment for significant safety improvement.

## Technical Details

**Affected files:**
- `src/lib/ai/use-checkin-chat.ts`

## Acceptance Criteria

- [ ] `STAGE_TO_TYPE` uses constrained key type
- [ ] `getStageQuestions` return type uses constrained key type
- [ ] TypeScript catches missing or misspelled stages at compile time
- [ ] No runtime behavior changes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #8 TypeScript review | Record<string> loses type safety |

## Resources

- PR #8: https://github.com/barry-napier/Clarity/pull/8
- TypeScript Record: https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type
