import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { openCheckout, formatPrice, getAnnualSavings, type PlanType } from '@/lib/stripe/checkout';

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
});

const FEATURES = [
  'Daily check-ins and reflections',
  'AI-powered coaching conversations',
  'Life domain tracking',
  'Personal memory system',
  'Google Drive sync (you own your data)',
  'Works offline',
];

function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [error, setError] = useState<string | null>(null);

  const { amount: annualSavings, percentage: savingsPercent } = getAnnualSavings();

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      navigate({ to: '/login' });
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await openCheckout(selectedPlan);

    if (!result.success) {
      setError(result.error || 'Something went wrong');
      setIsLoading(false);
    }
    // If successful, user is redirected to Stripe
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: '/' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="ml-2 text-lg font-medium">Pricing</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Intro */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold">Simple, honest pricing</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start with a 7-day free trial. No credit card required.
            Cancel anytime.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Annual Plan */}
          <button
            type="button"
            onClick={() => setSelectedPlan('annual')}
            className={`relative p-6 rounded-xl border-2 transition-all text-left ${
              selectedPlan === 'annual'
                ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                : 'border-border hover:border-muted-foreground/50'
            }`}
          >
            {selectedPlan === 'annual' && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-medium text-accent-foreground bg-accent px-3 py-1 rounded-full">
                Best value
              </div>
            )}
            <div className="space-y-4">
              <div>
                <div className="text-lg font-medium">Annual</div>
                <div className="text-3xl font-bold mt-1">$99<span className="text-lg font-normal text-muted-foreground">/year</span></div>
                <div className="text-sm text-accent mt-1">Save ${annualSavings} ({savingsPercent}%)</div>
              </div>
              <div className="text-sm text-muted-foreground">
                Billed annually
              </div>
            </div>
          </button>

          {/* Monthly Plan */}
          <button
            type="button"
            onClick={() => setSelectedPlan('monthly')}
            className={`p-6 rounded-xl border-2 transition-all text-left ${
              selectedPlan === 'monthly'
                ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                : 'border-border hover:border-muted-foreground/50'
            }`}
          >
            <div className="space-y-4">
              <div>
                <div className="text-lg font-medium">Monthly</div>
                <div className="text-3xl font-bold mt-1">$10<span className="text-lg font-normal text-muted-foreground">/month</span></div>
                <div className="text-sm text-muted-foreground mt-1">&nbsp;</div>
              </div>
              <div className="text-sm text-muted-foreground">
                Billed monthly
              </div>
            </div>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Subscribe Button */}
        <Button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Loading...' : isAuthenticated ? `Start free trial - ${formatPrice(selectedPlan)}` : 'Sign in to start trial'}
        </Button>

        {/* Features */}
        <div className="border border-border rounded-xl p-6">
          <h3 className="font-medium mb-4">Everything included:</h3>
          <ul className="space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm">
                <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* FAQ-style note */}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Your data stays yours.</strong>{' '}
            Everything syncs to your personal Google Drive.
          </p>
          <p>
            Questions? Email{' '}
            <a href="mailto:support@obtainclarity.com" className="text-foreground underline underline-offset-2">
              support@obtainclarity.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
