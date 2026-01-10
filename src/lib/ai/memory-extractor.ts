import { generateText } from 'ai';
import { models } from './index';
import { MEMORY_EXTRACTION_PROMPT, MEMORY_COMPRESSION_PROMPT } from './prompts';
import { db, type Memory } from '@/lib/db/schema';
import type { ChatMessage } from '@/lib/db/schema';

interface MemoryUpdate {
  section: string;
  content: string;
  action: 'add' | 'modify' | 'remove';
}

interface ExtractionResult {
  hasUpdates: boolean;
  updates: MemoryUpdate[];
  summary: string;
}

/**
 * Extract learnings from a conversation and update memory
 * Called at end of session or after significant exchanges
 */
export async function extractAndUpdateMemory(
  messages: ChatMessage[],
  currentMemory: Memory | undefined
): Promise<ExtractionResult | null> {
  if (messages.length < 2) {
    // Need at least one exchange to extract anything
    return null;
  }

  try {
    // Format conversation for the AI
    const conversation = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const prompt = `${MEMORY_EXTRACTION_PROMPT}

Current memory:
${currentMemory?.content || 'No existing memory.'}

Conversation to analyze:
${conversation}`;

    const result = await generateText({
      model: models.memory,
      prompt,
    });

    // Parse the JSON response
    const text = result.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('No JSON found in extraction response');
      return null;
    }

    const extraction = JSON.parse(jsonMatch[0]) as ExtractionResult;

    if (extraction.hasUpdates && extraction.updates.length > 0) {
      // Apply updates to memory
      await applyMemoryUpdates(extraction.updates, currentMemory);
    }

    return extraction;
  } catch (error) {
    console.error('Memory extraction failed:', error);
    return null;
  }
}

/**
 * Apply extracted updates to the memory document
 */
async function applyMemoryUpdates(
  updates: MemoryUpdate[],
  currentMemory: Memory | undefined
): Promise<void> {
  const now = Date.now();
  const currentContent = currentMemory?.content || getDefaultMemoryTemplate();
  const currentVersion = currentMemory?.version || 0;

  // For now, append updates as a simple log at the end
  // A more sophisticated implementation would parse and modify sections
  const updateLog = updates
    .map((u) => `- [${u.section}] ${u.action}: ${u.content}`)
    .join('\n');

  const updatedContent = `${currentContent}

---
## Recent Updates (${new Date().toLocaleDateString()})
${updateLog}`;

  // Estimate tokens (rough: 4 chars per token)
  const tokenEstimate = Math.ceil(updatedContent.length / 4);

  if (currentMemory) {
    await db.memory.update('main', {
      content: updatedContent,
      version: currentVersion + 1,
      tokenEstimate,
      updatedAt: now,
      syncStatus: 'pending',
    });
  } else {
    await db.memory.add({
      id: 'main',
      key: 'main',
      content: updatedContent,
      version: 1,
      tokenEstimate,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    });
  }

  // Queue for sync
  await db.syncQueue.add({
    entityType: 'memory',
    entityId: 'main',
    operation: currentMemory ? 'update' : 'create',
    createdAt: now,
    retryCount: 0,
  });
}

/**
 * Compress memory when it exceeds token limit
 */
export async function compressMemoryIfNeeded(
  memory: Memory,
  maxTokens: number = 2000
): Promise<boolean> {
  if (!memory.tokenEstimate || memory.tokenEstimate <= maxTokens) {
    return false;
  }

  try {
    const result = await generateText({
      model: models.memory,
      prompt: `${MEMORY_COMPRESSION_PROMPT}

Memory to compress:
${memory.content}`,
    });

    const compressedContent = result.text;
    const now = Date.now();

    await db.memory.update('main', {
      content: compressedContent,
      version: (memory.version || 0) + 1,
      tokenEstimate: Math.ceil(compressedContent.length / 4),
      lastCompaction: now,
      updatedAt: now,
      syncStatus: 'pending',
    });

    // Queue for sync
    await db.syncQueue.add({
      entityType: 'memory',
      entityId: 'main',
      operation: 'update',
      createdAt: now,
      retryCount: 0,
    });

    return true;
  } catch (error) {
    console.error('Memory compression failed:', error);
    return false;
  }
}

/**
 * Default memory template for new users
 */
function getDefaultMemoryTemplate(): string {
  return `# Personal Operating Memory

*Last updated: ${new Date().toLocaleDateString()}*

---

## Current Season

**Theme:** Getting Started with Clarity

**Focus Areas:**
- Building the habit of reflection
- Understanding what matters

---

## AI Instructions

- Use coaching tone - supportive but challenging
- Ask about neglected areas periodically
- Look for wins - help me recognize progress
- Be direct about time allocation tradeoffs
- If I'm avoiding something, gently call it out

---

## Life Domains

### Work
- *Not yet captured*

### Family
- *Not yet captured*

### Finances
- *Not yet captured*

### Relationships
- *Not yet captured*

### Health
- *Not yet captured*

### Meaning/Fun
- *Not yet captured*

---

## People I'm Tracking

*No one tracked yet*

---

## Rules I Trust

*No rules defined yet*

---

## Now / Next / Later

### Now
- Get to know Clarity

### Next
- *Nothing yet*

### Later
- *Nothing yet*`;
}

/**
 * Initialize memory for a new user
 */
export async function initializeMemory(): Promise<Memory> {
  const now = Date.now();
  const content = getDefaultMemoryTemplate();

  const memory: Memory = {
    id: 'main',
    key: 'main',
    content,
    version: 1,
    tokenEstimate: Math.ceil(content.length / 4),
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  };

  await db.memory.add(memory);

  // Queue for sync
  await db.syncQueue.add({
    entityType: 'memory',
    entityId: 'main',
    operation: 'create',
    createdAt: now,
    retryCount: 0,
  });

  return memory;
}
