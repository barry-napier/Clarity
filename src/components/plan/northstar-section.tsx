import { Link } from '@tanstack/react-router';
import { useNorthstar } from '@/lib/db/hooks';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function NorthstarSection() {
  const northstar = useNorthstar();

  // Loading state
  if (northstar === undefined) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          North Star
        </h2>
        <Card>
          <CardContent className="py-8">
            <div className="animate-pulse h-4 bg-muted rounded w-3/4" />
          </CardContent>
        </Card>
      </section>
    );
  }

  // Empty state - no North Star yet
  if (!northstar?.content) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          North Star
        </h2>
        <Card className="border-dashed border-muted-foreground/30">
          <CardHeader>
            <CardTitle className="text-base">Define Your North Star</CardTitle>
            <CardDescription>
              Your North Star is a living document - a personal manifesto that
              guides your decisions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Through a short guided conversation, you'll reflect on what
              matters most and create your own compass.
            </p>
            <Button asChild>
              <Link to="/plan/northstar">Begin guided conversation</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Has North Star - show preview
  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
        North Star
      </h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your North Star</CardTitle>
          <CardDescription>
            Last updated {formatDate(northstar.updatedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm prose-invert max-w-none">
            {/* Show first ~200 chars as preview */}
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">
              {northstar.content.length > 200
                ? `${northstar.content.slice(0, 200)}...`
                : northstar.content}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/plan/northstar">View full</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/plan/northstar" search={{ mode: 'refine' }}>
              Refine in chat
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
