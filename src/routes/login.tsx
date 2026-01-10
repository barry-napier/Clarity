import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { LoginButton } from '@/components/login-button';
import { isAuthenticated } from '@/lib/token-service';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();

  // Check auth on client-side only
  useEffect(() => {
    async function checkAuth() {
      try {
        const authed = await isAuthenticated();
        if (authed) {
          navigate({ to: '/today', replace: true });
        }
      } catch (error) {
        // Not authenticated, stay on login
        console.error('Auth check error:', error);
      }
    }
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo and tagline */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">Clarity</h1>
          <p className="text-muted-foreground">
            Your personal operating system for life
          </p>
        </div>

        {/* Sign in button */}
        <div className="pt-8">
          <LoginButton />
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          By signing in, you agree to our{' '}
          <a href="#" className="underline underline-offset-2">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="underline underline-offset-2">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
