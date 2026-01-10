# Phase 0: Foundation & Technical Spikes

> Epic: `clarity-0ch` | Status: 6/6 tasks complete | Blocks: Phase 1

## Overview

Establish core infrastructure for an offline-first iOS app with Google Drive sync. These are **technical spikes** to validate architecture before full implementation.

## Completed Tasks

- [x] `clarity-0ch.1`: Initialize TanStack Start project with Vite + TypeScript
- [x] `clarity-0ch.2`: Configure Tailwind CSS + shadcn/ui
- [x] `clarity-0ch.3`: Add Capacitor and initialize iOS platform
- [x] `clarity-0ch.4`: Google Drive OAuth spike
- [x] `clarity-0ch.5`: Dexie schema setup
- [x] `clarity-0ch.6`: Sync engine spike

## Implementation Notes

### Task 1: Add Capacitor and Initialize iOS Platform
**Bead**: `clarity-0ch.3`

#### Acceptance Criteria
- [x] Capacitor installed and configured for SPA mode
- [x] iOS platform initialized with custom URL scheme `clarity://`
- [x] App builds and runs on iOS Simulator
- [x] Deep link handling registered for OAuth callback

#### Implementation

**1. Install dependencies:**
```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/app
```

**2. Create `capacitor.config.ts`:**
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.clarity.app',
  appName: 'Clarity',
  webDir: 'dist/client',
  ios: {
    scheme: 'Clarity',
  },
  plugins: {
    App: {
      // Deep link handling
    },
  },
};

export default config;
```

**3. Update `vite.config.ts` for SPA mode:**
```typescript
tanstackStart({
  spa: {
    enabled: true,
  },
}),
```

**4. Initialize iOS:**
```bash
npx cap init Clarity com.clarity.app --web-dir dist/client
npm run build
npx cap add ios
npx cap sync
npx cap open ios
```

**5. Configure URL scheme in `ios/App/App/Info.plist`:**
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>clarity</string>
    </array>
  </dict>
</array>
```

**6. Add deep link listener in app:**
```typescript
// src/lib/deep-links.ts
import { App } from '@capacitor/app';

export function initDeepLinkListener(handler: (url: string) => void) {
  App.addListener('appUrlOpen', (event) => {
    handler(event.url);
  });
}
```

---

### Task 2: Google Drive OAuth Spike
**Bead**: `clarity-0ch.4`

#### Acceptance Criteria
- [ ] OAuth 2.0 flow with PKCE working on iOS
- [ ] Tokens stored securely in iOS Keychain
- [ ] Token refresh working automatically
- [ ] Can list files in `appDataFolder` as proof of success

#### Implementation

**1. Install dependencies:**
```bash
npm install @capacitor-community/secure-storage
npx cap sync
```

**2. Create OAuth configuration:**
```typescript
// src/lib/google-auth.ts
const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
const REDIRECT_URI = 'clarity://oauth/callback';
const SCOPES = ['https://www.googleapis.com/auth/drive.appdata'];

export function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomUUID() + crypto.randomUUID();
  // SHA-256 hash for challenge
  return { verifier, challenge: base64UrlEncode(sha256(verifier)) };
}

export function buildAuthUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}
```

**3. Implement token exchange:**
```typescript
// src/lib/token-service.ts
import { SecureStoragePlugin } from '@capacitor-community/secure-storage';

export async function exchangeCodeForTokens(code: string, verifier: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    }),
  });

  const tokens = await response.json();

  await SecureStoragePlugin.set({ key: 'access_token', value: tokens.access_token });
  await SecureStoragePlugin.set({ key: 'refresh_token', value: tokens.refresh_token });
  await SecureStoragePlugin.set({ key: 'token_expiry', value: String(Date.now() + tokens.expires_in * 1000) });

  return tokens;
}
```

**4. Implement token refresh:**
```typescript
export async function getValidAccessToken(): Promise<string | null> {
  const { value: expiry } = await SecureStoragePlugin.get({ key: 'token_expiry' });

  if (parseInt(expiry) - Date.now() < 300000) { // 5 min buffer
    return await refreshAccessToken();
  }

  const { value } = await SecureStoragePlugin.get({ key: 'access_token' });
  return value;
}
```

**5. Verify with Drive API call:**
```typescript
export async function listAppDataFiles(accessToken: string) {
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?' +
    new URLSearchParams({
      spaces: 'appDataFolder',
      fields: 'files(id,name,modifiedTime)',
    }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.json();
}
```

#### Google Cloud Console Setup
1. Create OAuth 2.0 Client ID (iOS type)
2. Add bundle ID: `com.clarity.app`
3. No client secret needed (public client with PKCE)

---

### Task 3: Dexie Schema Setup
**Bead**: `clarity-0ch.5`

#### Acceptance Criteria
- [ ] TypeScript database class with all tables defined
- [ ] Sync-friendly schema (string UUIDs, updatedAt, syncStatus)
- [ ] Can perform CRUD operations on all tables
- [ ] Schema versioning working

#### Implementation

**1. Install Dexie:**
```bash
npm install dexie dexie-react-hooks
```

