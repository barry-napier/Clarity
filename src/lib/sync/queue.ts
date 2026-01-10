import {
  db,
  type SyncQueueItem,
  type SyncEntityType,
  type SyncOperation,
} from '../db/schema';

export async function enqueueSync(
  entityType: SyncEntityType,
  entityId: string,
  operation: SyncOperation
): Promise<void> {
  // Check if there's already a pending operation for this entity
  const existing = await db.syncQueue
    .where('entityId')
    .equals(entityId)
    .first();

  if (existing && existing.id !== undefined) {
    // If we're deleting, update the operation to delete
    if (operation === 'delete') {
      await db.syncQueue.update(existing.id, { operation: 'delete' });
    }
    // Otherwise, keep the existing operation (create stays create, update stays update)
    return;
  }

  await db.syncQueue.add({
    entityType,
    entityId,
    operation,
    createdAt: Date.now(),
    retryCount: 0,
  });
}

export async function getQueuedItems(): Promise<SyncQueueItem[]> {
  const items = await db.syncQueue.orderBy('createdAt').toArray();
  // Filter to only items with valid IDs (should always be the case after DB retrieval)
  return items.filter((item): item is SyncQueueItem => item.id !== undefined);
}

export async function removeFromQueue(id: number): Promise<void> {
  await db.syncQueue.delete(id);
}

export async function incrementRetry(id: number): Promise<void> {
  const item = await db.syncQueue.get(id);
  if (item) {
    await db.syncQueue.update(id, { retryCount: item.retryCount + 1 });
  }
}

export async function getQueueLength(): Promise<number> {
  return db.syncQueue.count();
}
