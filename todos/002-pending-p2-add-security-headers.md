---
status: pending
priority: p2
issue_id: "002"
tags: [code-review, security, headers]
dependencies: []
---

# Add Security Headers and Meta Tags

## Problem Statement

The HTML document structure in `__root.tsx` lacks security-related meta tags. While TanStack Start handles many concerns at the framework level, security headers should be configured before production deployment.

## Findings

**Source:** Security Sentinel Agent Review of PR #1

**Location:** `/Users/bnapier/projects/clarity/src/routes/__root.tsx:10-19`

```typescript
head: () => ({
  meta: [
    { charSet: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { title: 'Clarity' },
    // Missing: security meta tags
  ],
}),
```

**Missing Security Headers:**
- Content Security Policy (CSP)
- X-Content-Type-Options
- Referrer-Policy

## Proposed Solutions

### Option A: Add meta tags in head config

```typescript
head: () => ({
  meta: [
    { charSet: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { title: 'Clarity' },
    { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
    { name: 'referrer', content: 'strict-origin-when-cross-origin' },
  ],
}),
```

- **Pros:** Simple, in-code configuration
- **Cons:** CSP is better handled at server/deployment level
- **Effort:** Small
- **Risk:** None

### Option B: Configure at Vercel deployment level

Use Vercel headers configuration in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'..." }
      ]
    }
  ]
}
```

- **Pros:** Full CSP control, cleaner separation
- **Cons:** Deployment-specific
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

Implement Option A for basic headers now; add Option B for CSP when deploying to production.

## Technical Details

- **Affected Files:** `src/routes/__root.tsx`, potentially `vercel.json`
- **Components:** Root document head configuration
- **Database Changes:** None

## Acceptance Criteria

- [ ] X-Content-Type-Options meta tag added
- [ ] Referrer-Policy meta tag added
- [ ] CSP configured at deployment level (production)
- [ ] Headers verified in browser dev tools

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #1 review | Security headers important for production |

## Resources

- [PR #1](https://github.com/barry-napier/Clarity/pull/1)
- [OWASP Secure Headers](https://owasp.org/www-project-secure-headers/)
- [Vercel Headers Configuration](https://vercel.com/docs/edge-network/headers)
