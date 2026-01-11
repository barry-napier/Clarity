---
status: completed
priority: p1
issue_id: "039"
tags: [code-review, simplicity, phase-4-checkins, dead-code]
dependencies: []
---

# Delete Unused context-builder.ts (119 LOC)

## Problem Statement

The file `src/lib/ai/context-builder.ts` (119 lines) is completely unused. None of its exported functions are imported anywhere in the codebase. This adds confusion about where context is built and increases bundle size unnecessarily.

## Findings

**Location:** `src/lib/ai/context-builder.ts`

**Unused exports:**
- `buildContext`
- `formatChatHistory`
- `prepareMemoryContext`
- `isContextNearLimit`

**Verification:** Grep for imports shows no usage anywhere in the codebase. The prompt building is done inline in `prompts.ts` instead.

## Proposed Solutions

### Option 1: Delete the File (Recommended)
Simply remove the unused file.

**Pros:** Immediate cleanup, no risk
**Cons:** None
**Effort:** Minimal
**Risk:** None

### Option 2: Refactor to Use It
Update prompt building to use these utilities.

**Pros:** Better organization
**Cons:** Requires refactoring working code
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option 1 - Delete `src/lib/ai/context-builder.ts` immediately.

## Technical Details

**Files to delete:**
- `src/lib/ai/context-builder.ts`

## Acceptance Criteria

- [ ] File deleted
- [ ] Build passes
- [ ] No runtime errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #7 simplicity review | Remove dead code to reduce confusion |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
