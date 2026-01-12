import { useFrameworkSessions } from '@/lib/db/hooks';
import { FRAMEWORKS } from '@/lib/frameworks/definitions';
import { FrameworkCard } from './framework-card';

export function FrameworkList() {
  const sessions = useFrameworkSessions();

  // Loading state
  if (sessions === undefined) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Thinking Frameworks
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  // Group sessions by framework type
  const sessionsByType: Record<string, typeof sessions> = {};
  sessions?.forEach((session) => {
    if (!sessionsByType[session.frameworkType]) {
      sessionsByType[session.frameworkType] = [];
    }
    sessionsByType[session.frameworkType].push(session);
  });

  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
        Thinking Frameworks
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Structured exercises for clarity on decisions and planning.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {FRAMEWORKS.map((framework) => {
          const frameworkSessions = sessionsByType[framework.id] || [];
          const inProgressSession = frameworkSessions.find(
            (s) => s.status === 'in_progress'
          );
          const lastCompleted = frameworkSessions
            .filter((s) => s.status === 'completed')
            .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0];

          return (
            <FrameworkCard
              key={framework.id}
              framework={framework}
              inProgressSession={inProgressSession}
              lastCompleted={lastCompleted}
            />
          );
        })}
      </div>
    </section>
  );
}
