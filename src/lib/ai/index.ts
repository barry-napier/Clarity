import { createOpenAI } from '@ai-sdk/openai';

/**
 * OpenAI client for AI SDK
 * Uses environment variable for API key
 */
export const openai = createOpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
});

/**
 * Model configuration
 * Fast model for chat, quality model for memory extraction
 */
export const models = {
  // Fast, cheap model for chat responses
  chat: openai('gpt-4o-mini'),
  // Quality model for memory extraction and compression
  memory: openai('gpt-4o'),
};

/**
 * Check if AI is configured (has API key)
 */
export function isAIConfigured(): boolean {
  return Boolean(import.meta.env.VITE_OPENAI_API_KEY);
}
