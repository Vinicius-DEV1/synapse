import { useState, useRef, useEffect } from 'react';
import { pullAllFromCloud, pushAllToCloud, syncPdfsToCloud } from '../services/sync';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(`Sync timeout após ${ms / 1000}s`)), ms)
  );
  return Promise.race([promise, timeout]);
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export function useSync(isAuth: boolean, masterKey: string | null, loadPages: () => void) {
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
      startSync();
      // 1. Ao logar, puxa todas as atualizações da nuvem (timeout de 60s)
      withTimeout(pullAllFromCloud(masterKey), 60_000)
        .then(() => {
          // Após puxar, recarrega a UI
          loadPages();
          // E empurra possíveis alterações locais antigas (também com timeout)
          return withTimeout(
            Promise.all([
              pushAllToCloud(masterKey),
              syncPdfsToCloud(masterKey),
            ]),
            60_000
          );
        })
        .then(() => finishSync(true))
        .catch(err => {
          console.warn('[Sync] Sync inicial encerrado:', err.message);
          finishSync(false);
        });

      // 2. Cria um gatilho de sincronização a cada 1 minuto
      const syncInterval = setInterval(() => {
        if (masterKey) {
          startSync();
          withTimeout(
            pullAllFromCloud(masterKey)
              .then(() => {
                loadPages();
                return Promise.all([
                  pushAllToCloud(masterKey),
                  syncPdfsToCloud(masterKey),
                ]);
              }),
            60_000
          )
            .then(() => finishSync(true))
            .catch(err => {
              console.warn('[Sync] Sync periódico encerrado:', err.message);
              finishSync(false);
            });
        }
      }, 60 * 1000);

      // 3. Gatilho inteligente (debounce de 3s após qualquer modificação do usuário)
      let syncDebounceTimer: ReturnType<typeof setTimeout>;
      const handleSyncTrigger = () => {
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(() => {
          if (masterKey) {
            startSync();
            withTimeout(
              pullAllFromCloud(masterKey)
                .then(() => {
                  loadPages();
                  return Promise.all([
                    pushAllToCloud(masterKey),
                    syncPdfsToCloud(masterKey),
                  ]);
                }),
              60_000
            )
              .then(() => finishSync(true))
              .catch(err => {
                console.warn('[Sync] Sync sob demanda encerrado:', err.message);
                finishSync(false);
              });
          }
        }, 3000); // 3 segundos de inatividade após digitar/alterar algo
      };
      
      let cleanupSyncTrigger: (() => void) | undefined;
      if (window.api?.onSyncTrigger) {
        cleanupSyncTrigger = window.api.onSyncTrigger(handleSyncTrigger);
      } else {
        window.addEventListener('app-sync-trigger', handleSyncTrigger);
      }

      return () => {
        clearInterval(syncInterval);
        clearTimeout(syncDebounceTimer);
        if (cleanupSyncTrigger) {
          cleanupSyncTrigger();
        } else {
          window.removeEventListener('app-sync-trigger', handleSyncTrigger);
        }
        if (syncDismissTimer.current) clearTimeout(syncDismissTimer.current);
      };
    }
  }, [isAuth, masterKey, loadPages]);

  return { syncStatus };
}
