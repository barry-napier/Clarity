import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { getGoogleUserId, getGoogleUserEmail } from '../user-service';
import { createCheckoutSession, createPortalSession } from './subscription-service';

export type PlanType = 'monthly' | 'annual';

const PRICE_IDS = {
  monthly: import.meta.env.VITE_STRIPE_PRICE_MONTHLY,
  annual: import.meta.env.VITE_STRIPE_PRICE_ANNUAL,
} as const;

// Return URL after checkout - uses the production domain
const RETURN_URL = 'https://obtainclarity.com/subscription/success';

export interface CheckoutResult {
  success: boolean;
  error?: string;
}

/**
 * Open Stripe Checkout for subscription
 * Opens in Safari on iOS (to avoid Apple's 30% fee) or new tab on web
 */
export async function openCheckout(planType: PlanType): Promise<CheckoutResult> {
  try {
    const googleUserId = await getGoogleUserId();
    const email = await getGoogleUserEmail();

    if (!googleUserId || !email) {
      return { success: false, error: 'User not authenticated' };
    }

    const priceId = PRICE_IDS[planType];
    if (!priceId) {
      return { success: false, error: `Price ID not configured for ${planType} plan` };
    }

    // Create checkout session via Edge Function
    const session = await createCheckoutSession(googleUserId, email, priceId, RETURN_URL);
    if (!session) {
      return { success: false, error: 'Failed to create checkout session' };
    }

    // Open checkout URL
    if (Capacitor.isNativePlatform()) {
      // iOS: Open in Safari (external browser) to avoid Apple fees
      await Browser.open({
        url: session.url,
        presentationStyle: 'popover', // Opens Safari
      });
    } else {
      // Web: Open in same window (will redirect back)
      window.location.href = session.url;
    }

    return { success: true };
  } catch (error) {
    console.error('Checkout error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Checkout failed'
    };
  }
}

/**
 * Open Stripe Customer Portal for subscription management
 * Allows users to update payment method, cancel, or change plans
 */
export async function openCustomerPortal(): Promise<CheckoutResult> {
  try {
    const googleUserId = await getGoogleUserId();
    if (!googleUserId) {
      return { success: false, error: 'User not authenticated' };
    }

    const returnUrl = Capacitor.isNativePlatform()
      ? 'https://obtainclarity.com/subscription/return'
      : `${window.location.origin}/settings`;

    const session = await createPortalSession(googleUserId, returnUrl);
    if (!session) {
      return { success: false, error: 'Failed to create portal session' };
    }

    // Open portal URL
    if (Capacitor.isNativePlatform()) {
      await Browser.open({
        url: session.url,
        presentationStyle: 'popover',
      });
    } else {
      window.location.href = session.url;
    }

    return { success: true };
  } catch (error) {
    console.error('Portal error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Portal access failed'
    };
  }
}

/**
 * Format price for display
 */
export function formatPrice(planType: PlanType): string {
  return planType === 'monthly' ? '$10/month' : '$99/year';
}

/**
 * Calculate savings for annual plan
 */
export function getAnnualSavings(): { amount: number; percentage: number } {
  const monthlyAnnual = 10 * 12; // $120
  const annualPrice = 99;
  const savings = monthlyAnnual - annualPrice;
  const percentage = Math.round((savings / monthlyAnnual) * 100);
  return { amount: savings, percentage };
}
