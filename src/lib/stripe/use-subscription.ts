import { useState, useEffect, useCallback } from 'react';
import { getGoogleUserId } from '../user-service';
import { fetchSubscriptionStatus, type SubscriptionStatus } from './subscription-service';

export interface UseSubscriptionReturn {
  /** Current subscription status */
  status: SubscriptionStatus | null;
  /** Whether the subscription data is loading */
  isLoading: boolean;
  /** Whether the user has active access (trialing or active subscription) */
  isActive: boolean;
  /** Days remaining in trial (null if not trialing) */
  trialDaysRemaining: number | null;
  /** Whether the trial is ending soon (3 days or less) */
  isTrialEndingSoon: boolean;
  /** Error message if subscription check failed */
  error: string | null;
  /** Refresh the subscription status */
  refresh: () => Promise<void>;
}

/**
 * Hook to manage subscription status
 */
export function useSubscription(): UseSubscriptionReturn {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const googleUserId = await getGoogleUserId();
      if (!googleUserId) {
        // User not signed in yet
        setStatus({
          status: 'none',
          isActive: false,
          trialEndsAt: null,
          trialDaysRemaining: null,
          periodEndsAt: null,
          planType: null,
          cancelAtPeriodEnd: false,
        });
        return;
      }

      const subscriptionStatus = await fetchSubscriptionStatus(googleUserId);
      setStatus(subscriptionStatus);
    } catch (err) {
      console.error('Error fetching subscription status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
      // Set inactive status on error - fail secure
      setStatus({
        status: 'none',
        isActive: false,
        trialEndsAt: null,
        trialDaysRemaining: null,
        periodEndsAt: null,
        planType: null,
        cancelAtPeriodEnd: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Calculate derived state
  const isActive = status?.isActive ?? false;
  const trialDaysRemaining = status?.trialDaysRemaining ?? null;
  const isTrialEndingSoon = trialDaysRemaining !== null && trialDaysRemaining <= 3;

  return {
    status,
    isLoading,
    isActive,
    trialDaysRemaining,
    isTrialEndingSoon,
    error,
    refresh: fetchStatus,
  };
}

/**
 * Check if subscription status indicates active access
 */
export function hasActiveAccess(status: SubscriptionStatus | null): boolean {
  if (!status) return false;
  return status.isActive;
}
