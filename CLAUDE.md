# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start dev server on port 3000
npm run build        # Production build (outputs to dist/client/)
npm run typecheck    # TypeScript type checking
npm run build:ios    # Build + sync to iOS
npx cap sync ios     # Sync web build to iOS project
npx cap open ios     # Open Xcode project
```

## Architecture Overview

Clarity is a privacy-first personal productivity app built as a hybrid web/iOS application. The core architecture follows a local-first pattern where all user data lives in IndexedDB and syncs to Google Drive.

### Data Flow

1. **Local Database (Dexie/IndexedDB)** - All user data stored locally in `src/lib/db/schema.ts`
2. **Sync Queue** - Changes queued for sync with `syncStatus` field tracking state
3. **Google Drive AppData** - User data syncs to hidden app folder (user owns their data)
4. **Supabase** - Only stores auth tokens and anonymous analytics (no user content)

### Key Architectural Patterns

**Authentication Flow** (`src/lib/auth-context.tsx`):
- Google OAuth with PKCE for both web and iOS native
- Tokens stored via `@aparajita/capacitor-secure-storage` on iOS, localStorage on web
- Deep link handling for iOS OAuth callback (`clarity://oauth/callback`)

**Sync System** (`src/lib/sync/`):
- `queue.ts` - Enqueue changes for background sync
- `processor.ts` - Process sync queue items
- `drive.ts` - Google Drive API operations
- `hydrate.ts` - Initial data load from Drive
- `use-sync.ts` - React hook for sync status

**Routing** (`src/routes/`):
- TanStack Router with file-based routes
- `_app.tsx` - Protected layout (requires auth)
- `_app/today.tsx`, `_app/plan.tsx`, `_app/reflect.tsx` - Main app sections

### Database Entities

All entities implement `Syncable` interface with `syncStatus`, `driveFileId`, timestamps:
- `Capture` - Quick inbox items
- `Checkin` - Daily check-in entries
- `Chat` - AI conversation history
- `Memory` - AI-maintained user patterns
- `Northstar` - Personal manifesto
- `Framework` - Thinking exercises

### Environment Variables

Copy `.env.example` to `.env`:
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID
- `VITE_GOOGLE_CLIENT_SECRET` - Required for web OAuth only
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` - Supabase project config

### Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json)

## Task Tracking

Uses [Beads](https://github.com/steveyegge/beads) for issue tracking:
```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```
