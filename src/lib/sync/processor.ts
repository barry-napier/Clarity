import {
  db,
  type Syncable,
  type SyncEntityType,
  type Capture,
} from '../db/schema';
import { uploadMarkdownFile, deleteFromDrive } from './drive';
import { entityToMarkdown, getMarkdownFilename, capturesToMarkdown } from './markdown';
import { getValidAccessToken } from '../token-service';
import type { EntityTable } from 'dexie';

/**
 * Process sync by scanning all entities and comparing timestamps
 * Entities where updatedAt > lastSyncedAt need to be uploaded
 */
export async function processSyncQueue(): Promise<{
  processed: number;
  failed: number;
}> {
  console.log('[Sync] Starting sync process...');
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    console.log('[Sync] No access token, skipping sync');
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  // Process each entity type
  const entityTypes: SyncEntityType[] = [
    'memory',
    'northstar',
    'capture',
    'checkin',
    'chat',
    'framework',
    'frameworkSession',
    'review',
  ];

  for (const entityType of entityTypes) {
    try {
      if (entityType === 'capture') {
        // Special handling: aggregate captures by date
        const result = await syncCaptures(accessToken);
        processed += result.processed;
        failed += result.failed;
      } else {
        const result = await syncEntityType(accessToken, entityType);
        processed += result.processed;
        failed += result.failed;
      }
    } catch (error) {
      console.error(`[Sync] Error processing ${entityType}:`, error);
      failed++;
    }
  }

  return { processed, failed };
}

/**
 * Sync a single entity type by scanning for dirty records
 */
async function syncEntityType(
  accessToken: string,
  entityType: SyncEntityType
): Promise<{ processed: number; failed: number }> {
  const table = getTable(entityType);
  const entities = await table.toArray();

  let processed = 0;
  let failed = 0;

  for (const entity of entities) {
    // Check if entity needs sync: no lastSyncedAt, or updatedAt is newer
    const needsSync = !entity.lastSyncedAt || entity.updatedAt > entity.lastSyncedAt;

    if (!needsSync) continue;

    try {
      // Convert entity to markdown
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markdown = entityToMarkdown(entityType, entity as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { folder, filename } = getMarkdownFilename(entityType, entity as any);

      // Upload to Drive
      const driveFileId = await uploadMarkdownFile(
        accessToken,
        filename,
        markdown,
        folder || undefined,
        entity.driveFileId
      );

      // Update entity with sync info
      await table.update(entity.id, {
        driveFileId,
        lastSyncedAt: Date.now(),
      });

      processed++;
      console.log(`[Sync] Uploaded ${entityType}: ${filename}`);
    } catch (error) {
      console.error(`[Sync] Failed to sync ${entityType} ${entity.id}:`, error);
      failed++;
    }
  }

  return { processed, failed };
}

/**
 * Special handling for captures: aggregate by date into single files
 */
async function syncCaptures(
  accessToken: string
): Promise<{ processed: number; failed: number }> {
  // Get all captures that need sync
  const allCaptures = await db.captures.toArray();
  console.log(`[Sync] Found ${allCaptures.length} captures total`);

  // Group by date
  const capturesByDate = new Map<string, Capture[]>();
  for (const capture of allCaptures) {
    const existing = capturesByDate.get(capture.date) || [];
    existing.push(capture);
    capturesByDate.set(capture.date, existing);
  }

  let processed = 0;
  let failed = 0;

  // For each date, check if any capture needs sync
  for (const [date, captures] of capturesByDate) {
    const needsSync = captures.some(
      (c) => !c.lastSyncedAt || c.updatedAt > c.lastSyncedAt
    );
    console.log(`[Sync] Captures for ${date}: ${captures.length} items, needsSync=${needsSync}`,
      captures.map(c => ({ id: c.id, updatedAt: c.updatedAt, lastSyncedAt: c.lastSyncedAt })));

    if (!needsSync) continue;

    try {
      // Generate markdown for all captures on this date
      const markdown = capturesToMarkdown(captures, date);
      const filename = `${date}.md`;

      // Find existing driveFileId from any capture for this date
      const existingFileId = captures.find((c) => c.driveFileId)?.driveFileId;

      // Upload to Drive
      const driveFileId = await uploadMarkdownFile(
        accessToken,
        filename,
        markdown,
        'captures',
        existingFileId
      );

      // Update ALL captures for this date with the shared driveFileId and lastSyncedAt
      const now = Date.now();
      for (const capture of captures) {
        await db.captures.update(capture.id, {
          driveFileId,
          lastSyncedAt: now,
        });
      }

      processed++;
      console.log(`[Sync] Uploaded captures for ${date} (${captures.length} items)`);
    } catch (error) {
      console.error(`[Sync] Failed to sync captures for ${date}:`, error);
      failed++;
    }
  }

  return { processed, failed };
}

/**
 * Handle deletion of entities from Drive
 * Called when we detect an entity was deleted locally but still has a driveFileId
 */
export async function syncDeletion(
  accessToken: string,
  driveFileId: string
): Promise<void> {
  try {
    await deleteFromDrive(accessToken, driveFileId);
    console.log(`[Sync] Deleted file from Drive: ${driveFileId}`);
  } catch (error) {
    console.error(`[Sync] Failed to delete from Drive:`, error);
  }
}

// Type-safe table accessor using Dexie's EntityTable type
type SyncableTable = EntityTable<Syncable, 'id'>;

function getTable(entityType: SyncEntityType): SyncableTable {
  const tables: Record<SyncEntityType, SyncableTable> = {
    capture: db.captures,
    checkin: db.checkins,
    chat: db.chats,
    memory: db.memory,
    northstar: db.northstar,
    framework: db.frameworks,
    frameworkSession: db.frameworkSessions,
    review: db.reviews,
  };

  return tables[entityType];
}
