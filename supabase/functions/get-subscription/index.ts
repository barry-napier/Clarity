import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { googleUserId } = await req.json();

    if (!googleUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing googleUserId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('google_user_id', googleUserId)
      .single();

    if (!user) {
      // No user exists yet - return trial state for new users
      return new Response(
        JSON.stringify({
          status: 'none',
          isActive: false,
          trialEndsAt: null,
          periodEndsAt: null,
          planType: null,
          cancelAtPeriodEnd: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!subscription) {
      return new Response(
        JSON.stringify({
          status: 'none',
          isActive: false,
          trialEndsAt: null,
          periodEndsAt: null,
          planType: null,
          cancelAtPeriodEnd: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate if subscription is active
    const now = new Date();
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
    const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;

    const isTrialActive = subscription.status === 'trialing' && trialEnd && trialEnd > now;
    const isSubscriptionActive = subscription.status === 'active' && periodEnd && periodEnd > now;
    const isActive = isTrialActive || isSubscriptionActive;

    // Calculate days remaining in trial
    let trialDaysRemaining = null;
    if (isTrialActive && trialEnd) {
      trialDaysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return new Response(
      JSON.stringify({
        status: subscription.status,
        isActive,
        trialEndsAt: subscription.trial_end,
        trialDaysRemaining,
        periodEndsAt: subscription.current_period_end,
        planType: subscription.plan_type,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        stripeCustomerId: subscription.stripe_customer_id,
        stripeSubscriptionId: subscription.stripe_subscription_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get subscription error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
