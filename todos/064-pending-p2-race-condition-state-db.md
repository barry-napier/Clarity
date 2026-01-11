---
status: pending
priority: p2
issue_id: "064"
tags: [code-review, pr-9, data-integrity, race-condition]
dependencies: []
---

# Race Condition Between State Update and Database Persistence

## Problem Statement

There is a temporal gap between React state updates and database persistence in `use-checkin-chat.ts`. If the user force-quits or loses connectivity between these operations, the state and database become inconsistent.

Additionally, `updateCheckinStage` and `updateCheckinMessages` are separate database transactions that can fail independently.

## Findings

**Location:** `src/lib/ai/use-checkin-chat.ts:306-310`

**Current Code:**
```typescript
// Update stage and persist messages
currentQuestionRef.current = nextQuestion;
setStage(nextStage);                              // React state
await updateCheckinStage(checkinId, nextStage);   // DB transaction 1
await updateCheckinMessages(checkinId, finalMessages);  // DB transaction 2
```

**Corruption Scenario 1 - Network Drop:**
1. User answers priority question
2. `setStage('complete')` - React state updated
3. `updateCheckinStage(id, 'complete')` succeeds
4. Network drops
5. `updateCheckinMessages(id, finalMessages)` fails
6. On resume: Stage is `complete` but messages missing final exchange

**Corruption Scenario 2 - Force Quit:**
1. `setStage(nextStage)` executes
2. User force-quits app
3. `updateCheckinStage` never called
4. On resume: Database has old stage, UI shows new stage

**Discovery:** Data integrity analysis by data-integrity-guardian agent

## Proposed Solutions

### Option 1: Combine into Single Transaction (Recommended)

Use Dexie transaction to make stage + messages atomic.

```typescript
// In checkins.ts
export async function updateCheckinStateAtomic(
  checkinId: string,
  stage: CheckinStage,
  messages: Message[]
): Promise<void> {
  await db.transaction('rw', db.checkins, async () => {
    const checkin = await db.checkins.get(checkinId);
    if (!checkin) throw new Error('Checkin not found');

    await db.checkins.update(checkinId, {
      stage,
      messages,
      syncStatus: 'pending',
      updatedAt: Date.now(),
    });
  });
}
```

**Pros:** Atomic operation, no partial state
**Cons:** New function, minor refactoring
**Effort:** Small
**Risk:** Low

### Option 2: Update State After DB Success

Only update React state after DB operations succeed.

```typescript
try {
  await updateCheckinStage(checkinId, nextStage);
  await updateCheckinMessages(checkinId, finalMessages);
  // Only update React state after DB success
  setStage(nextStage);
} catch (err) {
  // DB failed, state unchanged
  setError(err);
}
```

**Pros:** State always matches DB
**Cons:** Doesn't fix the two-transaction issue
**Effort:** Small
**Risk:** Low

## Recommended Action

Option 1 - Create atomic update function. This ensures stage and messages are always consistent.

## Technical Details

**Affected files:**
- `src/lib/ai/use-checkin-chat.ts`
- `src/lib/checkins.ts` (new function)

**Dexie Transaction:**
- Wraps multiple operations in single transaction
- Automatically rolls back on any failure
- IndexedDB guarantees atomicity

## Acceptance Criteria

- [ ] Stage and messages updated in single transaction
- [ ] Partial update not possible
- [ ] React state updated only after DB success
- [ ] Error handling preserves consistent state

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #9 data integrity review | Separate transactions can lead to inconsistent state |

## Resources

- PR #9: https://github.com/barry-napier/clarity/pull/9
- Dexie transactions: https://dexie.org/docs/Tutorial/Design#transactions
