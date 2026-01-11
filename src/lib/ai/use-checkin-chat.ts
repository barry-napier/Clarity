import { useState, useCallback, useRef, useEffect } from 'react';
import { streamText } from 'ai';
import { models, isAIConfigured } from './index';
import { buildCheckinSystemPrompt } from './prompts';
import { generateMessageId } from '@/lib/chats';
import {
  updateCheckinStage,
  updateCheckinMessages,
  addCheckinEntry,
  completeCheckin,
  formatRecentCheckinsForContext,
  getDaysSinceLastCheckin,
} from '@/lib/checkins';
import { hapticMessageSent, hapticMessageReceived, hapticError } from '@/lib/haptics';
import type { CheckinStage, CheckinEntry } from '@/lib/db/schema';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Stages that have associated questions and entries
type StageWithEntry = 'awaiting_energy' | 'awaiting_wins' | 'awaiting_friction' | 'awaiting_priority';

// Type guard to check if a stage has an entry
function isStageWithEntry(stage: CheckinStage): stage is StageWithEntry {
  return stage === 'awaiting_energy' || stage === 'awaiting_wins' ||
         stage === 'awaiting_friction' || stage === 'awaiting_priority';
}

// Map stages to entry types with constrained keys
const STAGE_TO_TYPE: Record<StageWithEntry, CheckinEntry['type']> = {
  awaiting_energy: 'energy',
  awaiting_wins: 'wins',
  awaiting_friction: 'friction',
  awaiting_priority: 'priority',
};

// Map stages to next stages
const NEXT_STAGE: Record<CheckinStage, CheckinStage> = {
  idle: 'awaiting_energy',
  awaiting_energy: 'awaiting_wins',
  awaiting_wins: 'awaiting_friction',
  awaiting_friction: 'awaiting_priority',
  awaiting_priority: 'complete',
  complete: 'complete',
};

// Determine time of day based on current hour (before noon = morning)
function getTimeOfDay(): 'morning' | 'evening' {
  return new Date().getHours() < 12 ? 'morning' : 'evening';
}

// Get stage questions based on time of day
function getStageQuestions(timeOfDay: 'morning' | 'evening'): Record<StageWithEntry, string> {
  const isMorning = timeOfDay === 'morning';
  return {
    awaiting_energy: isMorning
      ? 'How are you feeling today?'
      : 'How are you feeling right now?',
    awaiting_wins: isMorning
      ? 'What went well recently?'
      : 'What went well today?',
    awaiting_friction: isMorning
      ? "What's on your mind that feels heavy?"
      : "What drained you today?",
    awaiting_priority: isMorning
      ? "What's the ONE thing you want to focus on today?"
      : "What's one thing you want to let go of tonight?",
  };
}

interface UseCheckinChatOptions {
  checkinId: string;
  initialStage: CheckinStage;
  memoryContext?: string;
  initialMessages?: Message[];
  onComplete?: () => void;
}

interface UseCheckinChatReturn {
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  startCheckin: () => Promise<void>;
  isStreaming: boolean;
  isReady: boolean;
  isComplete: boolean;
  stage: CheckinStage;
  error: Error | null;
  retry: () => void;
}

/**
 * Specialized chat hook for check-ins with state machine
 * Guides user through Energy, Wins, Friction, Priority questions
 */
