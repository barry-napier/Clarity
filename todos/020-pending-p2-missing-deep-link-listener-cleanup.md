---
status: pending
priority: p2
issue_id: "020"
tags: [code-review, typescript, memory-leak]
dependencies: []
---

# Missing Deep Link Listener Cleanup

## Problem Statement

The deep link listener initialization function does not return a cleanup handle, which will cause memory leaks in React components and duplicate handlers if called multiple times.

## Findings

**Source:** Code Review of PR #3

**Location:** `/Users/bnapier/projects/clarity/src/lib/deep-links.ts` (lines 3-7)

**Current Code:**
```typescript
export function initDeepLinkListener(handler: (url: string) => void): void {
  App.addListener('appUrlOpen', (event) => {
    handler(event.url);
  });
}
```

**Issue:** No way to remove the listener, leading to:
- Memory leaks in React components that mount/unmount
- Duplicate handlers if `initDeepLinkListener` is called multiple times
- No way to clean up listeners during app lifecycle changes

**Impact:**
- Memory leaks accumulating over time
- Potential duplicate handler execution
- Inability to properly manage component lifecycle

## Proposed Solutions

### Option A: Return Cleanup Handle (Recommended)

```typescript
import { App, type PluginListenerHandle } from '@capacitor/app';

export function initDeepLinkListener(
  handler: (url: string) => void
): Promise<PluginListenerHandle> {
  return App.addListener('appUrlOpen', (event) => {
    handler(event.url);
  });
}
```

Usage in React:
```typescript
useEffect(() => {
  let listenerHandle: PluginListenerHandle | null = null;

  initDeepLinkListener((url) => {
    // Handle deep link
  }).then((handle) => {
    listenerHandle = handle;
  });

  return () => {
    listenerHandle?.remove();
  };
}, []);
```

- **Pros:** Proper cleanup, follows Capacitor patterns, minimal change
- **Cons:** Async return requires slightly different usage
- **Effort:** Small
- **Risk:** None

### Option B: Create a hook wrapper

```typescript
export function useDeepLinkListener(handler: (url: string) => void) {
  useEffect(() => {
    const listenerPromise = App.addListener('appUrlOpen', (event) => {
      handler(event.url);
    });

    return () => {
      listenerPromise.then((handle) => handle.remove());
    };
  }, [handler]);
}
```

- **Pros:** Encapsulates lifecycle management
- **Cons:** React-specific, limits non-React usage
- **Effort:** Small
- **Risk:** None

## Recommended Action

Implement Option A to return the cleanup handle. This maintains flexibility for both React and non-React usage.

## Technical Details

- **Affected Files:** `src/lib/deep-links.ts`
- **Components:** Deep link handling, app URL listener
- **Database Changes:** None

## Acceptance Criteria

- [ ] `initDeepLinkListener` returns `Promise<PluginListenerHandle>`
- [ ] Callers can properly clean up listeners
- [ ] No memory leaks on repeated mount/unmount cycles
- [ ] Documentation updated with cleanup example

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #3 review | Capacitor listeners require explicit cleanup |

## Resources

- [PR #3](https://github.com/barry-napier/Clarity/pull/3)
- [Capacitor App Plugin](https://capacitorjs.com/docs/apis/app)
