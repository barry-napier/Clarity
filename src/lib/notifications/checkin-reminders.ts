import { LocalNotifications, type ScheduleOptions, type PendingResult } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { getReminderSettings, type ReminderSettings } from './reminder-settings';

export const MORNING_NOTIFICATION_ID = 1001;
export const EVENING_NOTIFICATION_ID = 1002;

/**
 * Check if notifications are available (native platform)
 */
export function isNotificationsAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Request notification permissions
 * Returns true if permissions were granted
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!isNotificationsAvailable()) {
    return false;
  }

  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return false;
  }
}

/**
 * Check if notification permissions are granted
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  if (!isNotificationsAvailable()) {
    return false;
  }

  try {
    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('Failed to check notification permissions:', error);
    return false;
  }
}

/**
 * Schedule morning and evening check-in reminders
 * Based on user's settings
 */
export async function scheduleCheckinReminders(): Promise<void> {
  if (!isNotificationsAvailable()) {
    console.log('Notifications not available on this platform');
    return;
  }

  const hasPermission = await checkNotificationPermissions();
  if (!hasPermission) {
    console.log('Notification permissions not granted');
    return;
  }

  const settings = await getReminderSettings();
  if (!settings.enabled) {
    await cancelAllCheckinReminders();
    return;
  }

  // Cancel existing notifications first
  await cancelAllCheckinReminders();

  const notifications: ScheduleOptions['notifications'] = [];

  // Schedule morning reminder
  if (settings.morningEnabled) {
    const [hours, minutes] = settings.morningTime.split(':').map(Number);
    notifications.push({
      id: MORNING_NOTIFICATION_ID,
      title: 'Good morning',
      body: 'Ready for your daily check-in?',
      schedule: {
        on: {
          hour: hours,
          minute: minutes,
        },
        allowWhileIdle: true,
      },
    });
  }

  // Schedule evening reminder
  if (settings.eveningEnabled) {
    const [hours, minutes] = settings.eveningTime.split(':').map(Number);
    notifications.push({
      id: EVENING_NOTIFICATION_ID,
      title: 'Evening reflection',
      body: "How did today go? Let's check in.",
      schedule: {
        on: {
          hour: hours,
          minute: minutes,
        },
        allowWhileIdle: true,
      },
    });
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
    console.log(`Scheduled ${notifications.length} check-in reminders`);
  }
}

/**
 * Cancel all scheduled check-in reminders
 */
export async function cancelAllCheckinReminders(): Promise<void> {
  if (!isNotificationsAvailable()) {
    return;
  }

  try {
    await LocalNotifications.cancel({
      notifications: [
        { id: MORNING_NOTIFICATION_ID },
        { id: EVENING_NOTIFICATION_ID },
      ],
    });
  } catch (error) {
    console.error('Failed to cancel notifications:', error);
  }
}

/**
 * Get pending check-in notifications
 */
export async function getPendingCheckinReminders(): Promise<PendingResult> {
  if (!isNotificationsAvailable()) {
    return { notifications: [] };
  }

  try {
    return await LocalNotifications.getPending();
  } catch (error) {
    console.error('Failed to get pending notifications:', error);
    return { notifications: [] };
  }
}

/**
 * Register notification click listener
 * Returns a cleanup function
 */
export function registerNotificationClickListener(
  onNotificationClick: (notificationId: number) => void
): () => void {
  if (!isNotificationsAvailable()) {
    return () => {};
  }

  const listener = LocalNotifications.addListener(
    'localNotificationActionPerformed',
    (notification) => {
      onNotificationClick(notification.notification.id);
    }
  );

  return () => {
    listener.then((l) => l.remove());
  };
}

/**
 * Update reminders based on new settings
 */
export async function updateRemindersWithSettings(
  settings: ReminderSettings
): Promise<void> {
  if (settings.enabled) {
    await scheduleCheckinReminders();
  } else {
    await cancelAllCheckinReminders();
  }
}
