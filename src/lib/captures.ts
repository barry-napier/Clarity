import { db, type Capture } from './db/schema';

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate a unique ID for a capture
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Create a new capture
 */
export async function createCapture(content: string): Promise<Capture> {
  const now = Date.now();
  const capture: Capture = {
    id: generateId(),
    content: content.trim(),
    date: getTodayDate(),
    status: 'new',
    createdAt: now,
    updatedAt: now,
  };

  await db.captures.add(capture);

  return capture;
}

/**
 * Mark a capture as done
 */
export async function markCaptureDone(id: string): Promise<void> {
  const now = Date.now();

  await db.captures.update(id, {
    status: 'done',
    updatedAt: now,
  });
}

/**
 * Mark a capture as new (undo done)
 */
export async function markCaptureNew(id: string): Promise<void> {
  const now = Date.now();

  await db.captures.update(id, {
    status: 'new',
    updatedAt: now,
  });
}

/**
 * Delete a capture
 */
export async function deleteCapture(id: string): Promise<void> {
  await db.captures.delete(id);
}

/**
 * Get all captures (optionally filtered by status)
 */
export async function getCaptures(status?: 'new' | 'done'): Promise<Capture[]> {
  if (status) {
    return db.captures.where('status').equals(status).reverse().sortBy('createdAt');
  }
  return db.captures.reverse().sortBy('createdAt');
}

/**
 * Get capture count by status
 */
export async function getCaptureCount(status: 'new' | 'done'): Promise<number> {
  return db.captures.where('status').equals(status).count();
}
