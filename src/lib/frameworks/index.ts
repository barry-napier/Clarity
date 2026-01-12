import { db, type FrameworkSession, type FrameworkEntry } from '../db/schema';

/**
 * Generate a unique ID for a framework session
 */
function generateSessionId(frameworkType: string): string {
  const timestamp = Date.now();
  const nanoid = crypto.randomUUID().slice(0, 8);
  return `fs-${frameworkType}-${timestamp}-${nanoid}`;
}

/**
 * Create a new framework session
 */
export async function createFrameworkSession(
  frameworkType: string
): Promise<FrameworkSession> {
  const now = Date.now();
  const session: FrameworkSession = {
    id: generateSessionId(frameworkType),
    frameworkType,
    status: 'in_progress',
    stage: 0,
    entries: [],
    startedAt: now,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  };

  await db.transaction('rw', [db.frameworkSessions, db.syncQueue], async () => {
    await db.frameworkSessions.add(session);

    await db.syncQueue.add({
      entityType: 'frameworkSession',
      entityId: session.id,
      operation: 'create',
      createdAt: now,
      retryCount: 0,
    });
  });

  return session;
}

/**
 * Get a framework session by ID
 */
export async function getFrameworkSession(
  id: string
): Promise<FrameworkSession | undefined> {
  return db.frameworkSessions.get(id);
}

/**
 * Get in-progress session for a framework type
 */
export async function getInProgressSession(
  frameworkType: string
): Promise<FrameworkSession | undefined> {
  return db.frameworkSessions
    .where('frameworkType')
    .equals(frameworkType)
    .and((session) => session.status === 'in_progress')
    .first();
}

/**
 * Get or create a session for a framework
 * Returns existing in_progress session or creates a new one
 */
export async function getOrCreateFrameworkSession(
  frameworkType: string
): Promise<FrameworkSession> {
  const existing = await getInProgressSession(frameworkType);
  if (existing) {
    return existing;
  }
  return createFrameworkSession(frameworkType);
}

/**
 * Add an entry to a framework session
 */
export async function addFrameworkEntry(
  sessionId: string,
  entry: FrameworkEntry
): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', [db.frameworkSessions, db.syncQueue], async () => {
    const updated = await db.frameworkSessions
      .where('id')
      .equals(sessionId)
      .modify((session) => {
        session.entries.push(entry);
        session.updatedAt = now;
        session.syncStatus = 'pending';
      });

    if (updated === 0) {
      throw new Error(`Framework session ${sessionId} not found`);
    }

    await db.syncQueue.add({
      entityType: 'frameworkSession',
      entityId: sessionId,
      operation: 'update',
      createdAt: now,
      retryCount: 0,
    });
  });
}

/**
 * Update the session stage
 */
export async function updateSessionStage(
  sessionId: string,
  stage: number
): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', [db.frameworkSessions, db.syncQueue], async () => {
    await db.frameworkSessions.update(sessionId, {
      stage,
      updatedAt: now,
      syncStatus: 'pending',
    });

    await db.syncQueue.add({
      entityType: 'frameworkSession',
      entityId: sessionId,
      operation: 'update',
      createdAt: now,
      retryCount: 0,
    });
  });
}

/**
 * Update session messages for resume capability
 */
export async function updateSessionMessages(
  sessionId: string,
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string }>
): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', [db.frameworkSessions, db.syncQueue], async () => {
    await db.frameworkSessions.update(sessionId, {
      messages,
      updatedAt: now,
      syncStatus: 'pending',
    });

    await db.syncQueue.add({
      entityType: 'frameworkSession',
      entityId: sessionId,
      operation: 'update',
      createdAt: now,
      retryCount: 0,
    });
  });
}

/**
 * Complete a framework session
 */
export async function completeFrameworkSession(
  sessionId: string,
  insights?: string
): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', [db.frameworkSessions, db.syncQueue], async () => {
    await db.frameworkSessions.update(sessionId, {
      status: 'completed',
      completedAt: now,
      insights,
      updatedAt: now,
      syncStatus: 'pending',
    });

    await db.syncQueue.add({
      entityType: 'frameworkSession',
      entityId: sessionId,
      operation: 'update',
      createdAt: now,
      retryCount: 0,
    });
  });
}

/**
 * Abandon a framework session
 */
export async function abandonFrameworkSession(sessionId: string): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', [db.frameworkSessions, db.syncQueue], async () => {
    await db.frameworkSessions.update(sessionId, {
      status: 'abandoned',
      updatedAt: now,
      syncStatus: 'pending',
    });

    await db.syncQueue.add({
      entityType: 'frameworkSession',
      entityId: sessionId,
      operation: 'update',
      createdAt: now,
      retryCount: 0,
    });
  });
}

/**
 * Get completed sessions for a framework
 */
export async function getCompletedSessions(
  frameworkType: string,
  limit = 10
): Promise<FrameworkSession[]> {
  return db.frameworkSessions
    .where('frameworkType')
    .equals(frameworkType)
    .and((session) => session.status === 'completed')
    .reverse()
    .sortBy('completedAt')
    .then((sessions) => sessions.slice(0, limit));
}

/**
 * Get the most recent completed session for a framework
 */
export async function getLastCompletedSession(
  frameworkType: string
): Promise<FrameworkSession | undefined> {
  const sessions = await getCompletedSessions(frameworkType, 1);
  return sessions[0];
}