**2. Create database schema:**
```typescript
// src/lib/db/schema.ts
import Dexie, { type EntityTable } from 'dexie';

// Sync metadata mixin
interface Syncable {
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

export interface Checkin extends Syncable {
  date: string; // YYYY-MM-DD
  entries: CheckinEntry[];
}

interface CheckinEntry {
  type: 'emotion' | 'highlight' | 'challenge' | 'looking_forward';
  content: string;
  timestamp: number;
}

export interface Chat extends Syncable {
  date: string;
  messages: ChatMessage[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Memory extends Syncable {
  key: 'main'; // Single document
  content: string; // Markdown
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

export interface SyncQueueItem {
  id?: number;
  entityType: 'capture' | 'checkin' | 'chat' | 'memory' | 'northstar' | 'framework';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
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
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;

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
```

**3. Create helper functions:**
```typescript
// src/lib/db/helpers.ts
export function generateId(): string {
  return crypto.randomUUID();
}

export function createSyncable<T extends Syncable>(data: Omit<T, keyof Syncable>): T {
  const now = Date.now();
  return {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
  } as T;
}
```

**4. Create reactive hooks:**
```typescript
// src/lib/db/hooks.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema';

export function useCaptures(date?: string) {
  return useLiveQuery(() => {
    if (date) {
      return db.captures.where('date').equals(date).toArray();
    }
    return db.captures.orderBy('updatedAt').reverse().limit(50).toArray();
  }, [date]);
}

export function usePendingSyncCount() {
  return useLiveQuery(() =>
    db.syncQueue.count()
  );
}
```

---

### Task 4: Sync Engine Spike
**Bead**: `clarity-0ch.6` | Depends on: `clarity-0ch.4`, `clarity-0ch.5`

#### Acceptance Criteria
- [ ] Can push local changes to Google Drive app folder
- [ ] Can pull remote changes to local Dexie
- [ ] Operation queue persists and processes offline changes
- [ ] Basic conflict resolution (last-write-wins)

#### Implementation

**1. Create sync queue manager:**
```typescript
// src/lib/sync/queue.ts
import { db, SyncQueueItem } from '../db/schema';

export async function enqueueSync(
  entityType: SyncQueueItem['entityType'],
  entityId: string,
  operation: SyncQueueItem['operation']
) {
  await db.syncQueue.add({
    entityType,
    entityId,
    operation,
    createdAt: Date.now(),
    retryCount: 0,
  });
}
```

**2. Create Drive file operations:**
```typescript
// src/lib/sync/drive.ts
export async function uploadToAppFolder(
  accessToken: string,
  fileName: string,
  content: object,
  existingFileId?: string
): Promise<string> {
  if (existingFileId) {
    // Update existing file
    await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(content),
      }
    );
    return existingFileId;
  }

  // Create new file
  const metadata = { name: fileName, parents: ['appDataFolder'] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  const result = await response.json();
  return result.id;
}
```

**3. Create sync processor:**
```typescript
// src/lib/sync/processor.ts
import { db } from '../db/schema';
import { uploadToAppFolder } from './drive';
import { getValidAccessToken } from '../token-service';

export async function processSyncQueue() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return;

  const items = await db.syncQueue.orderBy('createdAt').toArray();

  for (const item of items) {
    try {
      await processQueueItem(item, accessToken);
      await db.syncQueue.delete(item.id!);
    } catch (error) {
      if (item.retryCount >= 3) {
        console.error('Sync failed permanently:', item);
        await db.syncQueue.delete(item.id!);
      } else {
        await db.syncQueue.update(item.id!, { retryCount: item.retryCount + 1 });
      }
    }
  }
}

async function processQueueItem(item: SyncQueueItem, accessToken: string) {
  const table = db[item.entityType as keyof typeof db];
  const entity = await (table as any).get(item.entityId);

  if (item.operation === 'delete') {
    // Handle delete
    return;
  }

  const fileName = `${item.entityType}-${item.entityId}.json`;
  const driveFileId = await uploadToAppFolder(
    accessToken,
    fileName,
    entity,
    entity.driveFileId
  );

  await (table as any).update(item.entityId, {
    driveFileId,
    syncStatus: 'synced',
  });
}
```

**4. Create sync trigger hook:**
```typescript
// src/lib/sync/use-sync.ts
import { useEffect } from 'react';
import { processSyncQueue } from './processor';

export function useSync() {
  useEffect(() => {
    // Sync on mount
    processSyncQueue();

    // Sync on network reconnect
    const handleOnline = () => processSyncQueue();
    window.addEventListener('online', handleOnline);

    return () => window.removeEventListener('online', handleOnline);
  }, []);
}
```

---

## Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| OAuth approach | PKCE with custom URL scheme | More secure than implicit flow, works without backend |
| Token storage | iOS Keychain via secure-storage | Native security, survives app updates |
| ID generation | `crypto.randomUUID()` | Browser native, no collisions |
| Timestamps | Unix milliseconds | Simple comparison for LWW |
| Conflict resolution | Last-write-wins by `updatedAt` | Simple, acceptable for personal app |
| Sync trigger | On change + on online | Immediate feel with offline resilience |

## Open Questions

1. **Universal Links**: Should we add as fallback to custom URL scheme?
2. **Background sync**: How to handle iOS backgrounding during sync?
3. **Compression**: At what size should memory.md be compressed?
4. **Analytics**: What sync events should be tracked?

## References

- [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
- [Google Drive API - App Data](https://developers.google.com/workspace/drive/api/guides/appdata)
- [Dexie.js Best Practices](https://dexie.org/docs/Tutorial/Best-Practices)
- [OAuth 2.0 for Native Apps (RFC 8252)](https://datatracker.ietf.org/doc/html/rfc8252)
- Spec: `docs/spec.md`
