import { useMemory } from '@/lib/db/hooks';
import { parseMemorySections } from '@/lib/memory-parser';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Calendar,
  Target,
  Users,
  Scale,
  BookOpen,
  ListTodo,
  MessageSquare,
} from 'lucide-react';

// Map section titles to icons
const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'current-season': Calendar,
  'operating-rhythm': Calendar,
  'life-domains': Target,
  'cross-domain-tensions': Scale,
  'people-im-tracking': Users,
  'rules-i-trust': BookOpen,
  'ai-instructions': MessageSquare,
  'now-next-later': ListTodo,
};

export function MemoryViewer() {
  const memory = useMemory();

  // Loading state
  if (memory === undefined) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Memory
        </h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  // Empty state
  if (!memory?.content) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Memory
        </h2>
        <div className="border border-dashed border-muted-foreground/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Your memory document will build over time as you chat with Clarity
            and complete check-ins.
          </p>
        </div>
      </section>
    );
  }

  const sections = parseMemorySections(memory.content);

  // Filter out Life Domains (shown in Plan tab)
  const displaySections = sections.filter(
    (s) => s.id !== 'life-domains'
  );

  if (displaySections.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Memory
        </h2>
        <div className="border border-dashed border-muted-foreground/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            No memory sections found. Complete some check-ins to build your
            memory.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
        Memory
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        What Clarity knows about you. AI-maintained and always evolving.
      </p>
      <Accordion type="multiple" defaultValue={['current-season']} className="w-full">
        {displaySections.map((section) => {
          const Icon = SECTION_ICONS[section.id] || BookOpen;

          return (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{section.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="py-2 text-sm text-foreground whitespace-pre-wrap">
                  {section.content || (
                    <span className="text-muted-foreground italic">
                      No content yet
                    </span>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
}
