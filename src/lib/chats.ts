import { db, type Chat, type ChatMessage } from './db/schema';

const SESSION_GAP_HOURS = 24;

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate a unique ID for a chat session
 * Format: YYYY-MM-DD-nanoid
 */
function generateChatId(): string {
  const date = getTodayDate();
  const nanoid = crypto.randomUUID().slice(0, 8);
  return `${date}-${nanoid}`;
}

/**
 * Generate a unique ID for a message
 */
export function generateMessageId(): string {
  return crypto.randomUUID();
}

/**
 * Check if we should create a new session based on the last message timestamp
 */
function shouldCreateNewSession(lastMessage?: ChatMessage): boolean {
  if (!lastMessage) return true;
  const hoursSinceLastMessage =
    (Date.now() - lastMessage.timestamp) / (1000 * 60 * 60);
  return hoursSinceLastMessage >= SESSION_GAP_HOURS;
}

/**
 * Get the current active chat session, or create a new one if needed
 */
export async function getOrCreateCurrentChat(
  memorySnapshot?: string
): Promise<Chat> {
  // Get the most recent chat
  const chats = await db.chats.orderBy('updatedAt').reverse().limit(1).toArray();
  const latestChat = chats[0];

  // Check if we should continue the existing session
  if (latestChat && latestChat.messages.length > 0) {
    const lastMessage = latestChat.messages[latestChat.messages.length - 1];
    if (!shouldCreateNewSession(lastMessage)) {
      return latestChat;
    }
  }

  // Create a new chat session
  return createChat(memorySnapshot);
}

/**
 * Create a new chat session
 */
export async function createChat(memorySnapshot?: string): Promise<Chat> {
  const now = Date.now();
  const chat: Chat = {
    id: generateChatId(),
    date: getTodayDate(),
    messages: [],
    memorySnapshot,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  };

  await db.chats.add(chat);

  // Add to sync queue
  await db.syncQueue.add({
    entityType: 'chat',
    entityId: chat.id,
    operation: 'create',
    createdAt: now,
    retryCount: 0,
  });

  return chat;
}

/**
 * Add a message to a chat session
 */
export async function addMessage(
  chatId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage> {
  const now = Date.now();
  const message: ChatMessage = {
    id: generateMessageId(),
    role,
    content,
    timestamp: now,
  };

  const chat = await db.chats.get(chatId);
  if (!chat) {
    throw new Error(`Chat ${chatId} not found`);
  }

  await db.chats.update(chatId, {
    messages: [...chat.messages, message],
    updatedAt: now,
    syncStatus: 'pending',
  });

  // Add to sync queue
  await db.syncQueue.add({
    entityType: 'chat',
    entityId: chatId,
    operation: 'update',
    createdAt: now,
    retryCount: 0,
  });

  return message;
}

/**
 * Update the last assistant message (for streaming)
 */
export async function updateLastAssistantMessage(
  chatId: string,
  content: string
): Promise<void> {
  const chat = await db.chats.get(chatId);
  if (!chat) {
    throw new Error(`Chat ${chatId} not found`);
  }

  const messages = [...chat.messages];
  const lastMessage = messages[messages.length - 1];

  if (lastMessage && lastMessage.role === 'assistant') {
    lastMessage.content = content;
    lastMessage.timestamp = Date.now();
  }

  await db.chats.update(chatId, {
    messages,
    updatedAt: Date.now(),
    syncStatus: 'pending',
  });
}

/**
 * Get a chat by ID
 */
export async function getChatById(id: string): Promise<Chat | undefined> {
  return db.chats.get(id);
}

/**
 * Get chat history (all chats, most recent first)
 */
export async function getChatHistory(limit = 50): Promise<Chat[]> {
  return db.chats.orderBy('updatedAt').reverse().limit(limit).toArray();
}

/**
 * Get chats by date
 */
export async function getChatsByDate(date: string): Promise<Chat[]> {
  return db.chats.where('date').equals(date).toArray();
}

/**
 * Delete a chat
 */
export async function deleteChat(id: string): Promise<void> {
  const now = Date.now();

  await db.chats.delete(id);

  // Add to sync queue
  await db.syncQueue.add({
    entityType: 'chat',
    entityId: id,
    operation: 'delete',
    createdAt: now,
    retryCount: 0,
  });
}

/**
 * Persist messages from AI SDK to a chat (called after stream completes)
 */
export async function persistChatMessages(
  chatId: string,
  messages: Array<{ id: string; role: string; content: string }>
): Promise<void> {
  const now = Date.now();
  const chatMessages: ChatMessage[] = messages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    timestamp: now,
  }));

  const existing = await db.chats.get(chatId);

  if (existing) {
    await db.chats.update(chatId, {
      messages: chatMessages,
      updatedAt: now,
      syncStatus: 'pending',
    });
  }

  // Queue for sync
  await db.syncQueue.add({
    entityType: 'chat',
    entityId: chatId,
    operation: existing ? 'update' : 'create',
    createdAt: now,
    retryCount: 0,
  });
}
