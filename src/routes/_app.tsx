import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { isAuthenticated } from '@/lib/token-service';
import { AppShell } from '@/components/app-shell';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const authed = await isAuthenticated();
        if (!authed) {
          navigate({ to: '/login', replace: true });
        } else {
          setIsAuthed(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate({ to: '/login', replace: true });
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, [navigate]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthed) {
    return null;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
