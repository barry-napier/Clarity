import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { CheckinView } from '@/components/checkin/checkin-view';
import { Button } from '@/components/ui/button';
import { getOrCreateTodayCheckin, skipCheckin } from '@/lib/checkins';
import type { Checkin } from '@/lib/db/schema';

export const Route = createFileRoute('/_app/today/checkin')({
  component: CheckinPage,
});

function CheckinPage() {
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Get or create today's check-in
  useEffect(() => {
    async function loadCheckin() {
      try {
        const todayCheckin = await getOrCreateTodayCheckin();
        setCheckin(todayCheckin);
      } catch (error) {
        console.error('Failed to load check-in:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCheckin();
  }, []);

  const handleComplete = () => {
    // Navigate back to today page after completion
    navigate({ to: '/today' });
  };

  const handleSkip = async () => {
    if (checkin) {
      await skipCheckin(checkin.id);
      navigate({ to: '/today' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!checkin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Failed to load check-in</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // If check-in is already complete, redirect to today
  if (checkin.status === 'complete' || checkin.status === 'skipped') {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <Link to="/today">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-medium text-foreground">Check-in</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              You've already completed your check-in today.
            </p>
            <Link to="/today">
              <Button variant="outline">Back to Today</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <Link to="/today">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-medium text-foreground">Daily Check-in</h1>
          <p className="text-xs text-muted-foreground">
            {checkin.timeOfDay === 'morning' ? 'Morning' : 'Evening'} check-in
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Skip
        </Button>
      </header>

      {/* Check-in View */}
      <div className="flex-1 min-h-0">
        <CheckinView checkin={checkin} onComplete={handleComplete} />
      </div>
    </div>
  );
}
