import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import { useReviewChat } from '@/lib/ai/use-review-chat';
import { useMemory } from '@/lib/db/hooks';
import { useKeyboard } from '@/lib/use-keyboard';
import { ChatMessage } from '../chat/chat-message';
import { ChatInput } from '../chat/chat-input';
import { StreamingIndicator } from '../chat/streaming-indicator';
import { cn } from '@/lib/utils';
import { isAIConfigured } from '@/lib/ai';
import {
  completeReview,
  updateReviewMessages,
  updateReviewStage,
  formatWeekCheckinsForReview,
  formatWeekCapturesForReview,
} from '@/lib/reviews';
import { Button } from '../ui/button';
import type { Review } from '@/lib/db/schema';
import type { ReviewStage } from '@/lib/ai/prompts/review';

interface ReviewChatProps {
  review: Review;
  onComplete?: () => void;
}

export function ReviewChat({ review, onComplete }: ReviewChatProps) {
  const memory = useMemory();
  const { isVisible: keyboardVisible, keyboardHeight } = useKeyboard();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const hasStartedRef = useRef(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [weekContext, setWeekContext] = useState<{
    checkins: string;
    captures: string;
  } | null>(null);

  // Load week context on mount
  useEffect(() => {
    async function loadContext() {
      const [checkins, captures] = await Promise.all([
        formatWeekCheckinsForReview(),
        formatWeekCapturesForReview(),
      ]);
      setWeekContext({ checkins, captures });
    }
    loadContext();
  }, []);

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

  const handleComplete = useCallback(
    async (content: string, insights: string[]) => {
      await completeReview(review.id, content, insights);
      onComplete?.();
    },
    [review.id, onComplete]
  );

  const handleUpdateMessages = useCallback(
    async (
      reviewId: string,
      messages: Array<{ id: string; role: 'user' | 'assistant'; content: string }>
    ) => {
      await updateReviewMessages(reviewId, messages);
    },
    []
  );

  const handleUpdateStage = useCallback(
    async (reviewId: string, stage: ReviewStage) => {
      await updateReviewStage(reviewId, stage);
    },
    []
  );

  const {
    messages,
    sendMessage,
    startReview,
    isStreaming,
    isComplete,
    stage,
    error,
    retry,
  } = useReviewChat({
    review,
    memoryContext: memory?.content,
    weekCheckinsContext: weekContext?.checkins,
    weekCapturesContext: weekContext?.captures,
    onComplete: handleComplete,
    updateReviewMessages: handleUpdateMessages,
    updateReviewStage: handleUpdateStage,
  });

  // Auto-start review when context is loaded and component mounts
  useEffect(() => {
    if (!hasStartedRef.current && weekContext && messages.length === 0) {
      hasStartedRef.current = true;
      startReview();
    }
  }, [startReview, weekContext, messages.length]);

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

  // Map stage to progress
  const getProgress = (): { current: number; total: number } => {
    const stageMap: Record<ReviewStage, number> = {
      idle: 0,
      awaiting_signal_noise: 1,
      awaiting_progress: 2,
      awaiting_patterns: 3,
      awaiting_adjustment: 4,
      synthesizing: 4,
      complete: 4,
    };
    return { current: stageMap[stage] || 0, total: 4 };
  };

  const progress = getProgress();

  // Show offline message
  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-muted-foreground mb-4">
          This feature requires an internet connection.
        </p>
        <Button asChild variant="outline">
          <Link to="/reflect">Back to Reflect</Link>
        </Button>
      </div>
    );
  }

  // Loading context
  if (!weekContext) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">
          Loading your week...
        </div>
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
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i < progress.current
                  ? 'bg-accent'
                  : i === progress.current
                    ? 'bg-accent/50'
                    : 'bg-muted'
              )}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-center">
          {isComplete
            ? 'Review complete'
            : `Question ${progress.current} of ${progress.total}`}
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
            Your weekly review is saved.
          </p>
          <div className="flex justify-center">
            <Button asChild variant="outline">
              <Link to="/reflect">Back to Reflect</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
