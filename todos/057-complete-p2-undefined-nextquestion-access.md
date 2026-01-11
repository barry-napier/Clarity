---
status: complete
priority: p2
issue_id: "057"
tags: [code-review, pr-8, phase-4-checkins, typescript, null-safety]
dependencies: ["056"]
---

# Potential Undefined Access on nextQuestion

## Problem Statement

When accessing `stageQuestionsRef.current[nextStage]` at line 237, if `nextStage` is `'idle'` or `'complete'`, the result is `undefined`. This undefined value flows into the instruction string without validation, potentially causing malformed AI prompts.

## Findings

**Location:** `src/lib/ai/use-checkin-chat.ts:237`

**Current Code:**
```typescript
// Line 237
const nextQuestion = stageQuestionsRef.current[nextStage];
const instruction = `The user just answered the ${entryType} question. Acknowledge briefly (1-2 sentences), then ask: "${nextQuestion}"`;
```

**Contrast with line 131-132 which has a fallback:**
```typescript
const question = questions[nextStage] || questions.awaiting_energy;
```

**Issue:** If `nextStage` is `'complete'` (which happens after the priority stage), `nextQuestion` will be `undefined`, resulting in the instruction: `"...then ask: "undefined""`.

**Note:** In practice, the code path at line 237 may never reach this state because of the early return at lines 195-211 when `nextStage === 'complete'`. However, defensive coding would add explicit handling.

**Discovery:** TypeScript review by kieran-typescript-reviewer agent

## Proposed Solutions

### Option 1: Add Explicit Guard (Recommended)
Add a guard clause before using nextQuestion.

```typescript
const nextQuestion = stageQuestionsRef.current[nextStage as StageWithEntry];
if (!nextQuestion) {
  // This shouldn't happen in normal flow - log and handle gracefully
  console.error(`No question defined for stage: ${nextStage}`);
  return;
}
const instruction = `...then ask: "${nextQuestion}"`;
```

**Pros:** Explicit handling, clear error message, prevents malformed prompts
**Cons:** Adds a few lines of code
**Effort:** Small
**Risk:** None

### Option 2: Use nullish coalescing with fallback
Provide a fallback question.

```typescript
const nextQuestion = stageQuestionsRef.current[nextStage] ?? 'Is there anything else on your mind?';
```

**Pros:** Never undefined
**Cons:** Masks potential bugs, fallback may not be appropriate
**Effort:** Small
**Risk:** Low

## Recommended Action

Option 1 - Add explicit guard. The early return at line 195 means this code path shouldn't be reached for 'complete', but explicit handling documents this assumption and catches any future regressions.

## Technical Details

**Affected files:**
- `src/lib/ai/use-checkin-chat.ts`

## Acceptance Criteria

- [ ] Accessing `stageQuestionsRef.current[nextStage]` is guarded
- [ ] Invalid stage access logs an error
- [ ] No `undefined` appears in AI instruction strings

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #8 TypeScript review | Undefined access possible in edge case |

## Resources

- PR #8: https://github.com/barry-napier/Clarity/pull/8
