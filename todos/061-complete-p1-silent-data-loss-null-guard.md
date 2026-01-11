---
status: complete
priority: p1
issue_id: "061"
tags: [code-review, pr-9, data-integrity, checkin]
dependencies: []
---

# Silent Data Loss on Undefined nextQuestion

## Problem Statement

When `nextQuestion` is undefined, the function returns early **after** the user's entry has already been persisted to the database. This creates an inconsistent state where the entry is saved but the stage is not updated, causing duplicate entries on resume.

**This is a P1 blocker** because it can corrupt user data.

## Findings

**Location:** `src/lib/ai/use-checkin-chat.ts:194-257`

**Issue Flow:**
1. User answers question (e.g., energy)
2. Line 202: `addCheckinEntry(checkinId, entry)` - Entry persisted to DB
3. Line 252-257: Null guard fires if `nextQuestion` is undefined
4. Function returns early - stage NOT updated, messages NOT persisted
5. User refreshes/resumes
6. System asks same question again (stage unchanged)
7. User answers again
8. **Result:** Two entries of same type in database

**Current Code (problematic order):**
```typescript
// Line 194-202: Entry is persisted FIRST
const entryType = isStageWithEntry(stage) ? STAGE_TO_TYPE[stage] : null;
if (entryType) {
  const entry: CheckinEntry = {...};
  await addCheckinEntry(checkinId, entry);  // <-- DB write happens here
}

// Line 206: Determine next stage
const nextStage = NEXT_STAGE[stage];

// Lines 252-257: Null guard fires AFTER entry is persisted
const nextQuestion = stageQuestionsRef.current[nextStage as StageWithEntry];
if (!nextQuestion) {
  console.error(`No question defined for stage: ${nextStage}`);
  return;  // <-- Entry already saved, but stage not updated
}
```

**Discovery:** Data integrity analysis by data-integrity-guardian agent

## Proposed Solutions

### Option 1: Move Null Guard Before Entry Persistence (Recommended)

Validate `nextQuestion` exists before persisting any data.

```typescript
// Early validation - BEFORE any DB writes
const nextStage = NEXT_STAGE[stage];
if (nextStage !== 'complete') {
  const nextQuestion = stageQuestionsRef.current[nextStage as StageWithEntry];
  if (!nextQuestion) {
    console.error(`No question defined for stage: ${nextStage}`);
    hapticError();
    setError(new Error('Check-in configuration error. Please try again.'));
    return;  // Return BEFORE any data is written
  }
}

// Now safe to persist entry
const entryType = isStageWithEntry(stage) ? STAGE_TO_TYPE[stage] : null;
if (entryType) {
  const entry: CheckinEntry = {...};
  await addCheckinEntry(checkinId, entry);
}
```

**Pros:** Prevents data corruption, clear error handling
**Cons:** Changes code structure
**Effort:** Small
**Risk:** Low

### Option 2: Transactional Rollback

Wrap entry + stage update in a transaction and rollback on failure.

```typescript
try {
  await db.transaction('rw', [db.checkins], async () => {
    await addCheckinEntry(checkinId, entry);
    // ... streaming logic
    await updateCheckinStage(checkinId, nextStage);
    await updateCheckinMessages(checkinId, finalMessages);
  });
} catch (err) {
  // Transaction rolled back automatically
}
```

**Pros:** Atomic operations, no partial state
**Cons:** Requires significant refactoring, transaction spans async streaming
**Effort:** Large
**Risk:** Medium (streaming inside transaction is complex)

## Recommended Action

Option 1 - Move the validation before any data persistence. This is the minimal fix that prevents the data corruption scenario.

## Technical Details

**Affected files:**
- `src/lib/ai/use-checkin-chat.ts`

**Data Flow:**
- User input → addCheckinEntry (DB) → stage transition → messages update (DB)
- Currently: Validation happens between entry write and stage write
- Fix: Validation must happen before entry write

## Acceptance Criteria

- [ ] Null guard for `nextQuestion` executes before `addCheckinEntry()`
- [ ] If guard fails, no data is written to database
- [ ] User sees error message if check-in configuration is invalid
- [ ] No duplicate entries possible from this code path

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #9 code review | Entry persisted before validation causes data corruption |

## Resources

- PR #9: https://github.com/barry-napier/clarity/pull/9
- Related: #057 (completed) - Added the null guard but after entry persistence
