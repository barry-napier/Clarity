---
status: pending
priority: p2
issue_id: "017"
tags: [code-review, performance, sync]
dependencies: []
---

# Sequential Queue Processing - O(n) Network Round Trips

## Problem Statement

The sync processor handles each queued item sequentially with `await`, resulting in O(n) network round trips. With 100 pending items, this means 200+ sequential network requests taking 40+ seconds, creating a very poor user experience for users who work offline and accumulate many changes.

## Findings

**Source:** Performance Review Agent - PR #3

**Location:** `/Users/bnapier/projects/clarity/src/lib/sync/processor.ts:21-38`

```typescript
export async function processQueue(items: SyncItem[]): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  // Sequential processing - each item waits for the previous
  for (const item of items) {
    try {
      // Network request 1: fetch current state
      const current = await fetchFromDrive(item.fileId);

      // Network request 2: upload changes
      const result = await uploadToDrive(item.fileId, item.data);

      results.push({ success: true, item, result });
    } catch (error) {
      results.push({ success: false, item, error });
    }
  }

  return results;
}

// With 100 items: 200 sequential requests = 40+ seconds
// With batching: 200 requests in batches of 10 = ~8 seconds
```

**Impact:**
- Very slow sync for users who work offline and accumulate many changes
- Poor perceived performance on reconnection
- Battery drain from long-running sync operations
- UI blocked or unresponsive during sync

## Proposed Solutions

### Option A: Promise.allSettled with concurrency control (Recommended)

```typescript
import pLimit from 'p-limit';

const CONCURRENCY_LIMIT = 5;

export async function processQueue(items: SyncItem[]): Promise<SyncResult[]> {
  const limit = pLimit(CONCURRENCY_LIMIT);

  const promises = items.map(item =>
    limit(async () => {
      try {
        const current = await fetchFromDrive(item.fileId);
        const result = await uploadToDrive(item.fileId, item.data);
        return { success: true, item, result };
      } catch (error) {
        return { success: false, item, error };
      }
    })
  );

  return Promise.all(promises);
}
```

- **Pros:** 5-10x faster sync, respects API rate limits, handles errors gracefully
- **Cons:** Small dependency (p-limit is <1KB)
- **Effort:** Small
- **Risk:** Low - needs testing with Google Drive rate limits

### Option B: Manual batching without dependency

```typescript
const BATCH_SIZE = 5;

export async function processQueue(items: SyncItem[]): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async item => {
        const current = await fetchFromDrive(item.fileId);
        const result = await uploadToDrive(item.fileId, item.data);
        return { success: true, item, result };
      })
    );

    results.push(...batchResults.map((r, idx) =>
      r.status === 'fulfilled'
        ? r.value
        : { success: false, item: batch[idx], error: r.reason }
    ));
  }

  return results;
}
```

- **Pros:** No dependencies, simple batching logic
- **Cons:** Less elegant, fixed batch size
- **Effort:** Small
- **Risk:** None

### Option C: Streaming with progress updates

```typescript
export async function* processQueueStreaming(
  items: SyncItem[]
): AsyncGenerator<SyncResult> {
  const limit = pLimit(5);
  const pending = items.map(item =>
    limit(() => processItem(item))
  );

  for (const promise of pending) {
    yield await promise; // Stream results as they complete
  }
}
```

- **Pros:** UI can show real-time progress, better UX
- **Cons:** More complex integration with UI
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

[Leave blank - filled during triage]

## Technical Details

- **Affected Files:** `src/lib/sync/processor.ts`
- **Components:** Sync queue processor, Google Drive integration
- **Database Changes:** None

## Acceptance Criteria

- [ ] Sync processes items in parallel batches (5-10 concurrent)
- [ ] Total sync time reduced by 5x or more for large queues
- [ ] Google Drive rate limits respected (no 429 errors)
- [ ] Individual item failures don't block other items
- [ ] Progress can be tracked for UI feedback
- [ ] Unit tests cover concurrent processing

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #3 review | Sequential async is a common performance anti-pattern |

## Resources

- [PR #3](https://github.com/barry-napier/Clarity/pull/3)
- [p-limit npm package](https://www.npmjs.com/package/p-limit)
- [Google Drive API Rate Limits](https://developers.google.com/drive/api/guides/limits)
- [Promise.allSettled MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled)
