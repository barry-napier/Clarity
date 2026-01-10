---
status: pending
priority: p3
issue_id: "004"
tags: [code-review, architecture, agent-native]
dependencies: []
---

# Establish Agent-Native Tool Registry Pattern

## Problem Statement

The project spec (`docs/spec.md`) describes an AI-powered personal operating system, but the architectural design follows an "AI-as-feature" pattern rather than true agent-native architecture. Key concerns:

1. Memory is agent-controlled but not user-accessible
2. Check-in flow is a workflow, not primitives
3. Learning extraction is hard-coded logic, not agent judgment

## Findings

**Source:** Agent-Native Reviewer Agent Review of PR #1

**Current Design (from spec):**
- AI "maintains" memory - users can't read/write directly
- Check-in is "AI asks questions one at a time" - workflow, not primitives
- `extractLearnings()` is automatic code, not agent tool calls

**Agent-Native Alternative:**
- Tools should be primitives (read/write/query)
- Both UI and agents use the same tool interface
- Memory is a shared resource, not agent-controlled opacity

## Proposed Solutions

### Option A: Establish tool registry pattern early

Create directory structure:
```
src/
├── agent/
│   ├── tools/           # Primitive tools
│   │   ├── capture.ts   # create, read, update, delete
│   │   ├── memory.ts    # read, write, query
│   │   └── checkin.ts   # log_energy, log_win, etc.
│   ├── prompts/         # System prompt templates
│   └── context.ts       # Runtime context builder
```

Define tool interface convention:
```typescript
export const tool = {
  name: 'capture_create',
  description: 'Create a new capture',
  parameters: z.object({ content: z.string() }),
  execute: async (params) => { ... }
}
```

- **Pros:** True agent-native design, future-proof
- **Cons:** Requires spec revision
- **Effort:** Medium
- **Risk:** Low

### Option B: Continue with spec as designed

Keep current workflow-based AI design.

- **Pros:** Faster to implement initially
- **Cons:** May limit future agent capabilities
- **Effort:** Low
- **Risk:** Medium - technical debt

## Recommended Action

Consider Option A before implementing AI integration. Document the pattern in `docs/agent-architecture.md`.

## Technical Details

- **Affected Files:** New `src/agent/` directory
- **Components:** Tool registry, context injection
- **Database Changes:** None

## Acceptance Criteria

- [ ] `src/agent/tools/` directory exists with at least one tool
- [ ] Tool interface convention documented
- [ ] Each tool exports: name, description, parameters, execute
- [ ] UI actions and agent tools use same primitives

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-10 | Created from PR #1 review | Agent-native design decisions matter early |

## Resources

- [PR #1](https://github.com/barry-napier/Clarity/pull/1)
- [docs/spec.md](./docs/spec.md) - Current AI design
- Agent-native principles: "Any action a user can take, an agent can also take"
