import { supabase } from '../supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface SubscriptionStatus {
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | 'incomplete' | 'none';
  isActive: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  periodEndsAt: string | null;
  planType: 'monthly' | 'annual' | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

/**
 * Ensure user exists in Supabase (called after OAuth success)
 * Creates user and trial subscription if they don't exist
 */
export async function ensureSupabaseUser(googleUserId: string, email: string): Promise<void> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ensure-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ googleUserId, email }),
    });

    if (!response.ok) {
      console.error('Error ensuring user:', await response.text());
      // Don't throw - user can still use app, subscription check will fail gracefully
      return;
    }

    const data = await response.json();

    if (data.isNewUser) {
      console.log('New user created with 7-day trial, expires:', data.trialEnd);
    } else {
      console.log('Existing user verified');
    }
  } catch (error) {
    console.error('Error ensuring Supabase user:', error);
    // Don't throw - non-critical error
  }
}

/**
 * Fetch subscription status from Supabase
 */
export async function fetchSubscriptionStatus(googleUserId: string): Promise<SubscriptionStatus> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ googleUserId }),
    });

    if (!response.ok) {
      throw new Error(`Subscription fetch failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching subscription:', error);
    // Return inactive status on error - fail secure
    return {
      status: 'none',
      isActive: false,
      trialEndsAt: null,
      trialDaysRemaining: null,
      periodEndsAt: null,
      planType: null,
      cancelAtPeriodEnd: false,
    };
  }
}

/**
 * Create a Stripe checkout session
 */
export async function createCheckoutSession(
  googleUserId: string,
  email: string,
  priceId: string,
  returnUrl: string
): Promise<{ url: string; sessionId: string } | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        googleUserId,
        email,
        priceId,
        returnUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Checkout session creation failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return null;
  }
}

/**
 * Create a Stripe customer portal session
 */
export async function createPortalSession(
  googleUserId: string,
  returnUrl: string
): Promise<{ url: string } | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        googleUserId,
        returnUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Portal session creation failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating portal session:', error);
    return null;
  }
}
