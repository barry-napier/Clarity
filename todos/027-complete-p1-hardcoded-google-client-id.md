---
status: complete
priority: p1
issue_id: "027"
tags: [code-review, security, configuration]
dependencies: []
---

# Move Google OAuth Client ID to Environment Variable

## Problem Statement

The Google OAuth Client ID is hardcoded in source code rather than loaded from environment variables. While OAuth client IDs are considered semi-public for native/SPA apps, hardcoding prevents environment-specific configuration, makes credential rotation difficult, and exposes production credentials in version control.

## Findings

**Source:** Security Sentinel Agent Review of PR #4

**Location:** `/Users/bnapier/projects/clarity/src/lib/google-auth.ts:4-5`

```typescript
const GOOGLE_CLIENT_ID =
  '718146632898-3tsbeksgrpt5p4k1faki4jea2kevva3r.apps.googleusercontent.com';
```

**Impact:**
- Cannot use different OAuth apps for dev/staging/production
- Credential rotation requires code changes and redeployment
- Production credentials visible in git history

## Proposed Solutions

### Option A: Move to Environment Variable (Recommended)

```typescript
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  throw new Error('VITE_GOOGLE_CLIENT_ID environment variable is required');
}
```

Update `.env.example`:
```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

- **Pros:** Consistent with Supabase config pattern, enables environment separation
- **Cons:** Requires env setup on each environment
- **Effort:** Small (5 minutes)
- **Risk:** None

## Recommended Action

Implement Option A - move to environment variable for consistency with other credentials.

## Technical Details

**Affected Files:**
- `src/lib/google-auth.ts` - Move constant to env var
- `.env.example` - Add example entry
- `.env` - Add actual value (gitignored)

## Acceptance Criteria

- [ ] Google Client ID loaded from `VITE_GOOGLE_CLIENT_ID`
- [ ] Helpful error message if env var missing
- [ ] `.env.example` updated with placeholder
- [ ] OAuth flow still works on iOS and web

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from security review | Hardcoded credentials identified |

## Resources

- PR #4: Phase 1 Authentication
- Supabase config pattern: `src/lib/supabase.ts`
