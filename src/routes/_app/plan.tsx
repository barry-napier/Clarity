import { createFileRoute } from '@tanstack/react-router';
import { NorthstarSection } from '@/components/plan/northstar-section';
import { LifeDomains } from '@/components/plan/life-domains';
import { FrameworkList } from '@/components/plan/framework-list';

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
      <NorthstarSection />

      {/* Life Domains */}
      <LifeDomains />

      {/* Thinking Frameworks */}
      <FrameworkList />
    </div>
  );
}
