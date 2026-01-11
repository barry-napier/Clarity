---
status: pending
priority: p2
issue_id: "048"
tags: [code-review, architecture, phase-4-checkins, ios]
dependencies: []
---

# Haptics Implementation Uses Wrong API for iOS

## Problem Statement

The haptics module uses `navigator.vibrate`, which is a vibration API, not the iOS Taptic Engine. On iOS, `navigator.vibrate` typically does nothing or is not supported in WKWebView.

## Findings

**Location:** `src/lib/haptics.ts`

```typescript
if ('vibrate' in navigator) {
  navigator.vibrate(patterns[type]);
}
```

**Impact:**
- Haptic feedback does not work on iOS
- Silent failure - no error, just no feedback
- Users miss tactile confirmation of actions

## Proposed Solutions

### Option 1: Use @capacitor/haptics (Recommended)
Use the Capacitor haptics plugin for native haptic feedback.

```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export async function haptic(type: HapticType) {
  if (Capacitor.isNativePlatform()) {
    await Haptics.impact({ style: ImpactStyle.Light });
  }
}
```

**Pros:** Works on iOS and Android, proper Taptic Engine
**Cons:** Async API, needs plugin install
**Effort:** Low
**Risk:** Low

### Option 2: Keep navigator.vibrate as Fallback
Use Capacitor on native, navigator.vibrate on web.

**Pros:** Broader compatibility
**Cons:** Web vibration is jarring
**Effort:** Low
**Risk:** Low

## Recommended Action

Option 1 - Use @capacitor/haptics for native platforms.

## Technical Details

**Affected files:**
- `src/lib/haptics.ts`

**Dependency to add:**
```bash
npm install @capacitor/haptics
npx cap sync
```

## Acceptance Criteria

- [ ] Haptic feedback works on iOS
- [ ] Uses Taptic Engine for subtle feedback
- [ ] Graceful no-op on web

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-11 | Identified during PR #7 architecture review | navigator.vibrate doesn't work in iOS WKWebView |

## Resources

- PR #7: https://github.com/barry-napier/Clarity/pull/7
- Capacitor Haptics: https://capacitorjs.com/docs/apis/haptics
