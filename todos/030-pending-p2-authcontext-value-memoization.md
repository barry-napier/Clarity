---
status: pending
priority: p2
issue_id: "030"
tags: [code-review, performance, react]
dependencies: []
---

# Memoize AuthContext Value Object

## Problem Statement

The `AuthProvider` creates a new `value` object on every render. Even though the callbacks (`signIn`, `signOut`, `handleOAuthCallback`) are memoized with `useCallback`, the containing object is not. This causes ALL consumers of `useAuth()` to re-render whenever AuthProvider re-renders, even if the actual values haven't changed.

Since `AuthProvider` wraps the entire application at the root level, this means the **entire app re-renders** on any auth state change.

## Findings

**Source:** Performance Oracle Agent Review of PR #4

**Location:** `/Users/bnapier/projects/clarity/src/lib/auth-context.tsx:183-190`

```typescript
const value: AuthContextValue = {
  isAuthenticated: authenticated,
  isLoading,
  error,
  signIn,
  signOut,
  handleOAuthCallback,
};

return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
```

**Impact:**
- Every auth state change triggers full component tree re-render
- All components using `useAuth()` re-render even if they only use stable callbacks
- Performance degrades as app grows

## Proposed Solutions

### Option A: Wrap Value in useMemo (Recommended)

```typescript
const value = useMemo<AuthContextValue>(
  () => ({
    isAuthenticated: authenticated,
    isLoading,
    error,
    signIn,
    signOut,
    handleOAuthCallback,
  }),
  [authenticated, isLoading, error, signIn, signOut, handleOAuthCallback]
);

return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
```

- **Pros:** Minimal change, prevents unnecessary re-renders
- **Cons:** None
- **Effort:** Small (5 minutes)
- **Risk:** None

### Option B: Split Context (State vs Actions)

Create two contexts: one for state (changes often) and one for actions (stable):

```typescript
const AuthStateContext = createContext<AuthState | null>(null);
const AuthActionsContext = createContext<AuthActions | null>(null);
```

- **Pros:** Maximum optimization, components can subscribe to just what they need
- **Cons:** More complex, may be overkill for current app size
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

Implement Option A - simple useMemo is sufficient for Phase 1.

## Technical Details

**Affected Files:**
- `src/lib/auth-context.tsx` - Wrap value in useMemo

**Verification:**
Use React DevTools Profiler to verify reduced re-renders after fix.

## Acceptance Criteria

- [ ] AuthContext value wrapped in useMemo
- [ ] Components only re-render when their consumed values change
- [ ] React DevTools shows reduced render count
- [ ] All auth flows still work correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from performance review | Context value recreation pattern identified |

## Resources

- PR #4: Phase 1 Authentication
- React useMemo documentation
- Kent C. Dodds: "How to optimize your context value"
