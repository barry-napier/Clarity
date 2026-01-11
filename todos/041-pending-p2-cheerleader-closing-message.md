---
status: pending
priority: p2
issue_id: "041"
tags: [code-review, architecture, phase-4-checkins, product]
dependencies: []
---

# Hardcoded Cheerleader Closing Message Violates Tone

## Problem Statement

When the check-in completes, the closing message is hardcoded: "Good luck with your priority!" This violates the product's "no cheerleading" tone principle from the spec. The product philosophy explicitly rejects empty encouragement.

## Findings

**Location:** `src/lib/ai/use-checkin-chat.ts` (lines 171-184)

```typescript
if (nextStage === 'complete') {
  const closingMessage: Message = {
    id: generateMessageId(),
    role: 'assistant',
    content: "Got it. You're all set for today. Good luck with your priority!",
    //                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //                                          Violates "no cheerleading" principle
  };
}
```

**From CLAUDE.md:**
> - **No cheerleading, no fluff** - Anti-toxic-positivity, honest questions that make you think

## Proposed Solutions

### Option 1: Simple Direct Message (Recommended)
Replace with a direct, non-cheerleader message.

```typescript
content: "Got it. Your check-in is saved."
```

**Pros:** Simple, aligns with tone
**Cons:** Less personal
**Effort:** Minimal
**Risk:** None

### Option 2: Route Through AI
Have the AI generate the closing message based on the conversation.

**Pros:** More natural, contextual
**Cons:** Additional API call, latency
**Effort:** Medium
**Risk:** Low

### Option 3: Varied Closings Based on Content
Select from pool of closings based on what was discussed.

**Pros:** More personalized
**Cons:** Complexity, still risks cheerleading
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option 1 - Replace with simple direct message: "Got it. Your check-in is saved."

## Technical Details

**Affected files:**
- `src/lib/ai/use-checkin-chat.ts`

## Acceptance Criteria

- [ ] Closing message does not contain empty encouragement
- [ ] Message aligns with product tone guidelines
- [ ] Change tested in actual check-in flow

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #7 architecture review | Product tone should be consistent throughout |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
- CLAUDE.md tone guidelines
