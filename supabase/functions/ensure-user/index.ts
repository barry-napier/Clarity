import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Ensure user exists in Supabase with a trial subscription.
 * Called after OAuth success to set up new users automatically.
 *
 * - If user exists: returns existing subscription status
 * - If user is new: creates user + 7-day trial subscription
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { googleUserId, email } = await req.json();

    if (!googleUserId || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing googleUserId or email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('google_user_id', googleUserId)
      .single();

    if (existingUser) {
      // User exists - just return success
      return new Response(
        JSON.stringify({
          success: true,
          isNewUser: false,
          userId: existingUser.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new user
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        google_user_id: googleUserId,
        email,
      })
      .select('id')
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create trial subscription (7 days)
    const now = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: newUser.id,
        status: 'trialing',
        trial_start: now.toISOString(),
        trial_end: trialEnd.toISOString(),
      });

    if (subError) {
      console.error('Error creating subscription:', subError);
      // Don't fail - user was created, subscription can be created later
    }

    console.log(`Created new user ${newUser.id} with 7-day trial`);

    return new Response(
      JSON.stringify({
        success: true,
        isNewUser: true,
        userId: newUser.id,
        trialEnd: trialEnd.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Ensure user error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
