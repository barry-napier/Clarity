import { useMemory } from '@/lib/db/hooks';
import { parseLifeDomains, LIFE_DOMAIN_NAMES, type LifeDomain } from '@/lib/memory-parser';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { DomainDetail } from './domain-detail';
import {
  Briefcase,
  Users,
  DollarSign,
  Heart,
  Activity,
  Sparkles,
} from 'lucide-react';

const DOMAIN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Work: Briefcase,
  Family: Users,
  Finances: DollarSign,
  Relationships: Heart,
  Health: Activity,
  'Meaning/Fun': Sparkles,
};

export function LifeDomains() {
  const memory = useMemory();

  // Loading state
  if (memory === undefined) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Life Domains
        </h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  const domains: LifeDomain[] = memory?.content
    ? parseLifeDomains(memory.content)
    : LIFE_DOMAIN_NAMES.map((name) => ({ name, rawContent: '' }));

  // Check if any domains have content
  const hasAnyContent = domains.some((d) => d.rawContent);

  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
        Life Domains
      </h2>

      {!hasAnyContent ? (
        <div className="border border-dashed border-muted-foreground/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Track your goals across six core areas: Work, Family, Finances,
            Relationships, Health, and Meaning/Fun.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            As you complete check-ins and chat with Clarity, your domains will
            populate automatically.
          </p>
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={['work']} className="w-full">
          {domains.map((domain) => {
            const Icon = DOMAIN_ICONS[domain.name] || Briefcase;
            const domainKey = domain.name.toLowerCase().replace('/', '-');

            return (
              <AccordionItem
                key={domain.name}
                value={domainKey}
                className="border-b border-border"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{domain.name}</span>
                    {domain.target && (
                      <span className="text-xs text-muted-foreground ml-2 font-normal">
                        {domain.target.slice(0, 40)}
                        {domain.target.length > 40 ? '...' : ''}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <DomainDetail domain={domain} />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </section>
  );
}
