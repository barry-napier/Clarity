import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export const Route = createFileRoute('/oauth/callback')({
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const { handleOAuthCallback, isAuthenticated, error } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    async function processCallback() {
      // Get params from URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const errorParam = params.get('error');

      await handleOAuthCallback({
        code,
        state,
        error: errorParam,
      });

      setProcessing(false);
    }

    processCallback();
  }, [handleOAuthCallback]);

  useEffect(() => {
    if (!processing) {
      if (isAuthenticated) {
        navigate({ to: '/today' });
      } else if (error) {
        // On error, redirect to login after a brief delay
        const timeout = setTimeout(() => {
          navigate({ to: '/login' });
        }, 3000);
        return () => clearTimeout(timeout);
      }
    }
  }, [processing, isAuthenticated, error, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">
            Authentication Failed
          </h1>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-4">
        <h1 className="text-xl font-semibold text-foreground">
          Completing sign in...
        </h1>
        <p className="text-muted-foreground">Please wait</p>
      </div>
    </div>
  );
}
