---
status: pending
priority: p2
issue_id: "021"
tags: [code-review, security, oauth]
dependencies: []
---

# No Token Revocation on Logout

## Problem Statement

The `clearTokens` function only removes tokens locally without revoking them at Google's servers. The refresh token remains valid until its natural expiry, creating a security vulnerability.

## Findings

**Source:** Code Review of PR #3

**Location:** `/Users/bnapier/projects/clarity/src/lib/token-service.ts` (lines 61-67)

**Current Code:**
```typescript
export async function clearTokens(): Promise<void> {
  await SecureStorage.remove({ key: ACCESS_TOKEN_KEY });
  await SecureStorage.remove({ key: REFRESH_TOKEN_KEY });
  await SecureStorage.remove({ key: TOKEN_EXPIRY_KEY });
}
```

**Issue:** Tokens are only cleared locally without server-side revocation:
- Refresh tokens remain valid at Google's servers
- Exfiltrated tokens can be used even after user logs out
- User believes they are logged out but tokens are still usable

**Impact:**
- Security risk if tokens are compromised before logout
- False sense of security for users
- Tokens remain usable for extended periods (refresh tokens can last months)

## Proposed Solutions

### Option A: Add Token Revocation (Recommended)

```typescript
const GOOGLE_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

export async function clearTokens(): Promise<void> {
  // Get tokens before clearing
  const refreshToken = await SecureStorage.get({ key: REFRESH_TOKEN_KEY });
  const accessToken = await SecureStorage.get({ key: ACCESS_TOKEN_KEY });

  // Revoke tokens at Google's servers (best effort)
  const tokensToRevoke = [refreshToken?.value, accessToken?.value].filter(Boolean);

  await Promise.allSettled(
    tokensToRevoke.map((token) =>
      fetch(`${GOOGLE_REVOKE_ENDPOINT}?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    )
  );

  // Clear local storage regardless of revocation result
  await SecureStorage.remove({ key: ACCESS_TOKEN_KEY });
  await SecureStorage.remove({ key: REFRESH_TOKEN_KEY });
  await SecureStorage.remove({ key: TOKEN_EXPIRY_KEY });
}
```

- **Pros:** Proper security hygiene, tokens immediately invalidated
- **Cons:** Network request required, may fail silently
- **Effort:** Small
- **Risk:** Low - uses best-effort revocation with fallback to local clear

### Option B: Create separate revoke function

```typescript
export async function revokeAndClearTokens(): Promise<void> {
  await revokeTokens();
  await clearTokens();
}

export async function revokeTokens(): Promise<{ success: boolean; errors: string[] }> {
  // Detailed revocation with error reporting
}
```

- **Pros:** More granular control, error visibility
- **Cons:** Requires callers to use correct function
- **Effort:** Small
- **Risk:** Low

## Recommended Action

Implement Option A to add revocation directly to `clearTokens`. Use `Promise.allSettled` to ensure local tokens are always cleared even if revocation fails.

## Technical Details

- **Affected Files:** `src/lib/token-service.ts`
- **Components:** Authentication, logout flow
- **Database Changes:** None
- **API Endpoints:** `https://oauth2.googleapis.com/revoke`

## Acceptance Criteria

- [ ] `clearTokens` revokes tokens at Google before clearing locally
- [ ] Revocation failure does not prevent local token clearing
- [ ] Both access and refresh tokens are revoked
- [ ] Logout flow properly invalidates all tokens

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #3 review | OAuth tokens should be revoked server-side on logout |

## Resources

- [PR #3](https://github.com/barry-napier/Clarity/pull/3)
- [Google OAuth Token Revocation](https://developers.google.com/identity/protocols/oauth2/native-app#revoking-a-token)
