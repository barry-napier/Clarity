-- Migration: Create users and subscriptions tables for Stripe integration
-- This links Google OAuth users to subscription status

-- User identity mapping (links Google OAuth to Supabase)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  google_user_id text unique not null,
  email text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Subscription status enum
create type subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'paused', 'incomplete'
);

-- Subscription tracking
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status subscription_status not null default 'trialing',
  plan_type text, -- 'monthly' | 'annual'
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  canceled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for query performance
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer_id on public.subscriptions(stripe_customer_id);
create index if not exists idx_users_google_user_id on public.users(google_user_id);

-- Enable RLS
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;

-- RLS Policies
-- Note: These use a custom claim 'google_user_id' that we'll set via Edge Function

-- Allow service role full access (for Edge Functions)
create policy "Service role has full access to users"
  on public.users for all
  using (auth.role() = 'service_role');

create policy "Service role has full access to subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

-- Allow anon role to read user's own subscription via function call
-- The actual access control happens in the Edge Function
create policy "Allow anon to select subscriptions"
  on public.subscriptions for select
  using (true);

create policy "Allow anon to select users"
  on public.users for select
  using (true);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_users_updated_at
  before update on public.users
  for each row
  execute function update_updated_at_column();

create trigger update_subscriptions_updated_at
  before update on public.subscriptions
  for each row
  execute function update_updated_at_column();

-- Helper function to check if user has active subscription
create or replace function has_active_subscription(p_google_user_id text)
returns boolean as $$
begin
  return exists (
    select 1
    from public.users u
    join public.subscriptions s on s.user_id = u.id
    where u.google_user_id = p_google_user_id
    and s.status in ('trialing', 'active')
    and (
      s.trial_end > now()
      or s.current_period_end > now()
    )
  );
end;
$$ language plpgsql security definer;
