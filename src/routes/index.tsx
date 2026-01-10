import { createFileRoute, redirect } from '@tanstack/react-router';
import { isAuthenticated } from '@/lib/token-service';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const authed = await isAuthenticated();
    if (authed) {
      throw redirect({ to: '/today' });
    } else {
      throw redirect({ to: '/login' });
    }
  },
  component: () => null,
});
