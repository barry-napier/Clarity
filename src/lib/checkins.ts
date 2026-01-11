import { db, type Checkin, type CheckinEntry, type CheckinStage } from './db/schema';

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate a unique ID for a check-in
 * Format: checkin-YYYY-MM-DD-nanoid
 */
function generateCheckinId(): string {
  const date = getTodayDate();
  const nanoid = crypto.randomUUID().slice(0, 8);
  return `checkin-${date}-${nanoid}`;
}

/**
 * Determine time of day based on current hour
 */
function getTimeOfDay(): 'morning' | 'evening' {
  const hour = new Date().getHours();
  return hour < 12 ? 'morning' : 'evening';
}

/**
 * Get today's check-in or create a new one if none exists
 * If there's an in_progress check-in from today, return it
 * If there's a completed check-in, return it
 * Otherwise create a new one
 */
export async function getOrCreateTodayCheckin(): Promise<Checkin> {
  const today = getTodayDate();

  // Look for existing check-in today
  const existing = await db.checkins.where('date').equals(today).first();

  if (existing) {
    // If in_progress, return for resume
    // If complete/skipped, still return (show summary)
    return existing;
  }

  // Create new check-in
  return createCheckin();
}

/**
 * Create a new check-in for today
 */
export async function createCheckin(): Promise<Checkin> {
  const now = Date.now();
  const checkin: Checkin = {
    id: generateCheckinId(),
    date: getTodayDate(),
    timeOfDay: getTimeOfDay(),
    status: 'in_progress',
    stage: 'idle',
    entries: [],
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  };

  await db.checkins.add(checkin);

  // Add to sync queue
  await db.syncQueue.add({
    entityType: 'checkin',
    entityId: checkin.id,
    operation: 'create',
    createdAt: now,
    retryCount: 0,
  });

  return checkin;
}

/**
 * Get a check-in by ID
 */
export async function getCheckinById(id: string): Promise<Checkin | undefined> {
  return db.checkins.get(id);
}

/**
 * Add an entry to a check-in
 */
export async function addCheckinEntry(
  checkinId: string,
  entry: CheckinEntry
): Promise<void> {
  const now = Date.now();
  const checkin = await db.checkins.get(checkinId);

  if (!checkin) {
    throw new Error(`Checkin ${checkinId} not found`);
  }

  await db.checkins.update(checkinId, {
    entries: [...checkin.entries, entry],
    updatedAt: now,
    syncStatus: 'pending',
  });

  // Queue for sync
  await db.syncQueue.add({
    entityType: 'checkin',
    entityId: checkinId,
    operation: 'update',
    createdAt: now,
    retryCount: 0,
  });
}

/**
 * Update the check-in stage (for state machine persistence)
 */
export async function updateCheckinStage(
  checkinId: string,
  stage: CheckinStage
): Promise<void> {
  const now = Date.now();

  await db.checkins.update(checkinId, {
    stage,
    updatedAt: now,
    syncStatus: 'pending',
  });

  // Queue for sync
  await db.syncQueue.add({
    entityType: 'checkin',
    entityId: checkinId,
    operation: 'update',
    createdAt: now,
    retryCount: 0,
  });
}

/**
 * Complete a check-in
 */
export async function completeCheckin(checkinId: string): Promise<void> {
  const now = Date.now();

  await db.checkins.update(checkinId, {
    status: 'complete',
    stage: 'complete',
    completedAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  });

  // Queue for sync
  await db.syncQueue.add({
    entityType: 'checkin',
    entityId: checkinId,
    operation: 'update',
    createdAt: now,
    retryCount: 0,
  });
}

/**
 * Skip today's check-in
 */
export async function skipCheckin(checkinId: string): Promise<void> {
  const now = Date.now();

  await db.checkins.update(checkinId, {
    status: 'skipped',
    stage: 'complete',
    updatedAt: now,
    syncStatus: 'pending',
  });

  // Queue for sync
  await db.syncQueue.add({
    entityType: 'checkin',
    entityId: checkinId,
    operation: 'update',
    createdAt: now,
    retryCount: 0,
  });
}

/**
 * Get recent check-ins for context
 * Returns check-ins from the past 7 days
 */
export async function getRecentCheckins(limit = 7): Promise<Checkin[]> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoDate = weekAgo.toISOString().split('T')[0];

  return db.checkins
    .where('date')
    .aboveOrEqual(weekAgoDate)
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Get the most recent completed check-in
 */
export async function getLastCompletedCheckin(): Promise<Checkin | undefined> {
  return db.checkins
    .where('status')
    .equals('complete')
    .reverse()
    .first();
}

/**
 * Calculate days since last check-in
 */
export async function getDaysSinceLastCheckin(): Promise<number | null> {
  const last = await getLastCompletedCheckin();
  if (!last) return null;

  const lastDate = new Date(last.date);
  const today = new Date(getTodayDate());
  const diffTime = today.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Format recent check-ins for AI context
 */
export async function formatRecentCheckinsForContext(): Promise<string> {
  const recent = await getRecentCheckins(5);

  if (recent.length === 0) {
    return 'No recent check-ins.';
  }

  return recent
    .filter((c) => c.status === 'complete')
    .map((checkin) => {
      const entries = checkin.entries
        .map((e) => `- ${e.type}: ${e.response}`)
        .join('\n');
      return `**${checkin.date}:**\n${entries}`;
    })
    .join('\n\n');
}
