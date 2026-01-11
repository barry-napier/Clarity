---
status: pending
priority: p2
issue_id: "063"
tags: [code-review, pr-9, performance, consistency, react]
dependencies: ["062"]
---

# RAF Batching Not Applied to use-ai-chat.ts

## Problem Statement

PR #9 adds RAF batching to `use-checkin-chat.ts` to reduce streaming re-renders from 50-200+ to ~60fps, but the sibling hook `use-ai-chat.ts` still uses per-chunk state updates. This creates:
1. Inconsistent performance between check-in and regular chat
2. User may experience jank in regular chat but smooth check-ins
3. Maintenance burden - two different streaming implementations

## Findings

**Location:** `src/lib/ai/use-ai-chat.ts:98-108`

**Current (use-ai-chat.ts - NOT optimized):**
```typescript
for await (const chunk of result.textStream) {
  fullContent += chunk;
  setMessages((prev) => {
    const newMessages = [...prev];
    const lastMessage = newMessages[newMessages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.content = fullContent;  // Also mutates in place (anti-pattern)
    }
    return newMessages;
  });
}
```

**New (use-checkin-chat.ts - optimized):**
```typescript
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
          { ...lastMessage, content: pendingContentRef.current },
        ];
      });
      rafIdRef.current = null;
    });
  }
}
```

**Additional Issue:** The `use-ai-chat.ts` version also mutates `lastMessage.content` in place, which is a React anti-pattern.

**Discovery:** Pattern analysis by pattern-recognition-specialist and architecture-strategist agents

## Proposed Solutions

### Option 1: Apply Same RAF Pattern to use-ai-chat.ts (Recommended)

Copy the RAF batching pattern from `use-checkin-chat.ts`.

**Pros:** Consistent performance, fixes mutation anti-pattern
**Cons:** Code duplication
**Effort:** Small
**Risk:** Low

### Option 2: Extract Shared Streaming Hook

Create `useStreamingMessage` hook used by both.

```typescript
// src/lib/ai/use-streaming-message.ts
export function useStreamingMessage() {
  const pendingRef = useRef<string>('');
  const rafIdRef = useRef<number | null>(null);

  const updateContent = useCallback((content: string, setMessages: SetState) => {
    pendingRef.current = content;
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        setMessages(/* ... */);
        rafIdRef.current = null;
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return { updateContent };
}
```

**Pros:** DRY, single source of truth
**Cons:** More refactoring, new abstraction
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option 1 for immediate fix, consider Option 2 as follow-up if more streaming use cases emerge.

## Technical Details

**Affected files:**
- `src/lib/ai/use-ai-chat.ts`

## Acceptance Criteria

- [ ] `use-ai-chat.ts` uses RAF batching for streaming updates
- [ ] No mutation of message objects in state
- [ ] RAF cleanup on unmount (per #062)
- [ ] Streaming performance parity with check-in chat

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #9 code review | Optimization not consistently applied |

## Resources

- PR #9: https://github.com/barry-napier/clarity/pull/9
- Depends on: #062 (RAF cleanup pattern)
