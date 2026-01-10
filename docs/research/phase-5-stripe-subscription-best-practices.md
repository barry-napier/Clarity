# Phase 5: Stripe & Subscription Best Practices Research

> Research compiled: January 2026
> Sources: Official Stripe Documentation, Supabase Documentation, Capacitor Community, Industry Best Practices

## Table of Contents

1. [Stripe Checkout Integration Patterns](#stripe-checkout-integration-patterns)
2. [Subscription Management with Supabase](#subscription-management-with-supabase)
3. [Feature Gating Patterns for SaaS](#feature-gating-patterns-for-saas)
4. [Mobile Payment Flows in Capacitor Apps](#mobile-payment-flows-in-capacitor-apps)
5. [Security Recommendations](#security-recommendations)
6. [Implementation Checklist](#implementation-checklist)

---

## Stripe Checkout Integration Patterns

### Integration Options

Stripe offers two main approaches for payment collection:

| Approach | Use Case | Complexity |
|----------|----------|------------|
| **Stripe Checkout** | Quick setup, Stripe-hosted payment page | Low |
| **Stripe Elements** | Custom UI, embedded payment forms | Medium-High |

**Recommendation for Clarity**: Start with **Stripe Checkout** for faster implementation, then migrate to Elements if custom UI is required.

### Subscription Models

Choose the appropriate model based on your business needs:

1. **Pay Up Front**: Collect payment details and charge before providing access
2. **Free Trial**: Collect payment details, offer free period, then begin charging
3. **Freemium**: Provide limited access without payment details, charge for premium features

### Checkout Session Configuration

```typescript
// Create a Checkout Session for subscriptions
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  payment_method_types: ['card'],
  line_items: [
    {
      price: 'price_xxx', // Your Stripe Price ID
      quantity: 1,
    },
  ],
  // Free trial configuration
  subscription_data: {
    trial_period_days: 14,
    // Or use trial_end for specific date
    // trial_end: Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60),
  },
  // Save payment method as default
  payment_method_collection: 'always',
  // Customer portal redirect
  success_url: `${YOUR_DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${YOUR_DOMAIN}/canceled`,
  // Automatic tax calculation (if configured)
  automatic_tax: { enabled: true },
});
```

### Customer Portal Integration

The Stripe Customer Portal provides self-service subscription management:

```typescript
// Create a portal session
const portalSession = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: `${YOUR_DOMAIN}/account`,
});

// Redirect user to portal
redirect(portalSession.url);
```

**Portal Configuration Best Practices**:
- Enable payment method updates
- Configure cancellation flows with retention offers
- Limit plan switching to 10 products maximum
- Set up cancellation reason collection

### API Version

Use Stripe API version `2025-06-30.basil` or later for the latest features.

---

## Subscription Management with Supabase

### Architecture Options

#### Option 1: Stripe Sync Engine (Recommended)

Supabase provides official one-click integration that syncs Stripe data to your database:

```sql
-- Creates 'stripe' schema with tables matching Stripe objects
-- Tables: customers, subscriptions, products, prices, invoices, etc.
```

**Benefits**:
- Automatic data sync via webhooks
- Query subscription data with SQL
- Use in RLS policies

#### Option 2: Edge Functions for Webhooks

```typescript
// supabase/functions/stripe-webhook/index.ts
import Stripe from 'https://esm.sh/stripe@14?target=denonext'

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
  apiVersion: '2024-11-20'
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

Deno.serve(async (request) => {
  const signature = request.headers.get('Stripe-Signature')
  const body = await request.text()

  let event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')!,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    return new Response(err.message, { status: 400 })
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object)
      break
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionChange(event.data.object)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object)
      break
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object)
      break
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object)
      break
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
```

**Edge Function Configuration** (`config.toml`):
```toml
[functions.stripe-webhook]
verify_jwt = false  # Required for external webhook access
```

### Database Schema

```sql
-- Subscriptions table synced from Stripe
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL,
  price_id TEXT,
  product_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
```

### Webhook Handler Pattern

```typescript
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      price_id: subscription.items.data[0]?.price.id,
      product_id: subscription.items.data[0]?.price.product as string,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'stripe_subscription_id'
    })

  if (error) throw error
}
```

---

## Feature Gating Patterns for SaaS

### Key Concepts

**Feature Gating**: Controlling access to features based on subscription tier or payment plan.

**Entitlements**: Digital "keys" that define what each user can access based on their subscription.

### Types of Entitlements

| Type | Description | Example |
|------|-------------|---------|
| **Feature Gates** | Binary access to features | Premium reporting, Advanced analytics |
| **Usage Limits** | Consumption-based limits | API calls, Storage space, Team members |
| **Configuration** | Customizable feature settings | Data retention period, Custom branding |

### Implementation Pattern

```typescript
// types/entitlements.ts
export interface Entitlements {
  // Feature gates
  features: {
    advancedAnalytics: boolean
    customBranding: boolean
    prioritySupport: boolean
    apiAccess: boolean
  }
  // Usage limits
  limits: {
    storageGb: number
    apiCallsPerMonth: number
    teamMembers: number
    projectsLimit: number
  }
  // Tier info
  tier: 'free' | 'pro' | 'enterprise'
}

// Define entitlements by tier
export const TIER_ENTITLEMENTS: Record<string, Entitlements> = {
  free: {
    features: {
      advancedAnalytics: false,
      customBranding: false,
      prioritySupport: false,
      apiAccess: false,
    },
    limits: {
      storageGb: 1,
      apiCallsPerMonth: 1000,
      teamMembers: 1,
      projectsLimit: 3,
    },
    tier: 'free',
  },
  pro: {
    features: {
      advancedAnalytics: true,
      customBranding: true,
      prioritySupport: false,
      apiAccess: true,
    },
    limits: {
      storageGb: 50,
      apiCallsPerMonth: 50000,
      teamMembers: 5,
      projectsLimit: 20,
    },
    tier: 'pro',
  },
  enterprise: {
    features: {
      advancedAnalytics: true,
      customBranding: true,
      prioritySupport: true,
      apiAccess: true,
    },
    limits: {
      storageGb: 500,
      apiCallsPerMonth: -1, // unlimited
      teamMembers: -1, // unlimited
      projectsLimit: -1, // unlimited
    },
    tier: 'enterprise',
  },
}
```

### Feature Gate Hook

```typescript
// hooks/useEntitlements.ts
import { useSubscription } from './useSubscription'
import { TIER_ENTITLEMENTS, Entitlements } from '@/types/entitlements'

export function useEntitlements(): Entitlements {
  const { subscription } = useSubscription()

  // Map Stripe product/price to tier
  const tier = mapSubscriptionToTier(subscription)

  return TIER_ENTITLEMENTS[tier] ?? TIER_ENTITLEMENTS.free
}

export function useFeatureGate(feature: keyof Entitlements['features']): boolean {
  const entitlements = useEntitlements()
  return entitlements.features[feature]
}

export function useUsageLimit(limit: keyof Entitlements['limits']): number {
  const entitlements = useEntitlements()
  return entitlements.limits[limit]
}
```

### Feature Gate Component

```tsx
// components/FeatureGate.tsx
interface FeatureGateProps {
  feature: keyof Entitlements['features']
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const hasAccess = useFeatureGate(feature)

  if (hasAccess) {
    return <>{children}</>
  }

  return fallback ?? (
    <UpgradePrompt feature={feature} />
  )
}

// Usage
<FeatureGate feature="advancedAnalytics">
  <AnalyticsDashboard />
</FeatureGate>
```

### RLS-Based Feature Gating (Supabase)

```sql
-- Function to check subscription status
CREATE OR REPLACE FUNCTION has_active_subscription()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = auth.uid()
    AND status IN ('active', 'trialing')
    AND current_period_end > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check specific tier
CREATE OR REPLACE FUNCTION has_tier(required_tier TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
BEGIN
  SELECT
    CASE
      WHEN p.metadata->>'tier' IS NOT NULL THEN p.metadata->>'tier'
      ELSE 'free'
    END INTO user_tier
  FROM subscriptions s
  JOIN stripe.prices pr ON s.price_id = pr.id
  JOIN stripe.products p ON pr.product = p.id
  WHERE s.user_id = auth.uid()
  AND s.status IN ('active', 'trialing');

  RETURN user_tier = required_tier OR user_tier = 'enterprise';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policy using subscription check
CREATE POLICY "Pro users can access analytics"
  ON analytics_data FOR SELECT
  TO authenticated
  USING (has_tier('pro'));
```

### Best Practices

1. **Transparency**: Clearly communicate what features are available at each tier
2. **Avoid Gating Critical Features**: Core functionality should be accessible; gate premium enhancements
3. **Dynamic Pricing**: Use tools to adjust pricing based on user feedback
4. **Hybrid Models**: Mix subscription + usage-based pricing for flexibility (21% higher growth rate)
5. **Retention Coupons**: Offer discounts when users attempt to cancel

---

## Mobile Payment Flows in Capacitor Apps

### Payment Strategy Decision Tree

```
Is the content/feature a "digital good" consumed in-app?
│
├── YES → Apple/Google require IAP (with exceptions below)
│   │
│   └── Is user in US (Apple) or has Google alternative billing?
│       │
│       ├── YES → Can offer external payment as option
│       │         (Lower fees: ~3-5% vs 15-30%)
│       │
│       └── NO → Must use IAP only
│
└── NO (physical goods, real-world services) → Use Stripe directly
```

### 2025 Platform Changes

**Apple (US Only, as of May 2025)**:
- Apps can link to external payment methods for digital goods
- No Apple commission on external purchases
- Must include required disclosures

**Google Play (US Only, as of October 2025)**:
- Alternative payment systems allowed
- User choice billing available

### Fee Comparison

| Method | Fee | Notes |
|--------|-----|-------|
| Apple/Google IAP | 15-30% | Standard rate; 15% for small developers or after 1 year |
| Stripe (US cards) | 2.9% + $0.30 | Most cost-effective |
| Stripe (International) | 3.9% + $0.30 | +1% for non-US cards |

### Capacitor Implementation Options

#### Option 1: External Payment (Stripe Checkout)

Best for: Web-first apps, US users, avoiding platform fees

```typescript
// services/stripe-payment.ts
import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'

export async function initiateCheckout(priceId: string) {
  // Create checkout session on your server
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId }),
  })

  const { url } = await response.json()

  // Open Stripe Checkout in system browser
  await Browser.open({ url })

  // Listen for deep link return
  App.addListener('appUrlOpen', async ({ url }) => {
    if (url.includes('success')) {
      // Handle successful payment
      await refreshSubscriptionStatus()
    }
  })
}
```

#### Option 2: Native IAP (Capacitor Native Purchases)

Best for: Global users, App Store compliance, trusted UX

```typescript
// services/native-purchases.ts
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases'
import { Capacitor } from '@capacitor/core'

export async function purchaseSubscription(
  productId: string,
  planId: string,
  userId: string
) {
  // Check billing support
  const { isBillingSupported } = await NativePurchases.isBillingSupported()
  if (!isBillingSupported) {
    throw new Error('Purchases not supported on this device')
  }

  // Get product info
  const { product } = await NativePurchases.getProduct({
    productIdentifier: productId,
    productType: PURCHASE_TYPE.SUBS,
  })

  // Generate app account token for cross-platform user linking
  const appAccountToken = generateUUIDv5(userId)

  // Make purchase
  const transaction = await NativePurchases.purchaseProduct({
    productIdentifier: productId,
    planIdentifier: planId,  // REQUIRED for Android subscriptions
    productType: PURCHASE_TYPE.SUBS,
    quantity: 1,
    appAccountToken,
    autoAcknowledgePurchases: true,
  })

  // Validate on server
  await validatePurchase(transaction)

  return transaction
}
```

#### Option 3: Capacitor Community Stripe Plugin

For native Stripe integration with Apple Pay / Google Pay:

```bash
npm install @capacitor-community/stripe@6
```

```typescript
// Configure Stripe
import { Stripe } from '@capacitor-community/stripe'

await Stripe.initialize({
  publishableKey: 'pk_live_xxx',
})

// Payment Sheet (similar to Stripe Checkout, but native)
await Stripe.createPaymentSheet({
  paymentIntentClientSecret: clientSecret,
  merchantDisplayName: 'Clarity App',
})

const { paymentResult } = await Stripe.presentPaymentSheet()
```

### Recommended Hybrid Approach

```typescript
// services/payment-router.ts
import { Capacitor } from '@capacitor/core'

export function getPaymentMethod(userLocation: string, purchaseType: 'subscription' | 'one-time') {
  const platform = Capacitor.getPlatform()

  // Web always uses Stripe
  if (platform === 'web') {
    return 'stripe-checkout'
  }

  // US users on mobile: offer choice
  if (userLocation === 'US') {
    return 'hybrid' // Let user choose IAP or external
  }

  // Non-US mobile users: use IAP
  return 'native-iap'
}

// Route annual plans to web (lower fees)
// Route monthly/impulse purchases to IAP (higher conversion)
export function optimizePaymentRoute(plan: 'monthly' | 'annual') {
  if (plan === 'annual') {
    return 'stripe-checkout' // Lower fees worth the friction
  }
  return 'native-iap' // Higher conversion for small amounts
}
```

---

## Security Recommendations

### Webhook Security

#### 1. Always Verify Signatures

```typescript
// CRITICAL: Verify webhook signature
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
)
```

#### 2. Use Raw Body

```typescript
// Express.js - use raw body for webhook endpoint
app.post('/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
)
```

#### 3. Implement Idempotency

```typescript
// Store processed event IDs
const processedEvents = new Set<string>()

async function handleWebhook(event: Stripe.Event) {
  // Check for duplicate
  if (processedEvents.has(event.id)) {
    return { received: true, duplicate: true }
  }

  // Or use database
  const existing = await db.webhookEvents.findUnique({
    where: { stripe_event_id: event.id }
  })
  if (existing) return { received: true, duplicate: true }

  // Process event...

  // Mark as processed
  await db.webhookEvents.create({
    data: {
      stripe_event_id: event.id,
      processed_at: new Date()
    }
  })
}
```

### API Key Security

1. **Never expose secret keys** - Only publishable keys in frontend
2. **Use environment variables** - Never commit keys to version control
3. **Restrict API key permissions** - Use restricted keys for specific operations
4. **Rotate keys periodically** - Especially after team changes

### PCI Compliance

1. **Use Stripe.js/Elements** - Payment data never touches your servers
2. **HTTPS everywhere** - TLS for all payment-related pages
3. **Review compliance annually** - Self-assessment questionnaire

### Mobile Security

```typescript
// Validate purchases server-side
async function validatePurchase(transaction: Transaction) {
  const platform = Capacitor.getPlatform()

  if (platform === 'ios') {
    // Validate receipt with Apple
    await validateAppleReceipt(transaction.receipt)
  } else if (platform === 'android') {
    // Validate with Google Play API
    await validateGooglePurchase(transaction.purchaseToken)
  }
}
```

### Subscription Status Checks

```typescript
// Always check subscription server-side, not just client
async function checkAccess(userId: string): Promise<boolean> {
  const subscription = await db.subscriptions.findFirst({
    where: {
      user_id: userId,
      status: { in: ['active', 'trialing'] },
      current_period_end: { gt: new Date() }
    }
  })

  return !!subscription
}
```

---

## Implementation Checklist

### Phase 5A: Stripe Setup

- [ ] Create Stripe account and configure products/prices
- [ ] Set up webhook endpoint (Supabase Edge Function)
- [ ] Configure Customer Portal
- [ ] Implement signature verification
- [ ] Set up idempotency handling
- [ ] Configure test mode and test clocks

### Phase 5B: Supabase Integration

- [ ] Create subscriptions table with RLS
- [ ] Deploy Stripe webhook Edge Function
- [ ] Map Stripe customers to Supabase users
- [ ] Implement subscription status sync
- [ ] Create helper functions for access checks

### Phase 5C: Feature Gating

- [ ] Define tier entitlements
- [ ] Implement useEntitlements hook
- [ ] Create FeatureGate component
- [ ] Add RLS policies for feature access
- [ ] Build upgrade prompts

### Phase 5D: Mobile Payments

- [ ] Decide on payment strategy (IAP vs Stripe vs hybrid)
- [ ] Configure Capacitor payment plugins
- [ ] Implement deep link handling for returns
- [ ] Set up server-side receipt validation
- [ ] Test on both iOS and Android

### Phase 5E: Testing & Launch

- [ ] Test complete subscription lifecycle
- [ ] Test failed payment handling
- [ ] Test cancellation and reactivation
- [ ] Test trial periods
- [ ] Test Customer Portal flows
- [ ] Load test webhook handling

---

## Sources

### Official Documentation
- [Stripe Subscriptions Documentation](https://docs.stripe.com/billing/subscriptions/build-subscriptions)
- [Stripe Customer Portal](https://docs.stripe.com/customer-management)
- [Stripe SaaS Integration Guide](https://docs.stripe.com/saas)
- [Supabase Stripe Webhooks](https://supabase.com/docs/guides/functions/examples/stripe-webhooks)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Stripe Sync Engine](https://supabase.com/blog/stripe-sync-engine-integration)
- [Capacitor Community Stripe Plugin](https://github.com/capacitor-community/stripe)
- [Capgo Native Purchases](https://github.com/cap-go/capacitor-native-purchases)

### Best Practices & Guides
- [Stripe Best Practices for SaaS Billing](https://stripe.com/resources/more/best-practices-for-saas-billing)
- [Stripe Webhook Best Practices](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks)
- [LaunchDarkly Entitlements with Feature Flags](https://launchdarkly.com/blog/how-to-manage-entitlements-with-feature-flags/)
- [Orb: What is Feature Gating](https://www.withorb.com/blog/feature-gating)
- [Orb: What are Entitlements in SaaS](https://www.withorb.com/blog/what-are-entitlements-in-saas)

### Mobile Payments
- [Stripe In-App Purchases Documentation](https://docs.stripe.com/mobile/digital-goods)
- [Capacitor Stripe Payment Links Guide](https://capgo.app/blog/setup-stripe-payment-in-us-capacitor/)
- [RevenueCat: App-to-Web Purchase Guidelines](https://www.revenuecat.com/blog/engineering/app-to-web-purchase-guidelines/)
- [Adapty: Can You Use Stripe for In-App Purchases](https://adapty.io/blog/can-you-use-stripe-for-in-app-purchases/)

### Starter Templates
- [Vercel Next.js Subscription Payments](https://github.com/vercel/nextjs-subscription-payments)
- [Next Supabase Stripe Starter](https://github.com/KolbySisk/next-supabase-stripe-starter)
