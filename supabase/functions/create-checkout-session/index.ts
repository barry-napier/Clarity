import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-11-20.acacia',
});

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
    const { priceId, googleUserId, email, returnUrl } = await req.json();

    if (!priceId || !googleUserId || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: priceId, googleUserId, email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create user in our database
    let { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('google_user_id', googleUserId)
      .single();

    if (!user) {
      // Create new user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({ google_user_id: googleUserId, email })
        .select('id')
        .single();

      if (userError) throw userError;
      user = newUser;
    }

    // Get or create subscription record
    let { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email,
        metadata: {
          supabase_user_id: user.id,
          google_user_id: googleUserId,
        },
      });
      customerId = customer.id;

      // Create subscription record with trial
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);

      await supabase.from('subscriptions').insert({
        user_id: user.id,
        stripe_customer_id: customerId,
        status: 'trialing',
        trial_start: new Date().toISOString(),
        trial_end: trialEnd.toISOString(),
      });
    }

    // Determine plan type from price ID
    const monthlyPriceId = Deno.env.get('STRIPE_PRICE_MONTHLY');
    const planType = priceId === monthlyPriceId ? 'monthly' : 'annual';

    // Create checkout session with card-free trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_collection: 'if_required',
      subscription_data: {
        trial_period_days: 7,
        trial_settings: {
          end_behavior: { missing_payment_method: 'pause' },
        },
        metadata: {
          plan_type: planType,
        },
      },
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${returnUrl}?canceled=true`,
      allow_promotion_codes: true,
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Checkout session error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
