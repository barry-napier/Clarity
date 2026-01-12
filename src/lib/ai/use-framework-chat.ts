import { useState, useCallback, useRef, useEffect } from 'react';
import { streamText, generateText } from 'ai';
import { models, isAIConfigured } from './index';
import {
  buildFrameworkSystemPrompt,
  buildFrameworkSynthesisPrompt,
} from './prompts/framework';
import { generateMessageId } from '@/lib/chats';
import {
  addFrameworkEntry,
  updateSessionStage,
  updateSessionMessages,
  completeFrameworkSession,
} from '@/lib/frameworks';
import { getFrameworkById, type FrameworkDefinition } from '@/lib/frameworks/definitions';
import { hapticMessageSent, hapticMessageReceived, hapticError } from '@/lib/haptics';
import type { FrameworkEntry, FrameworkSession } from '@/lib/db/schema';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface UseFrameworkChatOptions {
  session: FrameworkSession;
  memoryContext?: string;
  onComplete?: () => void;
}

interface UseFrameworkChatReturn {
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  startSession: () => Promise<void>;
  isStreaming: boolean;
  isReady: boolean;
  isComplete: boolean;
  currentStage: number;
  totalStages: number;
  framework: FrameworkDefinition | undefined;
  error: Error | null;
  retry: () => void;
}

/**
 * Specialized chat hook for framework guided conversations
 */
export function useFrameworkChat({
  session,
  memoryContext,
  onComplete,
}: UseFrameworkChatOptions): UseFrameworkChatReturn {
  const framework = getFrameworkById(session.frameworkType);
  const [messages, setMessages] = useState<Message[]>(session.messages || []);
  const [currentStage, setCurrentStage] = useState(session.stage);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(session.status === 'completed');
  const [error, setError] = useState<Error | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // For RAF batching during streaming
  const pendingContentRef = useRef<string>('');
  const rafIdRef = useRef<number | null>(null);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const totalStages = framework?.stages.length ?? 0;

  // Start the session by asking the first question
  const startSession = useCallback(async () => {
    if (!isAIConfigured() || !framework) {
      setError(new Error('AI is not configured or framework not found.'));
      return;
    }

    // If resuming with existing messages, don't restart
    if (messages.length > 0) {
      return;
    }

    const firstStage = framework.stages[0];
    if (!firstStage.question) {
      setError(new Error('Framework has no opening question.'));
      return;
    }

    const openingMessage: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content: `Let's work through the ${framework.name} framework together.\n\n${firstStage.question}`,
    };

    setMessages([openingMessage]);
    await updateSessionMessages(session.id, [openingMessage]);
  }, [framework, messages.length, session.id]);

  // Handle synthesis stage
  const generateSynthesis = useCallback(async () => {
    if (!framework) return;

    setIsStreaming(true);

    try {
      // Build entries from session
      const entries = session.entries.map((e) => ({
        question: e.question,
        response: e.response,
      }));

      const prompt = buildFrameworkSynthesisPrompt(framework, entries);

      const result = await generateText({
        model: models.chat,
        prompt,
      });

      const synthesisMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: result.text,
      };

      const finalMessages = [...messages, synthesisMessage];
      setMessages(finalMessages);
      await updateSessionMessages(session.id, finalMessages);

      // Complete the session
      await completeFrameworkSession(session.id, result.text);
      setIsComplete(true);
      hapticMessageReceived();
      onComplete?.();
    } catch (err) {
      console.error('Synthesis error:', err);
      setError(err instanceof Error ? err : new Error('Failed to generate synthesis'));
      hapticError();
    } finally {
      setIsStreaming(false);
    }
  }, [framework, session.id, session.entries, messages, onComplete]);

  // Send a message and handle state transitions
  const sendMessage = useCallback(
    async (content: string) => {
      if (!isAIConfigured() || !framework) {
        setError(new Error('AI is not configured or framework not found.'));
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

      // Get current stage info
      const stage = framework.stages[currentStage];

      // Record entry if this stage has a question
      if (stage.question) {
        const entry: FrameworkEntry = {
          stage: currentStage,
          question: stage.question,
          response: content,
          timestamp: Date.now(),
        };
        await addFrameworkEntry(session.id, entry);
      }

      // Move to next stage
      const nextStage = currentStage + 1;

      // Check if we've completed all stages
      if (nextStage >= totalStages) {
        // Final stage - generate synthesis
        setCurrentStage(nextStage - 1); // Stay on last stage
        await updateSessionStage(session.id, nextStage - 1);
        await updateSessionMessages(session.id, updatedMessages);
        await generateSynthesis();
        return;
      }

      // Check if next stage is synthesis (question is null)
      const nextStageInfo = framework.stages[nextStage];
      if (nextStageInfo.question === null) {
        // Synthesis stage
        setCurrentStage(nextStage);
        await updateSessionStage(session.id, nextStage);
        await updateSessionMessages(session.id, updatedMessages);
        await generateSynthesis();
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

        const systemPrompt = buildFrameworkSystemPrompt(
          framework,
          nextStage,
          memoryContext
        );

        const instruction = `Acknowledge their response briefly, then ask: "${nextStageInfo.question}"`;

        const result = streamText({
          model: models.chat,
          system: `${systemPrompt}\n\nTransition instruction: ${instruction}`,
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

        setCurrentStage(nextStage);
        await updateSessionStage(session.id, nextStage);
        await updateSessionMessages(session.id, finalMessages);
        hapticMessageReceived();
      } catch (err) {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }

        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Framework chat error:', err);
        setError(err instanceof Error ? err : new Error('Failed to send message'));
        hapticError();
        setMessages(updatedMessages);
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [
      framework,
      messages,
      currentStage,
      totalStages,
      session.id,
      memoryContext,
      generateSynthesis,
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
    startSession,
    isStreaming,
    isReady: !isStreaming,
    isComplete,
    currentStage,
    totalStages,
    framework,
    error,
    retry,
  };
}
