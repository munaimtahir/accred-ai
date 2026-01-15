/**
 * Update Queue Service
 * 
 * Manages queue of unsynced indicator updates made while offline.
 * Stores edits to status, score, and remarks/notes for later sync.
 */

import { Indicator } from '../types';

const QUEUE_KEY = 'accredify_indicator_update_queue';

export interface IndicatorUpdate {
  indicator_id: string;
  fields: {
    status?: string;
    score?: number;
    remarks?: string;
    notes?: string;
    evidence_needed?: boolean;
  };
  updated_at: string;
  source: 'offline';
}

export interface UpdateQueue {
  version: number;
  updated_at: string;
  updates: Record<string, IndicatorUpdate>;
}

/**
 * Get current update queue
 */
export function getUpdateQueue(): UpdateQueue {
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    if (data) {
      const queue = JSON.parse(data) as UpdateQueue;
      // Validate structure
      if (queue.version && queue.updates && typeof queue.updates === 'object') {
        return queue;
      }
    }
  } catch (error) {
    console.error('Failed to read update queue:', error);
  }

  // Return empty queue
  return {
    version: 1,
    updated_at: new Date().toISOString(),
    updates: {},
  };
}

/**
 * Save update queue
 */
function saveUpdateQueue(queue: UpdateQueue): void {
  try {
    queue.updated_at = new Date().toISOString();
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to save update queue:', error);
  }
}

/**
 * Add or update an indicator edit in the queue
 * Latest state wins (overwrites previous update for same indicator)
 */
export function queueIndicatorUpdate(
  indicatorId: string,
  fields: Partial<Indicator>
): void {
  const queue = getUpdateQueue();

  // Extract only allowed fields for offline editing
  const allowedFields: IndicatorUpdate['fields'] = {};
  
  if (fields.status !== undefined) {
    allowedFields.status = fields.status as string;
  }
  if (fields.score !== undefined) {
    allowedFields.score = fields.score;
  }
  if (fields.notes !== undefined) {
    // Map 'notes' to 'remarks' in queue (backend uses 'notes', but spec says 'remarks')
    allowedFields.remarks = fields.notes;
    allowedFields.notes = fields.notes; // Keep both for compatibility
  }

  const update: IndicatorUpdate = {
    indicator_id: indicatorId,
    fields: allowedFields,
    updated_at: new Date().toISOString(),
    source: 'offline',
  };

  // Overwrite any existing update for this indicator (latest state wins)
  queue.updates[indicatorId] = update;
  saveUpdateQueue(queue);
}

/**
 * Get all queued updates
 */
export function getQueuedUpdates(): Record<string, IndicatorUpdate> {
  const queue = getUpdateQueue();
  return queue.updates;
}

/**
 * Get queued update for a specific indicator
 */
export function getQueuedUpdate(indicatorId: string): IndicatorUpdate | null {
  const queue = getUpdateQueue();
  return queue.updates[indicatorId] || null;
}

/**
 * Remove indicator from queue (after successful sync)
 */
export function removeQueuedUpdate(indicatorId: string): void {
  const queue = getUpdateQueue();
  delete queue.updates[indicatorId];
  saveUpdateQueue(queue);
}

/**
 * Clear all queued updates
 */
export function clearUpdateQueue(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch (error) {
    console.error('Failed to clear update queue:', error);
  }
}

/**
 * Get count of queued updates
 */
export function getQueuedUpdateCount(): number {
  const queue = getUpdateQueue();
  return Object.keys(queue.updates).length;
}

/**
 * Check if an indicator has unsynced updates
 */
export function hasUnsyncedUpdate(indicatorId: string): boolean {
  const queue = getUpdateQueue();
  return indicatorId in queue.updates;
}
