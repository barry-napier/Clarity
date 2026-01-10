# Phase 2: Captures & Sync

## Overview

Build the capture system - the core interaction loop where users can quickly capture thoughts, tasks, and ideas. This phase implements the full Dexie-to-Google-Drive sync pipeline.

## Success Criteria

- [ ] User can create captures from the Today view
- [ ] Captures persist locally in Dexie (works offline)
- [ ] Captures sync to Google Drive automatically
- [ ] User can mark captures as done
- [ ] Done captures move to a separate tab
- [ ] Sync status reflects actual sync state
- [ ] Synced captures persist across app restarts

## Scope

### In Scope
- Capture creation UI (quick input)
- Capture list with New/Done tabs
- Dexie CRUD operations for captures
- Google Drive file operations (create, update, read)
- Background sync queue processing
- Sync status indicator updates
- Pull-on-launch (hydrate from Drive on new device)

### Out of Scope (Deferred)
- AI extraction from captures (Phase 4)
- Offline conflict resolution (last-write-wins for now)
- Full-text search
- Capture tags/categories
- Bulk operations

---

## Technical Design

### Data Model

```typescript
// src/lib/db/schema.ts - Capture entity
interface Capture {
  id: string;           // UUID
  content: string;      // The capture text
  status: 'new' | 'done';
  createdAt: number;    // Unix timestamp
  updatedAt: number;    // Unix timestamp
  syncedAt: number | null; // Last sync to Drive
}
```

### Google Drive File Structure

```
/Clarity (appDataFolder)
  /captures
    /2026-01-10.json   # Daily file with all captures for that day
    /2026-01-11.json
```

**Daily file format:**
```json
{
  "date": "2026-01-10",
  "captures": [
    {
      "id": "uuid-1",
      "content": "Call mom about Sunday dinner",
      "status": "new",
      "createdAt": 1736506800000,
      "updatedAt": 1736506800000
    }
  ],
  "updatedAt": 1736510400000
}
```

### Sync Strategy

**Write flow:**
1. User creates capture
2. Write to Dexie immediately (instant UI)
3. Add to sync queue
4. Background worker picks up queue
5. Find or create daily file in Drive
6. Append/update capture in file
7. Mark as synced in Dexie, remove from queue

**Read flow (app launch):**
1. Check if first launch or new device
2. List all files in Drive /captures folder
3. For each file, merge captures into Dexie
4. Dexie becomes source of truth
5. UI renders from Dexie

**Conflict resolution:** Last-write-wins (simplest for MVP)

---

## Implementation Plan

### Phase 2A: Capture UI Components

**Files to create:**
- `src/components/capture-input.tsx` - Quick capture text input
- `src/components/capture-list.tsx` - List of captures with tabs
- `src/components/capture-item.tsx` - Single capture card

**Update:**
- `src/routes/_app/today.tsx` - Wire up capture components

### Phase 2B: Dexie Operations

**Files to update:**
- `src/lib/db/schema.ts` - Add Capture interface
- `src/lib/db/index.ts` - Add captures table, CRUD helpers

**New file:**
- `src/lib/captures.ts` - Capture service (create, update, list, markDone)

### Phase 2C: Google Drive Sync

**Files to update:**
- `src/lib/sync/drive.ts` - Add file operations (create, read, update)
- `src/lib/sync/processor.ts` - Handle capture sync
- `src/lib/sync/queue.ts` - Queue capture changes

**New files:**
- `src/lib/sync/captures-sync.ts` - Capture-specific sync logic
- `src/lib/sync/hydrate.ts` - Pull data from Drive on first launch

### Phase 2D: Integration & Polish

- Wire sync status to actual sync state
- Add loading states during sync
- Handle offline gracefully (queue grows, syncs when online)
- Test on iOS simulator

---

## Component Specifications

### CaptureInput

```tsx
// Quick capture input at top of Today view
<CaptureInput
  onSubmit={(content: string) => void}
  placeholder="What's on your mind?"
/>
```

**Behavior:**
- Auto-focus on mount (optional, maybe configurable)
- Submit on Enter
- Clear after submit
- Disable while submitting

### CaptureList

```tsx
<CaptureList
  tab="new" | "done"
  onTabChange={(tab) => void}
/>
```

**Behavior:**
- Two tabs: New, Done
- Badge with count on each tab
- Empty state for each tab
- Most recent first

### CaptureItem

```tsx
<CaptureItem
  capture={Capture}
  onToggleDone={() => void}
/>
```

**Behavior:**
- Checkbox to mark done
- Tap to expand? (TBD - might just be text)
- Swipe to delete? (Defer to later)
- Show relative time (2h ago, yesterday)

---

## Acceptance Tests

1. **Create capture:** Enter text, press enter, capture appears in list
2. **Persist offline:** Create capture, close app, reopen, capture still there
3. **Mark done:** Click checkbox, capture moves to Done tab
4. **Sync to Drive:** Create capture, wait 5s, check Drive - file exists
5. **Sync status:** During sync shows "Syncing...", after shows "Synced"
6. **New device:** Sign in on new browser, captures appear from Drive
7. **Offline mode:** Disconnect network, create captures, reconnect, they sync

---

## File References

### Existing Code
- Database schema: `src/lib/db/schema.ts`
- Sync engine: `src/lib/sync/processor.ts`
- Sync queue: `src/lib/sync/queue.ts`
- Drive API: `src/lib/sync/drive.ts`
- Today page: `src/routes/_app/today.tsx`

### External References
- [Dexie.js Documentation](https://dexie.org/docs/)
- [Google Drive API - Files](https://developers.google.com/drive/api/v3/reference/files)

---

## Implementation Checklist

### Phase 2A: Capture UI
- [ ] Create CaptureInput component
- [ ] Create CaptureList component with tabs
- [ ] Create CaptureItem component
- [ ] Wire up to Today page
- [ ] Add empty states
- [ ] Style with shadcn/ui

### Phase 2B: Dexie Operations
- [ ] Update captures table schema
- [ ] Create capture service with CRUD
- [ ] Add React hooks for capture queries (useLiveQuery)
- [ ] Test offline persistence

### Phase 2C: Google Drive Sync
- [ ] Implement daily file operations in Drive
- [ ] Update sync processor for captures
- [ ] Add capture-specific sync logic
- [ ] Implement hydrate on first launch
- [ ] Wire sync status to real state

### Phase 2D: Integration
- [ ] Test full flow: create -> sync -> verify in Drive
- [ ] Test mark done -> sync
- [ ] Test offline -> online sync
- [ ] Test new device hydration
- [ ] iOS simulator testing

### Final Verification
- [ ] All acceptance tests pass
- [ ] TypeScript compiles clean
- [ ] iOS build succeeds
- [ ] Works offline
