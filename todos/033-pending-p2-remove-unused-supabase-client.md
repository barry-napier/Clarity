---
status: pending
priority: p2
issue_id: "033"
tags: [code-review, yagni, cleanup]
dependencies: []
---

# Remove Unused Supabase Client (YAGNI)

## Problem Statement

The file `src/lib/supabase.ts` creates a fully configured Supabase client with custom storage adapter for "future features." This is textbook YAGNI (You Aren't Gonna Need It) - the client is imported nowhere and serves no current purpose.

## Findings

**Source:** Code Simplicity Reviewer Analysis of PR #4

**Location:** `/Users/bnapier/projects/clarity/src/lib/supabase.ts`

The file's own comment explains the issue:

```typescript
// We're using Google OAuth directly, not through Supabase Auth
// Supabase is primarily for analytics and future features
```

**File Stats:** 31 lines of unused code

**Impact:**
- Dead code in codebase
- Environment variables required but unused
- Mental overhead for developers wondering what it does
- Bundle size (though minimal with tree-shaking)

## Proposed Solutions

### Option A: Remove Entirely (Recommended)

Delete the file and remove from any imports.

```bash
rm src/lib/supabase.ts
```

Also remove from `.env.example`:
```diff
- VITE_SUPABASE_URL=
- VITE_SUPABASE_ANON_KEY=
```

- **Pros:** Clean codebase, follows YAGNI
- **Cons:** Need to recreate when actually needed
- **Effort:** Tiny (2 minutes)
- **Risk:** None

### Option B: Keep but Document

Add a TODO comment and keep for future:

```typescript
// TODO: Not currently used. Will be enabled for analytics in Phase 3.
// Remove if Phase 3 scope changes.
```

- **Pros:** Ready when needed
- **Cons:** Violates YAGNI, clutters codebase
- **Effort:** Tiny
- **Risk:** None

## Recommended Action

Implement Option A - remove the file. It can be easily recreated from documentation when actually needed.

## Technical Details

**Files to Remove:**
- `src/lib/supabase.ts`

**Files to Update:**
- `.env.example` - Remove Supabase entries (or keep as placeholder)

**Verification:**
- `grep -r "supabase" src/` should return no imports

## Acceptance Criteria

- [ ] `src/lib/supabase.ts` deleted
- [ ] No import errors
- [ ] Build still succeeds
- [ ] Decision documented (in this todo or commit message)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from simplicity review | YAGNI violation identified |

## Resources

- PR #4: Phase 1 Authentication
- Martin Fowler: YAGNI principle
