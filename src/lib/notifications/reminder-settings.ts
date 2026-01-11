import { Preferences } from '@capacitor/preferences';

const REMINDER_SETTINGS_KEY = 'checkin_reminder_settings';
const NOTIFICATION_PROMPT_SHOWN_KEY = 'notification_prompt_shown';
const COMPLETED_CHECKINS_COUNT_KEY = 'completed_checkins_count';

export interface ReminderSettings {
  enabled: boolean;
  morningEnabled: boolean;
  morningTime: string; // HH:MM format
  eveningEnabled: boolean;
  eveningTime: string; // HH:MM format
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  morningEnabled: true,
  morningTime: '08:00',
  eveningEnabled: true,
  eveningTime: '20:00',
};

/**
 * Get the current reminder settings
 */
export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const { value } = await Preferences.get({ key: REMINDER_SETTINGS_KEY });
    if (value) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(value) };
    }
  } catch (error) {
    console.error('Failed to get reminder settings:', error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save reminder settings
 */
export async function saveReminderSettings(
  settings: ReminderSettings
): Promise<void> {
  try {
    await Preferences.set({
      key: REMINDER_SETTINGS_KEY,
      value: JSON.stringify(settings),
    });
  } catch (error) {
    console.error('Failed to save reminder settings:', error);
    throw error;
  }
}

/**
 * Check if the notification permission prompt has been shown
 */
export async function hasNotificationPromptBeenShown(): Promise<boolean> {
  try {
    const { value } = await Preferences.get({ key: NOTIFICATION_PROMPT_SHOWN_KEY });
    return value === 'true';
  } catch (error) {
    console.error('Failed to check notification prompt status:', error);
    return false;
  }
}

/**
 * Mark the notification permission prompt as shown
 */
export async function markNotificationPromptShown(): Promise<void> {
  try {
    await Preferences.set({
      key: NOTIFICATION_PROMPT_SHOWN_KEY,
      value: 'true',
    });
  } catch (error) {
    console.error('Failed to mark notification prompt as shown:', error);
  }
}

/**
 * Get the count of completed check-ins (for soft prompt trigger)
 */
export async function getCompletedCheckinsCount(): Promise<number> {
  try {
    const { value } = await Preferences.get({ key: COMPLETED_CHECKINS_COUNT_KEY });
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('Failed to get completed checkins count:', error);
    return 0;
  }
}

/**
 * Increment the completed check-ins count
 */
export async function incrementCompletedCheckinsCount(): Promise<number> {
  try {
    const current = await getCompletedCheckinsCount();
    const newCount = current + 1;
    await Preferences.set({
      key: COMPLETED_CHECKINS_COUNT_KEY,
      value: newCount.toString(),
    });
    return newCount;
  } catch (error) {
    console.error('Failed to increment completed checkins count:', error);
    return 0;
  }
}

/**
 * Check if we should show the notification prompt
 * (After 3+ completed check-ins, if not already shown)
 */
export async function shouldShowNotificationPrompt(): Promise<boolean> {
  const alreadyShown = await hasNotificationPromptBeenShown();
  if (alreadyShown) {
    return false;
  }

  const count = await getCompletedCheckinsCount();
  return count >= 3;
}
