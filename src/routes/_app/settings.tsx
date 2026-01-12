import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Clock, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  isNotificationsAvailable,
  requestNotificationPermissions,
  checkNotificationPermissions,
  scheduleCheckinReminders,
  cancelAllCheckinReminders,
} from '@/lib/notifications/checkin-reminders';
import {
  getReminderSettings,
  saveReminderSettings,
  type ReminderSettings,
} from '@/lib/notifications/reminder-settings';
import { useSubscription } from '@/lib/stripe/use-subscription';
import { openCustomerPortal } from '@/lib/stripe/checkout';

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const notificationsAvailable = isNotificationsAvailable();

  const subscription = useSubscription();

  // Load settings on mount
  useEffect(() => {
    async function load() {
      const s = await getReminderSettings();
      setSettings(s);

      if (notificationsAvailable) {
        const permission = await checkNotificationPermissions();
        setHasPermission(permission);
      }
    }
    load();
  }, [notificationsAvailable]);

  const handleToggleReminders = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      // If enabling and don't have permission, request it
      if (!settings.enabled && !hasPermission) {
        const granted = await requestNotificationPermissions();
        setHasPermission(granted);
        if (!granted) {
          setIsSaving(false);
          return;
        }
      }

      const newSettings = { ...settings, enabled: !settings.enabled };
      await saveReminderSettings(newSettings);
      setSettings(newSettings);

      if (newSettings.enabled) {
        await scheduleCheckinReminders();
      } else {
        await cancelAllCheckinReminders();
      }
    } catch (error) {
      console.error('Failed to toggle reminders:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleMorning = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const newSettings = { ...settings, morningEnabled: !settings.morningEnabled };
      await saveReminderSettings(newSettings);
      setSettings(newSettings);
      if (settings.enabled) {
        await scheduleCheckinReminders();
      }
    } catch (error) {
      console.error('Failed to toggle morning reminder:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEvening = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const newSettings = { ...settings, eveningEnabled: !settings.eveningEnabled };
      await saveReminderSettings(newSettings);
      setSettings(newSettings);
      if (settings.enabled) {
        await scheduleCheckinReminders();
      }
    } catch (error) {
      console.error('Failed to toggle evening reminder:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTimeChange = async (
    type: 'morning' | 'evening',
    time: string
  ) => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      [type === 'morning' ? 'morningTime' : 'eveningTime']: time,
    };
    setSettings(newSettings);
  };

  const handleTimeSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      await saveReminderSettings(settings);
      if (settings.enabled) {
        await scheduleCheckinReminders();
      }
    } catch (error) {
      console.error('Failed to save time:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <Link to="/today">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-medium text-foreground">Settings</h1>
        </div>
      </header>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Subscription section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription.isLoading ? (
              <div className="animate-pulse text-sm text-muted-foreground">
                Loading subscription status...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {subscription.status?.status === 'trialing' && 'Free Trial'}
                      {subscription.status?.status === 'active' && 'Active Subscription'}
                      {subscription.status?.status === 'past_due' && 'Payment Past Due'}
                      {subscription.status?.status === 'canceled' && 'Canceled'}
                      {subscription.status?.status === 'paused' && 'Paused'}
                      {(subscription.status?.status === 'none' || !subscription.status) && 'No Subscription'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {subscription.status?.status === 'trialing' && subscription.trialDaysRemaining !== null && (
                        <>
                          {subscription.trialDaysRemaining === 0
                            ? 'Trial ends today'
                            : `${subscription.trialDaysRemaining} day${subscription.trialDaysRemaining === 1 ? '' : 's'} remaining`}
                        </>
                      )}
                      {subscription.status?.status === 'active' && subscription.status.planType && (
                        <>
                          {subscription.status.planType === 'monthly' ? 'Monthly' : 'Annual'} plan
                          {subscription.status.cancelAtPeriodEnd && ' (cancels at period end)'}
                        </>
                      )}
                      {subscription.status?.status === 'past_due' && 'Please update your payment method'}
                      {subscription.status?.status === 'paused' && 'Resume to continue using Clarity'}
                    </p>
                  </div>
                  {subscription.status?.stripeSubscriptionId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setIsPortalLoading(true);
                        await openCustomerPortal();
                        setIsPortalLoading(false);
                      }}
                      disabled={isPortalLoading}
                    >
                      {isPortalLoading ? 'Loading...' : (
                        <>
                          Manage
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {subscription.status?.status === 'trialing' && (
                  <Link to="/pricing">
                    <Button variant="default" className="w-full">
                      Subscribe Now
                    </Button>
                  </Link>
                )}

                {(subscription.status?.status === 'none' || !subscription.status) && (
                  <Link to="/pricing">
                    <Button variant="default" className="w-full">
                      View Plans
                    </Button>
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Notifications section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Check-in Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!notificationsAvailable && (
              <p className="text-sm text-muted-foreground">
                Notifications are only available on mobile devices.
              </p>
            )}

            {notificationsAvailable && (
              <>
                {/* Master toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified for daily check-ins
                    </p>
                  </div>
                  <Button
                    variant={settings.enabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleToggleReminders}
                    disabled={isSaving}
                  >
                    {settings.enabled ? 'On' : 'Off'}
                  </Button>
                </div>

                {settings.enabled && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    {/* Morning reminder */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Morning</span>
                        </div>
                        <Button
                          variant={settings.morningEnabled ? 'default' : 'outline'}
                          size="sm"
                          onClick={handleToggleMorning}
                          disabled={isSaving}
                        >
                          {settings.morningEnabled ? 'On' : 'Off'}
                        </Button>
                      </div>
                      {settings.morningEnabled && (
                        <Input
                          type="time"
                          value={settings.morningTime}
                          onChange={(e) =>
                            handleTimeChange('morning', e.target.value)
                          }
                          onBlur={handleTimeSave}
                          className="w-32"
                        />
                      )}
                    </div>

                    {/* Evening reminder */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Evening</span>
                        </div>
                        <Button
                          variant={settings.eveningEnabled ? 'default' : 'outline'}
                          size="sm"
                          onClick={handleToggleEvening}
                          disabled={isSaving}
                        >
                          {settings.eveningEnabled ? 'On' : 'Off'}
                        </Button>
                      </div>
                      {settings.eveningEnabled && (
                        <Input
                          type="time"
                          value={settings.eveningTime}
                          onChange={(e) =>
                            handleTimeChange('evening', e.target.value)
                          }
                          onBlur={handleTimeSave}
                          className="w-32"
                        />
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
