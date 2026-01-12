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
 *
 * Note: This handles legacy JSON files from AppData folder.
 * New sync uses Markdown files in visible Clarity folder.
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

  // Try to hydrate from legacy AppData (JSON files)
  try {
    const files = await listAppDataFiles(accessToken);
    const captureFiles = files.filter((f) => f.name.startsWith('capture-'));

    let hydrated = 0;
    let skipped = 0;

    for (const file of captureFiles) {
      try {
        const content = await downloadFromDrive(accessToken, file.id);
        const capture = JSON.parse(content) as Capture;

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
  } catch (error) {
    // AppData might not have any files, that's okay
    console.log('[Hydrate] No legacy AppData files found:', error);
    return { hydrated: 0, skipped: 0 };
  }
}
