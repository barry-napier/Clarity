---
status: pending
priority: p3
issue_id: "050"
tags: [code-review, simplicity, phase-4-checkins, dead-code]
dependencies: []
---

# Delete Unused Memory Compression Function

## Problem Statement

The `compressMemoryIfNeeded()` function in memory-extractor.ts is implemented but never called anywhere. This is 44 lines of dead code (YAGNI violation).

## Findings

**Location:** `src/lib/ai/memory-extractor.ts` (lines 133-176)

**Impact:**
- 44 lines of unused code
- Premature optimization for a problem that doesn't exist yet

## Proposed Solutions

### Option 1: Delete the Function (Recommended)
Remove until actually needed.

**Pros:** Cleaner codebase
**Cons:** Will need to rewrite if needed later
**Effort:** Minimal
**Risk:** None

## Recommended Action

Delete the unused function.

## Acceptance Criteria

- [ ] Function removed
- [ ] Related MEMORY_COMPRESSION_PROMPT can be removed if not used elsewhere
- [ ] Build passes
