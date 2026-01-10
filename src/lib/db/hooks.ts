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

export function useChat(date: string) {
  return useLiveQuery(
    () => db.chats.where('date').equals(date).first(),
    [date]
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
