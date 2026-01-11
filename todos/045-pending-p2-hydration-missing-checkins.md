---
status: pending
priority: p2
issue_id: "045"
tags: [code-review, data-integrity, phase-4-checkins, sync]
dependencies: []
---

# Hydration Does Not Include Checkins

## Problem Statement

The `hydrateFromDrive` function only hydrates `captures`. Checkins, chats, and memory are not hydrated from Drive on first launch or new device, resulting in data loss.

## Findings

**Location:** `src/lib/sync/hydrate.ts`

```typescript
const captureFiles = files.filter((f) => f.name.startsWith('capture-'));
// ...only processes capture files
```

**Impact:**
- User reinstalls app or uses new device
- Captures are restored from Drive ✓
- All check-in history is LOST ✗
- Memory document is LOST ✗
- Chat history is LOST ✗

## Proposed Solutions

### Option 1: Extend Hydration to All Entities (Recommended)
Add hydration for all syncable entity types.

```typescript
const entityPrefixes = ['capture-', 'checkin-', 'chat-', 'memory-', 'northstar-', 'framework-'];
// Process each entity type with appropriate handler
```

**Pros:** Complete data recovery, consistent behavior
**Cons:** More complex hydration logic
**Effort:** Medium
**Risk:** Low

### Option 2: Entity-Specific Hydration Functions
Create separate hydrate functions per entity type.

**Pros:** Clear separation, easier testing
**Cons:** More code, coordination needed
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option 1 - Extend existing hydration to handle all entity types.

## Technical Details

**Affected files:**
- `src/lib/sync/hydrate.ts`

**Entity types to add:**
- `checkin-*` files
- `chat-*` files
- `memory-*` files
- `northstar-*` files
- `framework-*` files

## Acceptance Criteria

- [ ] All entity types are hydrated from Drive
- [ ] Hydration handles schema differences gracefully
- [ ] Duplicate detection prevents overwriting local changes
- [ ] Progress indicator for multi-entity hydration

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #7 data integrity review | Hydration should cover all syncable entities |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
