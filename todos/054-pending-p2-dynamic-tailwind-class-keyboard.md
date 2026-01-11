---
status: pending
priority: p2
issue_id: "054"
tags: [code-review, pr-8, phase-4-checkins, bug, tailwind]
dependencies: []
---

# Dynamic Tailwind Class Won't Work at Runtime

## Problem Statement

The `checkin-view.tsx` component uses dynamic string interpolation for a Tailwind class (`pb-[${keyboardHeight}px]`), which will not work because Tailwind purges unused classes at build time and cannot see dynamically generated class names.

## Findings

**Location:** `src/components/checkin/checkin-view.tsx:162`

**Current Code:**
```typescript
className={cn(
  'flex flex-col h-full',
  keyboardVisible && `pb-[${keyboardHeight}px]`  // WON'T WORK
)}
```

**Issue:** Tailwind CSS statically analyzes the codebase at build time to generate CSS. Dynamic string interpolation like `pb-[${keyboardHeight}px]` creates class names that Tailwind has never seen, so no CSS is generated for them.

**Discovery:** TypeScript code review by kieran-typescript-reviewer agent

## Proposed Solutions

### Option 1: Use Inline Styles (Recommended)
Replace the dynamic Tailwind class with an inline style.

```typescript
<div
  className={cn('flex flex-col h-full')}
  style={keyboardVisible ? { paddingBottom: `${keyboardHeight}px` } : undefined}
>
```

**Pros:** Works correctly, simple fix
**Cons:** Mixes styling approaches
**Effort:** Small
**Risk:** None

### Option 2: Use CSS Custom Property
Set a CSS variable and reference it in a static class.

```typescript
// In component
style={{ '--keyboard-height': `${keyboardHeight}px` } as React.CSSProperties}
className="flex flex-col h-full pb-[var(--keyboard-height)]"
```

**Pros:** Keeps Tailwind syntax
**Cons:** More complex, CSS variable approach
**Effort:** Small
**Risk:** Low

## Recommended Action

Option 1 - Use inline styles. It's the simplest, most direct fix.

## Technical Details

**Affected files:**
- `src/components/checkin/checkin-view.tsx`

## Acceptance Criteria

- [ ] Keyboard padding is applied correctly when keyboard is visible
- [ ] Test on iOS with actual keyboard appearance
- [ ] No Tailwind build warnings

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #8 code review | Dynamic Tailwind classes don't work |

## Resources

- PR #8: https://github.com/barry-napier/Clarity/pull/8
- Tailwind Dynamic Classes: https://tailwindcss.com/docs/content-configuration#dynamic-class-names
