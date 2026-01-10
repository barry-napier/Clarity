---
status: pending
priority: p2
issue_id: "016"
tags: [code-review, performance, react-hooks]
dependencies: []
---

# useSync Effect Dependency Creates Loop Risk

## Problem Statement

The `sync` callback in the `useSync` hook depends on `isSyncing` state in its dependency array. This causes the callback reference to change on every sync state change, which can cause effect cleanup/re-run issues, memory leaks from stale event handlers, and potential infinite loop risks.

## Findings

**Source:** React Patterns Review Agent - PR #3

**Location:** `/Users/bnapier/projects/clarity/src/lib/sync/use-sync.ts:11-43`

```typescript
export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);

  // This callback changes identity every time isSyncing changes
  const sync = useCallback(async () => {
    if (isSyncing) return; // Depends on isSyncing

    setIsSyncing(true);
    try {
      await performSync();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]); // <-- Problem: callback recreated on every state change

  useEffect(() => {
    // Event listener uses sync callback
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [sync]); // Effect re-runs when sync changes

  return { sync, isSyncing };
}
```

**Impact:**
- Memory leaks from stale event handlers not being properly cleaned up
- Potential infinite loop if sync triggers state change that triggers effect
- Unstable function references cause unnecessary re-renders in consumers
- Event listeners constantly being added/removed

## Proposed Solutions

### Option A: Use ref for isSyncing flag (Recommended)

```typescript
export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const sync = useCallback(async () => {
    // Read from ref instead of state
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      await performSync();
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []); // No dependencies - stable callback

  useEffect(() => {
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [sync]); // Effect only runs once

  return { sync, isSyncing };
}
```

- **Pros:** Stable callback identity, no memory leaks, simple pattern
- **Cons:** Dual state tracking (ref + state)
- **Effort:** Small
- **Risk:** None

### Option B: Use functional state update

```typescript
const sync = useCallback(async () => {
  let shouldSync = false;

  setIsSyncing(current => {
    if (current) return current;
    shouldSync = true;
    return true;
  });

  if (!shouldSync) return;

  try {
    await performSync();
  } finally {
    setIsSyncing(false);
  }
}, []); // No dependencies needed
```

- **Pros:** No ref needed, uses React's built-in state access
- **Cons:** Slightly less readable, relies on setState callback side effect
- **Effort:** Small
- **Risk:** Low

## Recommended Action

[Leave blank - filled during triage]

## Technical Details

- **Affected Files:** `src/lib/sync/use-sync.ts`
- **Components:** Sync hook, event listeners
- **Database Changes:** None

## Acceptance Criteria

- [ ] `sync` callback has stable identity (doesn't change on state updates)
- [ ] Event listeners properly cleaned up on unmount
- [ ] No memory leaks detected in React DevTools profiler
- [ ] Guard against concurrent sync calls still works
- [ ] Unit tests verify stable callback reference

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #3 review | useCallback dependencies can create subtle bugs with state |

## Resources

- [PR #3](https://github.com/barry-napier/Clarity/pull/3)
- [React useCallback docs](https://react.dev/reference/react/useCallback)
- [React useRef for mutable values](https://react.dev/reference/react/useRef#referencing-a-value-with-a-ref)
