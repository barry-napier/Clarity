---
status: pending
priority: p2
issue_id: "044"
tags: [code-review, performance, phase-4-checkins, sync]
dependencies: []
---

# Duplicate Sync Queue Entries Per State Transition

## Problem Statement

Each check-in CRUD operation directly adds to sync queue instead of using the `enqueueSync` function which has deduplication logic. A typical check-in flow creates 8+ sync queue entries when one would suffice.

## Findings

**Location:** `src/lib/checkins.ts`

```typescript
// Bypasses deduplication - direct db.syncQueue.add
await db.syncQueue.add({
  entityType: 'checkin',
  entityId: checkinId,
  operation: 'update',
  createdAt: now,
  retryCount: 0,
});
```

vs existing utility in `src/lib/sync/queue.ts`:

```typescript
export async function enqueueSync(...) {
  const existing = await db.syncQueue.where('entityId').equals(entityId).first();
  if (existing) { /* dedupe logic */ }
}
```

**Impact:**
- 8+ sync queue entries per check-in instead of 1
- Redundant API calls to Google Drive
- Sync queue bloat
- Battery drain on mobile

## Proposed Solutions

### Option 1: Use enqueueSync (Recommended)
Replace direct db.syncQueue.add with existing utility.

```typescript
import { enqueueSync } from './sync/queue';
// ...
await enqueueSync('checkin', checkinId, 'update');
```

**Pros:** Uses existing code, automatic deduplication
**Cons:** Minor refactor
**Effort:** Low
**Risk:** Low

### Option 2: Batch Sync on Completion Only
Only add to sync queue when check-in is completed.

**Pros:** Minimal queue entries
**Cons:** Intermediate state not synced
**Effort:** Low
**Risk:** Medium (data loss on crash)

## Recommended Action

Option 1 - Use the existing `enqueueSync` utility.

## Technical Details

**Affected files:**
- `src/lib/checkins.ts` (multiple locations)
- Similar pattern should be checked in `src/lib/chats.ts`

## Acceptance Criteria

- [ ] All sync queue additions use enqueueSync utility
- [ ] Sync queue has proper deduplication
- [ ] Single check-in flow produces minimal queue entries
- [ ] Sync still works correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #7 performance/data integrity review | Use existing utilities instead of duplicating logic |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
