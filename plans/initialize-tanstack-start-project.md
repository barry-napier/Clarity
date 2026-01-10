# Initialize TanStack Start Project with Vite + TypeScript

**Issue:** clarity-0ch.1
**Type:** task
**Priority:** P2
**Blocks:** 4 tasks (Tailwind, Capacitor, OAuth spike, Dexie schema)

## Overview

Scaffold the base TanStack Start project with Vite and TypeScript configuration. This is the foundation for all other work on Clarity.

## Technical Approach

Use manual setup (not CLI) for full control over configuration. Key requirements:

- Package: `@tanstack/react-start` (not `@tanstack/start`)
- Plugin order: `tanstackStart()` BEFORE `viteReact()` in vite.config.ts
- TypeScript: Do NOT enable `verbatimModuleSyntax`
- Structure: Single package with `src/` directory (not monorepo)

## Acceptance Criteria

- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts server on port 3000
- [ ] `src/routeTree.gen.ts` auto-generates on first run
- [ ] Browser renders index page at http://localhost:3000
- [ ] `npm run build` succeeds
- [ ] TypeScript compiles with `npx tsc --noEmit`

## Implementation Steps

### 1. Create package.json

```json
{
  "name": "clarity",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  }
}
```

### 2. Install Dependencies

```bash
# Core dependencies
npm install react react-dom @tanstack/react-router @tanstack/react-start

# Dev dependencies
npm install -D typescript @types/react @types/react-dom @types/node vite @vitejs/plugin-react vite-tsconfig-paths
```

### 3. Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "strictNullChecks": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*", "vite.config.ts"]
}
```

### 4. Create vite.config.ts

```typescript
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
    // IMPORTANT: React plugin MUST come AFTER TanStack Start plugin
    viteReact(),
  ],
})
```

### 5. Create src/routes/__root.tsx

```typescript
/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Clarity' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
```

### 6. Create src/routes/index.tsx

```typescript
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Clarity</h1>
      <p>Your AI companion for daily reflection.</p>
    </div>
  )
}
```

### 7. Create src/router.tsx

```typescript
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function createAppRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
```

### 8. Create .gitignore

```gitignore
# Dependencies
node_modules/

# Build output
dist/
.output/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Capacitor (for future)
ios/App/Pods/
android/.gradle/

# TypeScript
*.tsbuildinfo
```

### 9. Verify Setup

```bash
npm run dev          # Should start on port 3000
npm run build        # Should complete without errors
npm run typecheck    # Should pass with no errors
```

## Files to Create

| File | Purpose |
|------|---------|
| `package.json` | Project manifest and scripts |
| `tsconfig.json` | TypeScript configuration |
| `vite.config.ts` | Vite + TanStack Start config |
| `src/routes/__root.tsx` | Root layout (required) |
| `src/routes/index.tsx` | Home page |
| `src/router.tsx` | Router configuration |
| `.gitignore` | Git ignore patterns |

## Notes

- `src/routeTree.gen.ts` is auto-generated on first `npm run dev` - commit it
- Path alias `@/*` configured for clean imports (e.g., `@/components/Button`)
- Port 3000 chosen for Capacitor compatibility later
- Minimal styling inline - Tailwind comes in next task

## References

- [TanStack Start Build from Scratch](https://tanstack.com/start/latest/docs/framework/react/build-from-scratch)
- [TanStack Router File-Based Routing](https://tanstack.com/router/latest/docs/framework/react/routing/file-based-routing)
- Project spec: `docs/spec.md:104-120` (project structure)
