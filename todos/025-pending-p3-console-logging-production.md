---
status: pending
priority: p3
issue_id: "025"
tags: [code-review, security, logging]
dependencies: []
---

# Remove or Abstract Console Logging for Production

## Problem Statement

Multiple files use `console.error` to log error details including sync item data. In production, this could expose sensitive information through debugging tools or crash reporters.

## Findings

**Source:** Security Sentinel Agent

**Locations:**
- `/Users/bnapier/projects/clarity/src/lib/token-service.ts:56`
- `/Users/bnapier/projects/clarity/src/lib/sync/processor.ts:27, 30`

```typescript
// token-service.ts
console.error('Token refresh failed:', error);

// processor.ts
console.error('Sync failed for item:', item, error);
console.error('Max retries exceeded, removing from queue:', item);
```

**Impact:** Could leak internal error details, token metadata, or entity data to logs accessible by debugging tools or crash reporters.

## Proposed Solutions

### Option A: Create Logging Abstraction (Recommended)

```typescript
// src/lib/logger.ts
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  error: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.error(message, ...args);
    } else {
      // In production, log only the message, not the data
      console.error(message);
    }
  },
};
```

- **Pros:** Controlled logging, can add crash reporter integration later
- **Cons:** Slight overhead
- **Effort:** Small
- **Risk:** None

### Option B: Remove All Console Logs

- **Pros:** Zero exposure risk
- **Cons:** Harder to debug issues in development
- **Effort:** Small
- **Risk:** Low - may miss debugging info

## Recommended Action

Consider when adding error monitoring/crash reporting infrastructure.

## Technical Details

- **Affected Files:** `src/lib/token-service.ts`, `src/lib/sync/processor.ts`
- **Components:** Token refresh, sync processing
- **Database Changes:** None

## Acceptance Criteria

- [ ] Console.error calls either removed or wrapped in abstraction
- [ ] Sensitive data (item contents, error details) not logged in production
- [ ] Development logging still functional

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #3 review | Logging can expose sensitive data |

## Resources

- [PR #3](https://github.com/barry-napier/Clarity/pull/3)
