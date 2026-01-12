import { Link } from '@tanstack/react-router';
import { useCurrentWeekReview } from '@/lib/db/hooks';
import { formatWeekPeriod, getCurrentWeekStart } from '@/lib/reviews';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function ReviewSection() {
  const currentWeekReview = useCurrentWeekReview();
  const weekPeriod = formatWeekPeriod(getCurrentWeekStart());

  // Loading state
  if (currentWeekReview === undefined) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Weekly Review
        </h2>
        <Card>
          <CardContent className="py-8">
            <div className="animate-pulse h-4 bg-muted rounded w-3/4" />
          </CardContent>
        </Card>
      </section>
    );
  }

  // Completed this week
  if (currentWeekReview?.status === 'completed') {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Weekly Review
        </h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Week of {weekPeriod}</CardTitle>
            <CardDescription>
              Completed {currentWeekReview.completedAt ? formatDate(currentWeekReview.completedAt) : 'this week'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentWeekReview.content && (
              <p className="text-sm text-foreground/80 line-clamp-3 mb-3">
                {currentWeekReview.content.slice(0, 150)}
                {currentWeekReview.content.length > 150 ? '...' : ''}
              </p>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/reflect/review">View summary</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  // In progress
  if (currentWeekReview?.status === 'draft' && currentWeekReview.messages?.length) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Weekly Review
        </h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Week of {weekPeriod}</CardTitle>
            <CardDescription>In progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              You started your weekly review. Continue where you left off.
            </p>
            <Button asChild>
              <Link to="/reflect/review">Continue review</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Not started
  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
        Weekly Review
      </h2>
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Week of {weekPeriod}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Reflect on what mattered this week, recognize patterns, and set one
            intention for next week.
          </p>
          <Button asChild>
            <Link to="/reflect/review">Start weekly review</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
