---
status: pending
priority: p2
issue_id: "018"
tags: [code-review, architecture, error-handling]
dependencies: []
---

# Missing Error Recovery in Token Service

## Problem Statement

Token refresh failures are silently swallowed with `console.error` and return `null`. The caller has no way to distinguish between "no tokens exist" (new user) and "tokens are invalid/expired" (needs re-authentication). This leaves users in a broken state without knowing authentication has expired.

## Findings

**Source:** Architecture Review Agent - PR #3

**Location:** `/Users/bnapier/projects/clarity/src/lib/token-service.ts:51-58`

```typescript
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null; // No tokens - but why?

    const response = await fetch('https://oauth2.googleapis.com/token', {
      // ... refresh request
    });

    if (!response.ok) {
      // Token invalid? Revoked? Network error? Rate limited?
      console.error('Token refresh failed:', response.status);
      return null; // Caller can't tell what went wrong
    }

    // ... store and return new token
  } catch (error) {
    console.error('Token refresh error:', error);
    return null; // Silent failure - user stuck in broken state
  }
}
```

**Impact:**
- Users left in broken authentication state without notification
- No way for UI to prompt re-authentication when needed
- Silent failures make debugging difficult
- Poor user experience when Google revokes token (e.g., password change)

## Proposed Solutions

### Option A: Discriminated union return type (Recommended)

```typescript
type TokenResult =
  | { status: 'valid'; token: string }
  | { status: 'no_tokens' }
  | { status: 'expired'; reason: 'invalid_grant' | 'token_revoked' }
  | { status: 'error'; error: Error };

async function refreshAccessToken(): Promise<TokenResult> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return { status: 'no_tokens' };
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      // ... refresh request
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.error === 'invalid_grant') {
        // Clear invalid tokens
        await clearTokens();
        return { status: 'expired', reason: 'invalid_grant' };
      }
      return { status: 'error', error: new Error(error.error_description) };
    }

    const tokens = await response.json();
    await storeTokens(tokens);
    return { status: 'valid', token: tokens.access_token };
  } catch (error) {
    return { status: 'error', error: error as Error };
  }
}

// Usage in UI
const result = await getValidAccessToken();
if (result.status === 'expired') {
  showReAuthenticationPrompt();
} else if (result.status === 'error') {
  showRetryableError(result.error);
}
```

- **Pros:** Type-safe error handling, clear error states, enables proper UI feedback
- **Cons:** Breaking change to API, requires updating all callers
- **Effort:** Medium
- **Risk:** Low - improves reliability

### Option B: Auth state observable/event emitter

```typescript
import { BehaviorSubject } from 'rxjs';

type AuthState =
  | { status: 'authenticated' }
  | { status: 'unauthenticated' }
  | { status: 'expired'; reason: string }
  | { status: 'error'; error: Error };

export const authState$ = new BehaviorSubject<AuthState>({
  status: 'unauthenticated'
});

// In token service
if (response.status === 401 || error.error === 'invalid_grant') {
  authState$.next({ status: 'expired', reason: 'Token revoked' });
}

// In React component
function useAuthState() {
  const [authState, setAuthState] = useState<AuthState>();

  useEffect(() => {
    const sub = authState$.subscribe(setAuthState);
    return () => sub.unsubscribe();
  }, []);

  return authState;
}
```

- **Pros:** Reactive updates, any component can subscribe, decoupled
- **Cons:** Additional dependency (rxjs) or custom implementation
- **Effort:** Medium
- **Risk:** Low

### Option C: Custom error classes

```typescript
class TokenExpiredError extends Error {
  constructor(public reason: 'invalid_grant' | 'token_revoked') {
    super(`Token expired: ${reason}`);
    this.name = 'TokenExpiredError';
  }
}

class NoTokensError extends Error {
  constructor() {
    super('No authentication tokens found');
    this.name = 'NoTokensError';
  }
}

// Throw instead of returning null
async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new NoTokensError();

  // ...
  if (error.error === 'invalid_grant') {
    throw new TokenExpiredError('invalid_grant');
  }
}
```

- **Pros:** Standard error handling pattern, instanceof checks
- **Cons:** Try/catch required everywhere, less explicit than union types
- **Effort:** Small
- **Risk:** None

## Recommended Action

[Leave blank - filled during triage]

## Technical Details

- **Affected Files:** `src/lib/token-service.ts`, consumers of token service
- **Components:** Token service, authentication flow, UI components
- **Database Changes:** None

## Acceptance Criteria

- [ ] Token errors return typed error states (not just null)
- [ ] UI can distinguish "not logged in" from "session expired"
- [ ] Re-authentication prompt shown when tokens are revoked
- [ ] Network errors are retryable, auth errors prompt re-login
- [ ] Invalid tokens are cleared to prevent repeated failures
- [ ] Unit tests cover all error states

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #3 review | Silent auth failures create poor UX |

## Resources

- [PR #3](https://github.com/barry-napier/Clarity/pull/3)
- [Google OAuth Error Responses](https://developers.google.com/identity/protocols/oauth2/native-app#handlingresponse)
- [TypeScript Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
