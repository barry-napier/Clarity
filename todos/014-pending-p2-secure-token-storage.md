---
status: pending
priority: p2
issue_id: "014"
tags: [code-review, security, token-storage]
dependencies: []
---

# Token Storage Using Capacitor Preferences (Not Keychain)

## Problem Statement

The token service stores refresh tokens using Capacitor Preferences, which uses UserDefaults on iOS. UserDefaults is not encrypted by default, making long-lived refresh tokens vulnerable to extraction from device backups or compromised devices.

## Findings

**Source:** Security Review Agent - PR #3

**Location:** `/Users/bnapier/projects/clarity/src/lib/token-service.ts:10-24`

```typescript
// Current implementation using Capacitor Preferences
// This stores data in UserDefaults (iOS) which is NOT encrypted
import { Preferences } from '@capacitor/preferences';

export async function storeTokens(tokens: TokenData): Promise<void> {
  await Preferences.set({
    key: 'refresh_token',
    value: tokens.refreshToken,
  });
  // ... access token storage
}
```

**Impact:** If the device is compromised or a backup is extracted, refresh tokens could be exposed, allowing persistent unauthorized access to the user's Google Drive. Refresh tokens are long-lived credentials that require encryption at rest.

## Proposed Solutions

### Option A: Use @capacitor-community/secure-storage (Recommended)

```typescript
import { SecureStoragePlugin } from '@capacitor-community/secure-storage';

export async function storeTokens(tokens: TokenData): Promise<void> {
  await SecureStoragePlugin.set({
    key: 'refresh_token',
    value: tokens.refreshToken,
  });
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    const { value } = await SecureStoragePlugin.get({ key: 'refresh_token' });
    return value;
  } catch {
    return null;
  }
}
```

- **Pros:** Uses iOS Keychain for encryption at rest, drop-in replacement API, well-maintained community plugin
- **Cons:** Additional dependency
- **Effort:** Small
- **Risk:** Low - API is very similar to Preferences

### Option B: Use native Keychain plugin directly

```typescript
import { Keychain } from '@nicholasbraun/capacitor-keychain';

export async function storeRefreshToken(token: string): Promise<void> {
  await Keychain.set({
    key: 'clarity_refresh_token',
    value: token,
  });
}
```

- **Pros:** Direct Keychain access, minimal abstraction
- **Cons:** Less actively maintained, iOS-only API
- **Effort:** Small
- **Risk:** Low

## Recommended Action

[Leave blank - filled during triage]

## Technical Details

- **Affected Files:** `src/lib/token-service.ts`
- **Components:** Token storage, authentication flow
- **Database Changes:** None

## Acceptance Criteria

- [ ] Refresh tokens stored in iOS Keychain (encrypted at rest)
- [ ] Access tokens can remain in Preferences (short-lived)
- [ ] Migration path for existing tokens implemented
- [ ] Verify tokens not visible in device backups
- [ ] Unit tests updated for new storage mechanism

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #3 review | iOS UserDefaults not suitable for sensitive credentials |

## Resources

- [PR #3](https://github.com/barry-napier/Clarity/pull/3)
- [@capacitor-community/secure-storage](https://github.com/nicholasbraun/capacitor-keychain)
- [Apple Keychain Services](https://developer.apple.com/documentation/security/keychain_services)
- [OWASP Mobile Storage](https://owasp.org/www-project-mobile-top-10/)
