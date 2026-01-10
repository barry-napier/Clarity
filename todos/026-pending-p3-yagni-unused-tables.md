---
status: pending
priority: p3
issue_id: "026"
tags: [code-review, simplicity, yagni]
dependencies: []
---

# Remove Unused Database Tables (YAGNI)

## Problem Statement

The database schema includes `Memory`, `Northstar`, and `Framework` tables that are not currently used by any feature. This violates the YAGNI (You Aren't Gonna Need It) principle and adds unnecessary complexity to the Phase 0 foundation.

## Findings

**Source:** Code Simplicity Reviewer Agent

**Location:** `/Users/bnapier/projects/clarity/src/lib/db/schema.ts:38-52, 66-69, 79-80`

```typescript
export interface Memory extends Syncable {
  key: 'main';
  content: string;
}

export interface Northstar extends Syncable {
  key: 'main';
  content: string;
}

export interface Framework extends Syncable {
  type: string;
  name: string;
  content: string;
}
```

**Impact:**
- Extra code to maintain
- More complex schema to understand
- Unused sync queue entity types
- ~18 lines of code that serves no current purpose

## Proposed Solutions

### Option A: Keep for Future Use (Current)

- **Pros:** Ready when needed
- **Cons:** Violates YAGNI, adds complexity
- **Effort:** None (status quo)
- **Risk:** Low

### Option B: Remove Unused Tables (Recommended)

Remove `Memory`, `Northstar`, and `Framework` interfaces and table definitions. Also update `SyncQueueItem.entityType` union.

- **Pros:** Simpler codebase, cleaner Phase 0
- **Cons:** Must add back later when needed
- **Effort:** Small
- **Risk:** None - Dexie migrations handle additions well

### Option C: Comment Out with TODO

Keep the code but commented out with a note explaining when to enable.

- **Pros:** Reference for future implementation
- **Cons:** Still clutters the file
- **Effort:** Small
- **Risk:** None

## Recommended Action

Consider Option B if strict YAGNI is preferred. Otherwise, keep for future phases since the overhead is minimal.

## Technical Details

- **Affected Files:**
  - `src/lib/db/schema.ts` (remove interfaces and table definitions)
  - `src/lib/db/hooks.ts` (remove `useMemory`, `useNorthstar`, `useFrameworks`)
  - `src/lib/sync/processor.ts` (update `getTable` mapping)
- **Components:** Database layer
- **Database Changes:** None (unused tables)

## Acceptance Criteria

- [ ] Unused tables removed from schema
- [ ] Unused hooks removed
- [ ] entityType union updated
- [ ] Build and typecheck pass

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #3 review | YAGNI keeps foundations simple |

## Resources

- [PR #3](https://github.com/barry-napier/Clarity/pull/3)
- [YAGNI Principle](https://martinfowler.com/bliki/Yagni.html)
