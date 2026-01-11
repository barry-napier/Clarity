---
status: completed
priority: p1
issue_id: "038"
tags: [code-review, data-integrity, phase-4-checkins, concurrency]
dependencies: []
---

# Race Condition in addCheckinEntry - Lost Updates

## Problem Statement

The `addCheckinEntry` function has a read-modify-write pattern without transaction protection. If two rapid message responses occur, the second update may overwrite the first entry because it read stale `checkin.entries`.

## Findings

**Location:** `src/lib/checkins.ts` (lines 91-116)

```typescript
export async function addCheckinEntry(
  checkinId: string,
  entry: CheckinEntry
): Promise<void> {
  const now = Date.now();
  const checkin = await db.checkins.get(checkinId);  // READ

  if (!checkin) {
    throw new Error(`Checkin ${checkinId} not found`);
  }

  await db.checkins.update(checkinId, {              // WRITE
    entries: [...checkin.entries, entry],            // Using stale data
    // ...
  });
}
```

**Corruption Scenario:**
1. User answers energy question → `addCheckinEntry(id, energyEntry)` reads entries=[]
2. Before write completes, user quickly answers wins → `addCheckinEntry(id, winsEntry)` reads entries=[]
3. First write: entries=[energyEntry]
4. Second write: entries=[winsEntry] (overwrites, energyEntry LOST)

## Proposed Solutions

### Option 1: Dexie Transaction with Modify (Recommended)
Use atomic modify operation within a transaction.

```typescript
await db.transaction('rw', db.checkins, async () => {
  await db.checkins.where('id').equals(checkinId).modify(checkin => {
    checkin.entries.push(entry);
    checkin.updatedAt = now;
    checkin.syncStatus = 'pending';
  });
});
```

**Pros:** Atomic, prevents race condition, idiomatic Dexie
**Cons:** Slightly more complex syntax
**Effort:** Low
**Risk:** Low

### Option 2: Optimistic Locking
Add version field and check before update.

**Pros:** Explicit conflict detection
**Cons:** More complex, need retry logic
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option 1 - Use Dexie transaction with modify for atomic updates.

## Technical Details

**Affected files:**
- `src/lib/checkins.ts`

**Similar issue in:**
- `updateCheckinStage` (line 121)
- `completeCheckin` (line 146)
- `skipCheckin` (line 170)

All these should also use transactions.

## Acceptance Criteria

- [ ] addCheckinEntry uses atomic modify operation
- [ ] No entry loss possible under rapid submissions
- [ ] Other checkin update functions also use transactions
- [ ] Sync queue operations wrapped in same transaction

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #7 data integrity review | Read-modify-write without transactions is a classic race condition |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
- Dexie Transactions: https://dexie.org/docs/Dexie/Dexie.transaction()
