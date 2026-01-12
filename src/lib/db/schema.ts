import Dexie, { type EntityTable } from 'dexie';

export interface Syncable {
  id: string;
  createdAt: number;
  updatedAt: number;
  lastSyncedAt?: number; // Timestamp of last successful sync to Drive
  driveFileId?: string;
}

export interface Capture extends Syncable {
  content: string;
  date: string; // YYYY-MM-DD
  status: 'new' | 'done';
}

export interface CheckinEntry {
  type: 'energy' | 'wins' | 'friction' | 'priority';
  question: string; // AI's question
  response: string; // User's response
  followUp?: string; // AI's follow-up (if terse response)
  followUpResponse?: string;
  timestamp: number;
}

export type CheckinStage =
  | 'idle'
  | 'awaiting_energy'
  | 'awaiting_wins'
  | 'awaiting_friction'
  | 'awaiting_priority'
  | 'complete';

/** Lightweight message type for check-in conversation history */
export interface CheckinMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface Checkin extends Syncable {
  date: string; // YYYY-MM-DD
  timeOfDay: 'morning' | 'evening';
  status: 'in_progress' | 'complete' | 'skipped';
  stage: CheckinStage; // Persisted for resume
  entries: CheckinEntry[];
  messages?: CheckinMessage[]; // Conversation history for resume
  completedAt?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Chat extends Syncable {
  date: string;
  messages: ChatMessage[];
  memorySnapshot?: string; // Memory state at session start
}

export interface Memory extends Syncable {
  key: 'main';
  content: string;
  version?: number; // Increment on each update
  tokenEstimate?: number; // Approximate token count
  lastCompaction?: number; // Last summarization timestamp
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

export interface FrameworkEntry {
  stage: number;
  question: string;
  response: string;
  timestamp: number;
}

export interface FrameworkSession extends Syncable {
  frameworkType: string; // 'regret-minimization' | 'ceo-energy' | 'annual-review'
  status: 'in_progress' | 'completed' | 'abandoned';
  stage: number;
  entries: FrameworkEntry[];
  messages?: Array<{ id: string; role: 'user' | 'assistant'; content: string }>;
  startedAt: number;
  completedAt?: number;
  insights?: string; // AI-synthesized insights from session
}

export interface Review extends Syncable {
  type: 'weekly' | 'monthly' | 'quarterly';
  periodStart: number; // ISO week start (Monday) timestamp
  periodEnd: number; // ISO week end (Sunday) timestamp
  content: string; // Markdown summary
  insights: string[]; // Key patterns/observations
  status: 'draft' | 'completed';
  messages?: Array<{ id: string; role: 'user' | 'assistant'; content: string }>;
  completedAt?: number;
}

// Entity types for sync operations
export type SyncEntityType =
  | 'capture'
  | 'checkin'
  | 'chat'
  | 'memory'
  | 'northstar'
  | 'framework'
  | 'frameworkSession'
  | 'review';

// Map old v2 entry types to new v3 types
const V2_TO_V3_TYPE_MAP: Record<string, CheckinEntry['type']> = {
  emotion: 'energy',
  highlight: 'wins',
  challenge: 'friction',
  looking_forward: 'priority',
};

export class ClarityDB extends Dexie {
  captures!: EntityTable<Capture, 'id'>;
  checkins!: EntityTable<Checkin, 'id'>;
  chats!: EntityTable<Chat, 'id'>;
  memory!: EntityTable<Memory, 'id'>;
  northstar!: EntityTable<Northstar, 'id'>;
  frameworks!: EntityTable<Framework, 'id'>;
  frameworkSessions!: EntityTable<FrameworkSession, 'id'>;
  reviews!: EntityTable<Review, 'id'>;

