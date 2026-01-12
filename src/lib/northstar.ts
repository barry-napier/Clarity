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
    await db.northstar.update('main', {
      content,
      updatedAt: now,
    });

    return {
      ...existing,
      content,
      updatedAt: now,
    };
  }

  // Create new
  const northstar: Northstar = {
    id: 'main',
    key: 'main',
    content,
    createdAt: now,
    updatedAt: now,
  };

  await db.northstar.add(northstar);

  return northstar;
}

/**
 * Check if user has defined a North Star
 */
export async function hasNorthstar(): Promise<boolean> {
  const northstar = await db.northstar.get('main');
  return Boolean(northstar?.content);
}
