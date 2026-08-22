import React, { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import * as Y from 'yjs';
import { applyBase64StateToYDoc } from '../../../utils/yjs-utils';
import { getEditorBackupMap } from './editorBackupStore';
import { onPageSaved } from '../../../services/page-broadcast';

interface UseEditorSyncProps {
  pageId: string | null;
  initialCrdtState?: string | null;
  onSaveRef: MutableRefObject<Function>;
  latestContentRef: MutableRefObject<{ html: string; crdt: string } | null>;
  instanceId?: string;
}

export function useEditorSync({ pageId, initialCrdtState, onSaveRef, latestContentRef, instanceId }: UseEditorSyncProps) {
  const hasMeaningfulCrdt = !!initialCrdtState && initialCrdtState.length > 8;

  const [ydoc] = React.useState(() => {
    const doc = new Y.Doc();
    doc.guid = pageId || 'temp';
    
    if (hasMeaningfulCrdt) {
      applyBase64StateToYDoc(doc, initialCrdtState!);
    }
    
    const backupMap = getEditorBackupMap();
    const backup = backupMap.get(pageId);
    if (backup?.crdt && backup.crdt.length > 8) {
      applyBase64StateToYDoc(doc, backup.crdt);
      backupMap.delete(pageId);
    }
    return doc;
  });
  
  const ydocRef = useRef<Y.Doc>(ydoc);

  // 1. Listen for remote sync events (e.g. Firebase / sync-pull)
  useEffect(() => {
    const handleRemoteUpdate = (e: CustomEvent) => {
      const { pageId: syncPageId, crdtState } = e.detail;
      if (syncPageId === pageId && ydocRef.current && crdtState) {
        applyBase64StateToYDoc(ydocRef.current, crdtState);
      }
    };
    window.addEventListener('caderno-sync-update', handleRemoteUpdate as EventListener);
    
    return () => {
      window.removeEventListener('caderno-sync-update', handleRemoteUpdate as EventListener);
    };
  }, [pageId]);

  // 2. Escuta broadcast de salvamento entre abas do browser e abas internas (BroadcastChannel + Local Event)
  useEffect(() => {
    const unsubscribe = onPageSaved((msg) => {
      // Update in-memory backup with latest version
      if (msg.pageId) {
        getEditorBackupMap().set(msg.pageId, { html: msg.html, crdt: msg.crdtState || '' });
      }

      // If message originated from this editor, no need to re-apply CRDT to self
      if (instanceId && msg.senderInstanceId === instanceId) {
        return;
      }

      // If saved page is currently open in this editor, sync YDoc immediately
      if (msg.pageId === pageId && ydocRef.current && msg.crdtState && msg.crdtState.length > 8) {
        applyBase64StateToYDoc(ydocRef.current, msg.crdtState);
        if (latestContentRef.current) {
          latestContentRef.current = { html: msg.html, crdt: msg.crdtState };
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [pageId, latestContentRef, instanceId]);

  // 3. Protection fallback when gaining focus / returning to visibility
  useEffect(() => {
    const handleFocusCheck = async () => {
      if (pageId && ydocRef.current) {
        // Primeiro verifica o backup em memória (síncrono e instantâneo)
        const backup = getEditorBackupMap().get(pageId);
        if (backup?.crdt && backup.crdt.length > 8) {
          applyBase64StateToYDoc(ydocRef.current, backup.crdt);
        }

        // Depois consulta o banco como garantia
        if (document.visibilityState === 'visible' && window.api) {
          try {
            const pages = await window.api.getAllPages?.();
            const currentPage = pages?.find((p: any) => p.id === pageId);
            if (currentPage?.crdt_state && currentPage.crdt_state.length > 8 && ydocRef.current) {
              applyBase64StateToYDoc(ydocRef.current, currentPage.crdt_state);
            }
          } catch (err) {
            console.warn('[Caderno:Sync] Erro ao verificar estado da página ao focar:', err);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleFocusCheck);
    window.addEventListener('focus', handleFocusCheck);

    return () => {
      document.removeEventListener('visibilitychange', handleFocusCheck);
      window.removeEventListener('focus', handleFocusCheck);
    };
  }, [pageId]);

  // 4. Salva alterações pendentes ao desmontar
  useEffect(() => {
    return () => {
      if (latestContentRef.current && latestContentRef.current.crdt.length > 8) {
        const result = onSaveRef.current(latestContentRef.current.html, latestContentRef.current.crdt, [], instanceId) as any;
        if (result && typeof result.catch === 'function') {
          result.catch((err: any) => {
            console.error(`[Caderno:Flush] Falha ao persistir alterações no unmount de ${pageId}:`, err);
          });
        }
      }
    };
  }, [pageId, latestContentRef, onSaveRef, instanceId]);

  return { ydocRef };
}
