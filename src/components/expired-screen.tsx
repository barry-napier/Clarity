import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { openCheckout, formatPrice, getAnnualSavings, type PlanType } from '@/lib/stripe/checkout';

interface ExpiredScreenProps {
  onRefresh?: () => Promise<void>;
}

/**
 * Full-screen component shown when trial has ended and user has no active subscription.
 * Provides subscription options to continue using the app.
 */
export function ExpiredScreen({ onRefresh }: ExpiredScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [error, setError] = useState<string | null>(null);

  const { amount: annualSavings, percentage: savingsPercent } = getAnnualSavings();

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);

    const result = await openCheckout(selectedPlan);

    if (!result.success) {
      setError(result.error || 'Something went wrong');
      setIsLoading(false);
    }
    // If successful, user is redirected to Stripe
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsLoading(true);
      setError(null);
      try {
        await onRefresh();
      } catch {
        setError('Failed to refresh subscription status');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-background">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-foreground">
            Your trial has ended
          </h1>
          <p className="text-muted-foreground">
            Subscribe to continue using Clarity and keep making progress on what matters.
          </p>
        </div>

        {/* Plan Selection */}
        <div className="space-y-3 pt-4">
          {/* Annual Plan */}
          <button
            type="button"
            onClick={() => setSelectedPlan('annual')}
            className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
              selectedPlan === 'annual'
                ? 'border-accent bg-accent/10'
                : 'border-border hover:border-muted-foreground/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Annual</div>
                <div className="text-sm text-muted-foreground">{formatPrice('annual')}</div>
              </div>
              <div className="text-xs font-medium text-accent bg-accent/20 px-2 py-1 rounded">
                Save ${annualSavings} ({savingsPercent}%)
              </div>
            </div>
          </button>

          {/* Monthly Plan */}
          <button
            type="button"
            onClick={() => setSelectedPlan('monthly')}
            className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
              selectedPlan === 'monthly'
                ? 'border-accent bg-accent/10'
                : 'border-border hover:border-muted-foreground/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Monthly</div>
                <div className="text-sm text-muted-foreground">{formatPrice('monthly')}</div>
              </div>
            </div>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
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
          {isLoading ? 'Loading...' : `Subscribe - ${formatPrice(selectedPlan)}`}
        </Button>

        {/* Refresh Link */}
        {onRefresh && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Already subscribed? Refresh status
          </button>
        )}

        {/* Terms */}
        <p className="text-xs text-muted-foreground pt-4">
          Cancel anytime. You can manage your subscription in Settings.
        </p>
      </div>
    </div>
  );
}
