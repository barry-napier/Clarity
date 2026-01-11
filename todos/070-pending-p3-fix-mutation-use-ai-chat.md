---
status: pending
priority: p3
issue_id: "070"
tags: [code-review, pr-9, react, anti-pattern]
dependencies: ["063"]
---

# Fix Mutable State Pattern in use-ai-chat.ts

## Problem Statement

`use-ai-chat.ts` mutates message objects in place during streaming, which is a React anti-pattern. PR #9 fixed this in `use-checkin-chat.ts` but not in `use-ai-chat.ts`.

## Findings

**Location:** `src/lib/ai/use-ai-chat.ts:98-108`

**Current (anti-pattern):**
```typescript
setMessages((prev) => {
  const newMessages = [...prev];
  const lastMessage = newMessages[newMessages.length - 1];
  if (lastMessage && lastMessage.role === 'assistant') {
    lastMessage.content = fullContent;  // MUTATION!
  }
  return newMessages;
});
```

**Fixed Pattern (use-checkin-chat.ts):**
```typescript
setMessages((prev) => {
  const lastIndex = prev.length - 1;
  const lastMessage = prev[lastIndex];
  if (lastMessage?.role !== 'assistant') return prev;
  return [
    ...prev.slice(0, lastIndex),
    { ...lastMessage, content: pendingContentRef.current },  // Immutable
  ];
});
```

## Proposed Solutions

### Option 1: Apply Same Immutable Pattern (Recommended)

Copy the pattern from `use-checkin-chat.ts`.

**Pros:** Follows React best practices, consistent codebase
**Cons:** Minor performance overhead (new object creation)
**Effort:** Small
**Risk:** None

## Acceptance Criteria

- [ ] No mutation of message objects
- [ ] Returns new array with new message object
- [ ] Behavior unchanged

## Resources

- PR #9: https://github.com/barry-napier/clarity/pull/9
- Depends on: #063 (RAF batching for use-ai-chat.ts)
