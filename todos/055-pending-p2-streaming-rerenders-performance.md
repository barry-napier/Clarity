---
status: pending
priority: p2
issue_id: "055"
tags: [code-review, pr-8, phase-4-checkins, performance, react]
dependencies: []
---

# Streaming State Updates Cause Excessive Re-renders

## Problem Statement

The AI streaming implementation in `use-checkin-chat.ts` triggers a state update (`setMessages`) for every chunk received during streaming. This can result in 50-200+ re-renders per AI response, causing janky scrolling on mobile devices and excessive CPU/battery usage.

## Findings

**Location:** `src/lib/ai/use-checkin-chat.ts:250-259`

**Current Code:**
```typescript
for await (const chunk of result.textStream) {
  fullContent += chunk;
  setMessages((prev) => {
    const newMessages = [...prev];
    const lastMessage = newMessages[newMessages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.content = fullContent;
    }
    return newMessages;
  });
}
```

**Issues:**
1. Every chunk triggers a state update → re-render
2. Creates a new array copy on every update (`[...prev]`)
3. Mutates the copied object (shared reference issue)
4. At 20-50ms streaming intervals, this means 20-50 re-renders per second

**Discovery:** Performance review by performance-oracle agent

## Proposed Solutions

### Option 1: Batch Updates with requestAnimationFrame (Recommended)
Throttle updates to match display refresh rate (~60fps max).

```typescript
const pendingContentRef = useRef<string>('');
const rafIdRef = useRef<number | null>(null);

for await (const chunk of result.textStream) {
  fullContent += chunk;
  pendingContentRef.current = fullContent;

  if (rafIdRef.current === null) {
    rafIdRef.current = requestAnimationFrame(() => {
      setMessages((prev) => {
        const lastIndex = prev.length - 1;
        const lastMessage = prev[lastIndex];
        if (lastMessage?.role !== 'assistant') return prev;

        return [
          ...prev.slice(0, lastIndex),
          { ...lastMessage, content: pendingContentRef.current }
        ];
      });
      rafIdRef.current = null;
    });
  }
}
```

**Pros:** Reduces re-renders by ~80%, proper immutable updates
**Cons:** Slightly more complex code
**Effort:** Small
**Risk:** Low

### Option 2: Use useReducer with batched dispatch
Use React's automatic batching with useReducer.

**Pros:** React-native solution
**Cons:** Larger refactor needed
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option 1 - RAF batching. Quick to implement, significant performance gain.

## Technical Details

**Affected files:**
- `src/lib/ai/use-checkin-chat.ts`

**Performance Impact:**
| Metric | Current | With RAF Batching |
|--------|---------|-------------------|
| Re-renders per response | 50-200 | ~16 (capped at 60fps) |
| CPU during streaming | High | Low |
| Battery impact | Moderate | Low |

## Acceptance Criteria

- [ ] Streaming text appears smoothly without jank
- [ ] Re-renders during streaming are capped at ~60/second
- [ ] No visual difference in streaming behavior
- [ ] Works correctly on iOS simulator

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #8 performance review | Streaming causes O(chunks) re-renders |

## Resources

- PR #8: https://github.com/barry-napier/Clarity/pull/8
- React Re-render Optimization: https://react.dev/learn/render-and-commit
