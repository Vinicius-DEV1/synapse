import { useState, useRef, useEffect } from 'react';
import { pullAllFromCloud, pushAllToCloud, syncPdfsToCloud } from '../services/sync';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(`Sync timeout após ${ms / 1000}s`)), ms)
  );
  return Promise.race([promise, timeout]);
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * Função helper para executar pull sem disparar cascata de sync triggers.
 * Ativa a flag de supressão durante o pull, garantindo que os db.put do
 * upsertRow não re-disparem o debounce do sync.
 */
async function pullWithSuppression(masterKey: any): Promise<void> {
  await pullAllFromCloud(masterKey);
}

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
      withTimeout(pullWithSuppression(masterKey), 60_000)
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

      // 2. Cria um gatilho de sincronização a cada 15 segundos (era 60s)
      const syncInterval = setInterval(() => {
        if (masterKey) {
          startSync();
          withTimeout(
            pullWithSuppression(masterKey)
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
      }, 15 * 1000); // ⚡ 15s (era 60s) — guia leitora atualiza 4x mais rápido

      // 3. Gatilho inteligente: PUSH PRIMEIRO, depois pull
      //    Debounce de 1.5s (era 3s) após qualquer modificação do usuário
      let syncDebounceTimer: ReturnType<typeof setTimeout>;
      const handleSyncTrigger = () => {
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(() => {
          if (masterKey) {
            startSync();
            withTimeout(
              // ⚡ Push PRIMEIRO — envia os dados do usuário para a nuvem imediatamente
              pushAllToCloud(masterKey)
                .then(() => {
                  // Depois pull — puxa possíveis mudanças de outros dispositivos
                  return pullWithSuppression(masterKey);
                })
                .then(() => {
                  loadPages();
                  return syncPdfsToCloud(masterKey);
                }),
              60_000
            )
              .then(() => finishSync(true))
              .catch(err => {
                console.warn('[Sync] Sync sob demanda encerrado:', err.message);
                finishSync(false);
              });
          }
        }, 1500); // ⚡ 1.5s (era 3s)
      };
      
      let cleanupSyncTrigger: (() => void) | undefined;
      if (window.api?.onSyncTrigger) {
        cleanupSyncTrigger = window.api.onSyncTrigger(handleSyncTrigger);
      } else {
        window.addEventListener('app-sync-trigger', handleSyncTrigger);
      }

      // 4. ⚡ Gatilho de FOCO: quando a guia ganha visibilidade (ex: usuário volta de outra aba),
      //    faz um pull imediato para trazer mudanças feitas em outras abas/dispositivos.
      let isSyncingOnFocus = false;
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && masterKey && !isSyncingOnFocus) {
          isSyncingOnFocus = true;
          startSync();
          withTimeout(
            pullWithSuppression(masterKey)
              .then(() => {
                loadPages();
                return pushAllToCloud(masterKey);
              }),
            30_000
          )
            .then(() => finishSync(true))
            .catch(err => {
              console.warn('[Sync] Sync on-focus encerrado:', err.message);
              finishSync(false);
            })
            .finally(() => { isSyncingOnFocus = false; });
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(syncInterval);
        clearTimeout(syncDebounceTimer);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
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
