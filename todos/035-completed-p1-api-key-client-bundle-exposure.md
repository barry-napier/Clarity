---
status: completed
priority: p1
issue_id: "035"
tags: [code-review, security, phase-4-checkins]
dependencies: []
completed_at: 2026-01-11
---

# API Key Exposed in Client Bundle

## Problem Statement

The OpenAI API key is embedded in the client-side JavaScript bundle via Vite's `import.meta.env`. This means the API key is visible in the browser's source code, allowing anyone who inspects the app bundle to extract and abuse the key.

## Findings

**Location:** `src/lib/ai/index.ts` (lines 7-9)

```typescript
export const openai = createOpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
});
```

**Impact:**
- Attackers could exhaust API credits
- API key could be used for unauthorized purposes
- Significant unexpected costs could be incurred
- No rate limiting exists on the client side to prevent abuse

## Proposed Solutions

### Option 1: Backend Proxy (Recommended)
Implement a serverless function or API route that holds the API key server-side.

**Pros:** Secure, can add rate limiting, standard practice
**Cons:** Adds infrastructure complexity, slight latency increase
**Effort:** Medium
**Risk:** Low

### Option 2: Supabase Edge Function
Use Supabase Edge Functions to proxy AI calls.

**Pros:** Already using Supabase, minimal new infrastructure
**Cons:** Adds dependency on Supabase for AI features
**Effort:** Medium
**Risk:** Low

### Option 3: Accept Risk with Rate Limiting
Keep client-side key but add aggressive rate limiting and monitoring.

**Pros:** Simplest to implement
**Cons:** Key still exposed, relies on monitoring
**Effort:** Low
**Risk:** High

## Recommended Action

Option 1 or 2 - Move API key to server-side proxy before production deployment.

## Technical Details

**Affected files:**
- `src/lib/ai/index.ts`
- `src/lib/ai/use-ai-chat.ts`
- `src/lib/ai/use-checkin-chat.ts`
- `src/lib/ai/memory-extractor.ts`

## Acceptance Criteria

- [x] API key is not present in client bundle
- [x] All AI calls route through authenticated backend proxy
- [ ] Rate limiting implemented at proxy level (future enhancement)
- [x] Error handling for proxy failures

## Resolution

Implemented Option 2 - Supabase Edge Function proxy:

1. Deployed `ai-proxy` edge function to Supabase project `iljezkekbfoolqtxyszk`
2. Updated `src/lib/ai/index.ts` to route through edge function
3. Removed `VITE_OPENAI_API_KEY` from client requirements
4. API key stored as Supabase Edge Function secret (needs to be set via dashboard)

**Remaining step:** Set `OPENAI_API_KEY` secret in Supabase Dashboard > Project Settings > Edge Functions > Secrets

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #7 security review | Client-side API keys are a common vulnerability |
| 2026-01-11 | Deployed Supabase Edge Function proxy | Supabase MCP makes edge function deployment trivial |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
- OWASP API Security: https://owasp.org/API-Security/
