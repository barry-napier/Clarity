import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useReview } from '@/lib/db/hooks';
import { getOrCreateCurrentWeekReview, formatWeekPeriod, getCurrentWeekStart } from '@/lib/reviews';
import { ReviewChat } from '@/components/reflect/review-chat';
import { Button } from '@/components/ui/button';
import type { Review } from '@/lib/db/schema';

export const Route = createFileRoute('/_app/reflect/review')({
  component: ReviewPage,
});

function ReviewPage() {
  const navigate = useNavigate();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);

  const weekPeriod = formatWeekPeriod(getCurrentWeekStart());

  // Get or create review
  useEffect(() => {
    async function loadReview() {
      try {
        const currentReview = await getOrCreateCurrentWeekReview();
        setReview(currentReview);
      } catch (error) {
        console.error('Failed to load review:', error);
      } finally {
        setLoading(false);
      }
    }

    loadReview();
  }, []);

  // Use hook to get live updates on the review
  const liveReview = useReview(review?.id);
  const currentReview = liveReview ?? review;

  const handleComplete = () => {
    navigate({ to: '/reflect' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!currentReview) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <Link to="/reflect">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-medium text-foreground">Weekly Review</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Failed to create review
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If review is already complete, show summary
  if (currentReview.status === 'completed') {
    return (
      <div className="flex flex-col h-full">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
          <Link to="/reflect">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-medium text-foreground">Weekly Review</h1>
            <p className="text-xs text-muted-foreground">{weekPeriod}</p>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Summary
              </h2>
              <p className="text-foreground whitespace-pre-wrap">
                {currentReview.content}
              </p>
            </div>
            {currentReview.insights && currentReview.insights.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Key Insights
                </h2>
                <ul className="space-y-1">
                  {currentReview.insights.map((insight, i) => (
                    <li key={i} className="text-sm text-foreground">
                      • {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <Link to="/reflect">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-medium text-foreground">Weekly Review</h1>
          <p className="text-xs text-muted-foreground">{weekPeriod}</p>
        </div>
      </header>

      {/* Review Chat */}
      <div className="flex-1 min-h-0">
        <ReviewChat review={currentReview} onComplete={handleComplete} />
      </div>
    </div>
  );
}
