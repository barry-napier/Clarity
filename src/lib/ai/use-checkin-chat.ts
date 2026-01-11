import { useState, useCallback, useRef, useEffect } from 'react';
import { streamText } from 'ai';
import { models, isAIConfigured } from './index';
import { buildCheckinSystemPrompt } from './prompts';
import { generateMessageId } from '@/lib/chats';
import {
  updateCheckinStage,
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

// Map stages to entry types
const STAGE_TO_TYPE: Record<string, CheckinEntry['type']> = {
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

// Initial questions for each stage
const STAGE_QUESTIONS: Record<string, string> = {
  awaiting_energy: 'How are you feeling today?',
  awaiting_wins: 'What went well recently?',
  awaiting_friction: "What's been hard or draining?",
  awaiting_priority: "What's the ONE thing you want to focus on today?",
};

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

  // Start the check-in by asking the first question
  const startCheckin = useCallback(async () => {
    if (!isAIConfigured()) {
      setError(new Error('AI is not configured. Please add your API key.'));
      return;
    }

    // If resuming from a specific stage, get the appropriate question
    const nextStage = stage === 'idle' ? 'awaiting_energy' : stage;
    const question = STAGE_QUESTIONS[nextStage] || STAGE_QUESTIONS.awaiting_energy;

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

    setMessages([assistantMessage]);
    setStage(nextStage);
    await updateCheckinStage(checkinId, nextStage);
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

      // Record the entry for the current stage
      const entryType = STAGE_TO_TYPE[stage];
      if (entryType) {
        const entry: CheckinEntry = {
          type: entryType,
          question: currentQuestionRef.current,
          response: content,
          timestamp: Date.now(),
        };
        await addCheckinEntry(checkinId, entry);
      }

      // Determine next stage
      const nextStage = NEXT_STAGE[stage];

      // If check-in is complete, finish up
      if (nextStage === 'complete') {
        // Add closing message
        const closingMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: "Got it. You're all set for today. Good luck with your priority!",
        };
        setMessages([...updatedMessages, closingMessage]);
        setStage('complete');
        await updateCheckinStage(checkinId, 'complete');
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

        // Add instruction for next question
        const nextQuestion = STAGE_QUESTIONS[nextStage];
        const instruction = `The user just answered the ${entryType} question. Acknowledge briefly (1-2 sentences), then ask: "${nextQuestion}"`;

        // Stream the response
        const result = streamText({
          model: models.chat,
          system: `${systemPromptRef.current}\n\nCurrent instruction: ${instruction}`,
          messages: conversationHistory,
          abortSignal: abortControllerRef.current.signal,
        });

        let fullContent = '';

        for await (const chunk of result.textStream) {
          fullContent += chunk;
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = fullContent;
            }
            return newMessages;
          });
        }

        // Final update
        const finalMessages = [
          ...updatedMessages,
          { ...assistantMessage, content: fullContent },
        ];
        setMessages(finalMessages);

        // Update stage
        currentQuestionRef.current = nextQuestion;
        setStage(nextStage);
        await updateCheckinStage(checkinId, nextStage);
        hapticMessageReceived();
      } catch (err) {
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
