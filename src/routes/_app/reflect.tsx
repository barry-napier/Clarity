import { createFileRoute } from '@tanstack/react-router';
import { ReviewSection } from '@/components/reflect/review-section';
import { ReviewHistory } from '@/components/reflect/review-history';
import { MemoryViewer } from '@/components/reflect/memory-viewer';
import { InsightsSection } from '@/components/reflect/insights-section';

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
          Reviews and insights
        </p>
      </div>

      {/* Weekly Review */}
      <ReviewSection />

      {/* Past Reviews */}
      <ReviewHistory />

      {/* AI Insights */}
      <InsightsSection />

      {/* Memory Viewer */}
      <MemoryViewer />
    </div>
  );
}
