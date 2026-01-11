---
status: pending
priority: p3
issue_id: "068"
tags: [code-review, pr-9, agent-native, api-design]
dependencies: []
---

# Export State Machine for Agent Accessibility

## Problem Statement

The check-in state machine (`NEXT_STAGE`, `STAGE_TO_TYPE`, `isStageWithEntry`) and questions (`getStageQuestions`) are internal to `use-checkin-chat.ts`. External agents cannot programmatically understand or navigate the check-in flow.

## Findings

**Location:** `src/lib/ai/use-checkin-chat.ts:24-72`

**Currently Internal:**
- `StageWithEntry` type
- `isStageWithEntry()` type guard
- `STAGE_TO_TYPE` mapping
- `NEXT_STAGE` mapping
- `getStageQuestions()` function

**Agent Impact:**
- Cannot understand valid state transitions
- Cannot predict next question
- Cannot validate their own navigation through the flow
- Must reimplement logic to test the flow

## Proposed Solutions

### Option 1: Export Constants and Helpers (Recommended)

```typescript
// Export from use-checkin-chat.ts or move to checkins.ts
export type { StageWithEntry };
export { isStageWithEntry, NEXT_STAGE, STAGE_TO_TYPE, getStageQuestions };
```

**Pros:** Enables agent testing, single source of truth
**Cons:** Minor API surface expansion
**Effort:** Small
**Risk:** None

### Option 2: Create Agent API Module

Create `src/lib/agent/checkin-api.ts` with agent-friendly functions.

**Pros:** Clean separation, documented agent API
**Cons:** More files, duplication risk
**Effort:** Medium
**Risk:** Low

## Acceptance Criteria

- [ ] State machine constants exported
- [ ] `getStageQuestions()` accessible externally
- [ ] Agent can programmatically navigate check-in flow

## Resources

- PR #9: https://github.com/barry-napier/clarity/pull/9
- Agent-native architecture review findings
