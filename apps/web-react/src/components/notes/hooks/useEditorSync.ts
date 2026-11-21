import React, { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import * as Y from 'yjs';
import { applyBase64StateToYDoc } from '../../../utils/yjs-utils';
import { getEditorBackupMap } from './editorBackupStore';
import { onPageSaved } from '../../../services/page-broadcast';
import { fetchPageContentDedup } from '../../page-view/pageContentFetcher';
import type { EditorSaveCallback } from './useEditorSave';

interface UseEditorSyncProps {
  pageId: string | null;
  initialCrdtState?: string | null;
  onSaveRef: MutableRefObject<EditorSaveCallback>;
  latestContentRef: MutableRefObject<{ html: string; crdt: string } | null>;
  instanceId?: string;
  isActive?: boolean;
}

export function useEditorSync({ pageId, initialCrdtState, latestContentRef, instanceId, isActive = true }: UseEditorSyncProps) {
  const hasMeaningfulCrdt = !!initialCrdtState && initialCrdtState.length > 8;

  // Track if CRDT application failed so Editor can fall back to HTML
  const [crdtFailed, setCrdtFailed] = useState(false);

  const lastAppliedCrdtRef = useRef<string | null>(
    hasMeaningfulCrdt ? initialCrdtState! : null
  );

  const [ydoc] = React.useState(() => {
    let doc = new Y.Doc();
    doc.guid = pageId || 'temp';
    
    if (hasMeaningfulCrdt) {
      try {
        applyBase64StateToYDoc(doc, initialCrdtState!);
        const xmlFragment = doc.get('default', Y.XmlFragment);
        if (!xmlFragment) throw new Error('CRDT produced empty XmlFragment');
      } catch (err) {
        console.warn('[Caderno:Sync] CRDT inválido ou incompatível, usando fallback HTML:', err);
        doc.destroy();
        doc = new Y.Doc();
        doc.guid = pageId || 'temp';
      }
    }
    
    const backupMap = getEditorBackupMap();
    const backup = backupMap.get(pageId);
    if (backup?.crdt && backup.crdt.length > 8) {
      try {
        applyBase64StateToYDoc(doc, backup.crdt);
        lastAppliedCrdtRef.current = backup.crdt;
      } catch (err) {
        console.warn('[Caderno:Sync] Falha ao aplicar backup CRDT:', err);
      }
    }
    return doc;
  });
  
  const ydocRef = useRef<Y.Doc>(ydoc);

  // 1. Listen for remote sync events (e.g. Firebase / sync-pull)
  useEffect(() => {
    const handleRemoteUpdate = (e: CustomEvent) => {
      const { pageId: syncPageId, crdtState } = e.detail;
      if (syncPageId === pageId && ydocRef.current && crdtState) {
        if (crdtState === lastAppliedCrdtRef.current) return;
        applyBase64StateToYDoc(ydocRef.current, crdtState);
        lastAppliedCrdtRef.current = crdtState;
      }
    };
    window.addEventListener('caderno-sync-update', handleRemoteUpdate as EventListener);
    
    return () => {
      window.removeEventListener('caderno-sync-update', handleRemoteUpdate as EventListener);
    };
  }, [pageId]);

  // 2. Listen to page save broadcasts across browser and internal tabs (BroadcastChannel + Local Event)
  useEffect(() => {
    const unsubscribe = onPageSaved((msg) => {
      if (msg.pageId) {
        getEditorBackupMap().set(msg.pageId, { html: msg.html, crdt: msg.crdtState || '' });
      }

      if (instanceId && msg.senderInstanceId === instanceId) {
        if (msg.pageId === pageId && msg.crdtState) {
          lastAppliedCrdtRef.current = msg.crdtState;
        }
        return;
      }

      if (msg.pageId === pageId && ydocRef.current && msg.crdtState && msg.crdtState.length > 8) {
        if (msg.crdtState !== lastAppliedCrdtRef.current) {
          applyBase64StateToYDoc(ydocRef.current, msg.crdtState);
          lastAppliedCrdtRef.current = msg.crdtState;
        }
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
  // Queries only the current page (coalesced with PageView) and applies CRDT only on real divergence.
  useEffect(() => {
    if (!isActive || !pageId) return;

    let cancelled = false;
    let lastFocusCheckTime = 0;
    const handleFocusCheck = async () => {
      if (cancelled || !pageId || !ydocRef.current || !isActive) return;
      const now = Date.now();
      if (now - lastFocusCheckTime < 2000) return;
      lastFocusCheckTime = now;

      if (document.visibilityState === 'visible') {
        const request = fetchPageContentDedup(pageId);
        if (request) {
          try {
            const pageData = await request;
            if (cancelled || !pageData) return;

            const remoteCrdt = pageData.crdt_state;
            // If the database row has no CRDT state, it was updated externally (e.g. by native Qt).
            // Clear any stale in-memory CRDT backup so it does not overwrite the newer HTML.
            if (!remoteCrdt || remoteCrdt.length <= 8) {
              getEditorBackupMap().delete(pageId);
              lastAppliedCrdtRef.current = null;
              return;
            }

            // Skip redundant Yjs merge if the remote CRDT matches our current local snapshot.
            const localCrdt = latestContentRef.current?.crdt || lastAppliedCrdtRef.current;
            if (remoteCrdt === localCrdt || remoteCrdt === lastAppliedCrdtRef.current) {
              return;
            }

            if (!cancelled && ydocRef.current) {
              applyBase64StateToYDoc(ydocRef.current, remoteCrdt);
              lastAppliedCrdtRef.current = remoteCrdt;
              getEditorBackupMap().set(pageId, {
                html: pageData.content || latestContentRef.current?.html || '',
                crdt: remoteCrdt,
              });
            }
            return;
          } catch (err) {
            if (!cancelled) {
              console.warn('[Caderno:Sync] Erro ao verificar estado da página ao focar:', err);
            }
          }
        }
      }

      if (cancelled || !ydocRef.current) return;

      // In-memory fallback only if storage API is unavailable and backup diverges
      const backup = getEditorBackupMap().get(pageId);
      if (
        backup?.crdt &&
        backup.crdt.length > 8 &&
        backup.crdt !== lastAppliedCrdtRef.current &&
        backup.crdt !== latestContentRef.current?.crdt
      ) {
        applyBase64StateToYDoc(ydocRef.current, backup.crdt);
        lastAppliedCrdtRef.current = backup.crdt;
      }
    };

    document.addEventListener('visibilitychange', handleFocusCheck);
    window.addEventListener('focus', handleFocusCheck);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleFocusCheck);
      window.removeEventListener('focus', handleFocusCheck);
    };
  }, [pageId, isActive, latestContentRef]);

  // 4. Destroy Y.Doc on unmount after synchronous editor flush completes
  useEffect(() => {
    const docInstance = ydocRef.current;
    return () => {
      queueMicrotask(() => {
        try {
          docInstance.destroy();
        } catch {
          // Ignore if already destroyed
        }
      });
    };
  }, []);

  // Signal CRDT failure on first render so Editor can fall back to HTML
  useEffect(() => {
    if (hasMeaningfulCrdt) {
      const xmlFragment = ydocRef.current.get('default', Y.XmlFragment);
      if (!xmlFragment || xmlFragment.length === 0) {
        setCrdtFailed(true);
      }
    }
  }, []);

  return { ydocRef, crdtFailed };
}
