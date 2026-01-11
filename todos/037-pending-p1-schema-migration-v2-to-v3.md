---
status: pending
priority: p1
issue_id: "037"
tags: [code-review, data-integrity, phase-4-checkins, migration]
dependencies: []
---

# No Schema Migration Logic for v2 to v3 Upgrade

## Problem Statement

The database schema version is bumped from v2 to v3 with breaking changes to `CheckinEntry` and `Checkin` interfaces, but there is no migration logic to transform existing data. Users with existing v2 checkin data will have corrupted records.

## Findings

**Location:** `src/lib/db/schema.ts`

**Breaking changes in v3:**
- `CheckinEntry.type` values changed: `'emotion' | 'highlight' | 'challenge' | 'looking_forward'` → `'energy' | 'wins' | 'friction' | 'priority'`
- `CheckinEntry.content` removed, replaced with `question`, `response`, `followUp`, `followUpResponse`
- New required fields: `Checkin.timeOfDay`, `Checkin.status`, `Checkin.stage`

**Corruption Scenario:**
```typescript
// Existing v2 CheckinEntry:
{ type: 'emotion', content: 'feeling good', timestamp: 123 }

// Code expects v3 format:
entry.response  // undefined - data loss
entry.type      // 'emotion' - not in valid union, unpredictable behavior
```

## Proposed Solutions

### Option 1: Add Dexie Upgrade Handler (Recommended)
Implement proper migration in schema definition.

```typescript
this.version(3).stores({...}).upgrade(tx => {
  return tx.table('checkins').toCollection().modify(checkin => {
    checkin.entries = checkin.entries.map(e => ({
      type: mapOldTypeToNew(e.type),
      question: 'Migrated from v2',
      response: e.content || '',
      timestamp: e.timestamp
    }));
    checkin.status = checkin.status || 'complete';
    checkin.stage = 'complete';
    checkin.timeOfDay = checkin.timeOfDay || 'morning';
  });
});
```

**Pros:** Proper migration, data preserved, standard Dexie pattern
**Cons:** Need to define type mapping, slightly complex
**Effort:** Medium
**Risk:** Low

### Option 2: Clear Old Data
Delete all v2 checkins during upgrade.

**Pros:** Simple, clean slate
**Cons:** Data loss for existing users
**Effort:** Low
**Risk:** High (data loss)

## Recommended Action

Option 1 - Implement proper Dexie upgrade handler with type mapping.

## Technical Details

**Affected files:**
- `src/lib/db/schema.ts`

**Type mapping:**
```typescript
const typeMap = {
  'emotion': 'energy',
  'highlight': 'wins',
  'challenge': 'friction',
  'looking_forward': 'priority'
};
```

## Acceptance Criteria

- [ ] Upgrade handler migrates existing checkins
- [ ] Old entry types are mapped to new types
- [ ] Missing required fields have sensible defaults
- [ ] No data loss for existing users
- [ ] Migration is idempotent (safe to run multiple times)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #7 data integrity review | Always add migration logic when changing schemas |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
- Dexie Migration Docs: https://dexie.org/docs/Dexie/Dexie.version()
