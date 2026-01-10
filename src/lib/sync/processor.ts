import {
  db,
  type SyncQueueItem,
  type Syncable,
  type SyncEntityType,
} from '../db/schema';
import { uploadToAppFolder, deleteFromDrive } from './drive';
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

  const fileName = `${item.entityType}-${item.entityId}.json`;
  const driveFileId = await uploadToAppFolder(
    accessToken,
    fileName,
    entity,
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
  };

  return tables[entityType];
}
