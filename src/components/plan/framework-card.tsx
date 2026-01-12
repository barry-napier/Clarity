import { Link } from '@tanstack/react-router';
import type { FrameworkDefinition } from '@/lib/frameworks/definitions';
import type { FrameworkSession } from '@/lib/db/schema';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface FrameworkCardProps {
  framework: FrameworkDefinition;
  inProgressSession?: FrameworkSession;
  lastCompleted?: FrameworkSession;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function formatFrequency(frequency: FrameworkDefinition['frequency']): string {
  const map: Record<string, string> = {
    yearly: 'Yearly',
    quarterly: 'Quarterly',
    monthly: 'Monthly',
    weekly: 'Weekly',
    as_needed: 'As needed',
  };
  return map[frequency] || frequency;
}

export function FrameworkCard({
  framework,
  inProgressSession,
  lastCompleted,
}: FrameworkCardProps) {
  return (
    <Link
      to="/plan/framework/$type"
      params={{ type: framework.id }}
      className="block"
    >
      <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{framework.name}</CardTitle>
            {inProgressSession && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/20 text-accent">
                In progress
              </span>
            )}
          </div>
          <CardDescription className="text-xs">
            {framework.estimatedMinutes} min · {formatFrequency(framework.frequency)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {framework.description}
          </p>
          {lastCompleted?.completedAt && !inProgressSession && (
            <p className="text-xs text-muted-foreground mt-2">
              Last completed {formatRelativeTime(lastCompleted.completedAt)}
            </p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-1 italic">
            {framework.source}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
