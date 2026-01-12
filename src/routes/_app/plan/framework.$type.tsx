import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useFrameworkSession } from '@/lib/db/hooks';
import { getOrCreateFrameworkSession, abandonFrameworkSession } from '@/lib/frameworks';
import { getFrameworkById } from '@/lib/frameworks/definitions';
import { FrameworkSessionView } from '@/components/plan/framework-session';
import { Button } from '@/components/ui/button';
import type { FrameworkSession } from '@/lib/db/schema';

export const Route = createFileRoute('/_app/plan/framework/$type')({
  component: FrameworkPage,
});

function FrameworkPage() {
  const { type } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<FrameworkSession | null>(null);
  const [loading, setLoading] = useState(true);

  const framework = getFrameworkById(type);

  // Get or create session
  useEffect(() => {
    async function loadSession() {
      if (!framework) {
        setLoading(false);
        return;
      }

      try {
        const frameworkSession = await getOrCreateFrameworkSession(type);
        setSession(frameworkSession);
      } catch (error) {
        console.error('Failed to load framework session:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [type, framework]);

  // Use hook to get live updates on the session
  const liveSession = useFrameworkSession(session?.id);
  const currentSession = liveSession ?? session;

  const handleComplete = () => {
    navigate({ to: '/plan' });
  };

  const handleRestart = async () => {
    if (currentSession) {
      await abandonFrameworkSession(currentSession.id);
      const newSession = await getOrCreateFrameworkSession(type);
      setSession(newSession);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!framework) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <Link to="/plan">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-medium text-foreground">Framework</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Framework not found: {type}
            </p>
            <Link to="/plan">
              <Button variant="outline">Back to Plan</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <Link to="/plan">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-medium text-foreground">
              {framework.name}
            </h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Failed to create session
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <Link to="/plan">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-medium text-foreground">
            {framework.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            {framework.estimatedMinutes} min · {framework.source}
          </p>
        </div>
        {currentSession.status === 'in_progress' &&
          currentSession.entries.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRestart}
              className="text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Restart
            </Button>
          )}
      </header>

      {/* Session View */}
      <div className="flex-1 min-h-0">
        <FrameworkSessionView
          session={currentSession}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
