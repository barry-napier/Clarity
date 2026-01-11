import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import { useCheckinChat } from '@/lib/ai/use-checkin-chat';
import { useMemory } from '@/lib/db/hooks';
import { useKeyboard } from '@/lib/use-keyboard';
import { ChatMessage } from '../chat/chat-message';
import { ChatInput } from '../chat/chat-input';
import { StreamingIndicator } from '../chat/streaming-indicator';
import { cn } from '@/lib/utils';
import { isAIConfigured } from '@/lib/ai';
import type { Checkin } from '@/lib/db/schema';
import { extractAndUpdateMemory } from '@/lib/ai/memory-extractor';
import { incrementCompletedCheckinsCount } from '@/lib/notifications/reminder-settings';
import type { ChatMessage as ChatMessageType } from '@/lib/db/schema';
import { Button } from '../ui/button';

interface CheckinViewProps {
  checkin: Checkin;
  onComplete?: () => void;
}

export function CheckinView({ checkin, onComplete }: CheckinViewProps) {
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

  // Will be set after useCheckinChat is called
  const messagesRef = useRef<Array<{ id: string; role: string; content: string }>>([]);

  const handleComplete = useCallback(async () => {
    // Trigger memory extraction with the check-in transcript
    const transcript: ChatMessageType[] = messagesRef.current.map((m, i) => ({
      id: `checkin-${i}`,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: Date.now(),
    }));

    if (transcript.length > 0) {
      await extractAndUpdateMemory(transcript, memory ?? undefined);
    }

    // Increment completed check-ins count (for notification prompt trigger)
    await incrementCompletedCheckinsCount();

    onComplete?.();
  }, [memory, onComplete]);

  const {
    messages,
    sendMessage,
    startCheckin,
    isStreaming,
    isComplete,
    stage,
    error,
    retry,
  } = useCheckinChat({
    checkinId: checkin.id,
    initialStage: checkin.stage,
    memoryContext: memory?.content,
    // Pass persisted messages for resume capability
    initialMessages: checkin.messages ?? [],
    onComplete: handleComplete,
  });

  // Sync messages to ref for handleComplete access
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-start check-in when component mounts (only once)
  // Skip if resuming with existing messages
  useEffect(() => {
    const hasExistingMessages = (checkin.messages?.length ?? 0) > 0;
    if (!hasStartedRef.current && checkin.stage === 'idle' && !hasExistingMessages) {
      hasStartedRef.current = true;
      startCheckin();
    }
  }, [checkin.stage, checkin.messages?.length, startCheckin]);

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

  // Map stage to progress indicator
  const getProgress = () => {
    const stages = ['awaiting_energy', 'awaiting_wins', 'awaiting_friction', 'awaiting_priority', 'complete'];
    const currentIndex = stages.indexOf(stage);
    return { current: Math.max(0, currentIndex), total: 4 };
  };

  const progress = getProgress();

  // Show offline message if no network connection
  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-muted-foreground mb-4">
          Check-ins require an internet connection.
        </p>
        <Button asChild variant="outline">
          <Link to="/today">Back to Today</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full',
        keyboardVisible && `pb-[${keyboardHeight}px]`
      )}
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
            ? 'Check-in complete'
            : `Question ${progress.current + 1} of ${progress.total}`}
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
              AI is not configured. Add your OpenAI API key to enable check-ins.
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
              <p className="text-sm text-destructive">Something went wrong. Tap to retry.</p>
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
          <p className="text-sm text-center text-muted-foreground">
            Check-in saved. Have a great day!
          </p>
        </div>
      )}
    </div>
  );
}