export function useCheckinChat({
  checkinId,
  initialStage,
  memoryContext,
  initialMessages = [],
  onComplete,
}: UseCheckinChatOptions): UseCheckinChatReturn {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [stage, setStage] = useState<CheckinStage>(initialStage);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentQuestionRef = useRef<string>('');
  const systemPromptRef = useRef<string>('');
  // For RAF batching during streaming to reduce re-renders
  const pendingContentRef = useRef<string>('');
  const rafIdRef = useRef<number | null>(null);
  // Capture time of day at start of check-in for consistent questions throughout
  const timeOfDayRef = useRef<'morning' | 'evening'>(getTimeOfDay());
  const stageQuestionsRef = useRef(getStageQuestions(timeOfDayRef.current));

  // Build system prompt on mount
  useEffect(() => {
    async function buildPrompt() {
      const recentCheckins = await formatRecentCheckinsForContext();
      const daysSinceLastCheckin = await getDaysSinceLastCheckin();
      systemPromptRef.current = buildCheckinSystemPrompt(
        memoryContext,
        recentCheckins,
        daysSinceLastCheckin
      );
    }
    buildPrompt();
  }, [memoryContext]);

  // Cleanup RAF on unmount to prevent memory leaks (#062)
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // Start the check-in by asking the first question
  const startCheckin = useCallback(async () => {
    if (!isAIConfigured()) {
      setError(new Error('AI is not configured. Please add your API key.'));
      return;
    }

    // If resuming from a specific stage, get the appropriate question
    // If stage is 'complete' or 'idle', start from awaiting_energy
    const nextStage: StageWithEntry = isStageWithEntry(stage) ? stage : 'awaiting_energy';
    const questions = stageQuestionsRef.current;
    const question = questions[nextStage];

    // Check for gap message
    const daysSinceLastCheckin = await getDaysSinceLastCheckin();
    let openingMessage = question;
    if (daysSinceLastCheckin !== null && daysSinceLastCheckin >= 3) {
      openingMessage = `Welcome back. No need to catch up - let's start fresh today.\n\n${question}`;
    }

    currentQuestionRef.current = question;

    const assistantMessage: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content: openingMessage,
    };

    const newMessages = [assistantMessage];
    setMessages(newMessages);
    setStage(nextStage);
    await updateCheckinStage(checkinId, nextStage);
    // Persist messages for resume
    await updateCheckinMessages(checkinId, newMessages);
  }, [checkinId, stage]);

  // Send a message and handle state transitions
  const sendMessage = useCallback(
    async (content: string) => {
      if (!isAIConfigured()) {
        setError(new Error('AI is not configured. Please add your API key.'));
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

      // Determine next stage FIRST to validate before persisting data (#061)
      const nextStage = NEXT_STAGE[stage];

      // Get entry type for current stage
      const entryType = isStageWithEntry(stage) ? STAGE_TO_TYPE[stage] : null;

      // If not completing, validate nextQuestion exists BEFORE persisting entry (#061)
      // This prevents data loss if we can't proceed to the next question
      let nextQuestion: string | undefined;
      if (nextStage !== 'complete') {
        nextQuestion = stageQuestionsRef.current[nextStage as StageWithEntry];
        if (!nextQuestion) {
          // Configuration error - don't persist partial data
          console.error(`No question defined for stage: ${nextStage}`);
          setError(new Error('Check-in configuration error. Please try again.'));
          hapticError();
          setMessages(messages); // Revert to previous messages
          return;
        }
      }

      // Now safe to record entry - we've validated we can proceed
      if (entryType) {
        const entry: CheckinEntry = {
          type: entryType,
          question: currentQuestionRef.current,
          response: content,
          timestamp: Date.now(),
        };
        await addCheckinEntry(checkinId, entry);
      }

      // If check-in is complete, finish up
      if (nextStage === 'complete') {
        // Add closing message
        const closingMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: 'Got it. Your check-in is saved.',
        };
        const finalMessages = [...updatedMessages, closingMessage];
        setMessages(finalMessages);
        setStage('complete');
        await updateCheckinStage(checkinId, 'complete');
        await updateCheckinMessages(checkinId, finalMessages);
        await completeCheckin(checkinId);
        onComplete?.();
        hapticMessageReceived();
        return;
      }

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

        // Build conversation history - include context about what we're doing
        const conversationHistory = updatedMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        // nextQuestion was already validated before persisting entry (#061)
        // TypeScript needs the assertion since nextQuestion could technically be undefined
        const instruction = `The user just answered the ${entryType} question. Acknowledge briefly (1-2 sentences), then ask: "${nextQuestion!}"`;

        // Stream the response
        const result = streamText({
          model: models.chat,
          system: `${systemPromptRef.current}\n\nCurrent instruction: ${instruction}`,
          messages: conversationHistory,
          abortSignal: abortControllerRef.current.signal,
        });

        let fullContent = '';
        pendingContentRef.current = '';

        for await (const chunk of result.textStream) {
          fullContent += chunk;
          pendingContentRef.current = fullContent;

          // Batch updates with RAF to cap at ~60fps instead of per-chunk
          if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(() => {
              setMessages((prev) => {
                const lastIndex = prev.length - 1;
                const lastMessage = prev[lastIndex];
                if (lastMessage?.role !== 'assistant') return prev;

                return [
                  ...prev.slice(0, lastIndex),
                  { ...lastMessage, content: pendingContentRef.current },
                ];
              });
              rafIdRef.current = null;
            });
          }
        }

        // Cancel any pending RAF and do final update
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }

        // Final update
        const finalMessages = [
          ...updatedMessages,
          { ...assistantMessage, content: fullContent },
        ];
        setMessages(finalMessages);

        // Update stage and persist messages
        // nextQuestion is guaranteed defined here - validated before entry persistence (#061)
        currentQuestionRef.current = nextQuestion!;
        setStage(nextStage);
        await updateCheckinStage(checkinId, nextStage);
        await updateCheckinMessages(checkinId, finalMessages);
        hapticMessageReceived();
      } catch (err) {
        // Cancel any pending RAF on error/abort (#062)
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }

        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Check-in chat error:', err);
        setError(err instanceof Error ? err : new Error('Failed to send message'));
        hapticError();
        setMessages(updatedMessages);
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [checkinId, messages, stage, onComplete]
  );

  const retry = useCallback(() => {
    if (lastUserMessageRef.current) {
      setMessages((prev) => prev.slice(0, -1));
      sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  return {
    messages,
    sendMessage,
    startCheckin,
    isStreaming,
    isReady: !isStreaming,
    isComplete: stage === 'complete',
    stage,
    error,
    retry,
  };
}
