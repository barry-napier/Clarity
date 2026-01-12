import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema';

export function useCaptures(date?: string) {
  return useLiveQuery(() => {
    if (date) {
      return db.captures.where('date').equals(date).toArray();
    }
    return db.captures.orderBy('updatedAt').reverse().limit(50).toArray();
  }, [date]);
}

export function useCheckin(date: string) {
  return useLiveQuery(
    () => db.checkins.where('date').equals(date).first(),
    [date]
  );
}

/**
 * Get today's check-in with live updates
 * Returns undefined while loading, null if none exists
 */
export function useTodayCheckin() {
  const today = new Date().toISOString().split('T')[0];
  return useLiveQuery(
    async () => {
      const checkin = await db.checkins.where('date').equals(today).first();
      return checkin ?? null; // Explicit null for "no record" to distinguish from "loading"
    },
    []
  );
}

/**
 * Get recent check-ins (past 7 days) with live updates
 */
export function useRecentCheckins(limit = 7) {
  return useLiveQuery(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoDate = weekAgo.toISOString().split('T')[0];

    return db.checkins
      .where('date')
      .aboveOrEqual(weekAgoDate)
      .reverse()
      .limit(limit)
      .toArray();
  }, [limit]);
}

export function useChat(date: string) {
  return useLiveQuery(
    () => db.chats.where('date').equals(date).first(),
    [date]
  );
}

export function useChatById(id: string | undefined) {
  return useLiveQuery(
    () => (id ? db.chats.get(id) : undefined),
    [id]
  );
}

export function useChatHistory(limit = 50) {
  return useLiveQuery(
    () => db.chats.orderBy('updatedAt').reverse().limit(limit).toArray(),
    [limit]
  );
}

export function useLatestChat() {
  return useLiveQuery(
    () => db.chats.orderBy('updatedAt').reverse().first()
  );
}

export function useMemory() {
  return useLiveQuery(() => db.memory.get('main'));
}

export function useNorthstar() {
  return useLiveQuery(() => db.northstar.get('main'));
}

export function useFrameworks(type?: string) {
  return useLiveQuery(() => {
    if (type) {
      return db.frameworks.where('type').equals(type).toArray();
    }
    return db.frameworks.toArray();
  }, [type]);
}

export function useFrameworkSession(id: string | undefined) {
  return useLiveQuery(
    () => (id ? db.frameworkSessions.get(id) : undefined),
    [id]
  );
}

export function useFrameworkSessions(frameworkType?: string) {
  return useLiveQuery(() => {
    if (frameworkType) {
      return db.frameworkSessions
        .where('frameworkType')
        .equals(frameworkType)
        .toArray();
    }
    return db.frameworkSessions.orderBy('updatedAt').reverse().toArray();
  }, [frameworkType]);
}

export function useInProgressFrameworkSession(frameworkType: string) {
  return useLiveQuery(
    () =>
      db.frameworkSessions
        .where('frameworkType')
        .equals(frameworkType)
        .and((session) => session.status === 'in_progress')
        .first(),
    [frameworkType]
  );
}

export function useReview(id: string | undefined) {
  return useLiveQuery(
    () => (id ? db.reviews.get(id) : undefined),
    [id]
  );
}

export function useReviews(type?: 'weekly' | 'monthly' | 'quarterly') {
  return useLiveQuery(() => {
    if (type) {
      return db.reviews.where('type').equals(type).reverse().sortBy('periodStart');
    }
    return db.reviews.orderBy('periodStart').reverse().toArray();
  }, [type]);
}

export function useCurrentWeekReview() {
  return useLiveQuery(async () => {
    // Get current week's Monday at midnight
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const weekStart = monday.getTime();

    return db.reviews
      .where('periodStart')
      .equals(weekStart)
      .and((review) => review.type === 'weekly')
      .first();
  }, []);
}
