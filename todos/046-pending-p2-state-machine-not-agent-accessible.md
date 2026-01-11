---
status: pending
priority: p2
issue_id: "046"
tags: [code-review, agent-native, phase-4-checkins, architecture]
dependencies: []
---

# State Machine Locked in Hook - Not Agent Accessible

## Problem Statement

The entire check-in state machine is locked inside the `useCheckinChat` React hook. An agent cannot programmatically conduct a check-in - the 4-question flow (energy, wins, friction, priority) is only accessible through React components.

## Findings

**Location:** `src/lib/ai/use-checkin-chat.ts`

The state machine constants are defined inside the hook but not exported:
```typescript
const STAGE_TO_TYPE = { ... };   // Not exported
const NEXT_STAGE = { ... };      // Not exported
const STAGE_QUESTIONS = { ... }; // Not exported
```

**Impact:**
- Agents cannot conduct check-ins programmatically
- All check-in functionality requires UI
- No headless check-in path exists
- Violates agent-native architecture principles

## Proposed Solutions

### Option 1: Extract State Machine to Shared Service (Recommended)
Move state machine logic to a separate module usable by both hooks and agents.

```typescript
// checkin-state-machine.ts
export function getNextStage(current: CheckinStage): CheckinStage
export function getQuestionForStage(stage: CheckinStage): string
export async function processCheckinResponse(
  checkinId: string,
  stage: CheckinStage,
  response: string
): Promise<CheckinStage>
```

**Pros:** Enables agent access, clean separation
**Cons:** Refactoring required
**Effort:** Medium
**Risk:** Low

### Option 2: Create Headless Check-in Function
Add a function that accepts all 4 answers at once.

```typescript
export async function conductCheckinHeadless(
  answers: { energy: string; wins: string; friction: string; priority: string }
): Promise<Checkin>
```

**Pros:** Simple agent API
**Cons:** Different flow than interactive
**Effort:** Low
**Risk:** Low

## Recommended Action

Option 1 for long-term, Option 2 as quick win.

## Technical Details

**Affected files:**
- `src/lib/ai/use-checkin-chat.ts` - Extract state machine
- New file: `src/lib/checkin-state-machine.ts`
- New file: `src/lib/checkins-service.ts` (headless API)

## Acceptance Criteria

- [ ] State machine logic accessible outside React
- [ ] Agent can conduct check-in without UI
- [ ] Same validation/persistence as UI flow
- [ ] Memory extraction triggered on headless completion

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #7 agent-native review | Core business logic shouldn't be locked in UI layer |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
