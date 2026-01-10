---
status: pending
priority: p2
issue_id: "015"
tags: [code-review, performance, race-condition]
dependencies: []
---

# Token Refresh Race Condition

## Problem Statement

Multiple concurrent calls to `getValidAccessToken()` when the token is near expiry will trigger multiple simultaneous refresh requests. This can cause token corruption, rate limiting from Google's OAuth endpoint, and wasted network bandwidth.

## Findings

**Source:** Performance Review Agent - PR #3

**Location:** `/Users/bnapier/projects/clarity/src/lib/token-service.ts:26-39, 42-59`

```typescript
export async function getValidAccessToken(): Promise<string | null> {
  const accessToken = await getAccessToken();
  const expiresAt = await getTokenExpiry();

  // Multiple callers can reach this check simultaneously
  if (!accessToken || !expiresAt || Date.now() > expiresAt - 60000) {
    // All concurrent callers will trigger refresh
    return await refreshAccessToken();
  }

  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  // No mutex - multiple refreshes can happen in parallel
  const refreshToken = await getRefreshToken();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    // ... refresh request
  });
  // Race: which response wins when storing?
  await storeTokens(newTokens);
  return newTokens.accessToken;
}
```

**Impact:**
- Token corruption if two refreshes complete and store different tokens
- Google OAuth rate limiting on concurrent refresh requests
- Wasted network bandwidth and battery on mobile
- Unpredictable authentication failures

## Proposed Solutions

### Option A: Promise-based mutex pattern (Recommended)

```typescript
let refreshPromise: Promise<string | null> | null = null;

export async function getValidAccessToken(): Promise<string | null> {
  const accessToken = await getAccessToken();
  const expiresAt = await getTokenExpiry();

  if (!accessToken || !expiresAt || Date.now() > expiresAt - 60000) {
    // If refresh already in progress, wait for it
    if (refreshPromise) {
      return refreshPromise;
    }

    // Start new refresh and store promise
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });

    return refreshPromise;
  }

  return accessToken;
}
```

- **Pros:** Simple, no external dependencies, handles concurrent calls elegantly
- **Cons:** Module-level state (but acceptable for singleton service)
- **Effort:** Small
- **Risk:** None

### Option B: Use async-mutex library

```typescript
import { Mutex } from 'async-mutex';

const refreshMutex = new Mutex();

async function refreshAccessToken(): Promise<string | null> {
  return refreshMutex.runExclusive(async () => {
    // Check again inside mutex in case another caller already refreshed
    const current = await getAccessToken();
    const expiresAt = await getTokenExpiry();
    if (current && expiresAt && Date.now() < expiresAt - 60000) {
      return current;
    }
    // Proceed with refresh
    // ...
  });
}
```

- **Pros:** Well-tested library, explicit locking semantics
- **Cons:** Additional dependency
- **Effort:** Small
- **Risk:** None

## Recommended Action

[Leave blank - filled during triage]

## Technical Details

- **Affected Files:** `src/lib/token-service.ts`
- **Components:** Token refresh logic, authentication flow
- **Database Changes:** None

## Acceptance Criteria

- [ ] Only one refresh request fires when multiple calls occur simultaneously
- [ ] All concurrent callers receive the same refreshed token
- [ ] No token corruption possible from race conditions
- [ ] Unit tests verify concurrent call handling
- [ ] Refresh promise properly cleaned up after completion

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #3 review | OAuth token refresh needs mutex protection |

## Resources

- [PR #3](https://github.com/barry-napier/Clarity/pull/3)
- [async-mutex npm package](https://www.npmjs.com/package/async-mutex)
- [JavaScript Mutex Pattern](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
