import { useState, useCallback, useRef, useEffect } from 'react';
import { streamText, generateText } from 'ai';
import { models, isAIConfigured } from './index';
import {
  buildNorthstarSystemPrompt,
  NORTHSTAR_QUESTIONS,
  NEXT_NORTHSTAR_STAGE,
  NORTHSTAR_SYNTHESIS_PROMPT,
  type NorthstarStage,
} from './prompts/northstar';
import { generateMessageId } from '@/lib/chats';
import { hapticMessageSent, hapticMessageReceived, hapticError } from '@/lib/haptics';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type StageWithQuestion = 'awaiting_values' | 'awaiting_purpose' | 'awaiting_ideal_life';

function isStageWithQuestion(stage: NorthstarStage): stage is StageWithQuestion {
  return (
    stage === 'awaiting_values' ||
    stage === 'awaiting_purpose' ||
    stage === 'awaiting_ideal_life'
  );
}

interface UseNorthstarChatOptions {
  memoryContext?: string;
  existingNorthstar?: string;
  onComplete?: (content: string) => void;
}

interface UseNorthstarChatReturn {
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  startConversation: () => Promise<void>;
  isStreaming: boolean;
  isReady: boolean;
  isComplete: boolean;
  stage: NorthstarStage;
  synthesizedContent: string | null;
  error: Error | null;
  retry: () => void;
}

/**
 * Specialized chat hook for North Star guided conversation
 * Guides user through Values, Purpose, Ideal Life questions
 */
export function useNorthstarChat({
  memoryContext,
  existingNorthstar,
  onComplete,
}: UseNorthstarChatOptions): UseNorthstarChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stage, setStage] = useState<NorthstarStage>('idle');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [synthesizedContent, setSynthesizedContent] = useState<string | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentQuestionRef = useRef<string>('');
  const systemPromptRef = useRef<string>('');
  const userResponsesRef = useRef<Record<string, string>>({});
  // For RAF batching during streaming
  const pendingContentRef = useRef<string>('');
  const rafIdRef = useRef<number | null>(null);

  // Build system prompt on mount
  useEffect(() => {
    systemPromptRef.current = buildNorthstarSystemPrompt(memoryContext);
  }, [memoryContext]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // Start the conversation by asking the first question
  const startConversation = useCallback(async () => {
    if (!isAIConfigured()) {
      setError(new Error('AI is not configured.'));
      return;
    }

    const firstQuestion = NORTHSTAR_QUESTIONS.awaiting_values;
    currentQuestionRef.current = firstQuestion;

    const openingMessage = existingNorthstar
      ? `Let's revisit your North Star. I'll ask you three questions to help you refine what matters most.\n\n${firstQuestion}`
      : `Let's define your North Star - a personal manifesto that captures what matters most to you. I'll ask you three questions.\n\n${firstQuestion}`;

    const assistantMessage: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content: openingMessage,
    };

    setMessages([assistantMessage]);
    setStage('awaiting_values');
  }, [existingNorthstar]);

  // Generate synthesis from user responses
  const generateSynthesis = useCallback(async () => {
    setIsStreaming(true);

    try {
      const responses = userResponsesRef.current;
      const contextForSynthesis = `
User's responses:

VALUES - What principles guide their decisions:
${responses.values || 'Not provided'}

PURPOSE - What gives their life meaning:
${responses.purpose || 'Not provided'}

IDEAL LIFE - What a Tuesday looks like in 5 years:
${responses.ideal_life || 'Not provided'}
`;

      const result = await generateText({
        model: models.memory, // Use quality model for synthesis
        system: NORTHSTAR_SYNTHESIS_PROMPT,
        prompt: contextForSynthesis,
      });

      const synthesized = result.text;
      setSynthesizedContent(synthesized);

      const synthesisMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: `Here's a draft of your North Star manifesto:\n\n---\n\n${synthesized}\n\n---\n\nHow does this feel? You can say "looks good" to save it, or tell me what you'd like to change.`,
      };

      setMessages((prev) => [...prev, synthesisMessage]);
      setStage('reviewing');
      hapticMessageReceived();
    } catch (err) {
      console.error('Synthesis error:', err);
      setError(err instanceof Error ? err : new Error('Failed to generate synthesis'));
      hapticError();
    } finally {
      setIsStreaming(false);
    }
  }, []);

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

      // Handle review stage separately
      if (stage === 'reviewing') {
        const lowerContent = content.toLowerCase().trim();
        const isApproval =
          lowerContent === 'looks good' ||
          lowerContent === 'save it' ||
          lowerContent === 'perfect' ||
          lowerContent === 'yes' ||
          lowerContent === 'done' ||
          lowerContent.includes('save');

        if (isApproval && synthesizedContent) {
          const finalMessage: Message = {
            id: generateMessageId(),
            role: 'assistant',
            content: 'Your North Star is saved. You can revisit and refine it anytime.',
          };
          setMessages([...updatedMessages, finalMessage]);
          setStage('complete');
          onComplete?.(synthesizedContent);
          hapticMessageReceived();
          return;
        }

        // User wants changes - regenerate with feedback
        setIsStreaming(true);
        try {
          const result = await generateText({
            model: models.memory,
            system: `${NORTHSTAR_SYNTHESIS_PROMPT}\n\nThe user previously saw this draft:\n${synthesizedContent}\n\nThey want changes.`,
            prompt: `User feedback: ${content}\n\nPlease revise the manifesto based on their feedback. Return only the revised manifesto text.`,
          });

          const revised = result.text;
          setSynthesizedContent(revised);

          const revisionMessage: Message = {
            id: generateMessageId(),
            role: 'assistant',
            content: `Here's the revised version:\n\n---\n\n${revised}\n\n---\n\nBetter? Say "looks good" to save, or tell me what else to adjust.`,
          };

          setMessages([...updatedMessages, revisionMessage]);
          hapticMessageReceived();
        } catch (err) {
          console.error('Revision error:', err);
          setError(err instanceof Error ? err : new Error('Failed to revise'));
          hapticError();
        } finally {
          setIsStreaming(false);
        }
        return;
      }

      // Store user response for current stage
      if (stage === 'awaiting_values') {
        userResponsesRef.current.values = content;
      } else if (stage === 'awaiting_purpose') {
        userResponsesRef.current.purpose = content;
      } else if (stage === 'awaiting_ideal_life') {
        userResponsesRef.current.ideal_life = content;
      }

      const nextStage = NEXT_NORTHSTAR_STAGE[stage];

      // If next stage is synthesizing, generate the manifesto
      if (nextStage === 'synthesizing') {
        // Add acknowledgment then synthesize
        const ackMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: 'Thank you for sharing. Let me bring these together into your North Star...',
        };
        setMessages([...updatedMessages, ackMessage]);
        setStage('synthesizing');
        await generateSynthesis();
        return;
      }

      // Get next question
      const nextQuestion = isStageWithQuestion(nextStage)
        ? NORTHSTAR_QUESTIONS[nextStage]
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

        const instruction = `The user just answered. Acknowledge briefly (1-2 sentences max), then ask: "${nextQuestion}"`;

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
        currentQuestionRef.current = nextQuestion;
        setStage(nextStage);
        hapticMessageReceived();
      } catch (err) {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }

        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('North Star chat error:', err);
        setError(err instanceof Error ? err : new Error('Failed to send message'));
        hapticError();
        setMessages(updatedMessages);
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [messages, stage, synthesizedContent, onComplete, generateSynthesis]
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
    startConversation,
    isStreaming,
    isReady: !isStreaming,
    isComplete: stage === 'complete',
    stage,
    synthesizedContent,
    error,
    retry,
  };
}
