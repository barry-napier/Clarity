import { useState, useCallback, useRef } from 'react';
import { streamText } from 'ai';
import { models, isAIConfigured } from './index';
import { buildSystemPrompt } from './prompts';
import { persistChatMessages, generateMessageId } from '@/lib/chats';
import { hapticMessageSent, hapticMessageReceived, hapticError } from '@/lib/haptics';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface UseAIChatOptions {
  chatId: string;
  memoryContext?: string;
  initialMessages?: Message[];
}

interface UseAIChatReturn {
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  isStreaming: boolean;
  isReady: boolean;
  error: Error | null;
  retry: () => void;
}

/**
 * Custom chat hook using AI SDK streamText
 * Handles persistence, memory context, and error recovery
 */
export function useAIChat({
  chatId,
  memoryContext,
  initialMessages = [],
}: UseAIChatOptions): UseAIChatReturn {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!isAIConfigured()) {
        setError(new Error('AI is not configured. Please add your OpenAI API key.'));
        return;
      }

      setError(null);
      lastUserMessageRef.current = content;
      hapticMessageSent();

      // Add user message
      const userMessage: Message = {
        id: generateMessageId(),
        role: 'user',
        content,
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      // Create placeholder for assistant message
      const assistantMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: '',
      };

      setMessages([...updatedMessages, assistantMessage]);
      setIsStreaming(true);

      try {
        // Cancel any ongoing stream
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Build conversation history for the AI
        const conversationHistory = updatedMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        // Stream the response
        const result = streamText({
          model: models.chat,
          system: buildSystemPrompt(memoryContext),
          messages: conversationHistory,
          abortSignal: abortControllerRef.current.signal,
        });

        let fullContent = '';

        for await (const chunk of result.textStream) {
          fullContent += chunk;
          // Update the assistant message with streaming content
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = fullContent;
            }
            return newMessages;
          });
        }

        // Final update with complete content
        const finalMessages = [...updatedMessages, { ...assistantMessage, content: fullContent }];
        setMessages(finalMessages);

        // Persist to Dexie
        await persistChatMessages(chatId, finalMessages);
        hapticMessageReceived();
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Stream was cancelled, not an error
          return;
        }
        console.error('Chat error:', err);
        setError(err instanceof Error ? err : new Error('Failed to send message'));
        hapticError();

        // Remove the failed assistant message
        setMessages(updatedMessages);
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [chatId, memoryContext, messages]
  );

  const retry = useCallback(() => {
    if (lastUserMessageRef.current) {
      // Remove the last user message and retry
      setMessages((prev) => prev.slice(0, -1));
      sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  return {
    messages,
    sendMessage,
    isStreaming,
    isReady: !isStreaming,
    error,
    retry,
  };
}
