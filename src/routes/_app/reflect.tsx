import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/_app/reflect')({
  component: ReflectPage,
});

function ReflectPage() {
  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reflect</h1>
        <p className="text-sm text-muted-foreground">
          Reviews and memory
        </p>
      </div>

      {/* Weekly Review */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Weekly Review
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Week in Review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Reflect on your progress and learnings
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Memory */}
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Memory
        </h2>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Your AI companion learns about you over time
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
