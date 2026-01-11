---
status: pending
priority: p1
issue_id: "036"
tags: [code-review, data-integrity, phase-4-checkins]
dependencies: []
---

# Check-in Messages Not Persisted for Resume

## Problem Statement

The check-in state machine persists the `stage` to the database, but does NOT persist the chat messages. If a user starts a check-in, answers questions, then closes the app and reopens to resume, the `stage` will be correct but the `messages` array will be empty, showing no conversation history.

## Findings

**Location:** `src/lib/ai/use-checkin-chat.ts`

```typescript
// Line 79 - messages start empty
const [messages, setMessages] = useState<Message[]>(initialMessages);

// Stage is persisted (line 130)
await updateCheckinStage(checkinId, nextStage);

// But messages are never persisted to the database
```

**Impact:**
- Partial data loss on app restart
- Broken resume experience - user sees no conversation context
- Memory extraction may receive empty transcript if resumed and completed
- Poor user experience

## Proposed Solutions

### Option 1: Persist Messages to Checkin Entity (Recommended)
Add a `messages` field to the Checkin schema and persist after each exchange.

**Pros:** Simple, consistent with data model, enables resume
**Cons:** Schema change, additional DB writes
**Effort:** Medium
**Risk:** Low

### Option 2: Store Messages in CheckinEntry
Extend CheckinEntry to include the full conversation exchange for that question.

**Pros:** More granular, aligns with entry-based model
**Cons:** More complex data structure
**Effort:** Medium
**Risk:** Low

### Option 3: Reconstruct from Entries
Generate resumable state from existing `entries` array on mount.

**Pros:** No schema change, entries already persist
**Cons:** Can't reproduce exact AI responses, only user answers
**Effort:** Low
**Risk:** Medium (degraded experience)

## Recommended Action

Option 1 - Add messages field to Checkin schema for full conversation persistence.

## Technical Details

**Affected files:**
- `src/lib/db/schema.ts` - Add messages field to Checkin interface
- `src/lib/ai/use-checkin-chat.ts` - Persist messages after updates
- `src/lib/checkins.ts` - Add updateCheckinMessages function
- `src/components/checkin/checkin-view.tsx` - Pass initialMessages from checkin

**Schema change:**
```typescript
export interface Checkin extends Syncable {
  // ... existing fields
  messages?: Array<{ role: string; content: string }>;
}
```

## Acceptance Criteria

- [ ] Messages are persisted to database after each exchange
- [ ] Resuming a check-in shows previous conversation
- [ ] Memory extraction receives full transcript on completion
- [ ] DB migration handles existing checkins gracefully

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #7 architecture review | State machine state != full conversation state |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
