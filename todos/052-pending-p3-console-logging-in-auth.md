---
status: pending
priority: p3
issue_id: "052"
tags: [code-review, security, phase-4-checkins]
dependencies: []
---

# Remove Debug Console Logging in Auth

## Problem Statement

Debug logging in production could leak sensitive information to browser console.

## Findings

**Location:** `src/lib/auth-context.tsx`

```typescript
console.log('[AuthProvider] Auth result:', authed);
console.log('[AuthProvider] Validating state...');
console.log('[AuthProvider] Verifier found:', !!verifier);
```

**Impact:** Information disclosure to users with dev tools open.

## Proposed Solutions

### Option 1: Remove or Conditional Logging (Recommended)
Use import.meta.env.DEV to gate logging.

**Pros:** Clean production console
**Cons:** Harder to debug in prod
**Effort:** Minimal
**Risk:** None

## Recommended Action

Remove or gate behind DEV flag.

## Acceptance Criteria

- [ ] No auth-related logs in production build
- [ ] Debug logging still available in development
