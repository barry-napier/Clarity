# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Philosophy

Clarity is a "personal operating system for intentional living" - a calm, intelligent companion that's therapist-adjacent in tone. Key principles:

- **No cheerleading, no fluff** - Anti-toxic-positivity, honest questions that make you think
- **Signal vs noise** - Focus on what matters, not productivity theater
- **Privacy-first** - Users own their data (stored in their Google Drive)

See `docs/spec.md` for full product specification.

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
- `Capture` - Quick inbox items (New/Done tabs)
- `Checkin` - Daily check-in entries (energy, wins, friction, single priority)
- `Chat` - AI conversation history (24+ hour gap = new session)
- `Memory` - AI-maintained markdown doc with life domains, patterns, people
- `Northstar` - Personal manifesto (living document)
- `Framework` - Thinking exercises (Annual Review, Regret Minimization, etc.)

### Life Domains

The system tracks six core areas: Work/Career, Relationships, Health, Meaning/Fun, Finances, Family. Memory also includes: Current Season, Operating Rhythm, People I'm Tracking, Cross-Domain Tensions, Rules I Trust, AI Instructions, Now/Next/Later.

### AI Integration

- **Vercel AI Gateway** - Model-agnostic abstraction
- **Chat model**: Fast/cheap (GPT-4o-mini, Claude Haiku)
- **Memory model**: Quality (GPT-4o, Claude Sonnet)
- **Every interaction extracts learnings** to update memory immediately
- Memory auto-compresses to stay within context limits

### AI Tone Guidelines

When building AI features, the tone should be:
- Warm but direct, never effusive or sycophantic
- Ask questions that make users think, not obvious questions
- Acknowledge difficulty without toxic positivity ("That sounds hard" not "You've got this!")
- Probe gently once on terse answers, then accept and move on

### Environment Variables

Copy `.env.example` to `.env`:
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID
- `VITE_GOOGLE_CLIENT_SECRET` - Required for web OAuth only
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` - Supabase project config

### Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json)

## Design System

- **Dark mode default** - `html.dark` class applied in root
- **Font**: Inter (loaded from Google Fonts)
- **Colors**: Near-black background (`hsl(0 0% 4%)`), amber/gold accent (`hsl(35 90% 55%)`)
- **Touch targets**: 44px minimum for iOS
- **Container**: max-width ~720px, generous vertical padding
- **Components**: shadcn/ui with Tailwind CSS v4

## Task Tracking

Uses [Beads](https://github.com/steveyegge/beads) for issue tracking:
```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```
