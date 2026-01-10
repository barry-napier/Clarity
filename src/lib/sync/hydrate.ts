import { db, type Capture } from '../db/schema';
import { listAppDataFiles, downloadFromDrive } from './drive';
import { getValidAccessToken } from '../token-service';

/**
 * Check if this is a fresh install (no local captures)
 */
async function isFirstLaunch(): Promise<boolean> {
  const count = await db.captures.count();
  return count === 0;
}

/**
 * Hydrate local database from Google Drive
 * Called on app launch to sync data from Drive to local Dexie
 */
export async function hydrateFromDrive(): Promise<{
  hydrated: number;
  skipped: number;
}> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return { hydrated: 0, skipped: 0 };
  }

  // Only full hydrate on first launch; otherwise rely on incremental sync
  const firstLaunch = await isFirstLaunch();
  if (!firstLaunch) {
    return { hydrated: 0, skipped: 0 };
  }

  const files = await listAppDataFiles(accessToken);
  const captureFiles = files.filter((f) => f.name.startsWith('capture-'));

  let hydrated = 0;
  let skipped = 0;

  for (const file of captureFiles) {
    try {
      const capture = await downloadFromDrive<Capture>(accessToken, file.id);

      // Check if we already have this capture locally
      const existing = await db.captures.get(capture.id);
      if (existing) {
        // Keep the more recently updated version
        if (capture.updatedAt > existing.updatedAt) {
          await db.captures.put({
            ...capture,
            driveFileId: file.id,
            syncStatus: 'synced',
          });
          hydrated++;
        } else {
          skipped++;
        }
      } else {
        // New capture from Drive
        await db.captures.put({
          ...capture,
          driveFileId: file.id,
          syncStatus: 'synced',
        });
        hydrated++;
      }
    } catch (error) {
      console.error(`Failed to hydrate capture from ${file.name}:`, error);
      skipped++;
    }
  }

  return { hydrated, skipped };
}
