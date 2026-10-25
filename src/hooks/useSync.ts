import { useState, useRef, useEffect } from 'react';
import { pullAllFromCloud, pushAllToCloud, syncPdfsToCloud, listenForCloudSyncSignal } from '../services/sync';
import { getDeviceId, restoreLastSyncTimesFromDb } from '../services/sync/sync-utils';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(`Sync timeout após ${ms / 1000}s`)), ms)
  );
  return Promise.race([promise, timeout]);
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * Checks whether an error is caused by Firebase quota limits or permission denial.
 * Deduplicated — used across all sync error handlers.
 */
function isQuotaOrPermissionError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: string, message?: string };
  return e.code === 'resource-exhausted' 
    || e.message?.toLowerCase().includes('quota') === true
    || e.message?.toLowerCase().includes('permission-denied') === true;
}

/**
 * Centralized sync error handler.
 * Dispatches global window event on quota or permission errors.
 */
function handleSyncError(err: unknown, context: string) {
  const e = err as { message?: string, code?: string };
  console.warn(`[Sync] ${context} FAILED: ${e.message || 'Unknown error'}`, err);
  if (isQuotaOrPermissionError(err)) {
    window.dispatchEvent(new CustomEvent('caderno-sync-error', { 
      detail: { message: e.message, code: e.code } 
    }));
  }
}

