/**
 * Google Drive API operations
 * Stores data in a visible "Clarity" folder as Markdown files
 */

// Google Drive API Response Types
export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  mimeType?: string;
}

interface DriveListResponse {
  files?: DriveFile[];
  nextPageToken?: string;
}

interface DriveCreateResponse {
  id: string;
  name: string;
}

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const CLARITY_FOLDER_NAME = 'Clarity';
const FOLDER_CACHE_KEY = 'clarity_drive_folders';

// Cache folder IDs (persisted to localStorage)
let clarityFolderId: string | null = null;
const subfolderIds: Record<string, string> = {};

// In-flight folder creation promises (prevents concurrent creates)
let clarityFolderPromise: Promise<string> | null = null;
const subfolderPromises: Record<string, Promise<string>> = {};

// Load cached folder IDs from localStorage
function loadFolderCache(): void {
  try {
    const cached = localStorage.getItem(FOLDER_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      clarityFolderId = data.clarityFolderId || null;
      Object.assign(subfolderIds, data.subfolderIds || {});
    }
  } catch {
    // Ignore parse errors
  }
}

// Save folder IDs to localStorage
function saveFolderCache(): void {
  try {
    localStorage.setItem(FOLDER_CACHE_KEY, JSON.stringify({
      clarityFolderId,
      subfolderIds,
    }));
  } catch {
    // Ignore storage errors
  }
}

// Initialize cache on module load
loadFolderCache();

/**
 * Find or create the main Clarity folder in user's Drive
 */
export async function getOrCreateClarityFolder(
  accessToken: string
): Promise<string> {
  if (clarityFolderId) return clarityFolderId;

  // If creation already in-flight, wait for it
  if (clarityFolderPromise) return clarityFolderPromise;

  // Start creation and store promise
  clarityFolderPromise = createClarityFolderInternal(accessToken);
  try {
    return await clarityFolderPromise;
  } finally {
    clarityFolderPromise = null;
  }
}

async function createClarityFolderInternal(accessToken: string): Promise<string> {
  // Double-check cache after acquiring "lock"
  if (clarityFolderId) return clarityFolderId;

  // Search for existing folder
  const searchResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files?' +
      new URLSearchParams({
        q: `name='${CLARITY_FOLDER_NAME}' and mimeType='${FOLDER_MIME_TYPE}' and trashed=false`,
        fields: 'files(id,name)',
      }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!searchResponse.ok) {
    throw new Error(`Failed to search for Clarity folder: ${searchResponse.status}`);
  }

  const searchData = (await searchResponse.json()) as DriveListResponse;

  if (searchData.files && searchData.files.length > 0) {
    clarityFolderId = searchData.files[0].id;
    saveFolderCache();
    return clarityFolderId;
  }

  // Create folder
  const createResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: CLARITY_FOLDER_NAME,
        mimeType: FOLDER_MIME_TYPE,
      }),
    }
  );

  if (!createResponse.ok) {
    throw new Error(`Failed to create Clarity folder: ${createResponse.status}`);
  }

  const createData = (await createResponse.json()) as DriveCreateResponse;
  clarityFolderId = createData.id;
  saveFolderCache();
  return clarityFolderId;
}

/**
 * Find or create a subfolder within Clarity folder
 */
export async function getOrCreateSubfolder(
  accessToken: string,
  subfolderName: string
): Promise<string> {
  if (subfolderIds[subfolderName]) return subfolderIds[subfolderName];

  // If creation already in-flight for this subfolder, wait for it
  const existing = subfolderPromises[subfolderName];
  if (existing) return existing;

  // Start creation and store promise
  const promise = createSubfolderInternal(accessToken, subfolderName);
  subfolderPromises[subfolderName] = promise;
  try {
    return await promise;
  } finally {
    delete subfolderPromises[subfolderName];
  }
}

async function createSubfolderInternal(
  accessToken: string,
  subfolderName: string
): Promise<string> {
  // Double-check cache after acquiring "lock"
  if (subfolderIds[subfolderName]) return subfolderIds[subfolderName];

  const parentId = await getOrCreateClarityFolder(accessToken);

  // Search for existing subfolder
  const searchResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files?' +
      new URLSearchParams({
        q: `name='${subfolderName}' and mimeType='${FOLDER_MIME_TYPE}' and '${parentId}' in parents and trashed=false`,
        fields: 'files(id,name)',
      }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!searchResponse.ok) {
    throw new Error(`Failed to search for subfolder: ${searchResponse.status}`);
  }

  const searchData = (await searchResponse.json()) as DriveListResponse;

  if (searchData.files && searchData.files.length > 0) {
    subfolderIds[subfolderName] = searchData.files[0].id;
    saveFolderCache();
    return subfolderIds[subfolderName];
  }

  // Create subfolder
  const createResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: subfolderName,
        mimeType: FOLDER_MIME_TYPE,
        parents: [parentId],
      }),
    }
  );

  if (!createResponse.ok) {
    throw new Error(`Failed to create subfolder: ${createResponse.status}`);
  }

  const createData = (await createResponse.json()) as DriveCreateResponse;
  subfolderIds[subfolderName] = createData.id;
  saveFolderCache();
  return subfolderIds[subfolderName];
}

