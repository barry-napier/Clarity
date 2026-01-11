---
status: pending
priority: p3
issue_id: "059"
tags: [code-review, pr-8, phase-4-checkins, simplification, yagni]
dependencies: []
---

# Time-of-Day Logic Could Be Simplified

## Problem Statement

The time-based question variation feature uses two functions and two refs to answer one simple question: "Is it before noon?" This is over-engineered for the current requirements.

## Findings

**Location:** `src/lib/ai/use-checkin-chat.ts:41-63, 104-106`

**Current Code (23 lines):**
```typescript
function getTimeOfDay(): 'morning' | 'evening' {
  return new Date().getHours() < 12 ? 'morning' : 'evening';
}

function getStageQuestions(timeOfDay: 'morning' | 'evening'): Record<string, string> {
  const isMorning = timeOfDay === 'morning';
  return {
    awaiting_energy: isMorning ? '...' : '...',
    awaiting_wins: isMorning ? '...' : '...',
    awaiting_friction: isMorning ? '...' : '...',
    awaiting_priority: isMorning ? '...' : '...',
  };
}

const timeOfDayRef = useRef<'morning' | 'evening'>(getTimeOfDay());
const stageQuestionsRef = useRef(getStageQuestions(timeOfDayRef.current));
```

**Issue:** The `'morning' | 'evening'` type union is immediately converted to a boolean (`isMorning`) - the string values are never used meaningfully. Two functions + two refs for a simple boolean check.

**Discovery:** Code simplicity review by code-simplicity-reviewer agent

## Proposed Solutions

### Option 1: Single Boolean Ref (Recommended)
Replace with a single boolean ref and inline the questions.

```typescript
// Single ref captures the decision at check-in start
const isMorningRef = useRef(new Date().getHours() < 12);

// Use inline where needed (line 131-132)
const question = isMorningRef.current
  ? 'How are you feeling today?'
  : 'How are you feeling right now?';
```

**Pros:** Simpler, fewer abstractions, clearer intent
**Cons:** Questions are inlined (but only used in 2 places)
**Effort:** Small
**Risk:** None

### Option 2: Keep Structure, Remove Type Union
Keep the functions but use boolean instead of string union.

```typescript
function isMorning(): boolean {
  return new Date().getHours() < 12;
}
```

**Pros:** Slightly simpler
**Cons:** Still has extra abstraction
**Effort:** Small
**Risk:** None

## Recommended Action

Option 1 - Single boolean ref. The current abstraction provides no benefit over a simple boolean. The string `'morning'` vs `'evening'` is never logged, displayed, or stored - it only exists to be converted to a boolean.

## Technical Details

**Affected files:**
- `src/lib/ai/use-checkin-chat.ts`

**LOC Reduction:** ~15 lines

## Acceptance Criteria

- [ ] Time-of-day logic simplified to single boolean ref
- [ ] Questions still vary correctly based on time
- [ ] Time is still captured at check-in start (not re-evaluated mid-session)
- [ ] No functional change to user experience

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #8 simplicity review | Type union adds no value over boolean |

## Resources

- PR #8: https://github.com/barry-napier/Clarity/pull/8
- YAGNI principle: https://martinfowler.com/bliki/Yagni.html
