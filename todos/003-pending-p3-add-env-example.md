---
status: pending
priority: p3
issue_id: "003"
tags: [code-review, documentation, configuration]
dependencies: []
---

# Add .env.example for Environment Documentation

## Problem Statement

The `.gitignore` includes `.env*` files but no `.env.example` exists. For a project with multiple integrations (Supabase, Google Drive, Vercel AI Gateway, Stripe), environment configuration should be documented early.

## Findings

**Source:** Architecture Strategist Agent Review of PR #1

**Location:** `.gitignore` includes env exclusions but no example file exists.

**Impact:** Developers will need to guess required environment variables when setting up the project.

## Proposed Solutions

### Option A: Create .env.example with all planned integrations

```bash
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# AI Gateway (Vercel)
AI_GATEWAY_KEY=

# Google Drive OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
```

- **Pros:** Complete documentation upfront
- **Cons:** May include vars not yet needed
- **Effort:** Small
- **Risk:** None

### Option B: Add incrementally as integrations are added

Add only variables that are currently used.

- **Pros:** No unused documentation
- **Cons:** Easy to forget
- **Effort:** Ongoing
- **Risk:** Low

## Recommended Action

Create `.env.example` when first integration (Supabase auth) is added.

## Technical Details

- **Affected Files:** `.env.example` (new file)
- **Components:** None
- **Database Changes:** None

## Acceptance Criteria

- [ ] `.env.example` file exists with required variables
- [ ] Each variable has a comment explaining its purpose
- [ ] README references the example file

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #1 review | Document env vars early for onboarding |

## Resources

- [PR #1](https://github.com/barry-napier/Clarity/pull/1)
- [docs/spec.md](./docs/spec.md) - Lists all integrations
