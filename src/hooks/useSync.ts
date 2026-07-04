import { useState, useRef, useEffect } from 'react';
import { pullAllFromCloud, pushAllToCloud, syncPdfsToCloud, listenForCloudSyncSignal } from '../services/sync';

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
      let isClosed = false;
      const syncChannel = new BroadcastChannel('caderno_sync');

      const doFullSync = async () => {
        if (isClosed) return;
        if (!navigator.onLine) {
          console.warn('[Sync] doFullSync abortado: sem conexão com a internet.');
          finishSync(false);
          return;
        }
        console.log(`[Sync] doFullSync INICIADO às ${new Date().toLocaleTimeString()}`);
        startSync();
        try {
          console.log('[Sync] Etapa 1: PULL From Cloud (Baixando alterações...)');
          await withTimeout(pullWithSuppression(masterKey), 30_000);
          console.log('[Sync] PULL concluído. Recarregando páginas na UI...');
          loadPages();
          console.log('[Sync] Etapa 2: PUSH To Cloud e sync de PDFs (Enviando alterações...)');
          await withTimeout(
            Promise.all([
              pushAllToCloud(masterKey),
              syncPdfsToCloud(masterKey),
            ]),
            30_000
          );
          if (!isClosed) {
            console.log('[Sync] doFullSync CONCLUÍDO COM SUCESSO!');
            finishSync(true);
            // Avisa outras abas do mesmo navegador que gravamos novidades no IDB local
            syncChannel.postMessage('LOCAL_UPDATE');
          }
        } catch (err: any) {
          if (!isClosed) {
            console.warn(`[Sync] doFullSync FALHOU: ${err.message}`, err);
            finishSync(false);
          }
        }
      };

      // 1. Initial Sync (Sincroniza ao abrir)
      doFullSync();

      // 2. Cross-Device Real-time Firebase Sync
      const unsubRealTime = listenForCloudSyncSignal(() => {
        if (!navigator.onLine) return;
        console.log('[Sync] Sinal Real-time recebido (Cross-device)! Sincronizando...');
        startSync();
        withTimeout(pullWithSuppression(masterKey), 30_000)
          .then(() => {
            loadPages();
            finishSync(true);
          })
          .catch(err => {
            console.warn('[Sync] Falha no Pull em Tempo Real:', err.message);
            finishSync(false);
          });
      });

      // 3. Cross-Tab Sync (Same Browser)
      syncChannel.onmessage = (msg) => {
        if (msg.data === 'LOCAL_UPDATE') {
          console.log('[Sync] Atualização recebida de outra aba. Recarregando UI...');
          loadPages();
        }
      };

      // 4. Gatilho inteligente sob demanda (quando o usuário edita)
      let syncDebounceTimer: ReturnType<typeof setTimeout>;
      const handleSyncTrigger = () => {
        console.log('[Sync] Gatilho de edição detectado! Agendando sync em 1.5s...');
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(() => {
          doFullSync();
        }, 1500); // ⚡ 1.5s após a edição
      };
      
      let cleanupSyncTrigger: (() => void) | undefined;
      if (window.api?.onSyncTrigger) {
        cleanupSyncTrigger = window.api.onSyncTrigger(handleSyncTrigger);
      } else {
        window.addEventListener('app-sync-trigger', handleSyncTrigger);
      }

      // 5. Gatilho de FOCO: Atualiza quando o usuário volta de outra janela
      let isSyncingOnFocus = false;
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && !isSyncingOnFocus) {
          console.log('[Sync] App ganhou foco novamente. Verificando por atualizações...');
          isSyncingOnFocus = true;
          doFullSync().finally(() => { isSyncingOnFocus = false; });
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // 6. Fallback de Segurança (a cada 5 minutos em vez de 15 segundos)
      const syncInterval = setInterval(() => {
        doFullSync();
      }, 5 * 60 * 1000); 

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
