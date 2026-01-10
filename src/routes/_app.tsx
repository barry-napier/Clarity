import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { isAuthenticated } from '@/lib/token-service';
import { AppShell } from '@/components/app-shell';

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const authed = await isAuthenticated();
    if (!authed) {
      throw redirect({ to: '/login' });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
