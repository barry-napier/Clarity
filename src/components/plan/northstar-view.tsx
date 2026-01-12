import { useNorthstar } from '@/lib/db/hooks';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function NorthstarView() {
  const northstar = useNorthstar();

  if (northstar === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-4 bg-muted rounded w-5/6" />
      </div>
    );
  }

  if (!northstar?.content) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No North Star defined yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        Last updated {formatDate(northstar.updatedAt)}
      </div>
      <div className="prose prose-sm prose-invert max-w-none">
        <p className="text-foreground whitespace-pre-wrap leading-relaxed">
          {northstar.content}
        </p>
      </div>
    </div>
  );
}
