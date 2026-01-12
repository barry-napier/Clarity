import { db, type Northstar } from './db/schema';

/**
 * Get the user's North Star
 * Returns undefined if not yet created
 */
export async function getNorthstar(): Promise<Northstar | undefined> {
  return db.northstar.get('main');
}

/**
 * Create or update the user's North Star
 * Uses 'main' as the key since there's only one North Star per user
 */
export async function saveNorthstar(content: string): Promise<Northstar> {
  const now = Date.now();
  const existing = await db.northstar.get('main');

  if (existing) {
    // Update existing
    await db.transaction('rw', [db.northstar, db.syncQueue], async () => {
      await db.northstar.update('main', {
        content,
        updatedAt: now,
        syncStatus: 'pending',
      });

      await db.syncQueue.add({
        entityType: 'northstar',
        entityId: 'main',
        operation: 'update',
        createdAt: now,
        retryCount: 0,
      });
    });

    return {
      ...existing,
      content,
      updatedAt: now,
      syncStatus: 'pending',
    };
  }

  // Create new
  const northstar: Northstar = {
    id: 'main',
    key: 'main',
    content,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  };

  await db.transaction('rw', [db.northstar, db.syncQueue], async () => {
    await db.northstar.add(northstar);

    await db.syncQueue.add({
      entityType: 'northstar',
      entityId: 'main',
      operation: 'create',
      createdAt: now,
      retryCount: 0,
    });
  });

  return northstar;
}

/**
 * Check if user has defined a North Star
 */
export async function hasNorthstar(): Promise<boolean> {
  const northstar = await db.northstar.get('main');
  return Boolean(northstar?.content);
}
