import { db } from '../db/schema';
import { listClarityFiles, downloadFromDrive, listAppDataFiles } from './drive';
import { getValidAccessToken } from '../token-service';
import { parseCaptures, parseCheckin, parseMemory, parseNorthstar } from './markdown';

/**
 * Check if this is a fresh install (no local data)
 */
async function isFirstLaunch(): Promise<boolean> {
  const captureCount = await db.captures.count();
  const checkinCount = await db.checkins.count();
  return captureCount === 0 && checkinCount === 0;
}

/**
 * Hydrate local database from Google Drive
 * Called on app launch to sync data from Drive to local Dexie
 *
 * Reads from visible Clarity folder (Markdown files)
 * Falls back to legacy AppData folder (JSON files) for migration
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
    console.log('[Hydrate] Not first launch, skipping hydration');
    return { hydrated: 0, skipped: 0 };
  }

  console.log('[Hydrate] First launch detected, hydrating from Drive...');

  let hydrated = 0;
  let skipped = 0;

  // Try to hydrate from Clarity folder (new markdown format)
  try {
    // Hydrate memory.md
    const rootFiles = await listClarityFiles(accessToken);
    const memoryFile = rootFiles.find((f) => f.name === 'memory.md');
    if (memoryFile) {
      const content = await downloadFromDrive(accessToken, memoryFile.id);
      const memory = parseMemory(content, memoryFile.id);
      await db.memory.put(memory);
      hydrated++;
      console.log('[Hydrate] Restored memory.md');
    }

    // Hydrate northstar.md
    const northstarFile = rootFiles.find((f) => f.name === 'northstar.md');
    if (northstarFile) {
      const content = await downloadFromDrive(accessToken, northstarFile.id);
      const northstar = parseNorthstar(content, northstarFile.id);
      await db.northstar.put(northstar);
      hydrated++;
      console.log('[Hydrate] Restored northstar.md');
    }

    // Hydrate captures folder
    try {
      const captureFiles = await listClarityFiles(accessToken, 'captures');
      for (const file of captureFiles) {
        if (!file.name.endsWith('.md')) continue;
        try {
          const content = await downloadFromDrive(accessToken, file.id);
          const date = file.name.replace('.md', '');
          const captures = parseCaptures(content, date, file.id);
          for (const capture of captures) {
            await db.captures.put(capture);
            hydrated++;
          }
          console.log(`[Hydrate] Restored ${captures.length} captures from ${file.name}`);
        } catch (error) {
          console.error(`[Hydrate] Failed to parse ${file.name}:`, error);
          skipped++;
        }
      }
    } catch (error) {
      console.log('[Hydrate] No captures folder found');
    }

    // Hydrate checkins folder
    try {
      const checkinFiles = await listClarityFiles(accessToken, 'checkins');
      for (const file of checkinFiles) {
        if (!file.name.endsWith('.md')) continue;
        try {
          const content = await downloadFromDrive(accessToken, file.id);
          // Parse filename: YYYY-MM-DD-morning.md or YYYY-MM-DD-evening.md
          const match = file.name.match(/^(\d{4}-\d{2}-\d{2})-(morning|evening)\.md$/);
          if (!match) {
            skipped++;
            continue;
          }
          const [, date, timeOfDay] = match;
          const checkin = parseCheckin(
            content,
            date,
            timeOfDay as 'morning' | 'evening',
            file.id
          );
          if (checkin) {
            await db.checkins.put(checkin);
            hydrated++;
            console.log(`[Hydrate] Restored checkin ${file.name}`);
          }
        } catch (error) {
          console.error(`[Hydrate] Failed to parse ${file.name}:`, error);
          skipped++;
        }
      }
    } catch (error) {
      console.log('[Hydrate] No checkins folder found');
    }

    console.log(`[Hydrate] Complete: ${hydrated} items restored, ${skipped} skipped`);
  } catch (error) {
    console.error('[Hydrate] Error reading Clarity folder:', error);
  }

  // Also try legacy AppData folder for migration
  if (hydrated === 0) {
    try {
      console.log('[Hydrate] Trying legacy AppData folder...');
      const files = await listAppDataFiles(accessToken);
      const captureFiles = files.filter((f) => f.name.startsWith('capture-'));

      for (const file of captureFiles) {
        try {
          const content = await downloadFromDrive(accessToken, file.id);
          const capture = JSON.parse(content);

          await db.captures.put({
            ...capture,
            driveFileId: file.id,
            syncStatus: 'pending', // Mark pending to re-sync to new format
          });
          hydrated++;
        } catch (error) {
          console.error(`[Hydrate] Failed to parse legacy ${file.name}:`, error);
          skipped++;
        }
      }

      if (hydrated > 0) {
        console.log(`[Hydrate] Migrated ${hydrated} items from legacy AppData`);
      }
    } catch (error) {
      console.log('[Hydrate] No legacy AppData files found');
    }
  }

  return { hydrated, skipped };
}
