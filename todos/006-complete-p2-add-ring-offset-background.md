---
status: complete
priority: p2
issue_id: "006"
tags: [code-review, css, shadcn, accessibility]
dependencies: []
---

# Add Missing ring-offset-background Color

## Problem Statement

Multiple shadcn components reference `ring-offset-background` for focus ring styling, but this color is not defined in the `@theme inline` block. This may cause focus states to render incorrectly.

## Findings

**Source:** Pattern Recognition Specialist Agent Review of PR #2

**Affected Components:**
- `/Users/bnapier/projects/clarity/src/components/ui/button.tsx`
- `/Users/bnapier/projects/clarity/src/components/ui/input.tsx`
- `/Users/bnapier/projects/clarity/src/components/ui/dialog.tsx`
- `/Users/bnapier/projects/clarity/src/components/ui/tabs.tsx`

**Example usage in button.tsx:**
```typescript
"ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

**Current globals.css @theme inline block** - missing `--color-ring-offset`:
```css
@theme inline {
  --color-background: hsl(var(--background));
  --color-ring: hsl(var(--ring));
  /* Missing: --color-ring-offset */
}
```

## Proposed Solutions

### Option A: Add ring-offset color to @theme inline (Recommended)

**Pros:**
- Simple fix
- Matches shadcn expected behavior

**Cons:**
- None

**Effort:** Small
**Risk:** Low

```css
@theme inline {
  /* ... existing colors ... */
  --color-ring-offset: hsl(var(--background));
}
```

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `src/styles/globals.css`

**Impact:** Focus ring offset may not match background color, causing visual artifacts during keyboard navigation

## Acceptance Criteria

- [ ] Focus rings on buttons show correct offset color
- [ ] Focus rings on inputs show correct offset color
- [ ] Tab navigation shows consistent focus states
- [ ] Works in both dark and light themes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #2 review | shadcn components expect ring-offset-background |

## Resources

- PR #2: https://github.com/barry-napier/Clarity/pull/2
- Tailwind ring-offset: https://tailwindcss.com/docs/ring-offset-color
