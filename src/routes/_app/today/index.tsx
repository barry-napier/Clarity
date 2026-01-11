import { createFileRoute, Link } from '@tanstack/react-router';
import { Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { SyncStatus } from '@/components/sync-status';
import { CaptureInput } from '@/components/capture-input';
import { CaptureList } from '@/components/capture-list';
import { CheckinCard } from '@/components/checkin/checkin-card';
import { NotificationPrompt } from '@/components/notification-prompt';

export const Route = createFileRoute('/_app/today/')({
  component: TodayPage,
});

function TodayPage() {
  const { signOut } = useAuth();

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Today</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SyncStatus />
          <Link to="/settings">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>

      {/* Inbox */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Inbox
        </h2>
        <div className="space-y-4">
          <CaptureInput />
          <CaptureList />
        </div>
      </section>

      {/* Daily Check-in */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Daily Check-in
        </h2>
        <div className="space-y-3">
          <CheckinCard />
          <NotificationPrompt />
        </div>
      </section>
    </div>
  );
}
