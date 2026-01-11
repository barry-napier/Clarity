import { Capacitor } from '@capacitor/core';

/**
 * Haptic feedback types
 */
type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Trigger haptic feedback on iOS
 * Falls back to no-op on web
 */
export function haptic(type: HapticType = 'light'): void {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Use the Taptic Engine via a hidden API
  // This works in WKWebView on iOS
  if ('vibrate' in navigator) {
    const patterns: Record<HapticType, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 30,
      success: [10, 50, 10],
      warning: [20, 50, 20],
      error: [30, 50, 30, 50, 30],
    };

    try {
      navigator.vibrate(patterns[type]);
    } catch {
      // Ignore errors - haptics are optional
    }
  }
}

/**
 * Haptic feedback for message sent
 */
export function hapticMessageSent(): void {
  haptic('light');
}

/**
 * Haptic feedback for message received
 */
export function hapticMessageReceived(): void {
  haptic('light');
}

/**
 * Haptic feedback for error
 */
export function hapticError(): void {
  haptic('error');
}

/**
 * Haptic feedback for success
 */
export function hapticSuccess(): void {
  haptic('success');
}
