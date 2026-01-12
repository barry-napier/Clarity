import { type ReactNode, useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useSubscription } from '@/lib/stripe/use-subscription';
import { ExpiredScreen } from './expired-screen';
import { TrialBanner } from './trial-banner';

interface SubscriptionGateProps {
  children: ReactNode;
  /** Show loading spinner while checking subscription */
  showLoading?: boolean;
}

/**
 * Gate component that checks subscription status before rendering children.
 * Shows ExpiredScreen if trial ended without subscription.
 * Shows TrialBanner if user is in trial period.
 *
 * Also listens for app resume events to refresh subscription status
 * (handles return from Stripe Checkout on iOS).
 */
export function SubscriptionGate({ children, showLoading = true }: SubscriptionGateProps) {
  const { isLoading, isActive, status, trialDaysRemaining, isTrialEndingSoon, refresh } = useSubscription();

  // Listen for app resume to refresh subscription status
  // This handles the case when user returns from Stripe Checkout
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener('appStateChange', ({ isActive: appIsActive }) => {
      if (appIsActive) {
        console.log('[SubscriptionGate] App resumed, refreshing subscription status');
        refresh();
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [refresh]);

  // Loading state
  if (isLoading && showLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Not active - show expired screen
  if (!isActive && status?.status !== 'trialing') {
    return <ExpiredScreen onRefresh={refresh} />;
  }

  // Active (trialing or subscribed) - render children with optional trial banner
  return (
    <>
      {status?.status === 'trialing' && trialDaysRemaining !== null && (
        <TrialBanner
          daysRemaining={trialDaysRemaining}
          isEndingSoon={isTrialEndingSoon}
        />
      )}
      {children}
    </>
  );
}
