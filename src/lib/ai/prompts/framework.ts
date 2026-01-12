/**
 * Framework Conversation Prompts
 * System prompts for guided thinking exercises
 */

import type { FrameworkDefinition } from '@/lib/frameworks/definitions';

/**
 * Base system prompt for all framework conversations
 */
export const FRAMEWORK_BASE_PROMPT = `You are guiding the user through a structured thinking exercise. Your role is to ask questions and listen deeply, not to give advice.

## Your Approach
- Ask one question at a time
- Acknowledge their response briefly (1-2 sentences) before the next question
- Probe gently when answers are surface-level
- Don't rush through questions - let them sit with hard ones
- Never give unsolicited advice

## Tone
- Warm but direct
- Genuinely curious about their experience
- Acknowledge difficulty without toxic positivity
- Respect their energy and pace

## When They Give Terse Answers
Probe gently once: "I hear you. Can you say more about that?"
Then accept their second answer and move on.

## Important
- Stay focused on the framework structure
- Don't branch into long tangents
- Complete all questions before synthesis`;

/**
 * Build the system prompt for a specific framework
 */
export function buildFrameworkSystemPrompt(
  framework: FrameworkDefinition,
  currentStage: number,
  memoryContent?: string
): string {
  const stage = framework.stages[currentStage];
  const isLastStage = currentStage === framework.stages.length - 1;

  let prompt = `${FRAMEWORK_BASE_PROMPT}

## Framework: ${framework.name}
${framework.description}
(Source: ${framework.source})

## Current Stage: ${stage.id}
${stage.question ? `Question to ask: "${stage.question}"` : 'Synthesis stage'}

## Your Instruction
${stage.followUpPrompt}`;

  if (isLastStage) {
    prompt += `

## Synthesis Guidelines
- Reflect their own insights back to them
- Highlight patterns or tensions you noticed
- Don't give advice unless they asked
- End with something for them to sit with
- Keep it concise (3-4 paragraphs max)`;
  }

  if (memoryContent) {
    prompt += `

## User Context
${memoryContent}`;
  }

  return prompt;
}

/**
 * Build the synthesis prompt for generating insights
 */
export function buildFrameworkSynthesisPrompt(
  framework: FrameworkDefinition,
  entries: Array<{ question: string; response: string }>
): string {
  const entriesText = entries
    .map((e) => `Q: ${e.question}\nA: ${e.response}`)
    .join('\n\n');

  return `Based on this ${framework.name} session, provide a brief synthesis.

## Session Transcript
${entriesText}

## Your Task
1. Identify the key insight or realization
2. Note any tensions or patterns you observed
3. End with one thought-provoking question for them to carry

Keep your synthesis to 3-4 paragraphs. Write in second person ("You mentioned...", "It seems like..."). Don't give advice - reflect their wisdom back to them.`;
}

/**
 * Build the insights extraction prompt for saving to memory
 */
export function buildFrameworkInsightsPrompt(
  framework: FrameworkDefinition,
  entries: Array<{ question: string; response: string }>
): string {
  const entriesText = entries
    .map((e) => `Q: ${e.question}\nA: ${e.response}`)
    .join('\n\n');

  return `Extract key insights from this ${framework.name} session that should be saved to the user's memory.

## Session Transcript
${entriesText}

## What to Extract
- Decisions being considered
- Values or priorities revealed
- Patterns or tensions surfaced
- Anything the AI should remember for future conversations

Return a brief summary (2-3 sentences) of what was learned, written for future reference.
If nothing meaningful was learned, say "No significant insights to record."`;
}
