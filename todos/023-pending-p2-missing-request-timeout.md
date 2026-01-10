---
status: pending
priority: p2
issue_id: "023"
tags: [code-review, architecture, reliability]
dependencies: ["019"]
---

# Missing Request Timeout

## Problem Statement

All fetch calls in the Drive sync module lack timeout handling, which could cause indefinite hangs on poor networks and make the app appear frozen.

## Findings

**Source:** Code Review of PR #3

**Location:** `/Users/bnapier/projects/clarity/src/lib/sync/drive.ts`

**Current Code Pattern:**
```typescript
const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});
// No timeout - will wait indefinitely
```

**Issue:** Network requests have no timeout mechanism:
- Fetch API does not have built-in timeout support
- Slow or unresponsive networks cause indefinite hangs
- Users see frozen UI with no feedback
- No way to cancel stuck requests

**Impact:**
- App appears frozen on poor network conditions
- No user feedback during long waits
- Cannot recover from stuck network states
- Poor user experience on mobile networks

## Proposed Solutions

### Option A: Add AbortController with Timeout (Recommended)

```typescript
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Usage with configurable timeouts
const TIMEOUT_CONFIG = {
  metadata: 10000,    // 10 seconds for metadata operations
  upload: 60000,      // 60 seconds for uploads
  download: 30000,    // 30 seconds for downloads
};

// In drive.ts
const response = await fetchWithTimeout(
  url,
  { method: 'GET', headers },
  TIMEOUT_CONFIG.metadata
);
```

- **Pros:** Standard approach, configurable per-operation, graceful error handling
- **Cons:** Requires wrapping all fetch calls
- **Effort:** Medium
- **Risk:** Low

### Option B: Integrate with HTTP Client Wrapper

If implementing issue #019 (HTTP Client Abstraction), add timeout support there:

```typescript
// Already handled in http-client.ts from issue #019
const response = await httpClient.get(url, { timeout: 10000 });
```

- **Pros:** Centralized solution, combines with other improvements
- **Cons:** Depends on #019 completion
- **Effort:** Small (if #019 is done)
- **Risk:** None

## Recommended Action

If implementing #019 (HTTP Client Abstraction), include timeout support there. Otherwise, implement Option A as a standalone utility.

## Technical Details

- **Affected Files:** `src/lib/sync/drive.ts`, potentially `src/lib/http-client.ts`
- **Components:** All network operations
- **Database Changes:** None

## Acceptance Criteria

- [ ] All fetch calls have timeout handling
- [ ] Different timeouts for different operation types
- [ ] Timeout errors are properly caught and reported
- [ ] User receives feedback when requests time out
- [ ] Configurable timeout values

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #3 review | Fetch API requires manual timeout implementation |

## Resources

- [PR #3](https://github.com/barry-napier/Clarity/pull/3)
- [AbortController MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Fetch with Timeout Pattern](https://dmitripavlutin.com/timeout-fetch-request/)
