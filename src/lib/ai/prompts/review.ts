/**
 * Weekly Review Prompts
 * System prompts for guided weekly reflection
 */

export type ReviewStage =
  | 'idle'
  | 'awaiting_signal_noise'
  | 'awaiting_progress'
  | 'awaiting_patterns'
  | 'awaiting_adjustment'
  | 'synthesizing'
  | 'complete';

export const REVIEW_STAGES: ReviewStage[] = [
  'idle',
  'awaiting_signal_noise',
  'awaiting_progress',
  'awaiting_patterns',
  'awaiting_adjustment',
  'synthesizing',
  'complete',
];

export const NEXT_REVIEW_STAGE: Record<ReviewStage, ReviewStage> = {
  idle: 'awaiting_signal_noise',
  awaiting_signal_noise: 'awaiting_progress',
  awaiting_progress: 'awaiting_patterns',
  awaiting_patterns: 'awaiting_adjustment',
  awaiting_adjustment: 'synthesizing',
  synthesizing: 'complete',
  complete: 'complete',
};

export const REVIEW_QUESTIONS: Record<
  Exclude<ReviewStage, 'idle' | 'synthesizing' | 'complete'>,
  string
> = {
  awaiting_signal_noise:
    "Looking back at this week, what actually mattered? What turned out to be just noise or busywork?",
  awaiting_progress:
    "How did you move toward what matters? Any wins, even small ones?",
  awaiting_patterns:
    "What patterns do you notice? Anything that keeps showing up - good or frustrating?",
  awaiting_adjustment:
    "What's ONE thing you want to be different next week?",
};

export const WEEKLY_REVIEW_SYSTEM_PROMPT = `You are helping the user reflect on their week. Your role is to help them see what mattered, recognize patterns, and identify one meaningful adjustment.

## Your Approach
- Be direct and honest. No cheerleading.
- Surface tensions they might be avoiding
- Probe when answers are surface-level
- Don't rush to solutions

## Tone
- Warm but direct
- Acknowledge difficulty without toxic positivity
- Genuinely curious about their experience

## Questions to Guide Through
1. SIGNAL vs NOISE - What mattered? What was busywork?
2. PROGRESS - How did they move toward what matters?
3. PATTERNS - What keeps showing up?
4. ONE ADJUSTMENT - What would make next week better?

## When They Give Terse Answers
Probe gently once, then accept and move on.

## Context You Have Access To
- Their check-ins from this week
- Their captures from this week
- Their memory (patterns, goals, etc.)

Reference this context naturally. Notice patterns across days.`;

/**
 * Build the weekly review system prompt with context
 */
export function buildWeeklyReviewPrompt(
  memoryContent?: string,
  weekCheckins?: string,
  weekCaptures?: string
): string {
  let prompt = WEEKLY_REVIEW_SYSTEM_PROMPT;

  if (memoryContent) {
    prompt += `\n\n## User Memory\n${memoryContent}`;
  }

  if (weekCheckins) {
    prompt += `\n\n## This Week's Check-ins\n${weekCheckins}`;
  }

  if (weekCaptures) {
    prompt += `\n\n## This Week's Captures\n${weekCaptures}`;
  }

  return prompt;
}

/**
 * Build synthesis prompt for generating review summary
 */
export const REVIEW_SYNTHESIS_PROMPT = `Based on this weekly review conversation, create a brief summary.

## What to Include
1. Key insight or theme from the week
2. Notable wins or progress
3. Pattern worth watching
4. The ONE adjustment they committed to

## Guidelines
- Keep it concise (3-4 short paragraphs)
- Write in second person
- Be specific, reference what they actually said
- End with their chosen adjustment for next week

Return only the summary text.`;
