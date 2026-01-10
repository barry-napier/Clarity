---
status: complete
priority: p1
issue_id: "028"
tags: [code-review, security, oauth]
dependencies: []
---

# Clear OAuth State on Validation Failure

## Problem Statement

When OAuth state validation fails (potential CSRF attack detected), the stored state is NOT cleared. This leaves the state available for potential replay if an attacker manages to guess or obtain it later. The state IS correctly cleared on successful validation, but failure paths leave it dangling.

## Findings

**Source:** Security Sentinel Agent Review of PR #4

**Location:** `/Users/bnapier/projects/clarity/src/lib/oauth-storage.ts:44-46`

```typescript
if (storedState !== returnedState) {
  return false;  // State NOT cleared here - security gap!
}

// State correctly cleared on success at line 48-50
await clearOAuthState();
return true;
```

**Impact:**
- Failed CSRF attack attempts don't invalidate the state token
- State remains valid for 10 minutes even after attack detected
- Enables continued brute-force attempts against same state

## Proposed Solutions

### Option A: Clear State on Any Validation Attempt (Recommended)

```typescript
export async function validateOAuthState(returnedState: string): Promise<boolean> {
  const storedState = await secureGet(KEYS.OAUTH_STATE);
  const createdAt = await secureGet(KEYS.OAUTH_STATE_CREATED);

  // Always clear state after any validation attempt (success or failure)
  await clearOAuthState();

  if (!storedState || !createdAt) {
    return false;
  }

  // Check expiration
  const age = Date.now() - parseInt(createdAt, 10);
  if (age > OAUTH_TIMEOUT_MS) {
    return false;
  }

  return storedState === returnedState;
}
```

- **Pros:** Single-use state tokens, prevents replay attacks
- **Cons:** None - this is standard OAuth security practice
- **Effort:** Small (5 minutes)
- **Risk:** None

### Option B: Clear State on Failure Only

Move the clear call into the failure branch:

```typescript
if (storedState !== returnedState) {
  await clearOAuthState();  // Clear on mismatch
  return false;
}
```

- **Pros:** Minimal change
- **Cons:** Less clean than Option A
- **Effort:** Tiny
- **Risk:** None

## Recommended Action

Implement Option A - clear state at the START of validation for cleaner single-use semantics.

## Technical Details

**Affected Files:**
- `src/lib/oauth-storage.ts` - Move clearOAuthState() call

**Same Pattern Needed for PKCE:**
Check if `validateAndConsumePKCEVerifier` has the same issue (it does clear on success, verify failure path).

## Acceptance Criteria

- [ ] OAuth state cleared on ANY validation attempt (success or failure)
- [ ] PKCE verifier follows same pattern
- [ ] OAuth flow still works correctly
- [ ] Failed callback attempts don't leave dangling state

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from security review | CSRF token replay vulnerability identified |

## Resources

- PR #4: Phase 1 Authentication
- OAuth 2.0 Security Best Practices (RFC 6819)
