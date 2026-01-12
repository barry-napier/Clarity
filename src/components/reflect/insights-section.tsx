import { useState, useEffect } from 'react';
import { generateText } from 'ai';
import { models, isAIConfigured } from '@/lib/ai';
import { useMemory, useRecentCheckins } from '@/lib/db/hooks';
import { buildInsightsPrompt, parseInsightsResponse, type Insight } from '@/lib/ai/prompts/insights';
import { formatRecentCheckinsForContext } from '@/lib/checkins';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, AlertCircle, Zap, Scale, ArrowUpRight } from 'lucide-react';

const INSIGHT_ICONS: Record<Insight['type'], React.ComponentType<{ className?: string }>> = {
  pattern: TrendingUp,
  strength: Zap,
  blind_spot: AlertCircle,
  tension: Scale,
  progress: ArrowUpRight,
};

const INSIGHT_LABELS: Record<Insight['type'], string> = {
  pattern: 'Pattern',
  strength: 'Strength',
  blind_spot: 'Blind Spot',
  tension: 'Tension',
  progress: 'Progress',
};

export function InsightsSection() {
  const memory = useMemory();
  const recentCheckins = useRecentCheckins(14); // 2 weeks
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  // Check if we have enough data
  const hasEnoughData =
    memory?.content && recentCheckins && recentCheckins.length >= 3;

  const generateInsights = async () => {
    if (!isAIConfigured() || !hasEnoughData) return;

    setLoading(true);
    setError(null);

    try {
      const checkinsContext = await formatRecentCheckinsForContext();

      const prompt = buildInsightsPrompt(
        memory?.content,
        checkinsContext,
        undefined, // captures context - could add later
        undefined // reviews context - could add later
      );

      const result = await generateText({
        model: models.chat,
        prompt,
      });

      const parsed = parseInsightsResponse(result.text);

      if (parsed.insights.length > 0) {
        setInsights(parsed.insights);
        setLastGenerated(new Date());
      } else if (parsed.reason) {
        setError(parsed.reason);
      }
    } catch (err) {
      console.error('Failed to generate insights:', err);
      setError('Failed to generate insights. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on mount if we have data
  useEffect(() => {
    if (hasEnoughData && insights.length === 0 && !loading && !error) {
      generateInsights();
    }
  }, [hasEnoughData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Not enough data yet
  if (!hasEnoughData) {
    return (
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Insights
        </h2>
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground text-center">
              Complete a few more check-ins and Clarity will start noticing
              patterns.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Insights
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={generateInsights}
          disabled={loading}
          className="text-muted-foreground"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analyzing...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/30">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {!error && insights.length === 0 && !loading && (
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground text-center">
              Click refresh to generate insights from your recent activity.
            </p>
          </CardContent>
        </Card>
      )}

      {loading && insights.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {insights.length > 0 && (
        <div className="space-y-3">
          {insights.map((insight, i) => {
            const Icon = INSIGHT_ICONS[insight.type] || TrendingUp;
            const label = INSIGHT_LABELS[insight.type] || insight.type;

            return (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-accent" />
                    <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">{insight.observation}</p>
                  {insight.evidence && (
                    <CardDescription className="mt-2 text-xs italic">
                      "{insight.evidence}"
                    </CardDescription>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {lastGenerated && (
            <p className="text-xs text-muted-foreground text-center">
              Last generated {lastGenerated.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
