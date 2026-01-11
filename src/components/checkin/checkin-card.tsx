import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTodayCheckin } from '@/lib/db/hooks';
import { CheckCircle2, Play, RotateCcw, Zap, Trophy, AlertCircle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CheckinCard() {
  const checkin = useTodayCheckin();

  // Loading state
  if (checkin === undefined) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="text-base">Daily Check-in</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-12 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  // Not started state
  if (!checkin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Check-in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Take a moment to reflect on your day
          </p>
          <Link to="/today/checkin">
            <Button className="w-full gap-2">
              <Play className="h-4 w-4" />
              Start check-in
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // In progress state
  if (checkin.status === 'in_progress') {
    const stageLabels: Record<string, string> = {
      idle: 'Getting started',
      awaiting_energy: 'Energy',
      awaiting_wins: 'Wins',
      awaiting_friction: 'Friction',
      awaiting_priority: 'Priority',
    };

    return (
      <Card className="border-accent/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-accent animate-spin" />
            Check-in in progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Currently on: {stageLabels[checkin.stage] || 'Unknown'}
          </p>
          <Link to="/today/checkin">
            <Button className="w-full gap-2">
              Continue check-in
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Skipped state
  if (checkin.status === 'skipped') {
    return (
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            Check-in skipped
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No worries, there's always tomorrow.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Completed state - show summary
  const energyEntry = checkin.entries.find((e) => e.type === 'energy');
  const winsEntry = checkin.entries.find((e) => e.type === 'wins');
  const frictionEntry = checkin.entries.find((e) => e.type === 'friction');
  const priorityEntry = checkin.entries.find((e) => e.type === 'priority');

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-accent" />
          Check-in complete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary items */}
        <div className="space-y-3">
          {energyEntry && (
            <SummaryItem
              icon={<Zap className="h-4 w-4" />}
              label="Energy"
              value={truncate(energyEntry.response, 60)}
            />
          )}
          {winsEntry && (
            <SummaryItem
              icon={<Trophy className="h-4 w-4" />}
              label="Win"
              value={truncate(winsEntry.response, 60)}
            />
          )}
          {frictionEntry && (
            <SummaryItem
              icon={<AlertCircle className="h-4 w-4" />}
              label="Friction"
              value={truncate(frictionEntry.response, 60)}
            />
          )}
          {priorityEntry && (
            <SummaryItem
              icon={<Target className="h-4 w-4" />}
              label="Priority"
              value={truncate(priorityEntry.response, 60)}
              highlight
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryItem({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn('flex gap-2', highlight && 'bg-accent/10 -mx-2 px-2 py-1.5 rounded')}>
      <div className="text-muted-foreground shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className={cn('text-sm', highlight && 'font-medium text-accent')}>
          {value}
        </p>
      </div>
    </div>
  );
}

function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length).trim() + '...';
}
