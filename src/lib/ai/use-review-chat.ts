import { useState, useCallback, useRef, useEffect } from 'react';
import { streamText, generateText } from 'ai';
import { models, isAIConfigured } from './index';
import {
  buildWeeklyReviewPrompt,
  REVIEW_QUESTIONS,
  NEXT_REVIEW_STAGE,
  REVIEW_SYNTHESIS_PROMPT,
  type ReviewStage,
} from './prompts/review';
import { generateMessageId } from '@/lib/chats';
import { hapticMessageSent, hapticMessageReceived, hapticError } from '@/lib/haptics';
import type { Review } from '@/lib/db/schema';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type StageWithQuestion =
  | 'awaiting_signal_noise'
  | 'awaiting_progress'
  | 'awaiting_patterns'
  | 'awaiting_adjustment';

function isStageWithQuestion(stage: ReviewStage): stage is StageWithQuestion {
  return (
    stage === 'awaiting_signal_noise' ||
    stage === 'awaiting_progress' ||
    stage === 'awaiting_patterns' ||
    stage === 'awaiting_adjustment'
  );
}

interface UseReviewChatOptions {
  review: Review;
  memoryContext?: string;
  weekCheckinsContext?: string;
  weekCapturesContext?: string;
  onComplete?: (content: string, insights: string[]) => void;
  updateReviewMessages: (
    reviewId: string,
    messages: Message[]
  ) => Promise<void>;
  updateReviewStage: (reviewId: string, stage: ReviewStage) => Promise<void>;
}

interface UseReviewChatReturn {
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  startReview: () => Promise<void>;
  isStreaming: boolean;
  isReady: boolean;
  isComplete: boolean;
  stage: ReviewStage;
  synthesizedContent: string | null;
  error: Error | null;
  retry: () => void;
}

/**
 * Specialized chat hook for weekly review guided conversation
 */
export function useReviewChat({
  review,
  memoryContext,
  weekCheckinsContext,
  weekCapturesContext,
  onComplete,
  updateReviewMessages,
  updateReviewStage,
}: UseReviewChatOptions): UseReviewChatReturn {
  const [messages, setMessages] = useState<Message[]>(review.messages || []);
  const [stage, setStage] = useState<ReviewStage>(
    (review.status === 'completed' ? 'complete' : 'idle') as ReviewStage
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [synthesizedContent, setSynthesizedContent] = useState<string | null>(
    review.content || null
  );
  const lastUserMessageRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const systemPromptRef = useRef<string>('');
  const userResponsesRef = useRef<Record<string, string>>({});
  // For RAF batching during streaming
  const pendingContentRef = useRef<string>('');
  const rafIdRef = useRef<number | null>(null);

  // Build system prompt on mount
  useEffect(() => {
    systemPromptRef.current = buildWeeklyReviewPrompt(
      memoryContext,
      weekCheckinsContext,
      weekCapturesContext
    );
  }, [memoryContext, weekCheckinsContext, weekCapturesContext]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // Start the review by asking the first question
  const startReview = useCallback(async () => {
    if (!isAIConfigured()) {
      setError(new Error('AI is not configured.'));
      return;
    }

    // If resuming with existing messages, don't restart
    if (messages.length > 0) {
      return;
    }

    const firstQuestion = REVIEW_QUESTIONS.awaiting_signal_noise;

    const openingMessage: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content: `Let's reflect on your week.\n\n${firstQuestion}`,
    };

    setMessages([openingMessage]);
    setStage('awaiting_signal_noise');
    await updateReviewMessages(review.id, [openingMessage]);
  }, [messages.length, review.id, updateReviewMessages]);

  // Generate synthesis from user responses
  const generateSynthesis = useCallback(async () => {
    setIsStreaming(true);

    try {
      const responses = userResponsesRef.current;
      const contextForSynthesis = `
Weekly Review Conversation:

SIGNAL vs NOISE - What mattered vs busywork:
${responses.signal_noise || 'Not discussed'}

PROGRESS - Movement toward what matters:
${responses.progress || 'Not discussed'}

PATTERNS - What keeps showing up:
${responses.patterns || 'Not discussed'}

ONE ADJUSTMENT - What to change next week:
${responses.adjustment || 'Not discussed'}
`;

      const result = await generateText({
        model: models.chat,
        system: REVIEW_SYNTHESIS_PROMPT,
        prompt: contextForSynthesis,
      });

      const synthesized = result.text;
      setSynthesizedContent(synthesized);

      const synthesisMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: `Here's your week in summary:\n\n${synthesized}\n\nYour review is saved.`,
      };

      const finalMessages = [...messages, synthesisMessage];
      setMessages(finalMessages);
      setStage('complete');
      await updateReviewMessages(review.id, finalMessages);

      // Extract insights (simple extraction from responses)
      const insights: string[] = [];
      if (responses.patterns) {
        insights.push(responses.patterns);
      }
      if (responses.adjustment) {
        insights.push(`Next week: ${responses.adjustment}`);
      }

      onComplete?.(synthesized, insights);
      hapticMessageReceived();
    } catch (err) {
      console.error('Synthesis error:', err);
      setError(err instanceof Error ? err : new Error('Failed to generate synthesis'));
      hapticError();
    } finally {
      setIsStreaming(false);
    }
  }, [messages, review.id, onComplete, updateReviewMessages]);

  // Send a message and handle state transitions
  const sendMessage = useCallback(
    async (content: string) => {
      if (!isAIConfigured()) {
        setError(new Error('AI is not configured.'));
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

      // Store user response for current stage
      if (stage === 'awaiting_signal_noise') {
        userResponsesRef.current.signal_noise = content;
      } else if (stage === 'awaiting_progress') {
        userResponsesRef.current.progress = content;
      } else if (stage === 'awaiting_patterns') {
        userResponsesRef.current.patterns = content;
      } else if (stage === 'awaiting_adjustment') {
        userResponsesRef.current.adjustment = content;
      }

      const nextStage = NEXT_REVIEW_STAGE[stage];

      // If next stage is synthesizing, generate the summary
      if (nextStage === 'synthesizing') {
        await updateReviewMessages(review.id, updatedMessages);
        await generateSynthesis();
        return;
      }

      // Get next question
      const nextQuestion = isStageWithQuestion(nextStage)
        ? REVIEW_QUESTIONS[nextStage]
        : null;

      if (!nextQuestion) {
        console.error(`No question for stage: ${nextStage}`);
        setError(new Error('Configuration error'));
        hapticError();
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
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const conversationHistory = updatedMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        const instruction = `Acknowledge their response briefly (1-2 sentences), then ask: "${nextQuestion}"`;

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

        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }

        const finalMessages = [
          ...updatedMessages,
          { ...assistantMessage, content: fullContent },
        ];
        setMessages(finalMessages);

        setStage(nextStage);
        await updateReviewStage(review.id, nextStage);
        await updateReviewMessages(review.id, finalMessages);
        hapticMessageReceived();
      } catch (err) {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }

        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Review chat error:', err);
        setError(err instanceof Error ? err : new Error('Failed to send message'));
        hapticError();
        setMessages(updatedMessages);
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [
      messages,
      stage,
      review.id,
      generateSynthesis,
      updateReviewMessages,
      updateReviewStage,
    ]
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
    startReview,
    isStreaming,
    isReady: !isStreaming,
    isComplete: stage === 'complete',
    stage,
    synthesizedContent,
    error,
    retry,
  };
}
