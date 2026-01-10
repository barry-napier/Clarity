---
status: pending
priority: p2
issue_id: "031"
tags: [code-review, security, oauth]
dependencies: []
---

# Use Constant-Time Comparison for OAuth State Validation

## Problem Statement

The OAuth state validation uses direct string comparison with `!==`, which is susceptible to timing attacks. An attacker could potentially extract the expected state value character by character by measuring response times. While this attack is difficult to execute in practice, it's a security best practice to use constant-time comparison for security-critical values.

## Findings

**Source:** Security Sentinel Agent Review of PR #4

**Location:** `/Users/bnapier/projects/clarity/src/lib/oauth-storage.ts:44`

```typescript
if (storedState !== returnedState) {
  return false;
}
```

**Impact:**
- Theoretical timing attack vector
- Could allow state enumeration given enough attempts
- Industry best practice violation

## Proposed Solutions

### Option A: Constant-Time Comparison with TextEncoder (Recommended)

```typescript
function constantTimeCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  if (aBytes.length !== bBytes.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }

  return result === 0;
}

// Usage
if (!constantTimeCompare(storedState, returnedState)) {
  return false;
}
```

- **Pros:** Proper security, works in browser
- **Cons:** Slightly more code
- **Effort:** Small (15 minutes)
- **Risk:** None

### Option B: Use crypto.subtle.timingSafeEqual (Node.js only)

Not available in browser, but could be used in a future backend.

## Recommended Action

Implement Option A - create utility function for constant-time string comparison.

## Technical Details

**Affected Files:**
- `src/lib/oauth-storage.ts` - Use constant-time comparison
- Consider creating `src/lib/crypto-utils.ts` for shared security utilities

**Note:** This is a hardening measure. The 10-minute state expiration and proper PKCE already provide strong security.

## Acceptance Criteria

- [ ] OAuth state validation uses constant-time comparison
- [ ] Utility function created for reuse
- [ ] All OAuth flows still work correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from security review | Timing attack vector identified |

## Resources

- PR #4: Phase 1 Authentication
- OWASP: Timing Attacks
- Node.js crypto.timingSafeEqual
