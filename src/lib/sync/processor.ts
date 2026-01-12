import {
  db,
  type SyncQueueItem,
  type Syncable,
  type SyncEntityType,
  type Capture,
} from '../db/schema';
import { uploadMarkdownFile, deleteFromDrive } from './drive';
import { entityToMarkdown, getMarkdownFilename, capturesToMarkdown } from './markdown';
import { getValidAccessToken } from '../token-service';
import { getQueuedItems, removeFromQueue, incrementRetry } from './queue';
import type { EntityTable } from 'dexie';

const MAX_RETRIES = 3;

export async function processSyncQueue(): Promise<{
  processed: number;
  failed: number;
}> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return { processed: 0, failed: 0 };
  }

  const items = await getQueuedItems();
  let processed = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await processQueueItem(item, accessToken);
      await removeFromQueue(item.id);
      processed++;
    } catch (error) {
      console.error('Sync failed for item:', item, error);

      if (item.retryCount >= MAX_RETRIES) {
        console.error('Max retries exceeded, removing from queue:', item);
        await removeFromQueue(item.id);
        await markEntityError(item);
        failed++;
      } else {
        await incrementRetry(item.id);
      }
    }
  }

  return { processed, failed };
}

async function processQueueItem(
  item: SyncQueueItem,
  accessToken: string
): Promise<void> {
  const table = getTable(item.entityType);
  const entity = await table.get(item.entityId);

  if (item.operation === 'delete') {
    if (entity?.driveFileId) {
      await deleteFromDrive(accessToken, entity.driveFileId);
    }
    return;
  }

  if (!entity) {
    // Entity was deleted locally before sync
    return;
  }

  // Special handling for captures: aggregate all captures for the same date
  if (item.entityType === 'capture') {
    const capture = entity as unknown as Capture;
    const allCapturesForDate = await db.captures
      .where('date')
      .equals(capture.date)
      .toArray();

    const markdown = capturesToMarkdown(allCapturesForDate, capture.date);
    const filename = `${capture.date}.md`;

    // Find existing driveFileId from any capture for this date
    const existingFileId = allCapturesForDate.find((c) => c.driveFileId)?.driveFileId;

    const driveFileId = await uploadMarkdownFile(
      accessToken,
      filename,
      markdown,
      'captures',
      existingFileId
    );

    // Update all captures for this date with the shared driveFileId
    for (const c of allCapturesForDate) {
      await db.captures.update(c.id, {
        driveFileId,
        syncStatus: 'synced',
      });
    }
    return;
  }

  // Convert entity to markdown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markdown = entityToMarkdown(item.entityType, entity as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { folder, filename } = getMarkdownFilename(item.entityType, entity as any);

  // Upload to visible Clarity folder
  const driveFileId = await uploadMarkdownFile(
    accessToken,
    filename,
    markdown,
    folder || undefined,
    entity.driveFileId
  );

  await table.update(item.entityId, {
    driveFileId,
    syncStatus: 'synced',
  });
}

async function markEntityError(item: SyncQueueItem): Promise<void> {
  const table = getTable(item.entityType);
  const entity = await table.get(item.entityId);
  if (entity) {
    await table.update(item.entityId, { syncStatus: 'error' });
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
