---
status: complete
priority: p1
issue_id: "029"
tags: [code-review, bug, validation]
dependencies: []
---

# Add NaN Handling for parseInt in OAuth Storage

## Problem Statement

The `parseInt` calls in oauth-storage.ts and token-service.ts don't handle the case where stored values are corrupted or contain non-numeric content. When `parseInt` receives invalid input, it returns `NaN`, and comparisons like `NaN > OAUTH_TIMEOUT_MS` are always `false`. This means expired or corrupted states might incorrectly validate as valid.

## Findings

**Source:** TypeScript Reviewer Agent Analysis of PR #4

**Locations:**
1. `/Users/bnapier/projects/clarity/src/lib/oauth-storage.ts:37`
2. `/Users/bnapier/projects/clarity/src/lib/oauth-storage.ts:76`
3. `/Users/bnapier/projects/clarity/src/lib/token-service.ts:34`

```typescript
// oauth-storage.ts:37
const age = Date.now() - parseInt(createdAt, 10);
// If createdAt is corrupted: age = NaN
// NaN > OAUTH_TIMEOUT_MS = false (incorrectly passes validation)

// token-service.ts:34
if (parseInt(expiry, 10) - Date.now() < REFRESH_BUFFER_MS) {
// If expiry is corrupted: NaN - Date.now() = NaN
// NaN < REFRESH_BUFFER_MS = false (incorrectly skips refresh)
```

**Impact:**
- Storage corruption could cause expired OAuth states to validate
- Corrupted token expiry could prevent necessary token refresh
- Silent failures make debugging difficult

## Proposed Solutions

### Option A: Add Explicit NaN Check (Recommended)

```typescript
// oauth-storage.ts
const createdAtMs = parseInt(createdAt, 10);
if (Number.isNaN(createdAtMs)) {
  console.error('Corrupted OAuth state timestamp, clearing');
  await clearOAuthState();
  return false;
}
const age = Date.now() - createdAtMs;

// token-service.ts
const expiryMs = parseInt(expiry, 10);
if (Number.isNaN(expiryMs)) {
  console.error('Corrupted token expiry, forcing refresh');
  return await doTokenRefresh();
}
```

- **Pros:** Explicit handling, clear error logging, fail-safe behavior
- **Cons:** Slightly more verbose
- **Effort:** Small (15 minutes)
- **Risk:** None

### Option B: Use Number() with Fallback

```typescript
const createdAtMs = Number(createdAt) || 0;
// If corrupted, treats as epoch time (1970) which will be expired
```

- **Pros:** Concise, always returns valid number
- **Cons:** Silent failure, could mask bugs
- **Effort:** Tiny
- **Risk:** Low

## Recommended Action

Implement Option A for explicit error handling and logging.

## Technical Details

**Affected Files:**
- `src/lib/oauth-storage.ts` - Lines 37 and 76
- `src/lib/token-service.ts` - Line 34

## Acceptance Criteria

- [ ] All `parseInt` calls validate for NaN
- [ ] Corrupted values trigger appropriate recovery (clear state or force refresh)
- [ ] Error logging for debugging
- [ ] Unit tests for corruption scenarios

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from code review | parseInt NaN behavior identified |

## Resources

- PR #4: Phase 1 Authentication
- MDN: Number.isNaN()
