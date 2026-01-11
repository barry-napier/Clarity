---
status: pending
priority: p2
issue_id: "042"
tags: [code-review, typescript, phase-4-checkins, css]
dependencies: []
---

# Dynamic Tailwind Class Will Not Work

## Problem Statement

The code uses dynamic Tailwind class generation which doesn't work with Tailwind's JIT compiler. The padding will never be applied because the compiler cannot see dynamic class names at build time.

## Findings

**Location:** `src/components/checkin/checkin-view.tsx` (line 129)

```typescript
className={cn(
  'flex flex-col h-full',
  keyboardVisible && `pb-[${keyboardHeight}px]`  // This will NOT work
)}
```

Also in `src/components/chat/chat-view.tsx` (lines 81-85)

**Why it fails:**
Tailwind JIT scans source files at build time for class names. Dynamic interpolation like `pb-[${keyboardHeight}px]` produces strings that aren't visible during the scan, so no CSS is generated.

## Proposed Solutions

### Option 1: Use Inline Styles (Recommended)
Replace dynamic class with inline style for dynamic values.

```typescript
<div
  className="flex flex-col h-full"
  style={{ paddingBottom: keyboardVisible ? keyboardHeight : 0 }}
>
```

**Pros:** Works correctly, simple fix
**Cons:** Mixes approaches slightly
**Effort:** Minimal
**Risk:** None

### Option 2: Safelist Classes
Add safelist to Tailwind config for all possible values.

**Pros:** Keeps Tailwind-only approach
**Cons:** Impractical for pixel values, bloats CSS
**Effort:** High
**Risk:** Medium

## Recommended Action

Option 1 - Use inline styles for dynamic pixel values.

## Technical Details

**Affected files:**
- `src/components/checkin/checkin-view.tsx`
- `src/components/chat/chat-view.tsx`

## Acceptance Criteria

- [ ] Dynamic padding is actually applied when keyboard visible
- [ ] Fix applied in both checkin-view and chat-view
- [ ] Tested on iOS with keyboard

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #7 TypeScript review | Dynamic Tailwind classes don't work with JIT |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
- Tailwind JIT: https://tailwindcss.com/docs/content-configuration
