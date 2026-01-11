---
status: pending
priority: p2
issue_id: "047"
tags: [code-review, performance, phase-4-checkins, react]
dependencies: []
---

# Streaming State Updates Cause Excessive Re-renders

## Problem Statement

Each streaming chunk from the AI triggers a state update and full re-render. With 50-100+ chunks per response, this creates significant render overhead and potential performance issues on lower-end devices.

## Findings

**Location:** `src/lib/ai/use-checkin-chat.ts` (lines 222-234)

```typescript
for await (const chunk of result.textStream) {
  fullContent += chunk;
  setMessages((prev) => {
    const newMessages = [...prev];  // Creates new array each time
    const lastMessage = newMessages[newMessages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.content = fullContent;
    }
    return newMessages;
  });
}
```

**Impact:**
- 50-100+ re-renders per AI response
- Each re-render copies messages array
- Triggers downstream component re-renders
- Poor performance on low-end devices

## Proposed Solutions

### Option 1: Throttle/RAF Updates (Recommended)
Limit updates to animation frame rate (60fps).

```typescript
const streamingRef = useRef('');
const rafId = useRef<number>();

for await (const chunk of result.textStream) {
  streamingRef.current += chunk;
  if (!rafId.current) {
    rafId.current = requestAnimationFrame(() => {
      setMessages(prev => /* update with streamingRef.current */);
      rafId.current = undefined;
    });
  }
}
```

**Pros:** Smooth visual updates, minimal renders
**Cons:** Slightly more complex
**Effort:** Low
**Risk:** Low

### Option 2: Ref for Streaming, State on Complete
Use ref during streaming, only update state when done.

**Pros:** Minimal renders
**Cons:** May feel less responsive
**Effort:** Low
**Risk:** Low

## Recommended Action

Option 1 - Throttle using requestAnimationFrame.

## Technical Details

**Affected files:**
- `src/lib/ai/use-checkin-chat.ts`
- `src/lib/ai/use-ai-chat.ts` (same pattern)

## Acceptance Criteria

- [ ] Streaming feels smooth (60fps)
- [ ] Re-renders reduced to ~60 max per response
- [ ] Final content is accurate
- [ ] No visual stuttering

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #7 performance review | Batch state updates during high-frequency operations |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
