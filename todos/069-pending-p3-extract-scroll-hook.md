---
status: pending
priority: p3
issue_id: "069"
tags: [code-review, pr-9, code-duplication, react]
dependencies: []
---

# Extract Shared Scroll Handling Hook

## Problem Statement

Both `chat-view.tsx` and `checkin-view.tsx` have nearly identical scroll handling logic:
- `userHasScrolled` state
- `scrollContainerRef` and `messagesEndRef`
- `handleScroll` callback
- Auto-scroll useEffect

This duplication increases maintenance burden.

## Findings

**Location:**
- `src/components/chat/chat-view.tsx:19-69`
- `src/components/checkin/checkin-view.tsx:26-130`

**Duplicated Pattern:**
```typescript
const messagesEndRef = useRef<HTMLDivElement>(null);
const scrollContainerRef = useRef<HTMLDivElement>(null);
const [userHasScrolled, setUserHasScrolled] = useState(false);

useEffect(() => {
  if (!userHasScrolled && messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }
}, [messages, isStreaming, userHasScrolled]);

const handleScroll = useCallback(() => {
  // ... identical logic
}, [isStreaming]);
```

## Proposed Solutions

### Option 1: Extract useAutoScroll Hook (Recommended)

```typescript
// src/lib/use-auto-scroll.ts
export function useAutoScroll(deps: { messages: any[]; isStreaming: boolean }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);

  // ... logic

  return {
    messagesEndRef,
    scrollContainerRef,
    handleScroll,
    resetScroll: () => setUserHasScrolled(false),
  };
}
```

**Pros:** DRY, centralized scroll behavior
**Cons:** New abstraction
**Effort:** Small
**Risk:** Low

## Acceptance Criteria

- [ ] Shared hook extracts common scroll logic
- [ ] Both views use the shared hook
- [ ] Behavior unchanged

## Resources

- PR #9: https://github.com/barry-napier/clarity/pull/9
