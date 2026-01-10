---
status: pending
priority: p3
issue_id: "024"
tags: [code-review, typescript, maintainability]
dependencies: []
---

# Extract Magic Number for Token Expiry Buffer

## Problem Statement

The token refresh threshold uses a magic number `300000` (5 minutes in milliseconds) without explanation. This reduces code readability and makes it harder to adjust the value if needed.

## Findings

**Source:** TypeScript Reviewer Agent

**Location:** `/Users/bnapier/projects/clarity/src/lib/token-service.ts:34`

```typescript
if (parseInt(expiry) - Date.now() < 300000) {
  return await doTokenRefresh();
}
```

**Impact:** Minor readability issue. Developers must mentally calculate that 300000ms = 5 minutes.

## Proposed Solutions

### Option A: Extract to Named Constant (Recommended)

```typescript
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

if (parseInt(expiry) - Date.now() < TOKEN_REFRESH_BUFFER_MS) {
  return await doTokenRefresh();
}
```

- **Pros:** Self-documenting, easy to find and change
- **Cons:** None
- **Effort:** Small (one line change)
- **Risk:** None

### Option B: Move to Config File

```typescript
// src/lib/config.ts
export const AUTH_CONFIG = {
  TOKEN_REFRESH_BUFFER_MS: 5 * 60 * 1000,
};
```

- **Pros:** Centralized configuration, potentially overridable
- **Cons:** May be overkill for a single value
- **Effort:** Small
- **Risk:** None

## Recommended Action

Implement Option A when touching this file for other changes.

## Technical Details

- **Affected Files:** `src/lib/token-service.ts`
- **Components:** Token refresh logic
- **Database Changes:** None

## Acceptance Criteria

- [ ] Magic number replaced with named constant
- [ ] Comment explains the purpose (refresh 5 minutes before expiry)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #3 review | Magic numbers reduce maintainability |

## Resources

- [PR #3](https://github.com/barry-napier/Clarity/pull/3)
