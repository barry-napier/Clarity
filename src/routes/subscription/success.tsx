import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

export const Route = createFileRoute('/subscription/success')({
  component: SubscriptionSuccessPage,
});

function SubscriptionSuccessPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Auto-redirect after 3 seconds if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        navigate({ to: '/today', replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-sm w-full space-y-8 text-center">
        {/* Success icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-accent" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-foreground">
            Subscription active!
          </h1>
          <p className="text-muted-foreground">
            Thank you for subscribing to Clarity. You now have full access to all features.
          </p>
        </div>

        {/* CTA */}
        <Button
          onClick={() => navigate({ to: '/today', replace: true })}
          className="w-full"
          size="lg"
        >
          Continue to Clarity
        </Button>

        <p className="text-xs text-muted-foreground">
          Redirecting automatically...
        </p>
      </div>
    </div>
  );
}
