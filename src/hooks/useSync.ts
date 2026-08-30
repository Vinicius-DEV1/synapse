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
 * #5: Checks whether error is caused by Firebase quota limits or permission denial.
 * Deduplicado — usado por todos os handlers de erro de sync.
 */
function isQuotaOrPermissionError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: string, message?: string };
  return e.code === 'resource-exhausted' 
    || e.message?.toLowerCase().includes('quota') === true
    || e.message?.toLowerCase().includes('permission-denied') === true;
}

/**
 * #5: Handler centralizado de erros de sync.
 * Dispatches global window event on quota or permission errors.
 */
function handleSyncError(err: unknown, context: string) {
  const e = err as { message?: string, code?: string };
  console.warn(`[Sync] ${context} FALHOU: ${e.message || 'Erro desconhecido'}`, err);
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
      const FULL_SYNC_COOLDOWN_MS = 30_000; // 30 segundos de cooldown entre full syncs
      const syncChannel = new BroadcastChannel('caderno_sync');
      // #7: Unique device ID to ignore self-push signals
      const myDeviceId = getDeviceId();

      // #10: Restaurar timestamps de sync do banco local (protege contra limpeza de localStorage)
      restoreLastSyncTimesFromDb().catch(() => {});

      const doFullSync = async () => {
        if (isClosed) return;
        if (!navigator.onLine) {
          console.warn('[Sync] doFullSync abortado: sem conexão com a internet.');
          finishSync(false);
          return;
        }
        // Mutex: if sync is already running, skip this call
        if (isSyncing) {
          console.warn('[Sync] doFullSync ignorado: outro sync já está em andamento.');
          return;
        }
        // Cooldown: prevents excessively frequent full syncs (e.g., rapid focus + interval)
        const now = Date.now();
        if (now - lastFullSyncTime < FULL_SYNC_COOLDOWN_MS) {
          console.warn('[Sync] doFullSync ignorado: cooldown de 30s ainda ativo.');
          return;
        }
        isSyncing = true;
        lastFullSyncTime = now;
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
            handleSyncError(err, 'doFullSync'); // #5: centralizado
            finishSync(false);
          }
        } finally {
          isSyncing = false;
        }
      };

      const doPushOnlySync = async () => {
        if (isClosed) return;
        if (!navigator.onLine) {
          return; // Offline: do not show error, ignore silently
        }
        // Mutex: if sync is already running, ignore
        if (isSyncing) return;
        isSyncing = true;
        try {
          // Silent background push only — no pull and no unnecessary App re-renders
          await withTimeout(
            pushAllToCloud(masterKey),
            120_000
          );
          
          // PDF sync is separated from the 120s timeout because large files might take longer
          await syncPdfsToCloud(masterKey);
          if (!isClosed) {
            syncChannel.postMessage('LOCAL_UPDATE');
          }
        } catch (err: unknown) {
          if (!isClosed) {
            handleSyncError(err, 'doPushOnlySync');
          }
        } finally {
          isSyncing = false;
        }
      };

      // 1. Initial Sync (Sincroniza ao abrir)
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
        if (!navigator.onLine) return;
        if (isSyncing) return; // Mutex
        isSyncing = true;
        startSync();
        withTimeout(pullAllFromCloud(masterKey), 60_000)
          .then(() => {
            loadPages();
            finishSync(true);
          })
          .catch((err: unknown) => {
            handleSyncError(err, 'Pull em Tempo Real'); // #5: centralizado
            finishSync(false);
          })
          .finally(() => {
            isSyncing = false;
          });
      });

      // 3. Cross-Tab Sync (Same Browser)
      syncChannel.onmessage = (msg) => {
        if (msg.data === 'LOCAL_UPDATE') {
          loadPages();
        }
      };

      // 4. Smart on-demand trigger (when user edits)
      let syncDebounceTimer: ReturnType<typeof setTimeout>;
      const handleSyncTrigger = () => {
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(() => {
          doPushOnlySync();
        }, 15000);
      };

      let cleanupSyncTrigger: (() => void) | undefined;
      if (window.api?.onSyncTrigger) {
        cleanupSyncTrigger = window.api.onSyncTrigger(handleSyncTrigger);
      } else {
        window.addEventListener('app-sync-trigger', handleSyncTrigger);
      }

      const handleImmediateSyncTrigger = () => {
        doPushOnlySync();
      };
      window.addEventListener('app-sync-trigger-immediate', handleImmediateSyncTrigger);

      // 5. Focus trigger: update when user returns from another window
      // Guarded by mutex and 30s cooldown to prevent redundant sync runs
      let isSyncingOnFocus = false;
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && !isSyncingOnFocus) {
          isSyncingOnFocus = true;
          doFullSync().finally(() => { isSyncingOnFocus = false; });
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // 6. Safety fallback (every 10 minutes - reduced from 5 to save quota)
      const syncInterval = setInterval(() => {
        doFullSync();
      }, 10 * 60 * 1000); 

      return () => {
        isClosed = true;
        clearInterval(syncInterval);
        window.removeEventListener('app-sync-trigger', handleSyncTrigger);
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
