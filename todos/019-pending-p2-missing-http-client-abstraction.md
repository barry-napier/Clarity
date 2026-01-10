---
status: pending
priority: p2
issue_id: "019"
tags: [code-review, architecture, patterns]
dependencies: []
---

# Missing HTTP Client Abstraction

## Problem Statement

Raw `fetch` calls are scattered across 7 locations with repeated patterns. Each call manually sets Authorization headers and handles errors differently, leading to inconsistent error handling and code duplication.

## Findings

**Source:** Code Review of PR #3

**Location:** `/Users/bnapier/projects/clarity/src/lib/sync/drive.ts`, `/Users/bnapier/projects/clarity/src/lib/google-auth.ts`

**Issue:** Multiple raw `fetch` calls throughout the codebase with:
- Repeated Authorization header patterns
- Inconsistent error handling approaches
- No centralized timeout configuration
- Difficulty adding global concerns like logging or retry logic

**Impact:**
- Inconsistent error handling across API calls
- Code duplication in header setup
- Harder to add global concerns like timeouts or logging
- Maintenance burden when auth patterns change

## Proposed Solutions

### Option A: Create HTTP Client Wrapper (Recommended)

```typescript
// src/lib/http-client.ts
interface HttpClientOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

class HttpClient {
  private baseHeaders: Record<string, string> = {};
  private defaultTimeout = 30000;

  setAuthToken(token: string) {
    this.baseHeaders['Authorization'] = `Bearer ${token}`;
  }

  async get<T>(url: string, options?: HttpClientOptions): Promise<T> {
    return this.request('GET', url, undefined, options);
  }

  async post<T>(url: string, body?: unknown, options?: HttpClientOptions): Promise<T> {
    return this.request('POST', url, body, options);
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
    options?: HttpClientOptions
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options?.timeout ?? this.defaultTimeout
    );

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...this.baseHeaders,
          ...options?.headers,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new HttpError(response.status, await response.text());
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const httpClient = new HttpClient();
```

- **Pros:** Centralized auth, consistent error handling, built-in timeouts, easy to add logging
- **Cons:** Migration effort required
- **Effort:** Medium
- **Risk:** Low

### Option B: Use a library like ky or axios

- **Pros:** Battle-tested, feature-rich
- **Cons:** Additional dependency, may be overkill
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

Implement Option A to create a custom HTTP client wrapper that matches the project's specific needs.

## Technical Details

- **Affected Files:** `src/lib/sync/drive.ts`, `src/lib/google-auth.ts`, new `src/lib/http-client.ts`
- **Components:** All HTTP communication
- **Database Changes:** None

## Acceptance Criteria

- [ ] HTTP client wrapper created with auth header injection
- [ ] Consistent error parsing across all requests
- [ ] Configurable timeouts for all requests
- [ ] All existing fetch calls migrated to use the wrapper
- [ ] Logging hooks available for debugging

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #3 review | HTTP abstraction improves maintainability |

## Resources

- [PR #3](https://github.com/barry-napier/Clarity/pull/3)
