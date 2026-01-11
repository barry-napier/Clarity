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
    () => db.checkins.where('date').equals(today).first(),
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

export function usePendingSyncCount() {
  return useLiveQuery(() => db.syncQueue.count());
}
