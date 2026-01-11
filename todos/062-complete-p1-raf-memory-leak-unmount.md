---
status: complete
priority: p1
issue_id: "062"
tags: [code-review, pr-9, memory-leak, performance, react]
dependencies: []
---

# Memory Leak: RAF Not Cleaned Up on Unmount

## Problem Statement

The RAF (requestAnimationFrame) batching implementation in `use-checkin-chat.ts` does not clean up pending RAF callbacks when the component unmounts or when the stream is aborted. This causes:
1. React warning: "Can't perform a React state update on an unmounted component"
2. Potential memory leak from stale closures
3. Visual glitches if RAF fires after abort

**This is a P1 blocker** because memory leaks accumulate and degrade app performance.

## Findings

**Location:** `src/lib/ai/use-checkin-chat.ts:113-116, 271-297`

**Current Implementation:**
```typescript
// Lines 113-116: Refs declared
const pendingContentRef = useRef<string>('');
const rafIdRef = useRef<number | null>(null);

// Lines 276-289: RAF batching in streaming loop
if (rafIdRef.current === null) {
  rafIdRef.current = requestAnimationFrame(() => {
    setMessages((prev) => {
      // ... state update
    });
    rafIdRef.current = null;
  });
}

// Lines 293-296: Cleanup only at end of successful stream
if (rafIdRef.current !== null) {
  cancelAnimationFrame(rafIdRef.current);
  rafIdRef.current = null;
}
```

**Missing Cleanup Scenarios:**

1. **Component Unmount During Stream:**
   - User navigates away while AI is streaming
   - RAF callback still queued
   - Callback executes, calls `setMessages` on unmounted component
   - React warning + potential memory leak

2. **Stream Abort:**
   - User starts new check-in or force-quits
   - `abortControllerRef.current.abort()` called
   - Catch block handles AbortError but doesn't cancel RAF
   - Pending RAF still executes

**Discovery:** Performance analysis by performance-oracle agent

## Proposed Solutions

### Option 1: Add useEffect Cleanup (Recommended)

Add cleanup effect that cancels RAF on unmount.

```typescript
// Add near other refs
useEffect(() => {
  return () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };
}, []);
```

**Also add RAF cleanup in catch block:**
```typescript
catch (err) {
  // Cancel pending RAF on abort
  if (rafIdRef.current !== null) {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
  }

  if (err instanceof Error && err.name === 'AbortError') {
    return;
  }
  // ... rest of error handling
}
```

**Pros:** Complete cleanup, follows React best practices
**Cons:** Few extra lines
**Effort:** Small
**Risk:** None

### Option 2: Use useCallback with RAF Wrapper

Create a reusable RAF update function that manages its own cleanup.

```typescript
const batchedSetMessages = useCallback((content: string) => {
  if (rafIdRef.current !== null) return;

  rafIdRef.current = requestAnimationFrame(() => {
    setMessages(/* ... */);
    rafIdRef.current = null;
  });
}, []);

// Cleanup in useEffect
```

**Pros:** Cleaner API, reusable pattern
**Cons:** More refactoring
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option 1 - Add the useEffect cleanup and abort handling. This is the minimal fix that addresses the memory leak.

## Technical Details

**Affected files:**
- `src/lib/ai/use-checkin-chat.ts`

**React Lifecycle:**
- `useEffect` cleanup runs before component unmount
- `cancelAnimationFrame` removes pending callback from browser queue
- Setting ref to null prevents stale access

## Acceptance Criteria

- [ ] useEffect cleanup cancels pending RAF on unmount
- [ ] RAF canceled in catch block when stream is aborted
- [ ] No "Can't perform state update on unmounted component" warnings
- [ ] DevTools Memory tab shows no accumulating closures

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #9 performance review | RAF cleanup missing on unmount/abort |

## Resources

- PR #9: https://github.com/barry-napier/clarity/pull/9
- React docs on cleanup: https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development
