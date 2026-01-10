---
status: pending
priority: p2
issue_id: "032"
tags: [code-review, ux, error-handling]
dependencies: []
---

# Display Authentication Errors in Login UI

## Problem Statement

The `AuthContext` exposes an `error` state, but it's never consumed in the login UI. If authentication fails, users see no feedback - the button just stops loading with no explanation.

## Findings

**Source:** TypeScript Reviewer Agent Analysis of PR #4

**Location:** `/Users/bnapier/projects/clarity/src/components/login-button.tsx`

```typescript
export function LoginButton() {
  const { signIn, isLoading } = useAuth();
  // error is not destructured or displayed

  return (
    <Button onClick={signIn} disabled={isLoading}>
      {/* No error display */}
    </Button>
  );
}
```

**Also in:** `/Users/bnapier/projects/clarity/src/routes/login.tsx` - No error handling

**Impact:**
- Users don't know why authentication failed
- No guidance on how to retry or fix issues
- Poor user experience during OAuth errors

## Proposed Solutions

### Option A: Add Error Display to LoginButton (Recommended)

```typescript
export function LoginButton() {
  const { signIn, isLoading, error } = useAuth();

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={signIn} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <GoogleIcon className="mr-2 h-4 w-4" />
            Continue with Google
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-destructive text-center max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}
```

- **Pros:** Error visible where user is looking, minimal change
- **Cons:** None
- **Effort:** Small (10 minutes)
- **Risk:** None

### Option B: Toast Notification

Use a toast component to show errors:

```typescript
const { toast } = useToast();

useEffect(() => {
  if (error) {
    toast({ variant: "destructive", title: "Sign in failed", description: error });
  }
}, [error]);
```

- **Pros:** Non-intrusive, consistent with other app notifications
- **Cons:** Requires toast infrastructure, less prominent
- **Effort:** Medium (if toast not yet set up)
- **Risk:** Low

## Recommended Action

Implement Option A for immediate visibility. Consider Option B for app-wide error handling later.

## Technical Details

**Affected Files:**
- `src/components/login-button.tsx` - Add error display

**Error Messages to Handle:**
- OAuth cancelled by user
- Network errors
- Invalid state (CSRF)
- Token exchange failed

## Acceptance Criteria

- [ ] Auth errors displayed below login button
- [ ] Error clears when user tries again
- [ ] Styling matches app design system (text-destructive)
- [ ] Error messages are user-friendly (not raw error codes)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from code review | Missing error display identified |

## Resources

- PR #4: Phase 1 Authentication
- shadcn/ui error styling conventions
