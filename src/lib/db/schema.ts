import Dexie, { type EntityTable } from 'dexie';

export interface Syncable {
  id: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  driveFileId?: string;
}

export interface Capture extends Syncable {
  content: string;
  date: string; // YYYY-MM-DD
}

export interface CheckinEntry {
  type: 'emotion' | 'highlight' | 'challenge' | 'looking_forward';
  content: string;
  timestamp: number;
}

export interface Checkin extends Syncable {
  date: string; // YYYY-MM-DD
  entries: CheckinEntry[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Chat extends Syncable {
  date: string;
  messages: ChatMessage[];
}

export interface Memory extends Syncable {
  key: 'main';
  content: string;
}

export interface Northstar extends Syncable {
  key: 'main';
  content: string;
}

export interface Framework extends Syncable {
  type: string;
  name: string;
  content: string;
}

// Entity types for sync queue
export type SyncEntityType =
  | 'capture'
  | 'checkin'
  | 'chat'
  | 'memory'
  | 'northstar'
  | 'framework';

export type SyncOperation = 'create' | 'update' | 'delete';

// Type for creating a new sync queue item (ID not yet assigned)
export interface NewSyncQueueItem {
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  createdAt: number;
  retryCount: number;
}

// Type for a persisted sync queue item (ID is always present after DB retrieval)
export interface SyncQueueItem extends NewSyncQueueItem {
  id: number;
}

// Legacy type for backward compatibility with Dexie (allows optional id for add())
export interface SyncQueueItemRecord {
  id?: number;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  createdAt: number;
  retryCount: number;
}

export class ClarityDB extends Dexie {
  captures!: EntityTable<Capture, 'id'>;
  checkins!: EntityTable<Checkin, 'id'>;
  chats!: EntityTable<Chat, 'id'>;
  memory!: EntityTable<Memory, 'id'>;
  northstar!: EntityTable<Northstar, 'id'>;
  frameworks!: EntityTable<Framework, 'id'>;
  syncQueue!: EntityTable<SyncQueueItemRecord, 'id'>;

  constructor() {
    super('ClarityDB');

    this.version(1).stores({
      captures: 'id, date, syncStatus, updatedAt',
      checkins: 'id, date, syncStatus, updatedAt',
      chats: 'id, date, syncStatus, updatedAt',
      memory: 'id, syncStatus, updatedAt',
      northstar: 'id, syncStatus, updatedAt',
      frameworks: 'id, type, syncStatus, updatedAt',
      syncQueue: '++id, entityType, entityId, createdAt',
    });
  }
}

export const db = new ClarityDB();
