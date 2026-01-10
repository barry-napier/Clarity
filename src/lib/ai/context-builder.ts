import type { ChatMessage } from '@/lib/db/schema';

/**
 * Context budget allocation (tokens)
 * Total budget ~8K for GPT-4o-mini
 */
const CONTEXT_BUDGET = {
  system: 500,
  memory: 2000,
  history: 5000,
  buffer: 500,
};

/**
 * Rough token estimate (4 chars per token average)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token budget
 */
function truncateToTokens(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) {
    return text;
  }

  // Approximate character limit
  const maxChars = maxTokens * 4;
  return text.slice(0, maxChars) + '\n\n[Content truncated due to length...]';
}

/**
 * Format chat history for context injection
 * Truncates oldest messages if over budget
 */
export function formatChatHistory(
  messages: ChatMessage[],
  maxTokens: number = CONTEXT_BUDGET.history
): string {
  if (messages.length === 0) return '';

  // Start from most recent, work backwards
  const formattedMessages: string[] = [];
  let totalTokens = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const formatted = `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
    const tokens = estimateTokens(formatted);

    if (totalTokens + tokens > maxTokens) {
      // Add truncation notice if we're cutting messages
      if (formattedMessages.length > 0) {
        formattedMessages.unshift('[Earlier messages truncated...]');
      }
      break;
    }

    formattedMessages.unshift(formatted);
    totalTokens += tokens;
  }

  return formattedMessages.join('\n\n');
}

/**
 * Prepare memory content for injection
 * Truncates if over budget
 */
export function prepareMemoryContext(
  memoryContent: string | undefined,
  maxTokens: number = CONTEXT_BUDGET.memory
): string {
  if (!memoryContent) return '';
  return truncateToTokens(memoryContent, maxTokens);
}

/**
 * Build the full context for the AI
 * Returns formatted messages array for the AI SDK
 */
export function buildContext(
  memoryContent: string | undefined,
  chatHistory: ChatMessage[]
): {
  memory: string;
  formattedHistory: string;
  totalEstimatedTokens: number;
} {
  const memory = prepareMemoryContext(memoryContent);
  const formattedHistory = formatChatHistory(chatHistory);

  const totalEstimatedTokens =
    CONTEXT_BUDGET.system +
    estimateTokens(memory) +
    estimateTokens(formattedHistory);

  return {
    memory,
    formattedHistory,
    totalEstimatedTokens,
  };
}

/**
 * Check if context is approaching limits
 */
export function isContextNearLimit(estimatedTokens: number): boolean {
  const totalBudget =
    CONTEXT_BUDGET.system +
    CONTEXT_BUDGET.memory +
    CONTEXT_BUDGET.history +
    CONTEXT_BUDGET.buffer;

  return estimatedTokens > totalBudget * 0.9;
}
