import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SyncStatus } from '@/components/sync-status';

export const Route = createFileRoute('/_app/today')({
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
        <div className="flex items-center gap-3">
          <SyncStatus />
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
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Capture thoughts, tasks, and ideas here
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Daily Check-in */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Daily Check-in
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How are you feeling?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Take a moment to reflect on your day
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
