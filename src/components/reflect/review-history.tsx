import { useReviews } from '@/lib/db/hooks';
import { formatWeekPeriod } from '@/lib/reviews';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function ReviewHistory() {
  const reviews = useReviews('weekly');

  // Loading state
  if (reviews === undefined) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Past Reviews
        </h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  // Filter to completed reviews only
  const completedReviews = reviews?.filter((r) => r.status === 'completed') || [];

  if (completedReviews.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Past Reviews
        </h2>
        <p className="text-sm text-muted-foreground">
          No past reviews yet. Complete your first weekly review to start
          building your reflection history.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
        Past Reviews
      </h2>
      <Accordion type="single" collapsible className="w-full">
        {completedReviews.map((review) => (
          <AccordionItem key={review.id} value={review.id}>
            <AccordionTrigger className="hover:no-underline">
              <span className="font-medium">
                {formatWeekPeriod(review.periodStart)}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 py-2">
                {review.content && (
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {review.content}
                  </p>
                )}
                {review.insights && review.insights.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Key Insights
                    </span>
                    <ul className="mt-1 space-y-1">
                      {review.insights.map((insight, i) => (
                        <li key={i} className="text-sm text-foreground">
                          • {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
