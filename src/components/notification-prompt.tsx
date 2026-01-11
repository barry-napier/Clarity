import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  isNotificationsAvailable,
  requestNotificationPermissions,
  scheduleCheckinReminders,
} from '@/lib/notifications/checkin-reminders';
import {
  shouldShowNotificationPrompt,
  markNotificationPromptShown,
  saveReminderSettings,
  getReminderSettings,
} from '@/lib/notifications/reminder-settings';

export function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  // Check if we should show the prompt
  useEffect(() => {
    async function checkPrompt() {
      if (!isNotificationsAvailable()) {
        return;
      }

      const shouldShow = await shouldShowNotificationPrompt();
      setShowPrompt(shouldShow);
    }

    checkPrompt();
  }, []);

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestNotificationPermissions();

      if (granted) {
        // Enable reminders with default settings
        const settings = await getReminderSettings();
        await saveReminderSettings({ ...settings, enabled: true });
        await scheduleCheckinReminders();
      }

      // Mark as shown regardless of result
      await markNotificationPromptShown();
      setShowPrompt(false);
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = async () => {
    await markNotificationPromptShown();
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <Card className="border-accent/30 bg-accent/5 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </Button>

      <CardContent className="pt-6 pb-4">
        <div className="flex gap-4">
          <div className="shrink-0">
            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Bell className="h-5 w-5 text-accent" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground mb-1">
              Stay consistent with reminders
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Get gentle nudges for your morning and evening check-ins. You can
              customize the times later.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleEnable}
                disabled={isRequesting}
              >
                {isRequesting ? 'Enabling...' : 'Enable reminders'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-muted-foreground"
              >
                Not now
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
