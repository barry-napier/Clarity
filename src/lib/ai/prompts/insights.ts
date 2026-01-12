/**
 * Insights Generation Prompts
 * AI-derived patterns and observations from user's memory and activity
 */

export const INSIGHTS_GENERATION_PROMPT = `Based on the user's memory and recent activity, identify meaningful patterns and observations.

## What to Look For

1. **Patterns** - What themes keep appearing? Energy levels, recurring challenges, consistent wins?
2. **Strengths** - What do they consistently do well? What comes naturally?
3. **Blind Spots** - What might they be avoiding? What's not being discussed?
4. **Tensions** - Where are stated goals conflicting with actual behavior?
5. **Progress** - What's improving over time? What's getting worse?

## Guidelines

- Be specific and cite evidence from the data
- No generic observations ("you seem busy")
- If you see genuine concerns, name them directly
- Acknowledge uncertainty when appropriate
- Don't give advice - observe and reflect

## Output Format

Return 3-5 specific insights as a JSON array:
{
  "insights": [
    {
      "type": "pattern" | "strength" | "blind_spot" | "tension" | "progress",
      "observation": "Specific observation with evidence",
      "evidence": "Brief quote or reference from the data"
    }
  ]
}

If there's not enough data for meaningful insights, return:
{
  "insights": [],
  "reason": "Not enough data yet - need more check-ins and conversations"
}`;

/**
 * Build insights prompt with user context
 */
export function buildInsightsPrompt(
  memoryContent?: string,
  recentCheckinsContext?: string,
  recentCapturesContext?: string,
  recentReviewsContext?: string
): string {
  let prompt = INSIGHTS_GENERATION_PROMPT;

  if (memoryContent) {
    prompt += `\n\n## User Memory\n${memoryContent}`;
  }

  if (recentCheckinsContext) {
    prompt += `\n\n## Recent Check-ins (past 2 weeks)\n${recentCheckinsContext}`;
  }

  if (recentCapturesContext) {
    prompt += `\n\n## Recent Captures (past 2 weeks)\n${recentCapturesContext}`;
  }

  if (recentReviewsContext) {
    prompt += `\n\n## Recent Reviews\n${recentReviewsContext}`;
  }

  return prompt;
}

export interface Insight {
  type: 'pattern' | 'strength' | 'blind_spot' | 'tension' | 'progress';
  observation: string;
  evidence?: string;
}

export interface InsightsResult {
  insights: Insight[];
  reason?: string;
}

/**
 * Parse insights response from AI
 */
export function parseInsightsResponse(response: string): InsightsResult {
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(response);
    if (parsed.insights && Array.isArray(parsed.insights)) {
      return parsed;
    }
    return { insights: [], reason: 'Invalid response format' };
  } catch {
    // If JSON parsing fails, try to extract insights from text
    return { insights: [], reason: 'Could not parse AI response' };
  }
}