  constructor() {
    super('ClarityDB');

    // Version 1: Initial schema
    this.version(1).stores({
      captures: 'id, date, status, syncStatus, updatedAt',
      checkins: 'id, date, syncStatus, updatedAt',
      chats: 'id, date, syncStatus, updatedAt',
      memory: 'id, syncStatus, updatedAt',
      northstar: 'id, syncStatus, updatedAt',
      frameworks: 'id, type, syncStatus, updatedAt',
      syncQueue: '++id, entityType, entityId, createdAt',
    });

    // Version 2: Added status index to checkins
    this.version(2).stores({
      captures: 'id, date, status, syncStatus, updatedAt',
      checkins: 'id, date, status, syncStatus, updatedAt',
      chats: 'id, date, syncStatus, updatedAt',
      memory: 'id, syncStatus, updatedAt',
      northstar: 'id, syncStatus, updatedAt',
      frameworks: 'id, type, syncStatus, updatedAt',
      syncQueue: '++id, entityType, entityId, createdAt',
    });

    // Version 3: Breaking changes to CheckinEntry format
    // - entry.type: emotion|highlight|challenge|looking_forward -> energy|wins|friction|priority
    // - entry.content removed, replaced with question/response fields
    // - Added: timeOfDay, status, stage fields to Checkin
    this.version(3)
      .stores({
        captures: 'id, date, status, syncStatus, updatedAt',
        checkins: 'id, date, status, syncStatus, updatedAt',
        chats: 'id, date, syncStatus, updatedAt',
        memory: 'id, syncStatus, updatedAt',
        northstar: 'id, syncStatus, updatedAt',
        frameworks: 'id, type, syncStatus, updatedAt',
        syncQueue: '++id, entityType, entityId, createdAt',
      })
      .upgrade((tx) => {
        return tx
          .table('checkins')
          .toCollection()
          .modify((checkin) => {
            // Migrate entries to new format
            if (checkin.entries && Array.isArray(checkin.entries)) {
              checkin.entries = checkin.entries.map(
                (entry: { type?: string; content?: string; timestamp?: number }) => {
                  // Check if already migrated (has 'response' field)
                  if ('response' in entry) {
                    return entry;
                  }

                  const oldType = entry.type || 'emotion';
                  const newType = V2_TO_V3_TYPE_MAP[oldType] || 'energy';

                  return {
                    type: newType,
                    question: 'Migrated from v2',
                    response: entry.content || '',
                    timestamp: entry.timestamp || Date.now(),
                  };
                }
              );
            } else {
              checkin.entries = [];
            }

            // Add missing required fields with sensible defaults
            if (!checkin.timeOfDay) {
              checkin.timeOfDay = 'morning';
            }
            if (!checkin.status) {
              checkin.status = checkin.completedAt ? 'complete' : 'in_progress';
            }
            if (!checkin.stage) {
              checkin.stage = checkin.completedAt ? 'complete' : 'idle';
            }
          });
      });

    // Version 4: Add FrameworkSession and Review tables for Phase 6
    this.version(4).stores({
      captures: 'id, date, status, syncStatus, updatedAt',
      checkins: 'id, date, status, syncStatus, updatedAt',
      chats: 'id, date, syncStatus, updatedAt',
      memory: 'id, syncStatus, updatedAt',
      northstar: 'id, syncStatus, updatedAt',
      frameworks: 'id, type, syncStatus, updatedAt',
      frameworkSessions: 'id, frameworkType, status, syncStatus, updatedAt',
      reviews: 'id, type, periodStart, status, syncStatus, updatedAt',
      syncQueue: '++id, entityType, entityId, createdAt',
    });

    // Version 5: Remove queue-based sync, switch to timestamp-based sync
    // - Remove syncStatus indexes (field removed from Syncable)
    // - Delete syncQueue table
    // - Add lastSyncedAt field (handled by schema change)
    this.version(5)
      .stores({
        captures: 'id, date, status, updatedAt',
        checkins: 'id, date, status, updatedAt',
        chats: 'id, date, updatedAt',
        memory: 'id, updatedAt',
        northstar: 'id, updatedAt',
        frameworks: 'id, type, updatedAt',
        frameworkSessions: 'id, frameworkType, status, updatedAt',
        reviews: 'id, type, periodStart, status, updatedAt',
        syncQueue: null, // Delete the table
      })
      .upgrade((tx) => {
        // Migrate all syncable entities: remove syncStatus, add lastSyncedAt
        const tables = [
          'captures',
          'checkins',
          'chats',
          'memory',
          'northstar',
          'frameworks',
          'frameworkSessions',
          'reviews',
        ];

        return Promise.all(
          tables.map((tableName) =>
            tx
              .table(tableName)
              .toCollection()
              .modify((entity) => {
                // If entity was synced, preserve that as lastSyncedAt
                if (entity.syncStatus === 'synced' && entity.driveFileId) {
                  entity.lastSyncedAt = entity.updatedAt;
                }
                // Remove the old syncStatus field
                delete entity.syncStatus;
              })
          )
        );
      });
  }
}

export const db = new ClarityDB();
