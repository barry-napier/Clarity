import type { Syncable } from './schema';

export function generateId(): string {
  return crypto.randomUUID();
}

export function createSyncable<T extends Syncable>(
  data: Omit<T, keyof Syncable>
): T {
  const now = Date.now();
  return {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  } as T;
}

export function updateSyncable<T extends Syncable>(
  entity: T,
  updates: Partial<Omit<T, keyof Syncable>>
): T {
  return {
    ...entity,
    ...updates,
    updatedAt: Date.now(),
  };
}
