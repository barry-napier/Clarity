# Phase 4: Check-ins & Learning Loop - Completion Plan

## Overview

Phase 4 is **already substantially implemented**. The core conversational check-in flow works:
- 4-question sequence (energy, wins, friction, priority)
- AI streaming responses via Vercel AI SDK
- Memory extraction at completion
- Resume capability for interrupted check-ins
- Notification scheduling for reminders
- Time-of-day detection (morning/evening)
- Gap detection (3+ days)

This plan addresses the **gaps identified between spec and implementation**.

## Problem Statement

The spec-flow analysis identified several gaps:

| Gap | Severity | Current State |
|-----|----------|---------------|
| Morning/evening question variations | Medium | Questions are static, don't vary by time |
| Error message standardization | Medium | Shows `error.message` instead of spec's generic message |
| Notification deep linking | Medium | Tapping notification may not navigate to check-in |
| Terse response tracking | Low | Relies on AI prompt only, no state enforcement |
| Offline detection | Low | No clear "requires internet" message |

## Proposed Solution

Address the high-impact gaps in order of priority, keeping scope minimal.

## Acceptance Criteria

### Must Have
- [ ] Questions vary based on morning vs evening check-in
- [ ] Error message shows "Something went wrong. Tap to retry." (per spec)
- [ ] Tapping check-in notification navigates to `/today/checkin`

### Should Have
- [ ] Offline state shows clear "Check-ins require internet" message
- [ ] Verify end-to-end flow works on iOS simulator

### Nice to Have
- [ ] Terse response probe tracking in state machine
- [ ] Week-at-a-glance energy visualization on Today page

---

## Implementation Tasks

### Task 1: Time-of-Day Question Variations

**File:** `src/lib/ai/use-checkin-chat.ts`

Update `STAGE_QUESTIONS` to be a function that accepts `timeOfDay`:

```typescript
// src/lib/ai/use-checkin-chat.ts
function getStageQuestions(timeOfDay: 'morning' | 'evening'): Record<string, string> {
  const isMorning = timeOfDay === 'morning';
  return {
    awaiting_energy: isMorning
      ? 'How are you feeling today?'
      : 'How are you feeling right now?',
    awaiting_wins: isMorning
      ? 'What went well recently?'
      : 'What went well today?',
    awaiting_friction: isMorning
      ? "What's on your mind that feels heavy?"
      : "What drained you today?",
    awaiting_priority: isMorning
      ? "What's the ONE thing you want to focus on today?"
      : "What's one thing you want to let go of tonight?",
  };
}
```

**Reference:** `src/lib/ai/use-checkin-chat.ts:42-47`

---

### Task 2: Standardize Error Messages

**File:** `src/components/checkin/checkin-view.tsx`

Replace `error.message` display with spec's generic message:

```typescript
// Before (line ~187)
<p className="text-sm text-destructive">{error.message}</p>

// After
<p className="text-sm text-destructive">Something went wrong. Tap to retry.</p>
```

**Reference:** `src/components/checkin/checkin-view.tsx:187`, `docs/spec.md:705-707`

---

### Task 3: Notification Deep Link Navigation

**Files:**
- `src/lib/notifications/checkin-reminders.ts`
- `src/App.tsx` or root component

Add navigation handler when check-in notification is tapped:

```typescript
// In notification click listener
LocalNotifications.addListener('localNotificationActionPerformed', async (notification) => {
  const { actionId, notification: { id } } = notification;

  if (id === MORNING_NOTIFICATION_ID || id === EVENING_NOTIFICATION_ID) {
    // Navigate to check-in page
    window.location.href = '/today/checkin';
    // Or use router: navigate({ to: '/today/checkin' });
  }
});
```

**Reference:** `src/lib/notifications/checkin-reminders.ts:78-86`

---

### Task 4: Offline Detection

**File:** `src/components/checkin/checkin-view.tsx`

Add network status check before starting AI conversation:

```typescript
// Add at component start
const isOnline = navigator.onLine;

// In render, before showing AI chat
if (!isOnline) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <p className="text-muted-foreground">
        Check-ins require an internet connection.
      </p>
      <Button onClick={() => navigate({ to: '/today' })} className="mt-4">
        Back to Today
      </Button>
    </div>
  );
}
```

---

### Task 5: End-to-End Verification

Manual testing checklist:

- [ ] Start morning check-in (before noon) - verify morning questions
- [ ] Start evening check-in (after noon) - verify evening questions
- [ ] Give terse response ("fine") - verify single probe then acceptance
- [ ] Skip check-in - verify card shows skipped state
- [ ] Complete check-in - verify memory extraction runs
- [ ] Return after 3+ days - verify "Welcome back" message
- [ ] Trigger AI error - verify generic error message
- [ ] Tap check-in notification (iOS) - verify navigation to check-in

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/ai/use-checkin-chat.ts` | Add time-of-day question variations |
| `src/components/checkin/checkin-view.tsx` | Standardize error message, add offline check |
| `src/lib/notifications/checkin-reminders.ts` | Add deep link navigation on notification tap |

## References

### Internal
- `src/lib/ai/use-checkin-chat.ts:42-47` - Current static questions
- `src/components/checkin/checkin-view.tsx:187` - Error message display
- `src/lib/notifications/checkin-reminders.ts:78-86` - Notification listener
- `docs/spec.md:497-521` - Check-in system specification

### External
- [Capacitor Local Notifications](https://capacitorjs.com/docs/apis/local-notifications) - Notification deep linking
- [Vercel AI SDK](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) - Streaming patterns

---

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| One or two check-ins per day? | **One per day** with time-based variations (matches current implementation) |
| Track terse responses in state machine? | **Defer** - AI prompt handling is sufficient for now |
| Memory extraction timing? | **Keep at completion** - simpler and current behavior is acceptable |
