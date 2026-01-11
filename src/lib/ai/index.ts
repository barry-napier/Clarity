import { createOpenAI } from '@ai-sdk/openai';

/**
 * Supabase Edge Function proxy configuration
 * API key is stored securely server-side, not in client bundle
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * OpenAI client for AI SDK
 * Routes through Supabase Edge Function proxy for security
 * The actual OpenAI API key is stored server-side
 */
export const openai = createOpenAI({
  // Use edge function as proxy - no API key in client
  apiKey: 'proxy-via-supabase',
  baseURL: `${SUPABASE_URL}/functions/v1/ai-proxy`,
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  },
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
 * Check if AI is configured (Supabase connection available)
 */
export function isAIConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
