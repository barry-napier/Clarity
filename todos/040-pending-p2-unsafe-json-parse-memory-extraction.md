---
status: pending
priority: p2
issue_id: "040"
tags: [code-review, typescript, phase-4-checkins, validation]
dependencies: []
---

# Unsafe JSON Parsing Without Validation in Memory Extractor

## Problem Statement

The memory extraction code parses AI-generated JSON using `JSON.parse` with a type assertion, without runtime validation. If the LLM returns malformed JSON that doesn't match `ExtractionResult`, the subsequent code will fail silently or throw at runtime.

## Findings

**Location:** `src/lib/ai/memory-extractor.ts` (line 59)

```typescript
const extraction = JSON.parse(jsonMatch[0]) as ExtractionResult;
```

**Risk:**
- If `updates` is missing or not an array, code will fail
- If `hasUpdates` is not a boolean, logic may be incorrect
- Type assertion bypasses TypeScript's safety guarantees

## Proposed Solutions

### Option 1: Add Zod Validation (Recommended)
Use Zod to validate parsed JSON at runtime.

```typescript
import { z } from 'zod';

const ExtractionResultSchema = z.object({
  hasUpdates: z.boolean(),
  updates: z.array(z.object({
    section: z.string(),
    content: z.string(),
    action: z.enum(['add', 'modify', 'remove'])
  })),
  summary: z.string()
});

const extraction = ExtractionResultSchema.parse(JSON.parse(jsonMatch[0]));
```

**Pros:** Type-safe, clear error messages, standard pattern
**Cons:** Adds Zod dependency (already common in modern TS)
**Effort:** Low
**Risk:** Low

### Option 2: Manual Validation
Add manual type checks before using the data.

**Pros:** No new dependency
**Cons:** More verbose, error-prone
**Effort:** Medium
**Risk:** Low

## Recommended Action

Option 1 - Add Zod validation for AI responses.

## Technical Details

**Affected files:**
- `src/lib/ai/memory-extractor.ts`

**Same pattern should be applied to:**
- Any other AI JSON response parsing

## Acceptance Criteria

- [ ] Zod schema defined for ExtractionResult
- [ ] JSON.parse result validated before use
- [ ] Invalid responses handled gracefully with logging
- [ ] TypeScript types derived from Zod schema

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #7 TypeScript review | AI outputs need runtime validation |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
- Zod: https://zod.dev/
