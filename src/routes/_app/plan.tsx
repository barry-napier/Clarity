import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/_app/plan')({
  component: PlanPage,
});

function PlanPage() {
  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Plan</h1>
        <p className="text-sm text-muted-foreground">
          Your north star and goals
        </p>
      </div>

      {/* North Star */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          North Star
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What matters most?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define your guiding principles and long-term vision
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Goals */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Goals
        </h2>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Set meaningful goals aligned with your north star
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
