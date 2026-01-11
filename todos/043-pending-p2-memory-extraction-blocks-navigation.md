---
status: pending
priority: p2
issue_id: "043"
tags: [code-review, performance, phase-4-checkins]
dependencies: []
---

# Memory Extraction Blocks User Navigation

## Problem Statement

Memory extraction runs synchronously in the check-in completion callback, blocking navigation for 2-5 seconds while the AI call completes. If the AI call fails, the user experience is delayed without feedback.

## Findings

**Location:** `src/components/checkin/checkin-view.tsx` (lines 31-47)

```typescript
const handleComplete = useCallback(async () => {
  const transcript = messagesRef.current.map(...);
  if (transcript.length > 0) {
    await extractAndUpdateMemory(transcript, memory ?? undefined);  // BLOCKING
  }
  await incrementCompletedCheckinsCount();
  onComplete?.();  // Navigation happens AFTER AI completes
}, [memory, onComplete]);
```

**Impact:**
- User waits 2-5 seconds after completing check-in
- Network issues cause indefinite blocking
- Poor perceived performance

## Proposed Solutions

### Option 1: Fire and Forget (Recommended)
Don't await memory extraction - let it complete in background.

```typescript
const handleComplete = useCallback(async () => {
  const transcript = messagesRef.current.map(...);
  if (transcript.length > 0) {
    // Fire and forget - don't block user
    extractAndUpdateMemory(transcript, memory ?? undefined)
      .catch(err => console.error('Memory extraction failed:', err));
  }
  await incrementCompletedCheckinsCount();
  onComplete?.();  // Navigate immediately
}, [memory, onComplete]);
```

**Pros:** Immediate navigation, better UX
**Cons:** User doesn't know if extraction succeeded
**Effort:** Minimal
**Risk:** Low

### Option 2: Background Queue
Queue extraction for background processing.

**Pros:** Reliable, can retry
**Cons:** More infrastructure
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option 1 - Fire and forget with error logging.

## Technical Details

**Affected files:**
- `src/components/checkin/checkin-view.tsx`

## Acceptance Criteria

- [ ] Navigation happens immediately after check-in completion
- [ ] Memory extraction runs in background
- [ ] Extraction failures are logged but don't block user
- [ ] Memory is eventually updated correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #7 performance review | Don't block UX for non-critical background tasks |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
