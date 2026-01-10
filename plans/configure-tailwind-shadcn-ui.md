# Configure Tailwind CSS + shadcn/ui

**Issue:** clarity-0ch.2
**Type:** task
**Priority:** P2
**Status:** open

## Overview

Set up Tailwind CSS v4 with the dark theme colors from spec.md. Initialize shadcn/ui and add core components needed for the Clarity app.

## Problem Statement

The TanStack Start project is initialized but has no styling system. We need:
- Tailwind CSS for utility-first styling
- Custom dark theme (default) and light theme from spec
- shadcn/ui components for consistent, accessible UI
- Inter font for typography

## Technical Approach

### Stack Decisions

| Technology | Version | Rationale |
|------------|---------|-----------|
| Tailwind CSS | v4.x | Latest, uses Vite plugin, CSS-first config |
| @tailwindcss/vite | latest | No PostCSS config needed |
| shadcn/ui | latest | Tailwind v4 compatible |
| Inter font | Google Fonts | Simple, no build step |

### Architecture

Tailwind v4 uses a CSS-first configuration approach:
- No `tailwind.config.js` needed
- Theme defined via `@theme` directive in CSS
- Dark mode via `@custom-variant dark`

## Implementation Plan

### Phase 1: Install Dependencies

```bash
npm install tailwindcss @tailwindcss/vite
npm install clsx tailwind-merge class-variance-authority
npm install lucide-react
```

**Files affected:**
- `package.json`

### Phase 2: Configure Vite

Update `vite.config.ts` to add the Tailwind plugin:

```typescript
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),  // Add first
    tsConfigPaths(),
    tanstackStart(),
    viteReact(),
  ],
})
```

**Files affected:**
- `vite.config.ts`

### Phase 3: Create Global CSS

Create `src/styles/globals.css` with Tailwind imports and theme variables:

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

/* Dark theme (default) - from spec.md */
.dark {
  --background: 0 0% 4%;
  --foreground: 0 0% 95%;
  --card: 0 0% 8%;
  --card-foreground: 0 0% 95%;
  --popover: 0 0% 8%;
  --popover-foreground: 0 0% 95%;
  --primary: 0 0% 95%;
  --primary-foreground: 0 0% 4%;
  --secondary: 0 0% 12%;
  --secondary-foreground: 0 0% 95%;
  --muted: 0 0% 12%;
  --muted-foreground: 0 0% 50%;
  --accent: 35 90% 55%;
  --accent-foreground: 0 0% 4%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 95%;
  --border: 0 0% 15%;
  --input: 0 0% 15%;
  --ring: 35 90% 55%;
  --radius: 0.5rem;
}

/* Light theme - from spec.md */
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 4%;
  --card: 0 0% 98%;
  --card-foreground: 0 0% 4%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 4%;
  --primary: 0 0% 4%;
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 96%;
  --secondary-foreground: 0 0% 4%;
  --muted: 0 0% 96%;
  --muted-foreground: 0 0% 45%;
  --accent: 35 90% 55%;
  --accent-foreground: 0 0% 4%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 0 0% 90%;
  --input: 0 0% 90%;
  --ring: 35 90% 55%;
  --radius: 0.5rem;
}

/* Expose to Tailwind v4 */
@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}
```

**Files to create:**
- `src/styles/globals.css`

### Phase 4: Create Utility Functions

Create `src/lib/utils.ts` for shadcn's `cn()` helper:

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Files to create:**
- `src/lib/utils.ts`

### Phase 5: Update Root Layout

Update `src/routes/__root.tsx` to:
1. Import global CSS
2. Add Inter font from Google Fonts
3. Set `dark` class on html element by default

```tsx
// src/routes/__root.tsx
import '../styles/globals.css'

// In the head/meta section:
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

// On html element:
<html lang="en" className="dark">
```

**Files affected:**
- `src/routes/__root.tsx`

### Phase 6: Initialize shadcn/ui

Create `components.json` for shadcn configuration:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

**Files to create:**
- `components.json`

### Phase 7: Add Core Components

```bash
npx shadcn@latest add button card input dialog tabs accordion
```

This creates files in `src/components/ui/`:
- `button.tsx`
- `card.tsx`
- `input.tsx`
- `dialog.tsx`
- `tabs.tsx`
- `accordion.tsx`

**Files to create:**
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/accordion.tsx`

### Phase 8: Create Test Page

Update `src/routes/index.tsx` to display components for visual verification:

```tsx
// Quick component showcase
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
```

**Files affected:**
- `src/routes/index.tsx`

## Acceptance Criteria

### Functional Requirements
- [ ] Tailwind CSS classes work in components (e.g., `bg-background`, `text-foreground`)
- [ ] Dark theme renders correctly as default
- [ ] Light theme renders correctly when `dark` class removed
- [ ] Inter font loads and applies to all text
- [ ] All core shadcn components render without errors

### Non-Functional Requirements
- [ ] Build succeeds without warnings (`npm run build`)
- [ ] TypeScript passes (`npm run typecheck`)
- [ ] No console errors in browser

### Quality Gates
- [ ] Visual inspection of dark theme matches spec colors
- [ ] Components are accessible (keyboard navigation, focus states)

## Dependencies & Prerequisites

**Depends on:**
- clarity-0ch.1: Initialize TanStack Start project ✅ (completed)

**Blocks:**
- All UI work in Phase 1+

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| shadcn/ui Tailwind v4 incompatibility | Low | High | Use manual component installation if CLI fails |
| CSS not loading in SSR | Medium | Medium | Test SSR rendering, add CSS to head if needed |
| Font loading delay (FOUT) | Low | Low | Use `font-display: swap` (default in Google Fonts) |

## References

### Internal
- Theme colors: `docs/spec.md:623-666`
- Typography spec: `docs/spec.md:668-685`
- Component mapping: `docs/spec.md:688-700`

### External
- [Tailwind CSS v4 - Vite Installation](https://tailwindcss.com/docs/installation/vite)
- [shadcn/ui - TanStack Start](https://ui.shadcn.com/docs/installation/tanstack)
- [shadcn/ui - Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [shadcn/ui - Theming](https://ui.shadcn.com/docs/theming)
