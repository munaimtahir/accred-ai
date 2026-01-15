/**
 * Manual Sync Panel
 * 
 * Displays unsynced updates and allows manual sync to server.
 * Only shown when server is reachable and queue has items.
 */

import { useState, useEffect } from 'react';
import { RefreshCw, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { getQueuedUpdates, removeQueuedUpdate, clearUpdateQueue, IndicatorUpdate } from '../services/updateQueue';
import { api } from '../services/api';
import { readCachedSnapshot } from '../services/offlineCache';
import { onConnectivityChange } from '../services/connectivity';

interface SyncPanelProps {
  onSyncComplete?: () => void;
}

interface SyncStatus {
  indicatorId: string;
  status: 'pending' | 'syncing' | 'success' | 'failed';
  error?: string;
}

export default function SyncPanel({ onSyncComplete }: SyncPanelProps) {
  const [queuedUpdates, setQueuedUpdates] = useState<Record<string, IndicatorUpdate>>({});
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const refreshQueue = () => {
    const updates = getQueuedUpdates();
    setQueuedUpdates(updates);
    
    // Initialize sync statuses for new updates
    setSyncStatuses(prev => {
      const newStatuses = { ...prev };
      Object.keys(updates).forEach(indicatorId => {
        if (!newStatuses[indicatorId]) {
          newStatuses[indicatorId] = { indicatorId, status: 'pending' };
        }
      });
      // Remove statuses for indicators no longer in queue
      Object.keys(newStatuses).forEach(indicatorId => {
        if (!updates[indicatorId]) {
          delete newStatuses[indicatorId];
        }
      });
      return newStatuses;
    });
  };

  useEffect(() => {
    refreshQueue();
    
    // Refresh when connectivity changes (in case queue was modified elsewhere)
    const unsubscribe = onConnectivityChange(() => {
      refreshQueue();
    });
    
    return unsubscribe;
  }, []);

  const updateCount = Object.keys(queuedUpdates).length;
  if (updateCount === 0) {
    return null;
  }

  const handleSyncAll = async () => {
    setIsSyncing(true);
    const updates = Object.values(queuedUpdates);
    const newStatuses: Record<string, SyncStatus> = { ...syncStatuses };

    // Mark all as syncing
    updates.forEach(update => {
      newStatuses[update.indicator_id] = {
        indicatorId: update.indicator_id,
        status: 'syncing',
      };
    });
    setSyncStatuses(newStatuses);

    // Sync each update
    const syncPromises = updates.map(async (update) => {
      try {
        // Prepare update payload (only changed fields)
        const updateData: any = {};
        if (update.fields.status) updateData.status = update.fields.status;
        if (update.fields.score !== undefined) updateData.score = update.fields.score;
        if (update.fields.remarks || update.fields.notes) {
          updateData.notes = update.fields.remarks || update.fields.notes;
        }

        // Call backend API
        await api.updateIndicator(update.indicator_id, updateData);

        // Success: remove from queue and mark as success
        removeQueuedUpdate(update.indicator_id);
        newStatuses[update.indicator_id] = {
          indicatorId: update.indicator_id,
          status: 'success',
        };
      } catch (error) {
        // Failure: keep in queue and mark as failed
        newStatuses[update.indicator_id] = {
          indicatorId: update.indicator_id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Sync failed',
        };
      }
    });

    await Promise.all(syncPromises);
    setSyncStatuses(newStatuses);
    setIsSyncing(false);

    // Refresh queued updates
    const remaining = getQueuedUpdates();
    setQueuedUpdates(remaining);

    // If all synced, notify parent
    if (Object.keys(remaining).length === 0 && onSyncComplete) {
      onSyncComplete();
    }
  };

  const handleDiscardAll = () => {
    if (window.confirm('Are you sure you want to discard all unsynced changes? This cannot be undone.')) {
      clearUpdateQueue();
      setQueuedUpdates({});
      setSyncStatuses({});
      if (onSyncComplete) {
        onSyncComplete();
      }
    }
  };

  const getIndicatorName = (indicatorId: string): string => {
    const cache = readCachedSnapshot();
    if (!cache) return indicatorId;

    for (const project of cache.projects) {
      const indicator = project.indicators.find(i => i.id === indicatorId);
      if (indicator) {
        return `${indicator.standard}: ${indicator.indicator}`;
      }
    }
    return indicatorId;
  };

  const getChangedFields = (update: IndicatorUpdate): string[] => {
    const fields: string[] = [];
    if (update.fields.status) fields.push('Status');
    if (update.fields.score !== undefined) fields.push('Score');
    if (update.fields.remarks || update.fields.notes) fields.push('Notes');
    return fields;
  };

  const successCount = Object.values(syncStatuses).filter(s => s.status === 'success').length;
  const failedCount = Object.values(syncStatuses).filter(s => s.status === 'failed').length;
  const pendingCount = updateCount - successCount - failedCount;

  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 m-4 rounded-r-lg animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw size={20} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-900">
              You have {updateCount} unsynced {updateCount === 1 ? 'update' : 'updates'}
            </h3>
          </div>
          
          {isSyncing && (
            <p className="text-sm text-amber-700 mb-2">
              Syncing... {successCount} succeeded, {failedCount} failed, {pendingCount} pending
            </p>
          )}

          {!isSyncing && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSyncAll}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition-colors"
              >
                <RefreshCw size={16} />
                Apply All Updates
              </button>
              
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-amber-700 border border-amber-300 rounded-lg text-sm hover:bg-amber-50 transition-colors"
              >
                {showDetails ? 'Hide' : 'View'} Details
              </button>
              
              <button
                onClick={handleDiscardAll}
                className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-300 rounded-lg text-sm hover:bg-red-50 transition-colors"
              >
                <X size={16} />
                Discard All
              </button>
            </div>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
          {Object.values(queuedUpdates).map(update => {
            const status = syncStatuses[update.indicator_id];
            const indicatorName = getIndicatorName(update.indicator_id);
            const changedFields = getChangedFields(update);

            return (
              <div
                key={update.indicator_id}
                className="bg-white rounded-lg p-3 border border-amber-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {indicatorName}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Changed: {changedFields.join(', ')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(update.updated_at).toLocaleString()}
                    </p>
                    {status?.error && (
                      <p className="text-xs text-red-600 mt-1">{status.error}</p>
                    )}
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    {status?.status === 'syncing' && (
                      <Loader2 size={16} className="text-amber-600 animate-spin" />
                    )}
                    {status?.status === 'success' && (
                      <Check size={16} className="text-green-600" />
                    )}
                    {status?.status === 'failed' && (
                      <AlertCircle size={16} className="text-red-600" />
                    )}
                    {status?.status === 'pending' && (
                      <div className="w-4 h-4 rounded-full bg-amber-400" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