export function useSync(isAuth: boolean, masterKey: Record<string, CryptoKey>, loadPages: () => void) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const syncDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSync = () => setSyncStatus('syncing');
  const finishSync = (ok: boolean) => {
    setSyncStatus(ok ? 'success' : 'error');
    if (syncDismissTimer.current) clearTimeout(syncDismissTimer.current);
    syncDismissTimer.current = setTimeout(() => setSyncStatus('idle'), 3000);
  };

  useEffect(() => {
    if (isAuth && masterKey) {
      let isClosed = false;
      let isSyncing = false; // Mutex: prevents concurrent syncs wasting Firebase quota
      let lastFullSyncTime = 0; // Cooldown: minimum interval between full syncs
      const FULL_SYNC_COOLDOWN_MS = 30_000; // 30-second cooldown between full sync runs
      const syncChannel = new BroadcastChannel('caderno_sync');
      // Unique device ID to ignore self-push signals
      const myDeviceId = getDeviceId();
      const dirtyTables = new Set<string>();
      let hasPendingSignal = false;
      let hasPendingPush = false;

      // Mutex queue coordinator: drains pending remote signals or local pushes once unlocked
      const checkPendingOperations = () => {
        if (isClosed || isSyncing) return;
        if (hasPendingSignal) {
          hasPendingSignal = false;
          executeRealTimePull();
        } else if (hasPendingPush) {
          hasPendingPush = false;
          doPushOnlySync();
        }
      };

      // Restore sync timestamps from local database (protects against localStorage clearing)
      restoreLastSyncTimesFromDb().catch(() => {});

      const doFullSync = async () => {
        if (isClosed) return;
        if (!navigator.onLine) {
          console.warn('[Sync] doFullSync aborted: no internet connection.');
          finishSync(false);
          return;
        }
        // Mutex: if sync is already running, skip this call
        if (isSyncing) {
          console.warn('[Sync] doFullSync skipped: another sync is already in progress.');
          return;
        }
        // Cooldown: prevents excessively frequent full syncs (e.g., rapid focus + interval)
        const now = Date.now();
        if (now - lastFullSyncTime < FULL_SYNC_COOLDOWN_MS) {
          console.warn('[Sync] doFullSync skipped: 30s cooldown still active.');
          return;
        }
        isSyncing = true;
        lastFullSyncTime = now;
        dirtyTables.clear();
        startSync();
        try {
          await withTimeout(pullAllFromCloud(masterKey), 120_000);
          loadPages();
          window.dispatchEvent(new CustomEvent('caderno-sync-complete'));
          await withTimeout(
            Promise.all([
              pushAllToCloud(masterKey),
              syncPdfsToCloud(masterKey),
            ]),
            120_000
          );
          if (!isClosed) {
            finishSync(true);
            syncChannel.postMessage('LOCAL_UPDATE');
          }
        } catch (err: unknown) {
          if (!isClosed) {
            handleSyncError(err, 'doFullSync');
            finishSync(false);
          }
        } finally {
          isSyncing = false;
          checkPendingOperations();
        }
      };

      const doPushOnlySync = async () => {
        if (isClosed) return;
        if (!navigator.onLine) {
          return; // Offline: do not show error, ignore silently
        }
        // Mutex: if sync is already running, queue pending push so it is not dropped
        if (isSyncing) {
          hasPendingPush = true;
          return;
        }
        isSyncing = true;
        const tablesToPush = dirtyTables.size > 0 ? Array.from(dirtyTables) : undefined;
        dirtyTables.clear();
        try {
          // Silent background push targeting dirty tables (or all tables if unassigned)
          // Note: syncPdfsToCloud is intentionally excluded here to prevent heavy drive scans during keystroke autosaves
          await withTimeout(
            pushAllToCloud(masterKey, tablesToPush),
            120_000
          );
          if (!isClosed) {
            syncChannel.postMessage('LOCAL_UPDATE');
          }
        } catch (err: unknown) {
          if (tablesToPush) {
            for (const t of tablesToPush) dirtyTables.add(t);
          }
          if (!isClosed) {
            handleSyncError(err, 'doPushOnlySync');
          }
        } finally {
          isSyncing = false;
          checkPendingOperations();
        }
      };

      const executeRealTimePull = () => {
        if (!navigator.onLine || isClosed) return;
        if (isSyncing) {
          hasPendingSignal = true;
          return;
        }
        isSyncing = true;
        startSync();
        withTimeout(pullAllFromCloud(masterKey), 60_000)
          .then(() => {
            loadPages();
            finishSync(true);
          })
          .catch((err: unknown) => {
            handleSyncError(err, 'Real-time Pull');
            finishSync(false);
          })
          .finally(() => {
            isSyncing = false;
            checkPendingOperations();
          });
      };

      // 1. Initial Sync (Synchronize on application mount)
      doFullSync();

      // 2. Cross-Device Real-time Firebase Sync
      // NOTE: onSnapshot triggers immediately with initial doc state.
      // isFirstSnapshot ignores redundant initial invocation,
      // since doFullSync() above already performs full pull.
      let isFirstSnapshot = true;
      const unsubRealTime = listenForCloudSyncSignal((signalDeviceId?: string) => {
        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          return; // Ignore automatic onSnapshot trigger on mount
        }
        // #7: Ignore self-device signals (avoids redundant pull after push)
        if (signalDeviceId && signalDeviceId === myDeviceId) {
          return;
        }
        executeRealTimePull();
      });

      // 3. Cross-Tab Sync (Same Browser)
      syncChannel.onmessage = (msg) => {
        if (msg.data === 'LOCAL_UPDATE') {
          loadPages();
        }
      };

      // 4. Smart on-demand trigger (when user edits)
      let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
      const flushPendingDebouncedPush = () => {
        if (syncDebounceTimer) {
          clearTimeout(syncDebounceTimer);
          syncDebounceTimer = null;
          doPushOnlySync();
        }
      };

      const handleSyncTrigger = (arg?: string | Event) => {
        let table: string | undefined;
        if (typeof arg === 'string') {
          table = arg;
        } else if (arg && 'detail' in arg && typeof (arg as CustomEvent).detail === 'object') {
          table = (arg as CustomEvent<{ table?: string }>).detail?.table;
        }
        if (table) {
          dirtyTables.add(table);
        }
        if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(() => {
          syncDebounceTimer = null;
          doPushOnlySync();
        }, 3000);
      };

      let cleanupSyncTrigger: (() => void) | undefined;
      if (window.api?.onSyncTrigger) {
        cleanupSyncTrigger = window.api.onSyncTrigger(handleSyncTrigger);
      } else {
        window.addEventListener('app-sync-trigger', handleSyncTrigger as EventListener);
      }

      const handleImmediateSyncTrigger = (event?: Event) => {
        if (event && 'detail' in event && typeof (event as CustomEvent).detail === 'object') {
          const table = (event as CustomEvent<{ table?: string }>).detail?.table;
          if (table) {
            dirtyTables.add(table);
          }
        }
        if (syncDebounceTimer) {
          clearTimeout(syncDebounceTimer);
          syncDebounceTimer = null;
        }
        doPushOnlySync();
      };
      window.addEventListener('app-sync-trigger-immediate', handleImmediateSyncTrigger as EventListener);

      // 5. Focus & lifecycle trigger: update when user returns, and flush debounced sync when leaving
      let isSyncingOnFocus = false;
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && !isSyncingOnFocus) {
          isSyncingOnFocus = true;
          doFullSync().finally(() => { isSyncingOnFocus = false; });
        } else if (document.visibilityState === 'hidden') {
          // Flush pending debounced push immediately before mobile browser/webview suspends execution
          flushPendingDebouncedPush();
        }
      };
      const handlePageHide = () => {
        flushPendingDebouncedPush();
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('pagehide', handlePageHide);

      // 6. Network reconnection trigger: automatically sync offline changes when connection returns
      const handleOnline = () => {
        console.log('[Sync] Network connection restored (online). Triggering full synchronization...');
        doFullSync();
      };
      window.addEventListener('online', handleOnline);

      // 7. Safety fallback (every 10 minutes - reduced from 5 to save quota)
      const syncInterval = setInterval(() => {
        doFullSync();
      }, 10 * 60 * 1000); 

      return () => {
        isClosed = true;
        clearInterval(syncInterval);
        if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('app-sync-trigger-immediate', handleImmediateSyncTrigger);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (cleanupSyncTrigger) cleanupSyncTrigger();
        else window.removeEventListener('app-sync-trigger', handleSyncTrigger);
        if (syncDismissTimer.current) clearTimeout(syncDismissTimer.current);
        unsubRealTime();
        syncChannel.close();
      };
    }
  }, [isAuth, masterKey, loadPages]);

  return { syncStatus };
}
