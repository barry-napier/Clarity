import { useRef, useEffect, useState, useCallback } from 'react';
import { useAIChat } from '@/lib/ai/use-ai-chat';
import { useMemory } from '@/lib/db/hooks';
import { useKeyboard } from '@/lib/use-keyboard';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { ChatEmpty } from './chat-empty';
import { StreamingIndicator } from './streaming-indicator';
import { isAIConfigured } from '@/lib/ai';
import type { Chat as ChatType } from '@/lib/db/schema';

interface ChatViewProps {
  chat: ChatType;
}

export function ChatView({ chat }: ChatViewProps) {
  const memory = useMemory();
  const { isVisible: keyboardVisible, keyboardHeight } = useKeyboard();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);

  // Convert stored messages to the format expected by useAIChat
  const initialMessages = chat.messages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const {
    messages,
    sendMessage,
    isStreaming,
    error,
    retry,
  } = useAIChat({
    chatId: chat.id,
    memoryContext: memory?.content,
    initialMessages,
  });

  // Auto-scroll to bottom (unless user has scrolled up)
  useEffect(() => {
    if (!userHasScrolled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming, userHasScrolled]);

  // Reset scroll tracking when streaming ends
  useEffect(() => {
    if (!isStreaming) {
      setUserHasScrolled(false);
    }
  }, [isStreaming]);

  // Track user scroll
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (!isNearBottom && isStreaming) {
      setUserHasScrolled(true);
    } else if (isNearBottom) {
      setUserHasScrolled(false);
    }
  }, [isStreaming]);

  const handleSend = async (content: string) => {
    setUserHasScrolled(false);
    await sendMessage(content);
  };

  // Check if AI is configured
  const aiConfigured = isAIConfigured();

  return (
    <div
      className="flex flex-col h-full"
      style={keyboardVisible ? { paddingBottom: keyboardHeight } : undefined}
    >
      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {!aiConfigured && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-destructive">
              AI is not configured. Add your OpenAI API key to{' '}
              <code className="bg-muted px-1 rounded">VITE_OPENAI_API_KEY</code>{' '}
              in your environment variables.
            </p>
          </div>
        )}

        {messages.length === 0 ? (
          <ChatEmpty onSuggestionTap={handleSend} />
        ) : (
          <>
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                role={m.role as 'user' | 'assistant' | 'system'}
                content={m.content}
              />
            ))}
          </>
        )}

        {isStreaming && <StreamingIndicator />}

        {error && (
          <div className="flex justify-center p-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-sm text-center">
              <p className="text-sm text-destructive mb-2">{error.message}</p>
              <button
                onClick={retry}
                className="text-sm text-accent underline hover:no-underline"
              >
                Tap to retry
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming || !aiConfigured}
        className="border-t border-border"
      />
    </div>
  );
}
