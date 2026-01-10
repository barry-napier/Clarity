# Clarity

> A personal operating system for intentional living

Clarity is a privacy-first, AI-powered personal operating system designed to help you live more intentionally through structured reflection and goal tracking. Unlike gamified productivity tools, Clarity is a calm, intelligent companion—therapist-adjacent in tone, emphasizing reflection over motivation.

**Philosophy:** No cheerleading, no fluff. Just honest questions that make you think.

## Features

### Today
- **Inbox (Captures)** — Quick capture of thoughts, tasks, ideas
- **Daily Check-In** — 5-minute conversational ritual tracking energy, wins, friction

### Plan
- **North Star** — Living document personal manifesto
- **Goals & Vision** — Tracking across six life domains
- **Thinking Frameworks** — AI-guided exercises (Annual Review, Regret Minimization, etc.)

### Reflect
- **Reviews** — Weekly reflection on signal vs. noise
- **Memory & Insights** — AI-maintained memory of patterns, strengths, blind spots

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Auth & Analytics | Supabase |
| Local Database | Dexie (IndexedDB) |
| AI Services | Vercel AI Gateway |
| Cloud Storage | Google Drive |
| Mobile | Capacitor (iOS) |
| Payments | Stripe |

## Privacy Model

**You own your data.** All personal content (captures, check-ins, chats, memory) is stored in your Google Drive. Clarity only stores auth, subscription status, and anonymous analytics in Supabase.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# iOS development
npx cap sync
npx cap open ios
```

## Task Tracking

This project uses [Beads](https://github.com/steveyegge/beads) for task management.

```bash
bd ready          # See tasks ready to work on
bd start <id>     # Start a task
bd done <id>      # Complete a task
bd list           # List all issues
```

## Project Structure

```
src/
├── routes/         # TanStack Router file-based routes
├── components/     # React components (ui/, layout/, features/)
├── features/       # Feature-specific logic
├── lib/            # Core libraries (db/, sync/, ai/)
├── hooks/          # Custom React hooks
└── types/          # TypeScript types
```

## License

MIT
