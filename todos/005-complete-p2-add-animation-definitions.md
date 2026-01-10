---
status: complete
priority: p2
issue_id: "005"
tags: [code-review, css, shadcn, animations]
dependencies: []
---

# Add Missing Animation Definitions

## Problem Statement

The Accordion and Dialog components reference Tailwind animation utilities (`animate-accordion-up`, `animate-accordion-down`, `animate-in`, `animate-out`, etc.) that are not defined in the global CSS. This causes animations to silently fail.

## Findings

**Source:** Pattern Recognition Specialist Agent Review of PR #2

**Location:** `/Users/bnapier/projects/clarity/src/components/ui/accordion.tsx:47`

```typescript
className="...data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
```

**Location:** `/Users/bnapier/projects/clarity/src/components/ui/dialog.tsx:22,39`

```typescript
"...data-[state=open]:animate-in data-[state=closed]:animate-out..."
"...fade-in-0 fade-out-0 zoom-in-95 zoom-out-95 slide-in-from-*..."
```

**Missing animation utilities:**
- `animate-accordion-up`
- `animate-accordion-down`
- `animate-in` / `animate-out`
- `fade-in-0` / `fade-out-0`
- `zoom-in-95` / `zoom-out-95`
- `slide-in-from-left-2` / `slide-out-to-left-2`
- `slide-in-from-top-2` / `slide-out-to-top-2`
- etc.

## Proposed Solutions

### Option A: Install tailwindcss-animate package (Recommended)

**Pros:**
- Standard shadcn/ui approach
- Complete animation set included
- Maintained by community

**Cons:**
- Additional dependency

**Effort:** Small
**Risk:** Low

```bash
npm install tailwindcss-animate
```

Then update globals.css:
```css
@import "tailwindcss";
@import "tailwindcss-animate";
```

### Option B: Add keyframes manually to globals.css

**Pros:**
- No additional dependency
- Full control over animations

**Cons:**
- More code to maintain
- May miss some utilities

**Effort:** Medium
**Risk:** Low

```css
@keyframes accordion-down {
  from { height: 0; }
  to { height: var(--radix-accordion-content-height); }
}

@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height); }
  to { height: 0; }
}
```

## Recommended Action

<!-- Filled during triage -->

## Technical Details

**Affected files:**
- `src/styles/globals.css`
- `src/components/ui/accordion.tsx`
- `src/components/ui/dialog.tsx`

**Impact:** Visual only - components work but don't animate

## Acceptance Criteria

- [ ] Accordion expand/collapse animates smoothly
- [ ] Dialog open/close has fade and zoom animation
- [ ] No console warnings about missing CSS classes
- [ ] Build passes

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #2 review | Animation utilities expected by shadcn components |

## Resources

- PR #2: https://github.com/barry-napier/Clarity/pull/2
- tailwindcss-animate: https://github.com/jamiebuilds/tailwindcss-animate
- shadcn animation docs: https://ui.shadcn.com/docs/installation
