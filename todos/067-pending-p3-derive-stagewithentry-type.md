---
status: pending
priority: p3
issue_id: "067"
tags: [code-review, pr-9, typescript, code-quality]
dependencies: []
---

# Derive StageWithEntry Type from CheckinStage

## Problem Statement

`StageWithEntry` is manually defined as a string literal union rather than being derived from the schema's `CheckinStage` type. If `CheckinStage` changes, `StageWithEntry` must be manually updated, risking drift.

## Findings

**Location:** `src/lib/ai/use-checkin-chat.ts:24`

**Current Code:**
```typescript
type StageWithEntry = 'awaiting_energy' | 'awaiting_wins' | 'awaiting_friction' | 'awaiting_priority';
```

**Schema Definition (schema.ts:26-32):**
```typescript
export type CheckinStage = 'idle' | 'awaiting_energy' | 'awaiting_wins' |
                           'awaiting_friction' | 'awaiting_priority' | 'complete';
```

**Issue:** These types are manually synchronized. Adding a new stage to `CheckinStage` won't automatically update `StageWithEntry`.

## Proposed Solutions

### Option 1: Use Exclude Utility Type (Recommended)

```typescript
type StageWithEntry = Exclude<CheckinStage, 'idle' | 'complete'>;
```

**Pros:** Single source of truth, auto-updates when schema changes
**Cons:** Less explicit about what stages are included
**Effort:** Tiny
**Risk:** None

## Acceptance Criteria

- [ ] `StageWithEntry` derived using `Exclude<CheckinStage, 'idle' | 'complete'>`
- [ ] Type guard still works correctly

## Resources

- PR #9: https://github.com/barry-napier/clarity/pull/9
