---
status: pending
priority: p2
issue_id: "022"
tags: [code-review, agent-native, architecture]
dependencies: []
---

# Non-React Sync Status API Missing

## Problem Statement

Agents cannot check if a sync is currently in progress without using React hooks. The `isSyncing` state is internal to the `useSync` hook with no programmatic equivalent, breaking agent-native architecture principles.

## Findings

**Source:** Code Review of PR #3

**Location:** `/Users/bnapier/projects/clarity/src/lib/sync/use-sync.ts` (lines 6-9)

**Current Code:**
```typescript
export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  // ...
}
```

**Issue:** Sync status is only accessible through React hook:
- Agents cannot check sync status programmatically
- No way to observe sync state changes outside React components
- Agents have partial parity with users - can trigger sync but cannot monitor status

**Impact:**
- Agents lack visibility into sync operations
- Cannot implement proper sync coordination in agent workflows
- Breaks agent-native architecture principles

## Proposed Solutions

### Option A: Export Sync Status Singleton (Recommended)

```typescript
// src/lib/sync/sync-status.ts
interface SyncStatus {
  isSyncing: boolean;
  lastResult: SyncResult | null;
  lastSyncTime: Date | null;
}

class SyncStatusManager {
  private status: SyncStatus = {
    isSyncing: false,
    lastResult: null,
    lastSyncTime: null,
  };

  private listeners = new Set<(status: SyncStatus) => void>();

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  setIsSyncing(value: boolean) {
    this.status.isSyncing = value;
    this.notify();
  }

  setLastResult(result: SyncResult) {
    this.status.lastResult = result;
    this.status.lastSyncTime = new Date();
    this.notify();
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.getStatus()));
  }
}

export const syncStatusManager = new SyncStatusManager();

// Convenience function for agents
export function getSyncStatus(): SyncStatus {
  return syncStatusManager.getStatus();
}
```

Update `useSync` to use the manager:
```typescript
export function useSync() {
  const [status, setStatus] = useState(syncStatusManager.getStatus());

  useEffect(() => {
    return syncStatusManager.subscribe(setStatus);
  }, []);

  const triggerSync = async () => {
    syncStatusManager.setIsSyncing(true);
    // ... sync logic
    syncStatusManager.setLastResult(result);
    syncStatusManager.setIsSyncing(false);
  };

  return { ...status, triggerSync };
}
```

- **Pros:** Single source of truth, agent-accessible, subscribable
- **Cons:** Slightly more complex architecture
- **Effort:** Medium
- **Risk:** Low

### Option B: Simple module-level state

```typescript
let syncState = { isSyncing: false, lastResult: null };

export function getSyncStatus() {
  return { ...syncState };
}

export function setSyncStatus(status: Partial<typeof syncState>) {
  syncState = { ...syncState, ...status };
}
```

- **Pros:** Simple implementation
- **Cons:** No subscription support, manual React integration
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Implement Option A to create a proper sync status manager that supports both React hooks and programmatic access with subscriptions.

## Technical Details

- **Affected Files:** `src/lib/sync/use-sync.ts`, new `src/lib/sync/sync-status.ts`
- **Components:** Sync system, agent integrations
- **Database Changes:** None

## Acceptance Criteria

- [ ] `getSyncStatus()` function exported for agents
- [ ] Status includes `isSyncing`, `lastResult`, and `lastSyncTime`
- [ ] `useSync` hook uses the same underlying status
- [ ] Subscription mechanism available for status changes
- [ ] Agent documentation updated with sync status API

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #3 review | Agent-native architecture requires non-React APIs |

## Resources

- [PR #3](https://github.com/barry-napier/Clarity/pull/3)
