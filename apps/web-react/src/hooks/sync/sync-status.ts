import { useSyncExternalStore } from 'react';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

let currentSyncStatus: SyncStatus = 'idle';
const syncStatusListeners = new Set<(status: SyncStatus) => void>();

export function setGlobalSyncStatus(status: SyncStatus): void {
  currentSyncStatus = status;
  for (const listener of syncStatusListeners) listener(status);
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  syncStatusListeners.add(listener);
  return () => syncStatusListeners.delete(listener);
}

export function getSyncStatusSnapshot(): SyncStatus {
  return currentSyncStatus;
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatusSnapshot);
}
