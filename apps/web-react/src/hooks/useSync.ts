import { useState, useRef, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { pullAllFromCloud, pushAllToCloud, syncPdfsToCloud } from '../services/sync';
import { runSerializedSyncOperation } from '../services/sync/sync-operation-queue';
import { bindSyncEventListeners } from './sync/sync-event-bindings';
import { handleSyncError, isPromiseSettledResult } from './sync/sync-error-utils';
import { setGlobalSyncStatus, type SyncStatus } from './sync/sync-status';
import { deferSyncMutexReleaseUntilSettled } from './sync/sync-timeout-lifecycle';

export { getSyncStatusSnapshot, subscribeSyncStatus, useSyncStatus } from './sync/sync-status';
export type { SyncStatus } from './sync/sync-status';

export function useSync(
  isAuth: boolean,
  masterKey: Record<string, CryptoKey>,
  loadPages: () => void,
  workspaceId?: string
) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [firebaseUserId, setFirebaseUserId] = useState<string | undefined>(
    auth.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser.uid : undefined
  );
  const syncDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setFirebaseUserId(user && !user.isAnonymous ? user.uid : undefined);
  }), []);

  const startSync = () => {
    setSyncStatus('syncing');
    setGlobalSyncStatus('syncing');
  };
  const finishSync = (ok: boolean) => {
    const s: SyncStatus = ok ? 'success' : 'error';
    setSyncStatus(s);
    setGlobalSyncStatus(s);
    if (ok) {
      window.dispatchEvent(new CustomEvent('caderno-sync-success'));
    }
    if (syncDismissTimer.current) clearTimeout(syncDismissTimer.current);
    syncDismissTimer.current = setTimeout(() => {
      setSyncStatus('idle');
      setGlobalSyncStatus('idle');
    }, 3000);
  };

  useEffect(() => {
    if (isAuth && masterKey && firebaseUserId) {
      let isClosed = false;
      let isSyncing = false; // Mutex: prevents concurrent syncs wasting Firebase quota
      let lastFullSyncTime = 0; // Cooldown: minimum interval between full syncs
      const FULL_SYNC_COOLDOWN_MS = 30_000; // 30-second cooldown between full sync runs
      const syncChannel = new BroadcastChannel('caderno_sync');
      const dirtyTables = new Set<string>();
      let hasUntargetedDirty = false;
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

      const doFullSync = async () => {
        if (isClosed) return;
        if (!navigator.onLine) {
          console.warn('[Sync] doFullSync aborted: no internet connection.');
          finishSync(false);
          return;
        }
        if (isSyncing) {
          console.warn('[Sync] doFullSync skipped: another sync is already in progress.');
          return;
        }
        const now = Date.now();
        if (now - lastFullSyncTime < FULL_SYNC_COOLDOWN_MS) {
          console.warn('[Sync] doFullSync skipped: 30s cooldown still active.');
          return;
        }
        isSyncing = true;
        lastFullSyncTime = now;
        dirtyTables.clear();
        hasUntargetedDirty = false;
        startSync();
        let releaseDeferred = false;
        let fullSyncStage: 'pull' | 'push' = 'pull';
        try {
          await runSerializedSyncOperation(
            () => isClosed,
            () => pullAllFromCloud(masterKey, workspaceId, firebaseUserId),
            120_000,
          );
          if (isClosed) return;
          loadPages();
          window.dispatchEvent(new CustomEvent('caderno-sync-complete'));
          fullSyncStage = 'push';
          const fullSyncTasks = await runSerializedSyncOperation(
            () => isClosed,
            () => Promise.allSettled([
              pushAllToCloud(masterKey, undefined, workspaceId, firebaseUserId),
              syncPdfsToCloud(masterKey),
            ]),
            120_000,
          );
          const failedTask = fullSyncTasks.find(
            (task): task is PromiseRejectedResult => task.status === 'rejected',
          );
          if (failedTask) throw failedTask.reason;
          if (!isClosed) {
            finishSync(true);
            syncChannel.postMessage('LOCAL_UPDATE');
          }
        } catch (err: unknown) {
          releaseDeferred = deferSyncMutexReleaseUntilSettled(err, () => isClosed, outcome => {
            if (isClosed || outcome.status !== 'fulfilled') return;
            if (fullSyncStage === 'pull') {
              loadPages();
              window.dispatchEvent(new CustomEvent('caderno-sync-complete'));
              return;
            }

            if (!Array.isArray(outcome.value) || !outcome.value.every(isPromiseSettledResult)) return;
            const [pushResult, pdfResult] = outcome.value;
            if (pushResult.status === 'fulfilled') syncChannel.postMessage('LOCAL_UPDATE');
            if (pushResult.status === 'rejected') {
              handleSyncError(pushResult.reason, 'Late full-sync push');
            }
            if (pdfResult.status === 'rejected') {
              handleSyncError(pdfResult.reason, 'Late PDF sync');
            }
            if (pushResult.status === 'fulfilled' && pdfResult.status === 'fulfilled') {
              finishSync(true);
            }
          }, () => {
            isSyncing = false;
            checkPendingOperations();
          });
          if (!isClosed) {
            handleSyncError(err, 'doFullSync');
            finishSync(false);
          }
        } finally {
          if (!releaseDeferred) {
            isSyncing = false;
            checkPendingOperations();
          }
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
        if (dirtyTables.size === 0 && !hasUntargetedDirty) {
          return;
        }
        isSyncing = true;
        const tablesToPush = hasUntargetedDirty ? undefined : Array.from(dirtyTables);
        dirtyTables.clear();
        hasUntargetedDirty = false;
        const updatePayload = tablesToPush ? { type: 'LOCAL_UPDATE', tables: tablesToPush } : 'LOCAL_UPDATE';
        let releaseDeferred = false;
        try {
          // Note: syncPdfsToCloud is intentionally excluded here to prevent heavy drive scans during keystroke autosaves
          await runSerializedSyncOperation(
            () => isClosed,
            () => pushAllToCloud(masterKey, tablesToPush, workspaceId, firebaseUserId),
            120_000,
          );
          if (!isClosed) {
            syncChannel.postMessage(updatePayload);
          }
        } catch (err: unknown) {
          releaseDeferred = deferSyncMutexReleaseUntilSettled(err, () => isClosed, outcome => {
            if (outcome.status === 'fulfilled' && !isClosed) {
              syncChannel.postMessage(updatePayload);
            }
          }, () => {
            isSyncing = false;
            checkPendingOperations();
          });
          if (tablesToPush) {
            for (const t of tablesToPush) dirtyTables.add(t);
          } else {
            hasUntargetedDirty = true;
          }
          if (!isClosed) {
            handleSyncError(err, 'doPushOnlySync');
          }
        } finally {
          if (!releaseDeferred) {
            isSyncing = false;
            checkPendingOperations();
          }
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
        let releaseDeferred = false;
        runSerializedSyncOperation(
          () => isClosed,
          () => pullAllFromCloud(masterKey, workspaceId, firebaseUserId),
          60_000,
        )
          .then(() => {
            if (isClosed) return;
            loadPages();
            finishSync(true);
          })
          .catch((err: unknown) => {
            releaseDeferred = deferSyncMutexReleaseUntilSettled(err, () => isClosed, outcome => {
              if (outcome.status === 'fulfilled' && !isClosed) {
                loadPages();
                finishSync(true);
              }
            }, () => {
              isSyncing = false;
              checkPendingOperations();
            });
            if (!isClosed) {
              handleSyncError(err, 'Real-time Pull');
              finishSync(false);
            }
          })
          .finally(() => {
            if (!releaseDeferred) {
              isSyncing = false;
              checkPendingOperations();
            }
          });
      };

      const markDirty = (table?: string): void => {
        if (table) dirtyTables.add(table);
        else hasUntargetedDirty = true;
      };

      // Start the initial pull before registering the listener's initial-snapshot filter.
      doFullSync();
      const cleanupEventListeners = bindSyncEventListeners({
        workspaceId,
        firebaseUserId,
        syncChannel,
        loadPages,
        doFullSync,
        doPushOnlySync,
        executeRealTimePull,
        markDirty,
      });

      return () => {
        isClosed = true;
        cleanupEventListeners();
        if (syncDismissTimer.current) clearTimeout(syncDismissTimer.current);
      };
    }
  }, [isAuth, masterKey, loadPages, workspaceId, firebaseUserId]);

  return { syncStatus };
}

export function SyncCoordinator({
  isAuth,
  masterKey,
  loadPages,
  workspaceId,
}: {
  isAuth: boolean;
  masterKey: Record<string, CryptoKey>;
  loadPages: () => void;
  workspaceId?: string;
}) {
  useSync(isAuth, masterKey, loadPages, workspaceId);
  return null;
}
