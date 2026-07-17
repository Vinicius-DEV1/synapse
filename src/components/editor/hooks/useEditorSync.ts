import { useEffect, useRef, MutableRefObject } from 'react';
import * as Y from 'yjs';
import { applyBase64StateToYDoc } from '../../utils/yjs-utils';

interface UseEditorSyncProps {
  pageId: string | null;
  initialCrdtState?: string | null;
  initialContent: string;
  onSaveRef: MutableRefObject<Function>;
  latestContentRef: MutableRefObject<{ html: string, crdt: string } | null>;
}

export function useEditorSync({ pageId, initialCrdtState, initialContent, onSaveRef, latestContentRef }: UseEditorSyncProps) {
  const ydocRef = useRef<Y.Doc | null>(null);

  // Backup em memória
  if (!(window as any).__cadernoEditorBackup) {
    (window as any).__cadernoEditorBackup = new Map<string, { html: string; crdt: string }>();
  }

  const hasMeaningfulCrdt = !!initialCrdtState && initialCrdtState.length > 8;

  if (!ydocRef.current || ydocRef.current.guid !== pageId) {
    if (ydocRef.current) {
      ydocRef.current.destroy();
    }
    ydocRef.current = new Y.Doc();
    ydocRef.current.guid = pageId || 'temp';
    
    // console.log(`[Caderno:Mount] pageId=${pageId}`);
    
    if (hasMeaningfulCrdt) {
      applyBase64StateToYDoc(ydocRef.current, initialCrdtState!);
    }
    
    const backup = (window as any).__cadernoEditorBackup?.get(pageId);
    if (backup?.crdt && backup.crdt.length > 8) {
      applyBase64StateToYDoc(ydocRef.current, backup.crdt);
      (window as any).__cadernoEditorBackup.delete(pageId);
    }
  }

  const needsLegacyHydration = !hasMeaningfulCrdt && !!initialContent && initialContent !== '' && !(window as any).__cadernoEditorBackup?.has(pageId);

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

  useEffect(() => {
    return () => {
      if (latestContentRef.current && latestContentRef.current.crdt.length > 8) {
        // console.log(`[Caderno:Flush] Unmount flush for pageId=${pageId}`);
        const result = onSaveRef.current(latestContentRef.current.html, latestContentRef.current.crdt, []) as any;
        if (result && typeof result.catch === 'function') {
          result.catch((err: any) => {
            console.error(`[Caderno:Flush] Flush save FAILED for ${pageId}:`, err);
          });
        }
      }
    };
  }, [pageId, latestContentRef, onSaveRef]);

  return { ydocRef, needsLegacyHydration };
}
