---
status: pending
priority: p3
issue_id: "051"
tags: [code-review, simplicity, phase-4-checkins, dead-code]
dependencies: []
---

# Delete Unused Functions in chats.ts

## Problem Statement

Several exported functions in chats.ts are never used, adding ~60 lines of dead code.

## Findings

**Location:** `src/lib/chats.ts`

**Unused functions:**
- `updateLastAssistantMessage` (lines 132-154) - streaming updates happen in React state
- `addMessage` (lines 93-127) - messages persisted via `persistChatMessages` instead
- `getChatsByDate` (lines 173-175) - never called

## Proposed Solutions

### Option 1: Delete Unused Functions (Recommended)

**Pros:** Cleaner API surface, less code to maintain
**Cons:** May need to rewrite if needed later
**Effort:** Minimal
**Risk:** None

## Recommended Action

Delete the unused functions.

## Acceptance Criteria

- [ ] Unused functions removed
- [ ] Build passes
- [ ] No runtime errors
