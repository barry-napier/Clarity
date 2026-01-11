---
status: pending
priority: p3
issue_id: "058"
tags: [code-review, pr-8, phase-4-checkins, duplication, refactor]
dependencies: []
---

# Duplicated Online/Offline Detection Pattern

## Problem Statement

The online/offline detection pattern in `checkin-view.tsx` is duplicated from `use-sync.ts`. This violates DRY and creates maintenance burden - if the detection logic needs to change, it must be updated in multiple places.

## Findings

**Locations:**
- `src/components/checkin/checkin-view.tsx:29-41`
- `src/lib/sync/use-sync.ts:69-91`

**Duplicated Code:**
```typescript
// Both files contain this pattern:
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

**Discovery:** Pattern recognition by pattern-recognition-specialist agent and architecture review

## Proposed Solutions

### Option 1: Extract to Custom Hook (Recommended)
Create a shared `useOnlineStatus()` hook.

```typescript
// src/lib/use-online-status.ts
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

**Pros:** DRY, single source of truth, easy to enhance (e.g., add heartbeat check)
**Cons:** Another file to maintain
**Effort:** Small
**Risk:** None

### Option 2: Remove from checkin-view.tsx
Rely on error handling to catch offline failures instead of preemptive detection.

**Pros:** Fewer lines of code, simpler component
**Cons:** Slightly worse UX (shows error after attempt instead of before)
**Effort:** Small
**Risk:** Low

## Recommended Action

Option 1 - Extract to custom hook. This follows the established pattern in the codebase (e.g., `use-keyboard.ts`) and centralizes network status logic.

## Technical Details

**Affected files:**
- `src/lib/use-online-status.ts` (new)
- `src/components/checkin/checkin-view.tsx`
- `src/lib/sync/use-sync.ts`

## Acceptance Criteria

- [ ] `useOnlineStatus()` hook created in `/src/lib/`
- [ ] `checkin-view.tsx` uses the shared hook
- [ ] `use-sync.ts` uses the shared hook (optional, lower priority)
- [ ] Behavior unchanged

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #8 code review | Duplicate pattern across two files |

## Resources

- PR #8: https://github.com/barry-napier/Clarity/pull/8
- Similar pattern: `src/lib/use-keyboard.ts`
