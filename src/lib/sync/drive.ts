export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

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
    throw new Error(`Failed to list files: ${response.status}`);
  }

  const data = await response.json();
  return data.files || [];
}

export async function uploadToAppFolder(
  accessToken: string,
  fileName: string,
  content: object,
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

  // Create new file with multipart upload
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

  const result = await response.json();
  return result.id;
}

export async function downloadFromDrive<T>(
  accessToken: string,
  fileId: string
): Promise<T> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  return response.json();
}

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
