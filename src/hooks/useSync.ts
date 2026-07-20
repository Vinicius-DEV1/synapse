import { useState, useRef, useEffect } from 'react';
import { pullAllFromCloud, pushAllToCloud, syncPdfsToCloud, listenForCloudSyncSignal } from '../services/sync';

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
      let isClosed = false;
      let isSyncing = false; // Mutex: impede syncs simultâneos que desperdiçam cota Firebase
      let lastFullSyncTime = 0; // Cooldown: tempo mínimo entre full syncs
      const FULL_SYNC_COOLDOWN_MS = 30_000; // 30 segundos de cooldown entre full syncs
      const syncChannel = new BroadcastChannel('caderno_sync');

      const doFullSync = async () => {
        if (isClosed) return;
        if (!navigator.onLine) {
          console.warn('[Sync] doFullSync abortado: sem conexão com a internet.');
          finishSync(false);
          return;
        }
        // Mutex: se já tem um sync rodando, ignora esta chamada
        if (isSyncing) {
          console.warn('[Sync] doFullSync ignorado: outro sync já está em andamento.');
          return;
        }
        // Cooldown: evita full syncs muito frequentes (ex: foco rápido + intervalo)
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
        } catch (err: any) {
          if (!isClosed) {
            console.warn(`[Sync] doFullSync FALHOU: ${err.message}`, err);
            if (err.code === 'resource-exhausted' || err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('permission-denied')) {
              window.dispatchEvent(new CustomEvent('caderno-sync-error', { 
                detail: { message: err.message, code: err.code } 
              }));
            }
            finishSync(false);
          }
        } finally {
          isSyncing = false;
        }
      };

      const doPushOnlySync = async () => {
        if (isClosed) return;
        if (!navigator.onLine) {
          return; // Offline: não mostra erro, apenas ignora silenciosamente
        }
        // Mutex: se já tem um sync rodando, ignora
        if (isSyncing) return;
        isSyncing = true;
        startSync();
        try {
          // Apenas push — sem pull e sem sync de PDFs (que é pesado e roda no doFullSync)
          await withTimeout(pushAllToCloud(masterKey), 120_000);
          if (!isClosed) {
            finishSync(true);
            syncChannel.postMessage('LOCAL_UPDATE');
          }
        } catch (err: any) {
          if (!isClosed) {
            console.warn(`[Sync] doPushOnlySync FALHOU: ${err.message}`, err);
            if (err.code === 'resource-exhausted' || err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('permission-denied')) {
              window.dispatchEvent(new CustomEvent('caderno-sync-error', { 
                detail: { message: err.message, code: err.code } 
              }));
            }
            finishSync(false);
          }
        } finally {
          isSyncing = false;
        }
      };

      // 1. Initial Sync (Sincroniza ao abrir)
      doFullSync();

      // 2. Cross-Device Real-time Firebase Sync
      // NOTA: onSnapshot dispara imediatamente com o estado atual do doc.
      // Usamos isFirstSnapshot para ignorar esse disparo inicial redundante,
      // já que o doFullSync() acima já faz o pull completo.
      let isFirstSnapshot = true;
      const unsubRealTime = listenForCloudSyncSignal(() => {
        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          return; // Ignora o disparo automático do onSnapshot na montagem
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
          .catch((err: any) => {
            console.warn('[Sync] Falha no Pull em Tempo Real:', err.message);
            if (err.code === 'resource-exhausted' || err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('permission-denied')) {
              window.dispatchEvent(new CustomEvent('caderno-sync-error', { 
                detail: { message: err.message, code: err.code } 
              }));
            }
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

      // 4. Gatilho inteligente sob demanda (quando o usuário edita)
      let syncDebounceTimer: ReturnType<typeof setTimeout>;
      const handleSyncTrigger = () => {
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(() => {
          doPushOnlySync();
        }, 1500); // ⚡ 1.5s após a edição
      };
      
      let cleanupSyncTrigger: (() => void) | undefined;
      if (window.api?.onSyncTrigger) {
        cleanupSyncTrigger = window.api.onSyncTrigger(handleSyncTrigger);
      } else {
        window.addEventListener('app-sync-trigger', handleSyncTrigger);
      }

      // 5. Gatilho de FOCO: Atualiza quando o usuário volta de outra janela
      // Protegido pelo mutex e cooldown de 30s para evitar syncs excessivos
      let isSyncingOnFocus = false;
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && !isSyncingOnFocus) {
          isSyncingOnFocus = true;
          doFullSync().finally(() => { isSyncingOnFocus = false; });
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // 6. Fallback de Segurança (a cada 10 minutos — reduzido de 5 para economizar cota)
      const syncInterval = setInterval(() => {
        doFullSync();
      }, 10 * 60 * 1000); 

      return () => {
        isClosed = true;
        clearInterval(syncInterval);
        clearTimeout(syncDebounceTimer);
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
