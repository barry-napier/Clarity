import { db, type Review } from '../db/schema';
import type { ReviewStage } from '../ai/prompts/review';

/**
 * Generate a unique ID for a review
 */
function generateReviewId(type: string, periodStart: number): string {
  const date = new Date(periodStart).toISOString().split('T')[0];
  const nanoid = crypto.randomUUID().slice(0, 8);
  return `review-${type}-${date}-${nanoid}`;
}

/**
 * Get the start of the current ISO week (Monday at midnight)
 */
export function getCurrentWeekStart(): number {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  // If Sunday (0), go back 6 days, otherwise go back (dayOfWeek - 1) days
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

/**
 * Get the end of the current ISO week (Sunday at 23:59:59)
 */
export function getCurrentWeekEnd(): number {
  const weekStart = new Date(getCurrentWeekStart());
  const sunday = new Date(weekStart);
  sunday.setDate(weekStart.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday.getTime();
}

/**
 * Format week period for display
 */
export function formatWeekPeriod(periodStart: number): string {
  const start = new Date(periodStart);
  const end = new Date(periodStart);
  end.setDate(start.getDate() + 6);

  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const endStr = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return `${startStr} - ${endStr}`;
}

/**
 * Create a new weekly review
 */
export async function createWeeklyReview(): Promise<Review> {
  const now = Date.now();
  const periodStart = getCurrentWeekStart();
  const periodEnd = getCurrentWeekEnd();

  const review: Review = {
    id: generateReviewId('weekly', periodStart),
    type: 'weekly',
    periodStart,
    periodEnd,
    content: '',
    insights: [],
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  };

  await db.transaction('rw', [db.reviews, db.syncQueue], async () => {
    await db.reviews.add(review);

    await db.syncQueue.add({
      entityType: 'review',
      entityId: review.id,
      operation: 'create',
      createdAt: now,
      retryCount: 0,
    });
  });

  return review;
}

/**
 * Get a review by ID
 */
export async function getReview(id: string): Promise<Review | undefined> {
  return db.reviews.get(id);
}

/**
 * Get current week's review
 */
export async function getCurrentWeekReview(): Promise<Review | undefined> {
  const weekStart = getCurrentWeekStart();
  return db.reviews
    .where('periodStart')
    .equals(weekStart)
    .and((r) => r.type === 'weekly')
    .first();
}

/**
 * Get or create current week's review
 */
export async function getOrCreateCurrentWeekReview(): Promise<Review> {
  const existing = await getCurrentWeekReview();
  if (existing) {
    return existing;
  }
  return createWeeklyReview();
}

/**
 * Update review messages for resume capability
 */
export async function updateReviewMessages(
  reviewId: string,
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string }>
): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', [db.reviews, db.syncQueue], async () => {
    await db.reviews.update(reviewId, {
      messages,
      updatedAt: now,
      syncStatus: 'pending',
    });

    await db.syncQueue.add({
      entityType: 'review',
      entityId: reviewId,
      operation: 'update',
      createdAt: now,
      retryCount: 0,
    });
  });
}

/**
 * Update review stage (for state machine persistence)
 * Note: ReviewStage is tracked in messages, this is a convenience for future use
 */
export async function updateReviewStage(
  reviewId: string,
  _stage: ReviewStage
): Promise<void> {
  // Stage is implicit in the messages, but we update the timestamp
  const now = Date.now();

  await db.transaction('rw', [db.reviews, db.syncQueue], async () => {
    await db.reviews.update(reviewId, {
      updatedAt: now,
      syncStatus: 'pending',
    });

    await db.syncQueue.add({
      entityType: 'review',
      entityId: reviewId,
      operation: 'update',
      createdAt: now,
      retryCount: 0,
    });
  });
}

/**
 * Complete a review
 */
export async function completeReview(
  reviewId: string,
  content: string,
  insights: string[]
): Promise<void> {
  const now = Date.now();

  await db.transaction('rw', [db.reviews, db.syncQueue], async () => {
    await db.reviews.update(reviewId, {
      content,
      insights,
      status: 'completed',
      completedAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    });

    await db.syncQueue.add({
      entityType: 'review',
      entityId: reviewId,
      operation: 'update',
      createdAt: now,
      retryCount: 0,
    });
  });
}

/**
 * Get past reviews
 */
export async function getPastReviews(
  type: 'weekly' | 'monthly' | 'quarterly' = 'weekly',
  limit = 10
): Promise<Review[]> {
  return db.reviews
    .where('type')
    .equals(type)
    .and((r) => r.status === 'completed')
    .reverse()
    .sortBy('periodStart')
    .then((reviews) => reviews.slice(0, limit));
}

/**
 * Format check-ins for review context
 */
export async function formatWeekCheckinsForReview(): Promise<string> {
  const weekStart = getCurrentWeekStart();
  const weekStartDate = new Date(weekStart).toISOString().split('T')[0];

  const checkins = await db.checkins
    .where('date')
    .aboveOrEqual(weekStartDate)
    .and((c) => c.status === 'complete')
    .toArray();

  if (checkins.length === 0) {
    return 'No check-ins this week.';
  }

  return checkins
    .map((checkin) => {
      const entries = checkin.entries
        .map((e) => `- ${e.type}: ${e.response}`)
        .join('\n');
      return `**${checkin.date} (${checkin.timeOfDay}):**\n${entries}`;
    })
    .join('\n\n');
}

/**
 * Format captures for review context
 */
export async function formatWeekCapturesForReview(): Promise<string> {
  const weekStart = getCurrentWeekStart();
  const weekStartDate = new Date(weekStart).toISOString().split('T')[0];

  const captures = await db.captures
    .where('date')
    .aboveOrEqual(weekStartDate)
    .toArray();

  if (captures.length === 0) {
    return 'No captures this week.';
  }

  // Group by date
  const byDate: Record<string, string[]> = {};
  captures.forEach((c) => {
    if (!byDate[c.date]) {
      byDate[c.date] = [];
    }
    byDate[c.date].push(`- ${c.content} (${c.status})`);
  });

  return Object.entries(byDate)
    .map(([date, items]) => `**${date}:**\n${items.join('\n')}`)
    .join('\n\n');
}
