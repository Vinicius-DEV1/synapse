import { getDeviceId } from '../../services/sync/sync-utils';
import { listenForCloudSyncSignal } from '../../services/sync';

const SYNC_TRIGGER_DEBOUNCE_MS = 3_000;
const PERIODIC_SYNC_INTERVAL_MS = 10 * 60 * 1_000;

interface SyncEventBindingOptions {
  workspaceId?: string;
  firebaseUserId: string;
  syncChannel: BroadcastChannel;
  loadPages: () => void;
  doFullSync: () => Promise<void>;
  doPushOnlySync: () => Promise<void>;
  executeRealTimePull: (signalDeviceId?: string) => void;
  markDirty: (table?: string) => void;
}

function readTableDetail(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || !('detail' in value)) return undefined;
  const detail = value.detail;
  if (typeof detail !== 'object' || detail === null || !('table' in detail)) return undefined;
  return typeof detail.table === 'string' ? detail.table : undefined;
}

function isLocalUpdateMessage(
  value: unknown,
): value is 'LOCAL_UPDATE' | { type: 'LOCAL_UPDATE'; tables?: unknown } {
  if (value === 'LOCAL_UPDATE') return true;
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  return value.type === 'LOCAL_UPDATE';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
}

export function bindSyncEventListeners(options: SyncEventBindingOptions): () => void {
  const {
    workspaceId,
    firebaseUserId,
    syncChannel,
    loadPages,
    doFullSync,
    doPushOnlySync,
    executeRealTimePull,
    markDirty,
  } = options;
  const myDeviceId = getDeviceId();
  let isFirstSnapshot = true;
  const onSignal = (signalDeviceId?: string): void => {
    if (isFirstSnapshot) {
      isFirstSnapshot = false;
      return;
    }
    if (signalDeviceId && signalDeviceId === myDeviceId) return;
    executeRealTimePull(signalDeviceId);
  };
  const unsubscribeRemoteSignal = listenForCloudSyncSignal(onSignal, workspaceId, firebaseUserId);

  syncChannel.onmessage = event => {
    const message: unknown = event.data;
    if (message === 'LOCAL_UPDATE') {
      loadPages();
      return;
    }
    if (!isLocalUpdateMessage(message)) return;
    if (message === 'LOCAL_UPDATE' || !isStringArray(message.tables)) {
      loadPages();
    } else if (message.tables.length === 0 || message.tables.includes('pages')) {
      loadPages();
    }
  };

  let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const flushPendingDebouncedPush = (): void => {
    if (!syncDebounceTimer) return;
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
    doPushOnlySync();
  };

  const handleSyncTrigger = (arg?: string | Event): void => {
    markDirty(typeof arg === 'string' ? arg : readTableDetail(arg));
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      syncDebounceTimer = null;
      doPushOnlySync();
    }, SYNC_TRIGGER_DEBOUNCE_MS);
  };

  let cleanupSyncTrigger: (() => void) | undefined;
  if (window.api?.onSyncTrigger) {
    cleanupSyncTrigger = window.api.onSyncTrigger(handleSyncTrigger);
  } else {
    window.addEventListener('app-sync-trigger', handleSyncTrigger as EventListener);
  }

  const handleImmediateSyncTrigger = (event?: Event): void => {
    markDirty(readTableDetail(event));
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = null;
    }
    doPushOnlySync();
  };
  window.addEventListener('app-sync-trigger-immediate', handleImmediateSyncTrigger as EventListener);

  let isSyncingOnFocus = false;
  const handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && !isSyncingOnFocus) {
      isSyncingOnFocus = true;
      void doFullSync().finally(() => {
        isSyncingOnFocus = false;
      });
    } else if (document.visibilityState === 'hidden') {
      flushPendingDebouncedPush();
    }
  };
  const handlePageHide = (): void => flushPendingDebouncedPush();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);

  const handleOnline = (): void => {
    console.log('[Sync] Network connection restored (online). Triggering full synchronization...');
    void doFullSync();
  };
  window.addEventListener('online', handleOnline);
  const syncInterval = setInterval(() => void doFullSync(), PERIODIC_SYNC_INTERVAL_MS);

  return () => {
    clearInterval(syncInterval);
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('pagehide', handlePageHide);
    window.removeEventListener('app-sync-trigger-immediate', handleImmediateSyncTrigger);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (cleanupSyncTrigger) cleanupSyncTrigger();
    else window.removeEventListener('app-sync-trigger', handleSyncTrigger);
    unsubscribeRemoteSignal();
    syncChannel.close();
  };
}
