import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import { useFrameworkChat } from '@/lib/ai/use-framework-chat';
import { useMemory } from '@/lib/db/hooks';
import { useKeyboard } from '@/lib/use-keyboard';
import { ChatMessage } from '../chat/chat-message';
import { ChatInput } from '../chat/chat-input';
import { StreamingIndicator } from '../chat/streaming-indicator';
import { cn } from '@/lib/utils';
import { isAIConfigured } from '@/lib/ai';
import { getFrameworkQuestionCount } from '@/lib/frameworks/definitions';
import { Button } from '../ui/button';
import type { FrameworkSession as FrameworkSessionType } from '@/lib/db/schema';

interface FrameworkSessionProps {
  session: FrameworkSessionType;
  onComplete?: () => void;
}

export function FrameworkSessionView({
  session,
  onComplete,
}: FrameworkSessionProps) {
  const memory = useMemory();
  const { isVisible: keyboardVisible, keyboardHeight } = useKeyboard();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const hasStartedRef = useRef(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const {
    messages,
    sendMessage,
    startSession,
    isStreaming,
    isComplete,
    currentStage,
    framework,
    error,
    retry,
  } = useFrameworkChat({
    session,
    memoryContext: memory?.content,
    onComplete,
  });

  // Auto-start session when component mounts
  useEffect(() => {
    if (!hasStartedRef.current && messages.length === 0) {
      hasStartedRef.current = true;
      startSession();
    }
  }, [startSession, messages.length]);

  // Auto-scroll to bottom
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

  const aiConfigured = isAIConfigured();
  const totalQuestions = framework ? getFrameworkQuestionCount(framework) : 0;

  // Show offline message
  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-muted-foreground mb-4">
          This feature requires an internet connection.
        </p>
        <Button asChild variant="outline">
          <Link to="/plan">Back to Plan</Link>
        </Button>
      </div>
    );
  }

  if (!framework) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-muted-foreground mb-4">Framework not found.</p>
        <Button asChild variant="outline">
          <Link to="/plan">Back to Plan</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      style={keyboardVisible ? { paddingBottom: keyboardHeight } : undefined}
    >
      {/* Progress indicator */}
      <div className="px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i < currentStage
                  ? 'bg-accent'
                  : i === currentStage
                    ? 'bg-accent/50'
                    : 'bg-muted'
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-center">
          {isComplete
            ? 'Session complete'
            : `Question ${Math.min(currentStage + 1, totalQuestions)} of ${totalQuestions}`}
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {!aiConfigured && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-destructive">
              AI is not configured. Please check your environment setup.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            role={m.role as 'user' | 'assistant' | 'system'}
            content={m.content}
          />
        ))}

        {isStreaming && <StreamingIndicator />}

        {error && (
          <div className="flex justify-center p-4">
            <button
              onClick={retry}
              className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-sm text-center"
            >
              <p className="text-sm text-destructive">
                Something went wrong. Tap to retry.
              </p>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - disabled when complete */}
      {!isComplete && (
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming || !aiConfigured}
          placeholder="Type your response..."
          className="border-t border-border"
        />
      )}

      {/* Completion message */}
      {isComplete && (
        <div className="p-4 border-t border-border bg-muted/50">
          <p className="text-sm text-center text-muted-foreground mb-3">
            {framework.name} complete.
          </p>
          <div className="flex justify-center">
            <Button asChild variant="outline">
              <Link to="/plan">Back to Plan</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