/**
 * List files in Clarity folder (optionally in a subfolder)
 */
export async function listClarityFiles(
  accessToken: string,
  subfolder?: string
): Promise<DriveFile[]> {
  let parentId: string;

  if (subfolder) {
    parentId = await getOrCreateSubfolder(accessToken, subfolder);
  } else {
    parentId = await getOrCreateClarityFolder(accessToken);
  }

  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?' +
      new URLSearchParams({
        q: `'${parentId}' in parents and trashed=false`,
        fields: 'files(id,name,modifiedTime,mimeType)',
        orderBy: 'modifiedTime desc',
      }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Drive] List files failed:', response.status, errorBody);
    throw new Error(`Failed to list files: ${response.status} - ${errorBody}`);
  }

  const data = (await response.json()) as DriveListResponse;
  return data.files ?? [];
}

/**
 * Upload markdown file to Clarity folder
 */
export async function uploadMarkdownFile(
  accessToken: string,
  filename: string,
  content: string,
  subfolder?: string,
  existingFileId?: string
): Promise<string> {
  if (existingFileId) {
    // Update existing file
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'text/markdown',
        },
        body: content,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update file: ${response.status}`);
    }

    return existingFileId;
  }

  // Get parent folder
  let parentId: string;
  if (subfolder) {
    parentId = await getOrCreateSubfolder(accessToken, subfolder);
  } else {
    parentId = await getOrCreateClarityFolder(accessToken);
  }

  // Check if file already exists (by name)
  const searchResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files?' +
      new URLSearchParams({
        q: `name='${filename}' and '${parentId}' in parents and trashed=false`,
        fields: 'files(id)',
      }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (searchResponse.ok) {
    const searchData = (await searchResponse.json()) as DriveListResponse;
    if (searchData.files && searchData.files.length > 0) {
      // Update existing file
      const fileId = searchData.files[0].id;
      const updateResponse = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'text/markdown',
          },
          body: content,
        }
      );

      if (!updateResponse.ok) {
        throw new Error(`Failed to update existing file: ${updateResponse.status}`);
      }

      return fileId;
    }
  }

  // Create new file with multipart upload
  const metadata = {
    name: filename,
    parents: [parentId],
  };
  const boundary = '-------clarity_upload_boundary';

  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: text/markdown',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create file: ${response.status}`);
  }

  const result = (await response.json()) as DriveCreateResponse;
  return result.id;
}

/**
 * Download file content from Drive
 */
export async function downloadFromDrive(
  accessToken: string,
  fileId: string
): Promise<string> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  return response.text();
}

/**
 * Delete file from Drive
 */
export async function deleteFromDrive(
  accessToken: string,
  fileId: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete file: ${response.status}`);
  }
}

/**
 * Clear folder cache (call on logout)
 */
export function clearFolderCache(): void {
  clarityFolderId = null;
  Object.keys(subfolderIds).forEach((key) => delete subfolderIds[key]);
  try {
    localStorage.removeItem(FOLDER_CACHE_KEY);
  } catch {
    // Ignore storage errors
  }
}

// Legacy support for AppData (for migration)
export async function listAppDataFiles(
  accessToken: string
): Promise<DriveFile[]> {
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?' +
      new URLSearchParams({
        spaces: 'appDataFolder',
        fields: 'files(id,name,modifiedTime)',
      }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[Drive] List AppData files failed:', response.status, errorBody);
    throw new Error(`Failed to list AppData files: ${response.status} - ${errorBody}`);
  }

  const data = (await response.json()) as DriveListResponse;
  return data.files ?? [];
}

// Legacy: kept for backward compatibility during migration
export async function uploadToAppFolder(
  accessToken: string,
  fileName: string,
  content: object,
  existingFileId?: string
): Promise<string> {
  if (existingFileId) {
    const response = await fetch(
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

    if (!response.ok) {
      throw new Error(`Failed to update file: ${response.status}`);
    }

    return existingFileId;
  }

  const metadata = { name: fileName, parents: ['appDataFolder'] };
  const boundary = '-------clarity_upload_boundary';

  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    JSON.stringify(content),
    `--${boundary}--`,
  ].join('\r\n');

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create file: ${response.status}`);
  }

  const result = (await response.json()) as DriveCreateResponse;
  return result.id;
}
