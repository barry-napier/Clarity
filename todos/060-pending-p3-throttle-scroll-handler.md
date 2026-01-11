---
status: pending
priority: p3
issue_id: "060"
tags: [code-review, pr-8, phase-4-checkins, performance]
dependencies: []
---

# Scroll Handler Not Throttled

## Problem Statement

The scroll event handler in `checkin-view.tsx` fires on every scroll event (60+ Hz during active scrolling) and reads layout properties that cause forced reflow. This can cause scroll jank on mobile devices during message streaming.

## Findings

**Location:** `src/components/checkin/checkin-view.tsx:113-125`

**Current Code:**
```typescript
const handleScroll = useCallback(() => {
  const container = scrollContainerRef.current;
  if (!container) return;

  const { scrollTop, scrollHeight, clientHeight } = container;
  const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

  if (!isNearBottom && isStreaming) {
    setUserHasScrolled(true);
  } else if (isNearBottom) {
    setUserHasScrolled(false);
  }
}, [isStreaming]);
```

**Issues:**
1. Scroll events fire at 60+ Hz during active scrolling
2. Each event reads `scrollHeight` and `clientHeight` causing forced reflow
3. May trigger state updates on every scroll event

**Discovery:** Performance review by performance-oracle agent

## Proposed Solutions

### Option 1: Use requestAnimationFrame Throttling (Recommended)
Throttle scroll handling to match display refresh rate.

```typescript
const scrollThrottleRef = useRef<number | null>(null);

const handleScroll = useCallback(() => {
  if (scrollThrottleRef.current !== null) return;

  scrollThrottleRef.current = requestAnimationFrame(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (!isNearBottom && isStreaming) {
        setUserHasScrolled(true);
      } else if (isNearBottom) {
        setUserHasScrolled(false);
      }
    }
    scrollThrottleRef.current = null;
  });
}, [isStreaming]);
```

**Pros:** Caps scroll handling at 60fps, reduces CPU usage by 40-60%
**Cons:** Slightly more complex
**Effort:** Small
**Risk:** None

### Option 2: Use Passive Event Listener
Attach scroll listener via useEffect with `{ passive: true }`.

**Pros:** Better scroll performance
**Cons:** Doesn't reduce handler frequency
**Effort:** Small
**Risk:** None

## Recommended Action

Option 1 - RAF throttling. Combined with Option 2 for best results.

## Technical Details

**Affected files:**
- `src/components/checkin/checkin-view.tsx`

**Performance Impact:**
- Current: 60+ handler calls per second during scroll
- After: ~16 handler calls per second (capped at 60fps)
- Expected CPU reduction: 40-60%

## Acceptance Criteria

- [ ] Scroll handling throttled to ~60fps
- [ ] No visible change to scroll tracking behavior
- [ ] Smooth scrolling during AI streaming on iOS

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #8 performance review | Unthrottled scroll handler causes jank |

## Resources

- PR #8: https://github.com/barry-napier/Clarity/pull/8
- MDN Scroll Performance: https://developer.mozilla.org/en-US/docs/Web/API/Document/scroll_event#scroll_event_throttling
