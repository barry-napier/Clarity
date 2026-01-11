import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { isAuthenticated } from '@/lib/token-service';

export const Route = createFileRoute('/')({
  component: IndexRedirect,
});

// Helper to add timeout to promises
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}

function IndexRedirect() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      console.log('[IndexRedirect] Starting auth check...');
      try {
        const authed = await withTimeout(isAuthenticated(), 5000);
        console.log('[IndexRedirect] Auth result:', authed);
        if (authed) {
          navigate({ to: '/today', replace: true });
        } else {
          navigate({ to: '/login', replace: true });
        }
      } catch (error) {
        console.error('[IndexRedirect] Auth check failed:', error);
        navigate({ to: '/login', replace: true });
      } finally {
        setChecking(false);
      }
    }
    checkAuth();
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return null;
}
